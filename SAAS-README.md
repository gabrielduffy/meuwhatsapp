# 🚀 WhatsBenemax SaaS - PARTE 1: BASE SAAS

## ✅ O QUE FOI IMPLEMENTADO

### 1. Schema SQL Completo
- ✅ Tabelas multi-tenant (empresas, usuários, planos)
- ✅ Sistema de autenticação (sessões, tokens)
- ✅ Gestão de créditos e transações
- ✅ Afiliados e comissões
- ✅ Pagamentos (integração Asaas)
- ✅ Notificações
- ✅ White label (domínios personalizados)

### 2. Utilitários
- ✅ JWT (geração e verificação de tokens)
- ✅ Senha (hash, comparação, validação)
- ✅ Email (SMTP, templates)
- ✅ Validadores (email, CPF, CNPJ, slug, etc)

### 3. Repositórios
- ✅ usuarioRepositorio (CRUD completo)
- ✅ empresaRepositorio (CRUD + créditos)
- ✅ sessaoRepositorio (refresh tokens)

### 4. Serviços
- ✅ autenticacaoServico (cadastro, login, recuperação de senha)

### 5. Middlewares
- ✅ autenticacao (verificar JWT)
- ✅ permissoes (controle de acesso baseado em funções)
- ✅ creditos (verificar saldo)
- ✅ empresa (multi-tenant, limites de plano)

### 6. Rotas
- ✅ `/api/autenticacao/cadastrar` - Cadastrar empresa+usuário
- ✅ `/api/autenticacao/entrar` - Login
- ✅ `/api/autenticacao/atualizar-token` - Refresh token
- ✅ `/api/autenticacao/sair` - Logout
- ✅ `/api/autenticacao/esqueci-senha` - Recuperar senha
- ✅ `/api/autenticacao/redefinir-senha` - Redefinir senha
- ✅ `/api/autenticacao/verificar/:token` - Verificar email
- ✅ `/api/autenticacao/eu` - Dados do usuário autenticado
- ✅ `/api/autenticacao/alterar-senha` - Alterar senha

---

## 🔑 COMO USAR

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Crie um arquivo `.env`:
```env
# Banco
URL_BANCO=postgresql://usuario:senha@localhost:5432/whatsbenemax

# Redis
URL_REDIS=redis://localhost:6379

# JWT
JWT_SEGREDO=sua-chave-super-secreta
JWT_EXPIRA_EM=15m
JWT_ATUALIZACAO_EXPIRA_EM=7d

# Email (SMTP)
SMTP_SERVIDOR=smtp.gmail.com
SMTP_PORTA=587
SMTP_USUARIO=seu@email.com
SMTP_SENHA=sua-senha-app
SMTP_REMETENTE=WhatsBenemax <noreply@whatsbenemax.com>

# URLs
URL_APP=http://localhost:3000
```

### 3. Iniciar servidor
```bash
npm start
```

As tabelas serão criadas automaticamente na primeira execução!

---

## 📖 EXEMPLOS DE USO

### Cadastrar nova empresa
```bash
POST /api/autenticacao/cadastrar
{
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "senha": "Senha123",
  "nomeEmpresa": "Minha Empresa Ltda",
  "codigoAfiliado": "AFILIADO123"
}
```

Resposta:
```json
{
  "usuario": {
    "id": "uuid...",
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "funcao": "empresa"
  },
  "empresa": {
    "id": "uuid...",
    "nome": "Minha Empresa Ltda",
    "slug": "minha-empresa-ltda"
  },
  "mensagem": "Cadastro realizado! Verifique seu email..."
}
```

### Fazer login
```bash
POST /api/autenticacao/entrar
{
  "email": "joao@empresa.com",
  "senha": "Senha123"
}
```

Resposta:
```json
{
  "tokenAcesso": "eyJhbGciOiJIUzI1NiIs...",
  "tokenAtualizacao": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { ... },
  "empresa": {
    "id": "uuid...",
    "nome": "Minha Empresa Ltda",
    "saldo_creditos": 1000
  }
}
```

### Usar API autenticada
```bash
GET /api/autenticacao/eu
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 🎯 FUNÇÕES DE USUÁRIO

### 1. `administrador`
- Administrador do sistema (você)
- Acesso total a tudo

### 2. `empresa`
- Dono da empresa/tenant
- Gerencia sua empresa, usuários, instâncias

### 3. `afiliado`
- Afiliado que revende
- Visualiza clientes e comissões

### 4. `usuario`
- Atendente/operador
- Usa o chat, CRM, etc

---

## 💰 SISTEMA DE CRÉDITOS

Cada empresa tem um saldo de créditos que é debitado ao usar funcionalidades:
- Mensagem enviada: 1 crédito
- Resposta do Agente IA: 10 créditos + tokens
- Mensagem de prospecção: 1 crédito

Verificar créditos antes de ação:
```javascript
const { verificarCreditos } = require('./middlewares/creditos');

router.post('/enviar', verificarCreditos(10), async (req, res) => {
  // Ação que consome 10 créditos
});
```

---

## 🔐 MULTI-TENANT

Todas as queries devem filtrar por `empresa_id`:
```javascript
const { garantirMultiTenant } = require('./middlewares/empresa');

router.get('/contatos', garantirMultiTenant, async (req, res) => {
  const empresaId = req.empresaId; // Injetado pelo middleware
  // Buscar apenas contatos desta empresa
});
```

---

## 📋 PRÓXIMOS PASSOS (PARTE 2 e 3)

### PARTE 2 - Agente IA + Prospecção
- [ ] Tabelas de Agente IA
- [ ] Integração com Groq
- [ ] Sistema de prospecção
- [ ] Fila de disparos com Bull

### PARTE 3 - Chat + Integrações
- [ ] Chat em tempo real (Socket.io)
- [ ] Webhooks
- [ ] White-label completo
- [ ] Painel de administrador

---

## 🛠️ ARQUIVOS CRIADOS

```
src/
├── config/
│   └── saas-schema.sql                 ✅
├── utilitarios/
│   ├── jwt.js                          ✅
│   ├── senha.js                        ✅
│   ├── email.js                        ✅
│   └── validadores.js                  ✅
├── repositorios/
│   ├── usuario.repositorio.js          ✅
│   ├── empresa.repositorio.js          ✅
│   └── sessao.repositorio.js           ✅
├── servicos/
│   └── autenticacao.servico.js         ✅
├── middlewares/
│   ├── autenticacao.js                 ✅
│   ├── permissoes.js                   ✅
│   ├── creditos.js                     ✅
│   └── empresa.js                      ✅
└── rotas/
    └── autenticacao.rotas.js           ✅
```

---

## 🎉 SISTEMA SAAS BASE FUNCIONANDO!

O sistema já está funcional e pronto para receber as próximas partes (Agente IA, Prospecção, Chat).

**Teste agora:** Cadastre-se, faça login e veja seu saldo de créditos!
