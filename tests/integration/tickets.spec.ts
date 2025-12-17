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

    it('Deve aplicar desconto no ticket (Fluxo Positivo)', async () => {
        const response = await request(app)
            .post(`/tickets/${ticketPositiveId}/descontos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_POSITIVO });
        expect(response.status).toBe(201);
        expect(response.body.descontoAplicado).toBe(5);
    });

    it('Deve verificar que o valor do ticket foi atualizado após desconto', async () => {
        // Verification Step: GET /tickets/:id
        const response = await request(app)
            .get(`/tickets/${ticketPositiveId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        // Original: 11.50. Discount: 5.00. Current: 6.50.
        // Explicit check as requested
        expect(Number(response.body.valorAtual)).toBe(6.5);
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
        // Verification Step: GET /tickets/:id (Main Resource) + GET /pagamento if needed
        const response = await request(app)
            .get(`/tickets/${ticketPositiveId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('PAGO');
        expect(Number(response.body.valorAtual)).toBe(6.5); // Should remain the paid amount

        // Also verify the specific payment endpoint if business rule requires it
        const paymentRes = await request(app)
            .get(`/tickets/${ticketPositiveId}/pagamento`)
            .set('Authorization', `Bearer ${token}`);
        expect(paymentRes.body.status).toBe('PAGO');
    });

    it('Não deve permitir reutilizar a mesma NF no mesmo ticket', async () => {
        const response = await request(app)
            .post(`/tickets/${ticketPositiveId}/descontos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_POSITIVO });
        expect(response.status).toBe(409);
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

    it('Não deve aplicar desconto se data da NF estiver fora do intervalo', async () => {
        const response = await request(app)
            .post(`/tickets/${ticketNegativeId}/descontos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_DATA_INVALIDA });
        expect(response.status).toBe(409);
    });

    it('Não deve aplicar desconto se CEP for inválido/inativo', async () => {
        const response = await request(app)
            .post(`/tickets/${ticketNegativeId}/descontos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ chave: CHAVE_CENARIO_CEP_INVALIDO });
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/CEP.*não está ativo/);
    });
});
