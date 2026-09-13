# 13.7E — Preferências de tema

A tela Configurações passa a separar preferências de aparência das operações administrativas.

## Temas
- Escuro
- Claro
- Sistema

A preferência é persistida em `localStorage` por navegador.

O modo `Sistema` acompanha `prefers-color-scheme` e reage a mudanças do sistema operacional.

A aplicação do tema ocorre antes da pintura principal para reduzir flash de tema incorreto.
