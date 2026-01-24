# Task: Implementar 10 Testes Críticos de API

Este plano descreve a implementação de uma suíte de testes de integração para as rotas vitais do sistema WhatsBenemax, garantindo estabilidade durante a migração para React e futuras refatorações.

## 📋 Objetivos
- Configurar ambiente de testes robusto com Jest e Supertest.
- Implementar mocks estratégicos para PostgreSQL, Redis e Baileys.
- Validar autenticação, gestão de instâncias, envio de mensagens e integridade de dados.

## 🛠️ Stack Técnica
- **Framework:** Jest
- **HTTP Testing:** Supertest
- **Mocks:** jest.mock (pg, ioredis, @whiskeysockets/baileys)

## 🗂️ Rotas para Teste
1.  **Auth Success:** `POST /api/auth/login`
2.  **Auth Failure:** `POST /api/auth/login` (Invalid)
3.  **Users Protected:** `GET /api/usuarios` (RBAC Check)
4.  **Instance List:** `GET /api/instancia`
5.  **Instance Create:** `POST /api/instancia`
6.  **Message Send:** `POST /api/mensagens/enviar`
7.  **Company Profile:** `GET /api/empresa`
8.  **Contact Create:** `POST /api/contatos`
9.  **System Health:** `GET /status/api/current`
10. **Plans:** `GET /api/planos`

## 🚀 Fases de Implementação

### Fase 1: Configuração do Boilerplate
- [ ] Atualizar `src/__tests__/setup.js` para incluir mocks globais de Redis e PG.
- [ ] Criar utilitário `src/__tests__/utils/auth-helper.js` para gerar tokens de teste.

### Fase 2: Implementação dos Testes (Bloco A - Auth & Base)
- [ ] `auth.test.js`: Rotas 1 e 2.
- [ ] `users.test.js`: Rota 3.
- [ ] `system.test.js`: Rotas 7, 9 e 10.

### Fase 3: Implementação dos Testes (Bloco B - WhatsApp & CRM)
- [ ] `instance.test.js`: Rotas 4 e 5.
- [ ] `messages.test.js`: Rota 6.
- [ ] `contacts.test.js`: Rota 8.

### Fase 4: Verificação e Auditoria
- [ ] Executar `npm test`.
- [ ] Verificar cobertura de código.
- [ ] Executar script de lint da skill `clean-code`.

## ⚠️ Considerações de Segurança
- Nunca utilizar credenciais reais nos testes.
- Garantir que `process.env.NODE_ENV === 'test'` impeça escritas acidentais em produção.
