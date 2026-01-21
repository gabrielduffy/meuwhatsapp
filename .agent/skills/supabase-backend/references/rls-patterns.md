# RLS Patterns - Guia Detalhado

## Conceitos Fundamentais

### USING vs WITH CHECK
- `USING`: Filtra quais rows podem ser lidas/modificadas
- `WITH CHECK`: Valida novos dados em INSERT/UPDATE

```sql
-- SELECT usa apenas USING
CREATE POLICY "select" ON items FOR SELECT USING (user_id = auth.uid());

-- INSERT usa apenas WITH CHECK
CREATE POLICY "insert" ON items FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE usa ambos
CREATE POLICY "update" ON items FOR UPDATE 
  USING (user_id = auth.uid())        -- quais rows podem ser atualizadas
  WITH CHECK (user_id = auth.uid());  -- valida os novos valores
```

---

## Patterns Comuns

### 1. Ownership Simples
```sql
-- Usuário acessa apenas seus dados
CREATE POLICY "owner_access" ON items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. Dados Públicos + Privados
```sql
-- Todos podem ver itens públicos
CREATE POLICY "public_read" ON items
  FOR SELECT
  USING (is_public = true);

-- Owner pode ver todos os seus
CREATE POLICY "owner_read" ON items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas owner pode modificar
CREATE POLICY "owner_write" ON items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3. Membership (Teams/Organizations)
```sql
-- Usuários acessam dados de suas orgs
CREATE POLICY "org_access" ON projects
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members 
      WHERE user_id = auth.uid()
    )
  );
```

### 4. Role-Based Access
```sql
-- Verificar role do usuário na org
CREATE POLICY "admin_only" ON sensitive_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = sensitive_data.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );
```

### 5. Hierarquia (Parent-Child)
```sql
-- Acesso a comentários se tem acesso ao post
CREATE POLICY "comments_access" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
        AND (posts.is_public = true OR posts.user_id = auth.uid())
    )
  );
```

### 6. Time-Based Access
```sql
-- Acesso apenas durante período válido
CREATE POLICY "subscription_access" ON premium_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.user_id = auth.uid()
        AND subscriptions.expires_at > now()
    )
  );
```

---

## Patterns Avançados

### Security Definer Functions
Para lógica complexa, usar functions:

```sql
-- Function que verifica acesso
CREATE OR REPLACE FUNCTION public.can_access_project(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = $1
      AND project_members.user_id = auth.uid()
      AND project_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Usar na política
CREATE POLICY "project_access" ON tasks
  FOR ALL
  USING (public.can_access_project(project_id));
```

### JWT Claims Customizados
```sql
-- Acessar claims do JWT
CREATE POLICY "by_role" ON admin_data
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Verificar email verificado
CREATE POLICY "verified_only" ON sensitive
  FOR ALL
  USING (
    (auth.jwt() -> 'email_confirmed_at') IS NOT NULL
  );
```

### Soft Delete
```sql
-- Ocultar items deletados
CREATE POLICY "hide_deleted" ON items
  FOR SELECT
  USING (deleted_at IS NULL AND user_id = auth.uid());

-- Permitir "soft delete" (update de deleted_at)
CREATE POLICY "soft_delete" ON items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (NEW.deleted_at IS NOT NULL OR OLD.deleted_at IS NULL)
  );
```

---

## Erros Comuns

### ❌ RLS Desabilitado
```sql
-- SEMPRE habilitar RLS em tabelas com dados de usuário
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Forçar RLS mesmo para table owner
ALTER TABLE items FORCE ROW LEVEL SECURITY;
```

### ❌ Política Permissiva Demais
```sql
-- ❌ NUNCA fazer isso
CREATE POLICY "allow_all" ON items FOR ALL USING (true);

-- ✅ Sempre restringir
CREATE POLICY "owner_only" ON items FOR ALL USING (auth.uid() = user_id);
```

### ❌ Esquecer WITH CHECK
```sql
-- ❌ Permite inserir para qualquer user_id
CREATE POLICY "insert" ON items FOR INSERT WITH CHECK (true);

-- ✅ Força ownership
CREATE POLICY "insert" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### ❌ Subquery Lenta
```sql
-- ❌ Subquery executada para cada row
CREATE POLICY "slow" ON items
  FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM some_big_table WHERE ...)
  );

-- ✅ Usar EXISTS com índice
CREATE POLICY "fast" ON items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.user_id = auth.uid()
        AND org_members.org_id = items.org_id
    )
  );
```

---

## Testing RLS

### Testar como usuário específico
```sql
-- Simular usuário autenticado
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Executar query
SELECT * FROM items;

-- Reset
RESET ROLE;
```

### Verificar políticas ativas
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'items';
```

---

## Bypass para Service Role

O `service_role` key bypassa RLS automaticamente. Usar apenas no backend:

```typescript
// ❌ NUNCA expor service_role no client
const supabase = createClient(url, serviceRoleKey)

// ✅ Usar apenas em Edge Functions ou backend seguro
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```
