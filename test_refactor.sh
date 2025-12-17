#!/bin/bash
BASE_URL="http://localhost:3000"

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
    "timestampEntrada": "2016-09-11T10:00:00-03:00",
    "placaDoCarro": "ABC1D23",
    "usarCredito": false
  }')
echo "Response: $TICKET_RES"
TICKET_ID=$(echo $TICKET_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Ticket ID: $TICKET_ID"
echo ""

echo "=== 6. Apply Discount (Simulated NF) using Serpro Mock (if working) or known NF ==="
# Using the fixed key from previous tests which might be configured in Serpro Mock or reusing logic
NF_CHAVE="53160911510448000171550010000106771000187760"

DISCOUNT_RES=$(curl -s -X POST "$BASE_URL/tickets/$TICKET_ID/descontos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"chave\": \"$NF_CHAVE\"
  }")
echo "Response: $DISCOUNT_RES"
echo ""

echo "=== 7. Check Ticket Status/Values via GET ==="
curl -s -X GET "$BASE_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 8. Check Credit Balance (Did I get cashback?) ==="
curl -s -X GET "$BASE_URL/me/creditos" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 9. Pay remaining (if any) ==="
curl -s -X POST "$BASE_URL/tickets/$TICKET_ID/pagamento" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo": "pix"
  }'
echo ""

echo "=== 10. List Active Ticket ==="
curl -s -X GET "$BASE_URL/me/tickets/ativo" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 11. List All Tickets ==="
curl -s -X GET "$BASE_URL/me/tickets" \
  -H "Authorization: Bearer $TOKEN"
echo ""
