import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { Pool } from 'pg';
import { env } from '../../src/config/env';

// Keys for triggering specific mock behaviors
const CHAVE_CENARIO_POSITIVO = '53160911510448000171550010000106771000187760';
const CHAVE_CENARIO_DATA_INVALIDA = '99999999999999999999999999999999999999999999'; // Triggers 2025 date
const CHAVE_CENARIO_CEP_INVALIDO = '88888888888888888888888888888888888888888888'; // Triggers invalid CEP

// Mock SerproClient globally with dynamic behavior based on Chave
vi.mock('../../src/integrations/serpro/SerproClient', () => {
    return {
        SerproClient: class {
            async consultarNfe(chave: string) {
                // Default valid payload (2016 date, Valid CEP)
                let date = '2016-09-11T12:00:00-03:00';
                let cep = '12345678';

                if (chave === '99999999999999999999999999999999999999999999') {
                    // Scenario: Future Date (2025)
                    date = '2025-01-01T12:00:00-03:00';
                } else if (chave === '88888888888888888888888888888888888888888888') {
                    // Scenario: Invalid CEP
                    cep = '00000000';
                }

                return {
                    nfeProc: {
                        NFe: {
                            infNFe: {
                                total: { ICMSTot: { vNF: '100.00' } },
                                ide: { dhEmi: date },
                                dest: { enderDest: { CEP: cep } }
                            }
                        }
                    }
                };
            }
        }
    };
});

describe('Integracao: Ciclo de Vida do Ticket', () => {
    let ticketPositiveId: string;
    let ticketNegativeId: string;
    let token: string;
    const PLACA_TESTE = 'ABC1E23';

    beforeAll(async () => {
        const pool = new Pool({ connectionString: env.databaseUrl });
        await pool.query('TRUNCATE TABLE tickets, notas_fiscais, ticket_descontos, ticket_pagamentos, creditos_movimentos, usuarios CASCADE');
        await pool.query("INSERT INTO ceps_scs (cep, ativo) VALUES ('12345678', true) ON CONFLICT (cep) DO NOTHING");
        await pool.end();
    });

    // --- Authentication ---
    it('Deve registrar um novo usuario', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                nome: 'Test User',
                email: 'test@example.com',
                celular: '11999999999',
                cpf: '12345678901',
                placaDoCarro: PLACA_TESTE,
                senha: 'password123'
            });
        expect(response.status).toBe(201);
    });

    it('Deve logar e obter token', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', senha: 'password123' });
        expect(response.status).toBe(200);
        token = response.body.token;
    });

    // --- Positive Flow ---
    it('Deve criar um ticket com sucesso (Fluxo Positivo)', async () => {
        const response = await request(app)
            .post('/tickets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                tipoHoras: 2,
                timestampEntrada: '2016-09-11T11:00:00-03:00',
                placaDoCarro: PLACA_TESTE,
                usarCredito: false
            });
        expect(response.status).toBe(201);
        ticketPositiveId = response.body.id;
    });

    it('Deve buscar o ticket pelo ID', async () => {
        const response = await request(app)
            .get(`/tickets/${ticketPositiveId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(ticketPositiveId);
    });

    it('Deve aplicar cashback via NF no ticket ativo (Fluxo Positivo)', async () => {
        // Initial credit check
        const userRes = await request(app)
            .get('/me')
            .set('Authorization', `Bearer ${token}`);
        const initialBalance = Number(userRes.body.creditoSaldo);

        // Apply Cashback
        const response = await request(app)
            .post('/tickets/descontos')
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_POSITIVO });

        expect(response.status).toBe(201);
        expect(response.body.ticketId).toBe(ticketPositiveId);
        expect(response.body.creditoGerado).toBe(5); // 5% of 100.00
        expect(response.body.descontoAplicado).toBe(0); // No discount on ticket
    });

    it('Deve verificar que o valor do ticket NÃO mudou e crédito aumentou', async () => {
        // Verification Step: GET /tickets/:id
        const response = await request(app)
            .get(`/tickets/${ticketPositiveId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        // Original: 11.50. Cashback model: 11.50 remains.
        expect(Number(response.body.valorAtual)).toBe(11.5);

        // Verify Credit Balance
        const userRes = await request(app)
            .get('/me')
            .set('Authorization', `Bearer ${token}`);
        // Default 0 start + 5 cashback = 5. (Or previous balance + 5)
        // Since we truncate tables, start is 0.
        expect(Number(userRes.body.creditoSaldo)).toBe(5.00);
    });

    it('Deve processar o pagamento do ticket', async () => {
        const response = await request(app)
            .post(`/tickets/${ticketPositiveId}/pagamento`)
            .set('Authorization', `Bearer ${token}`)
            .send({ metodo: 'cartao' });
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('PAGO');
    });

    it('Deve verificar status e valores finais após pagamento', async () => {
        const response = await request(app)
            .get(`/tickets/${ticketPositiveId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('PAGO');
        expect(Number(response.body.valorAtual)).toBe(11.5);

        const paymentRes = await request(app)
            .get(`/tickets/${ticketPositiveId}/pagamento`)
            .set('Authorization', `Bearer ${token}`);
        expect(paymentRes.body.status).toBe('PAGO');
    });

    it('Deve excluir ticket ativo (se houver novo)', async () => {
        // Create new active ticket
        const createRes = await request(app)
            .post('/tickets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                tipoHoras: 1,
                timestampEntrada: '2016-09-11T12:00:00-03:00',
                usarCredito: false
            });
        expect(createRes.status).toBe(201);

        // Delete it
        const delRes = await request(app)
            .delete('/tickets/ativo')
            .set('Authorization', `Bearer ${token}`);
        expect(delRes.status).toBe(204);

        // Verify it is gone (active)
        const getRes = await request(app)
            .get('/me/tickets/ativo')
            .set('Authorization', `Bearer ${token}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body).toBe(null); // or empty body depending on implementation, usually 204 or null
    });

    it('Não deve permitir reutilizar a mesma NF no mesmo ticket', async () => {
        // Re-create active ticket to try reusing NF on it (or same ticket logic if we didn't pay/close it?)
        // The previous test PAID the ticketPositiveId, so it's closed.
        // The 'reutilizar' check usually runs on an active ticket.
        // Let's create a new one.

        const createRes = await request(app)
            .post('/tickets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                tipoHoras: 2,
                timestampEntrada: '2016-09-11T11:00:00-03:00',
                usarCredito: false
            });
        const newTicketId = createRes.body.id;

        const response = await request(app)
            .post('/tickets/descontos') // No ID
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_POSITIVO });

        expect(response.status).toBe(409); // Already used
    });

    // --- Negative Flow (New Ticket) ---
    it('Deve criar um NOVO ticket para testes negativos', async () => {
        // Reuse same time windows
        const response = await request(app)
            .post('/tickets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                tipoHoras: 2,
                timestampEntrada: '2016-09-11T11:00:00-03:00',
                placaDoCarro: PLACA_TESTE,
                usarCredito: false
            });
        expect(response.status).toBe(201);
        ticketNegativeId = response.body.id;
    });

    it('Não deve aplicar desconto se data da NF estiver fora do intervalo (usando ticket ativo)', async () => {
        const response = await request(app)
            .post('/tickets/descontos')
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_DATA_INVALIDA });
        expect(response.status).toBe(409);
    });

    it('Não deve aplicar desconto se CEP for inválido/inativo', async () => {
        const response = await request(app)
            .post('/tickets/descontos')
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_CEP_INVALIDO });
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/CEP.*não está ativo/);
    });
});
