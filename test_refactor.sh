#!/bin/bash
BASE_URL="http://localhost:3000"
BASE_URLCPF="12345678901"
PASSWORD="senha_secreta"

# Cleanup previous test data
echo "=== 0. Cleanup DB ==="
docker exec -e PGPASSWORD=postgres nota_fiscal_db psql -U postgres -d app -c "
DO \$\$ 
DECLARE 
    v_user_id UUID;
BEGIN 
    SELECT id INTO v_user_id FROM usuarios WHERE cpf = '$BASE_URLCPF';
    IF v_user_id IS NOT NULL THEN
        DELETE FROM creditos_movimentos WHERE user_id = v_user_id;
        DELETE FROM ticket_descontos WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = v_user_id);
        DELETE FROM ticket_pagamentos WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = v_user_id);
        UPDATE notas_fiscais SET usado_ticket_id = NULL WHERE usado_ticket_id IN (SELECT id FROM tickets WHERE user_id = v_user_id);
        DELETE FROM tickets WHERE user_id = v_user_id;
        DELETE FROM usuarios_veiculos WHERE user_id = v_user_id;
        DELETE FROM usuarios WHERE id = v_user_id;
    END IF;
END \$\$;
" || true
echo "Cleanup done."
echo ""

echo "=== 1. Register User ==="
REGISTER_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "User Test",
    "email": "user@test.com",
    "celular": "11999999999",
    "cpf": "12345678901",
    "placaDoCarro": "ABC1D23",
    "senha": "password123"
  }')
echo "Response: $REGISTER_RES"
echo ""

echo "=== 2. Login User ==="
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "senha": "password123"
  }')
echo "Response: $LOGIN_RES"
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

echo "=== 3. Add Credit Manual (MVP) ==="
curl -s -X POST "$BASE_URL/me/creditos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 50.00,
    "descricao": "Recarga Inicial"
  }'
echo ""

echo "=== 4. Check Credit Balance ==="
curl -s -X GET "$BASE_URL/me/creditos" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 5. Create Ticket (Without Credit) ==="
TICKET_RES=$(curl -s -X POST "$BASE_URL/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoHoras": 2,
    "timestampEntrada": "2016-08-31T23:00:00-03:00",
    "placaDoCarro": "ABC1D23",
    "usarCredito": false
  }')
echo "Response: $TICKET_RES"
TICKET_ID=$(echo $TICKET_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Ticket ID: $TICKET_ID"
echo ""


echo "=== 5.5. Check Initial Credit Balance ==="
CREDIT_INIT_RES=$(curl -s -X GET "$BASE_URL/me/creditos" -H "Authorization: Bearer $TOKEN")
echo "Response: $CREDIT_INIT_RES"
echo ""

echo "=== 6. Apply Cashback (Simulated NF) ==="
# Using a key that generates ~150.00 value -> 5% = 7.50 cashback
NF_CHAVE="53160911510448000171550010000106771000187760"

DISCOUNT_RES=$(curl -s -X POST "$BASE_URL/tickets/descontos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"chave\": \"$NF_CHAVE\"
  }")
echo "Response: $DISCOUNT_RES"
echo ""

echo "=== 7. Check Ticket Status/Values (Should remain original value) ==="
curl -s -X GET "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 8. Check Credit Balance (Should have increased) ==="
curl -s -X GET "$BASE_URL/me/creditos" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 9. Pay Ticket ==="
curl -s -X POST "$BASE_URL/tickets/$TICKET_ID/pagamento" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo": "pix"
  }'
echo ""

echo "=== 10. List Active Ticket (Should be null if paid) ==="
curl -s -X GET "$BASE_URL/me/tickets/ativo" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 11. Create another ticket to test DELETE ==="
TICKET_RES_2=$(curl -s -X POST "$BASE_URL/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoHoras": 2,
    "timestampEntrada": "2016-09-11T08:00:00-03:00",
    "usarCredito": false
  }')
echo "Created: $TICKET_RES_2"
echo ""

echo "=== 12. Delete Active Ticket ==="
DEL_RES=$(curl -s -X DELETE "$BASE_URL/tickets/ativo" \
  -H "Authorization: Bearer $TOKEN")
echo "Delete Status: $DEL_RES" # Should be empty 204
echo ""

echo "=== 13. Verify Deleted (Get Active Should be null) ==="
curl -s -X GET "$BASE_URL/me/tickets/ativo" \
  -H "Authorization: Bearer $TOKEN"
echo ""
