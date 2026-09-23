# Incremento 15.6A — Google Classroom OAuth & Course Discovery

Primeira fatia funcional do provider `GOOGLE_CLASSROOM`.

Fluxo:

```text
Google OAuth 2.0
→ IntegrationConnection(GOOGLE_CLASSROOM)
→ EncryptedIntegrationCredentialStore
→ GoogleClassroomTokenProvider
→ Classroom API /v1/courses
```

Escopos:

```text
openid
email
profile
https://www.googleapis.com/auth/classroom.courses.readonly
```

A conexão usa acesso offline e refresh token. Apenas cursos `ACTIVE` são descobertos.

Endpoints:

```text
GET /api/integrations/google/readiness
GET /api/integrations/google/oauth/start
GET /api/integrations/google/oauth/callback
GET /api/integrations/google/connections/{connectionId}/courses
```

Capability implementada nesta fatia:

```text
READ_CLASSROOM
```

Configuração:

```text
APP_INTEGRATIONS_GOOGLE_CLIENT_ID
APP_INTEGRATIONS_GOOGLE_CLIENT_SECRET
APP_INTEGRATIONS_GOOGLE_REDIRECT_URI
APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY
```

Próximo incremento: **15.6B — Course Linking & Roster Discovery**.
