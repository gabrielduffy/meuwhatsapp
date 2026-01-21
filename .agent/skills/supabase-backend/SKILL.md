---
name: Supabase Backend
description: Skill especializada em desenvolvimento backend com Supabase. Use quando o usuário trabalhar com Supabase, PostgreSQL via Supabase, Edge Functions, Row Level Security (RLS), políticas de acesso, autenticação (auth), storage, realtime, tabelas, colunas, migrations, triggers, functions, ou qualquer integração com Supabase. Também ativa para revisão, otimização e debugging de código Supabase existente.
---

# Supabase Backend

Skill para desenvolvimento, revisão e otimização de backends com Supabase.

## Áreas de Atuação

### 1. Database (PostgreSQL)
- Criação e alteração de tabelas
- Relacionamentos e foreign keys
- Índices e otimização de queries
- Migrations
- Triggers e Functions

### 2. Row Level Security (RLS)
- Políticas de SELECT, INSERT, UPDATE, DELETE
- Políticas baseadas em auth.uid()
- Políticas com JOINs e subqueries
- Bypass para service_role

### 3. Edge Functions (Deno)
- Estrutura e deploy
- Integração com banco
- Secrets e variáveis de ambiente
- CORS e headers
- Invocação client-side

### 4. Autenticação
- Providers (email, OAuth, magic link)
- Custom claims
- Hooks de auth
- Session management

### 5. Storage
- Buckets e políticas
- Upload/download
- Transformações de imagem
- URLs públicas vs signed

### 6. Realtime
- Subscriptions
- Broadcast
- Presence

---

## Checklist de Revisão

### Database
- [ ] Tabelas têm primary key (preferencialmente UUID)
- [ ] Foreign keys definidas com ON DELETE apropriado
- [ ] Índices em colunas de busca frequente
- [ ] Timestamps (created_at, updated_at) com defaults
- [ ] Soft delete quando apropriado (deleted_at)

### RLS
- [ ] RLS habilitado em TODAS as tabelas com dados sensíveis
- [ ] Política de SELECT para leitura
- [ ] Política de INSERT com validação de ownership
- [ ] Política de UPDATE restrita ao owner
- [ ] Política de DELETE restrita ao owner
- [ ] Testado com diferentes roles (anon, authenticated, service_role)

### Edge Functions
- [ ] Validação de input (Zod ou similar)
- [ ] Error handling apropriado
- [ ] CORS configurado
- [ ] Rate limiting considerado
- [ ] Secrets não expostos no código

### Auth
- [ ] Redirect URLs configuradas
- [ ] Email templates customizados
- [ ] Políticas de senha adequadas
- [ ] Session timeout apropriado

---

## Padrões Recomendados

### Estrutura de Tabela Base
```sql
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- campos específicos
);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### RLS Padrão para Tabela de Usuário
```sql
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seus itens
CREATE POLICY "Users can view own items"
  ON public.items FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário insere apenas para si
CREATE POLICY "Users can insert own items"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário atualiza apenas seus itens
CREATE POLICY "Users can update own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuário deleta apenas seus itens
CREATE POLICY "Users can delete own items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);
```

### Edge Function Base
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Sua lógica aqui

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
```

---

## Referências Detalhadas

- **Database e SQL**: Ver [references/database.md](references/database.md)
- **RLS Avançado**: Ver [references/rls-patterns.md](references/rls-patterns.md)
- **Edge Functions**: Ver [references/edge-functions.md](references/edge-functions.md)
- **Auth Patterns**: Ver [references/auth-patterns.md](references/auth-patterns.md)

---

## Formato de Resposta

### Para Revisões de Código

```
## Análise: [Nome do recurso]

**Tipo:** [Table/RLS/Edge Function/etc.]
**Risco de Segurança:** [Alto/Médio/Baixo/Nenhum]

### Problemas Encontrados

#### 🔴 Segurança (corrigir imediatamente)
1. [problema] → [solução]

#### 🟡 Performance/Boas Práticas
1. [problema] → [solução]

#### 🟢 Sugestões
1. [melhoria]

### Código Corrigido
[código SQL/TypeScript com correções]
```

---

## Comandos Rápidos

- `/supa-audit` - Auditoria completa de segurança
- `/supa-rls` - Gerar políticas RLS para tabela
- `/supa-edge` - Criar Edge Function base
- `/supa-migration` - Gerar migration SQL
- `/supa-schema` - Visualizar/documentar schema
