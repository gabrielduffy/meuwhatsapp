# Frontend React + TypeScript

## Stack Moderna

✅ **React 18** - Framework UI
✅ **TypeScript** - Tipagem estática
✅ **Vite** - Build tool ultra rápido (substitui CRA)
✅ **TailwindCSS** - Styling moderno
✅ **React Router** - Roteamento
✅ **Axios** - HTTP client
✅ **Lucide React** - Ícones modernos

---

## Por que React?

### ❌ Problemas do HTML puro:
- Código duplicado (sidebar, header em cada página)
- Difícil de debugar
- Sem hot reload
- Sem TypeScript
- Sem componentes reutilizáveis
- JavaScript vanilla difícil de manter

### ✅ Benefícios do React:
- **Componentes reutilizáveis** - Escreve uma vez, usa em todo lugar
- **TypeScript** - Pega erros antes de rodar
- **Hot Reload** - Atualiza instantâneo sem refresh
- **Debugging fácil** - React DevTools mostra tudo
- **Ecossistema moderno** - Libraries testadas por milhões
- **Performance** - Virtual DOM otimizado

---

## Estrutura

```
frontend/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   │   └── Layout.tsx   # Sidebar + Header
│   ├── pages/           # Páginas da aplicação
│   │   └── Conversas.tsx
│   ├── lib/             # Utilitários
│   │   └── api.ts       # Cliente HTTP
│   ├── hooks/           # React hooks customizados
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Router principal
│   └── main.tsx         # Entry point
├── package.json
├── vite.config.ts       # Config Vite
└── tailwind.config.js   # Config Tailwind
```

---

## Como Rodar

### 1. Backend (API)
```bash
npm start
# Roda em: http://localhost:3000
```

### 2. Frontend (React)
```bash
cd frontend
npm install  # Primeira vez
npm run dev
# Acessa: http://localhost:5173
```

O Vite faz **proxy automático**:
- `http://localhost:5173/api/*` → `http://localhost:3000/api/*`
- Sem CORS issues

---

## Páginas Implementadas

### ✅ Conversas (Chat WhatsApp)
**Path:** `/conversas`
**Features:**
- Lista de conversas com busca
- Interface split (lista + chat)
- Mensagens em tempo real
- Auto-scroll para última mensagem
- Avatares com iniciais
- Timestamps formatados
- Mobile responsivo
- Dark mode

### 🔄 Próximas (migrar do HTML):
- Dashboard
- Usuários
- Empresas
- CRM
- Agentes IA
- etc.

---

## Desenvolvimento

### Adicionar Nova Página

1. **Criar arquivo** `src/pages/NomeDaPagina.tsx`:
```tsx
export default function NomeDaPagina() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Título</h1>
      {/* Conteúdo */}
    </div>
  );
}
```

2. **Adicionar rota** em `App.tsx`:
```tsx
<Route path="/nome" element={<NomeDaPagina />} />
```

3. **Adicionar ao menu** em `components/Layout.tsx`:
```tsx
{ label: 'Nome', path: '/nome', icon: IconComponent }
```

### Fazer Request API

```tsx
import api from '../lib/api';

const { data } = await api.get('/endpoint');
await api.post('/endpoint', { dados });
```

### Usar TailwindCSS

```tsx
<div className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
  Botão
</div>
```

---

## Versionamento

### Instalado:
- **React:** 18.3.1
- **TypeScript:** 5.6.2
- **Vite:** 6.2.0
- **TailwindCSS:** 3.4.17
- **React Router:** 7.1.3
- **Axios:** 1.7.9

### Equivalente Lovable:
O stack é idêntico ao que Lovable usa! 🎯

---

## Build para Produção

```bash
cd frontend
npm run build
# Output: dist/
```

Servir o build:
```bash
npm run preview
```

---

## Comparação: HTML vs React

### HTML Puro (antigo):
```html
<!-- usuarios.html -->
<script>
const Users = {
  async loadUsers() {
    const response = await API.get('/api/usuarios');
    this.renderTable();
  },
  renderTable() {
    document.getElementById('table').innerHTML = `...`;
  }
};
Users.init();
</script>
```

### React + TypeScript (novo):
```tsx
// Usuarios.tsx
import { useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await api.get<User[]>('/api/usuarios');
    setUsers(data);
  };

  return (
    <div>
      <h1>Usuários</h1>
      <table>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

**Benefícios:**
- ✅ TypeScript pega erros de tipo
- ✅ Hooks gerenciam estado automaticamente
- ✅ JSX é mais legível que template strings
- ✅ Hot reload atualiza sem refresh
- ✅ React DevTools mostra estado em tempo real

---

## Próximos Passos

1. ✅ Conversas - FEITO
2. ⏳ Migrar Usuários para React
3. ⏳ Migrar Empresas para React
4. ⏳ Migrar CRM para React
5. ⏳ Adicionar React Query (cache automático)
6. ⏳ Adicionar Zustand (state management)
7. ⏳ Testes com Vitest

---

## Dúvidas?

- **Vite não inicia?** → Rode `npm install` primeiro
- **Erro CORS?** → Backend deve estar rodando na porta 3000
- **TypeScript errors?** → VS Code com extensão TypeScript
- **Tailwind não funciona?** → Restart do Vite (`Ctrl+C` → `npm run dev`)

---

**Tudo funciona como Lovable agora! 🚀**
