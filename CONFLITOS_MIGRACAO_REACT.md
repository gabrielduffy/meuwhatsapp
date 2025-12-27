# Documentação de Conflitos: Migração HTML → React

## ⚠️ Conflitos Críticos Identificados

### 1. **Rotas/Endpoints da API**

#### Problema:
O backend possui **rotas duplicadas** em português e inglês, causando inconsistência.

**Locais afetados:**
- `/src/rotas/` - Rotas em português (autenticacao.js, usuarios.js, empresas.js, etc.)
- `/src/routes/` - Rotas em inglês (auth.js, users.js, companies.js, etc.)

**Conflito:**
- React consome `/api/usuarios` mas backend pode estar servindo `/api/users`
- Algumas rotas existem apenas em um idioma
- Dificulta manutenção e debugging

**Solução:**
```javascript
// ANTES (Duplicado)
rotas/usuarios.js → /api/usuarios
routes/users.js → /api/users

// DEPOIS (Unificado)
routes/usuarios.js → /api/usuarios (padrão único em português)
```

**Impacto:** 🔴 ALTO - Pode quebrar chamadas de API

---

### 2. **Autenticação e Tokens**

#### Problema:
HTML usa `localStorage.getItem('auth_token')`, React também, mas **nomes podem variar**.

**Conflito:**
```javascript
// HTML antigo
localStorage.getItem('token')
localStorage.getItem('auth_token')
localStorage.getItem('user')

// React novo
localStorage.getItem('auth_token') // Padronizado
```

**Solução:**
```typescript
// frontend/src/lib/auth.ts
export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';

export const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
```

**Impacto:** 🔴 ALTO - Usuários podem ser deslogados após migração

**Migração necessária:**
```javascript
// Script de migração (executar uma vez)
const oldToken = localStorage.getItem('token');
if (oldToken && !localStorage.getItem('auth_token')) {
  localStorage.setItem('auth_token', oldToken);
  localStorage.removeItem('token');
}
```

---

### 3. **Formatos de Resposta da API**

#### Problema:
Backend retorna dados em **formatos inconsistentes**.

**Exemplos encontrados:**
```javascript
// Formato 1: Dados direto
GET /api/usuarios → { usuarios: [...] }

// Formato 2: Dados no root
GET /api/usuarios → [...]

// Formato 3: Com metadados
GET /api/usuarios → {
  success: true,
  data: { usuarios: [...] },
  total: 100
}
```

**Conflito no React:**
```typescript
// Código atual precisa lidar com 3 formatos
const { data } = await api.get('/usuarios');
const userList = data.usuarios || data.data?.usuarios || data || [];
```

**Solução:**
Padronizar backend para **SEMPRE** retornar:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Exemplo
GET /api/usuarios → {
  success: true,
  data: {
    usuarios: [...],
    total: 100,
    pagina: 1
  }
}
```

**Impacto:** 🟡 MÉDIO - Funciona mas é confuso

---

### 4. **CORS e Proxy**

#### Problema:
**Desenvolvimento:** React (port 5173) → Vite Proxy → Backend (port 3000)
**Produção:** Frontend e Backend no mesmo domínio

**Conflito:**
```javascript
// DEV: http://localhost:5173/api/usuarios → proxy → http://localhost:3000/api/usuarios
// PROD: https://app.whatsbenemax.com/api/usuarios (sem proxy)
```

**Configuração necessária no backend:**
```javascript
// src/server.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.whatsbenemax.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Impacto:** 🔴 ALTO - Bloqueio total em produção se não configurado

---

### 5. **WebSocket/Socket.io**

#### Problema:
HTML conecta Socket.io diretamente, React precisa de **namespace** diferente.

**Conflito:**
```javascript
// HTML antigo
const socket = io('http://localhost:3000');

// React novo (com Vite proxy)
const socket = io(); // Usa mesma origin automaticamente
```

**Configuração backend necessária:**
```javascript
// src/socket.js
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? 'https://app.whatsbenemax.com'
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  path: '/socket.io', // Path padrão
  transports: ['websocket', 'polling']
});
```

**Impacto:** 🔴 ALTO - Conversas em tempo real não funcionam

---

### 6. **Upload de Arquivos**

#### Problema:
HTML usa `FormData` com `<form>`, React precisa **manual FormData**.

**Conflito:**
```javascript
// HTML antigo (funciona automático)
<form enctype="multipart/form-data">
  <input type="file" name="arquivo" />
</form>

// React novo (precisa criar FormData)
const formData = new FormData();
formData.append('arquivo', file);
await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Backend esperando:**
```javascript
// Espera campo com nome 'arquivo'
upload.single('arquivo')
// Mas React pode estar enviando 'file' ou 'image'
```

**Solução:**
Padronizar nomes de campos:
```typescript
// frontend/src/lib/upload.ts
export const uploadFile = async (file: File, fieldName = 'arquivo') => {
  const formData = new FormData();
  formData.append(fieldName, file);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

**Impacto:** 🟡 MÉDIO - Upload de logo, anexos quebram

---

### 7. **Validação de Dados**

#### Problema:
HTML faz validação **client-side mínima**, backend **não valida** tudo.

**Conflito:**
```typescript
// React com TypeScript + Zod (validação forte)
const userSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  senha: z.string().min(8)
});

// Backend atual (validação fraca ou ausente)
if (!req.body.nome) {
  return res.status(400).json({ error: 'Nome obrigatório' });
}
// Não valida formato de email, tamanho de senha, etc.
```

**Solução:**
Adicionar Zod no backend também:
```javascript
// backend/src/validators/usuario.js
const { z } = require('zod');

const criarUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  funcao: z.enum(['administrador', 'empresa', 'usuario', 'afiliado'])
});

const validateBody = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      errors: error.errors.map(e => e.message)
    });
  }
};

module.exports = { criarUsuarioSchema, validateBody };
```

**Impacto:** 🟡 MÉDIO - Dados inválidos podem quebrar sistema

---

### 8. **Estado Global (Dark Mode, User)**

#### Problema:
HTML usa `localStorage` direto, React precisa **gerenciamento de estado**.

**Conflito:**
```javascript
// HTML antigo (localStorage direto)
document.body.classList.toggle('dark');
localStorage.setItem('darkMode', 'true');

// React novo (precisa useState + useEffect)
const [darkMode, setDarkMode] = useState(
  localStorage.getItem('darkMode') === 'true'
);

useEffect(() => {
  localStorage.setItem('darkMode', darkMode.toString());
  document.body.classList.toggle('dark', darkMode);
}, [darkMode]);
```

**Solução (com Zustand):**
```typescript
// frontend/src/store/useStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  darkMode: boolean;
  user: User | null;
  toggleDarkMode: () => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      darkMode: true,
      user: null,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'app-storage' }
  )
);
```

**Impacto:** 🟢 BAIXO - Apenas UX inconsistente

---

### 9. **Redirecionamentos e Navegação**

#### Problema:
HTML usa `window.location.href`, React usa **React Router**.

**Conflito:**
```javascript
// HTML antigo (reload completo da página)
window.location.href = '/dashboard';

// React novo (SPA - sem reload)
navigate('/dashboard');
```

**Consequências:**
- HTML: Perde estado, recarrega tudo
- React: Mantém estado, navegação instantânea

**Mas atenção:**
```typescript
// Logout DEVE recarregar para limpar tudo
const handleLogout = () => {
  clearAuth();
  window.location.href = '/login'; // ✅ Correto (força reload)
  // navigate('/login'); // ❌ Errado (mantém estado antigo)
};
```

**Impacto:** 🟢 BAIXO - Apenas mudança de comportamento

---

### 10. **Paginação e Query Params**

#### Problema:
HTML usa **query params** na URL, React precisa **React Router search params**.

**Conflito:**
```javascript
// HTML antigo
window.location.search = '?page=2&limit=50';

// React novo
const [searchParams, setSearchParams] = useSearchParams();
searchParams.set('page', '2');
searchParams.set('limit', '50');
setSearchParams(searchParams);
```

**Backend esperando:**
```javascript
// GET /api/usuarios?page=2&limit=50
const { page = 1, limit = 20 } = req.query;
```

**Impacto:** 🟢 BAIXO - Funciona em ambos

---

## 📊 Mapeamento Completo: HTML → React

### Páginas Migradas

| Página HTML | Rota HTML | Rota React | Status | API Endpoints |
|-------------|-----------|------------|--------|---------------|
| `index.html` | `/` | `/dashboard` | ✅ Migrado | - |
| `usuarios.html` | `/admin/usuarios` | `/usuarios` | ✅ Migrado | GET/POST/PUT/DELETE `/api/usuarios` |
| `empresas.html` | `/admin/empresas` | `/empresas` | ✅ Migrado | GET/PUT `/api/empresa/*` |
| `conversas.html` | `/admin/conversas` | `/conversas` | ✅ Migrado | GET `/api/conversas/*` |
| `agentes-ia.html` | `/admin/agentes-ia` | `/agentes-ia` | ⏳ Pendente | GET/POST/PUT/DELETE `/api/agentes` |
| `crm.html` | `/admin/crm` | `/crm` | ⏳ Pendente | GET/POST/PUT/DELETE `/api/crm/*` |
| `integracoes.html` | `/admin/integracoes` | `/integracoes` | ⏳ Pendente | GET/POST/PUT/DELETE `/api/integracoes` |
| `followup.html` | `/admin/followup` | `/followup` | ⏳ Pendente | GET/POST/PUT/DELETE `/api/followup` |

### Endpoints da API Afetados

| Endpoint Backend | Método | Usado em | Conflito? | Ação Necessária |
|------------------|--------|----------|-----------|-----------------|
| `/api/usuarios` | GET | Usuários | ❌ Não | - |
| `/api/usuarios` | POST | Usuários | ❌ Não | Adicionar validação Zod |
| `/api/usuarios/:id` | PUT | Usuários | ❌ Não | Adicionar validação Zod |
| `/api/usuarios/:id` | DELETE | Usuários | ❌ Não | - |
| `/api/usuarios/:id/desativar` | POST | Usuários | ❌ Não | - |
| `/api/usuarios/:id/ativar` | POST | Usuários | ❌ Não | - |
| `/api/usuarios/:id/redefinir-senha` | POST | Usuários | ❌ Não | - |
| `/api/empresa` | GET | Empresas | ❌ Não | - |
| `/api/empresa` | PUT | Empresas | ❌ Não | Adicionar validação Zod |
| `/api/empresa/plano` | GET | Empresas | ❌ Não | - |
| `/api/empresa/uso` | GET | Empresas | ❌ Não | - |
| `/api/empresa/creditos` | GET | Empresas | ❌ Não | - |
| `/api/empresa/transacoes` | GET | Empresas | ❌ Não | - |
| `/api/empresa/whitelabel` | PUT | Empresas | ❌ Não | Adicionar validação Zod |
| `/api/conversas` | GET | Conversas | ❌ Não | - |
| `/api/conversas/:id/mensagens` | GET | Conversas | ❌ Não | - |

---

## 🔧 Checklist de Migração

### Backend (Node.js + Express)

- [ ] **Consolidar rotas duplicadas** (`/src/rotas` → `/src/routes`)
- [ ] **Adicionar CORS** para React dev server (port 5173)
- [ ] **Padronizar formato de resposta** da API
  ```javascript
  { success: boolean, data: T, message?: string, errors?: string[] }
  ```
- [ ] **Adicionar validação Zod** em todas as rotas POST/PUT
- [ ] **Configurar Socket.io** para CORS do React
- [ ] **Padronizar nomes de campos** em uploads (`arquivo`)
- [ ] **Adicionar TypeScript** gradualmente (opcional mas recomendado)
- [ ] **Gerar Swagger docs** para documentar API

### Frontend (React + TypeScript)

- [x] **Criar lib/api.ts** com interceptors de auth
- [x] **Criar lib/auth.ts** para gerenciar tokens
- [ ] **Adicionar Zustand** para estado global
- [x] **Configurar React Router** com todas as rotas
- [x] **Criar componentes UI** reutilizáveis
- [x] **Migrar páginas** uma por uma
- [ ] **Adicionar React Query** para cache de API
- [ ] **Configurar Socket.io** client para conversas
- [ ] **Adicionar testes** com Vitest
- [ ] **Build otimizado** para produção

### Database (PostgreSQL)

- [ ] **Revisar schema** para inconsistências
- [ ] **Adicionar migrations** com Knex ou Prisma
- [ ] **Otimizar queries** lentas
- [ ] **Adicionar índices** em colunas de busca
- [ ] **Normalizar dados** duplicados

---

## 🚀 Estratégia de Deploy Gradual

### Opção 1: Big Bang (NÃO RECOMENDADO)
❌ Substituir tudo de uma vez
❌ Alto risco de downtime
❌ Difícil rollback

### Opção 2: Feature Flags (RECOMENDADO)
✅ Habilitar React por usuário/empresa
✅ Testar em produção com grupo pequeno
✅ Rollback instantâneo

**Implementação:**
```javascript
// Backend
app.get('/api/feature-flags', (req, res) => {
  const userId = req.user.id;
  const useReact = process.env.REACT_BETA_USERS?.includes(userId);

  res.json({
    useReactFrontend: useReact || process.env.ENABLE_REACT === 'true'
  });
});

// Frontend (HTML)
fetch('/api/feature-flags')
  .then(res => res.json())
  .then(data => {
    if (data.useReactFrontend) {
      window.location.href = 'http://localhost:5173';
    }
  });
```

### Opção 3: Subdomínio (MAIS SEGURO)
✅ `app-react.whatsbenemax.com` para nova versão
✅ `app.whatsbenemax.com` mantém HTML
✅ Migração gradual de usuários

---

## 📈 Timeline Sugerida

### Semana 1-2: Backend
- Consolidar rotas
- Adicionar CORS
- Adicionar validação Zod
- Padronizar respostas
- Documentar com Swagger

### Semana 3-4: Frontend (Páginas Principais)
- ✅ Dashboard
- ✅ Usuários
- ✅ Empresas
- ✅ Conversas
- ⏳ CRM
- ⏳ Agentes IA

### Semana 5: Frontend (Páginas Secundárias)
- Integrações
- Follow-up
- Configurações
- Planos
- Relatórios
- etc.

### Semana 6: Testes e Deploy
- Testes de integração
- Testes E2E
- Deploy em staging
- Testes com usuários beta
- Deploy em produção com feature flag

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CORS bloqueado em produção | 🔴 Alta | 🔴 Crítico | Configurar CORS antes do deploy |
| Tokens perdidos após migração | 🟡 Média | 🔴 Crítico | Script de migração de localStorage |
| WebSocket não conecta | 🟡 Média | 🔴 Crítico | Testar Socket.io com CORS |
| Upload de arquivos quebra | 🟡 Média | 🟡 Alto | Padronizar FormData fields |
| Validação inconsistente | 🔴 Alta | 🟡 Alto | Adicionar Zod no backend |
| Queries lentas | 🟢 Baixa | 🟡 Alto | Revisar e otimizar índices |

---

## 📞 Suporte e Dúvidas

- **Backend:** Revisar `/src/routes/` e `/src/rotas/`
- **Frontend:** Ver `/frontend/README.md` e `/FRONTEND_REACT.md`
- **Migração:** Este documento + `/PLANO_COMPLETO_MIGRACAO.md`

---

**Última atualização:** 2025-12-27
