# Incremento 15.2C — Integration Console MVP

## Objetivo
Antecipar a UI operacional de integrações para validar Microsoft Teams dentro do Arena Dev sem chamadas manuais de API.

## Fluxo
1. Readiness do app registration.
2. Conexão do tenant.
3. Descoberta de turmas.
4. Vínculo Microsoft ↔ Arena.
5. Roster e Student Matching Preview.

## Segurança
A UI nunca recebe client secret, access token ou refresh token. Ela apenas informa se o backend recebeu:

```text
APP_INTEGRATIONS_MICROSOFT_CLIENT_ID
APP_INTEGRATIONS_MICROSOFT_CLIENT_SECRET
```

## Backend complementar
`GET /api/integrations/connections/{connectionId}/classroom-links`

## Gate
```bash
cd backend
mvn -B -ntp verify
cd ../frontend
npm test
npm run typecheck
npm run build
cd ..
docker compose up -d --build
docker compose ps
```

## Próxima etapa
15.2D — Apply Student Matching.
