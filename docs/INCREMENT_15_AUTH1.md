# 15.AUTH1 — Microsoft 365 Delegated OAuth

## Objetivo

Substituir a experiência de conexão manual do Microsoft Teams por login
Microsoft 365 usando OAuth 2.0 Authorization Code + OpenID Connect.

## Experiência do professor

```text
Configurações
  → Plataformas educacionais
  → Microsoft Teams
  → Entrar com Microsoft 365
```

O professor não informa:

- Tenant ID;
- Client ID;
- Client Secret;
- access token;
- refresh token.

## Configuração da instalação

O administrador da instalação configura:

```text
APP_INTEGRATIONS_MICROSOFT_CLIENT_ID
APP_INTEGRATIONS_MICROSOFT_CLIENT_SECRET
APP_INTEGRATIONS_MICROSOFT_REDIRECT_URI
APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY
```

Gerar a chave AES-256:

```bash
openssl rand -base64 32
```

## Escopos delegados

```text
openid
profile
offline_access
EduRoster.ReadBasic
EduAssignments.ReadBasic
```

Os escopos Education exigem consentimento administrativo no tenant Microsoft.

## Segurança

Tokens delegados são persistidos em `integration_credentials` criptografados
com AES-256-GCM.

O `client_secret` permanece somente nas variáveis de ambiente do servidor.

## Compatibilidade

O provider antigo de client credentials continua disponível como fallback
temporário para conexões existentes.

## Callback

Default local:

```text
http://localhost:8080/api/integrations/microsoft/oauth/callback
```

Essa URL precisa ser registrada como Web Redirect URI no Microsoft Entra ID.

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
