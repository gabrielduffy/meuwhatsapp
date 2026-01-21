# Database - Guia Detalhado

## Tipos de Dados Recomendados

### IDs
```sql
-- Preferir UUID para IDs públicos
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- BIGINT para IDs internos/sequenciais
id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY
```

### Timestamps
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at TIMESTAMPTZ -- para soft delete
```

### JSON
```sql
-- JSONB para dados estruturados (mais rápido para queries)
metadata JSONB DEFAULT '{}'::jsonb

-- Validação de schema com check constraint
CONSTRAINT valid_metadata CHECK (
  metadata ? 'required_field'
)
```

### Enums
```sql
-- Criar tipo enum
CREATE TYPE status_type AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- Usar na coluna
status status_type NOT NULL DEFAULT 'pending'
```

---

## Relacionamentos

### One-to-Many
```sql
-- Posts pertence a User
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### Many-to-Many
```sql
-- Tags em Posts
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

### Self-Referencing
```sql
-- Categorias com subcategorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL
);
```

---

## Índices

### Quando Criar
- Colunas em WHERE frequentes
- Foreign keys (Supabase não cria automaticamente)
- Colunas em ORDER BY
- Colunas em JOIN

### Tipos de Índice
```sql
-- B-tree (padrão, bom para =, <, >, BETWEEN)
CREATE INDEX idx_users_email ON users(email);

-- Partial index (menor, mais rápido)
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;

-- Composite index (ordem importa!)
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

-- GIN para JSONB
CREATE INDEX idx_metadata ON items USING GIN (metadata);

-- GIN para full-text search
CREATE INDEX idx_posts_search ON posts USING GIN (to_tsvector('portuguese', title || ' ' || content));
```

---

## Functions e Triggers

### Trigger para updated_at
```sql
-- Função reutilizável
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabela
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### Function para Lógica de Negócio
```sql
CREATE OR REPLACE FUNCTION public.increment_view_count(item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.items
  SET view_count = view_count + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger para Audit Log
```sql
CREATE OR REPLACE FUNCTION public.audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migrations

### Estrutura de Arquivo
```sql
-- migrations/20240101000000_create_items.sql

-- Up
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own items"
  ON public.items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### Alterações Seguras
```sql
-- Adicionar coluna (seguro)
ALTER TABLE items ADD COLUMN description TEXT;

-- Adicionar coluna NOT NULL (requer default)
ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Renomear coluna (cuidado com código existente)
ALTER TABLE items RENAME COLUMN name TO title;

-- Remover coluna (irreversível!)
ALTER TABLE items DROP COLUMN old_column;
```

---

## Queries Otimizadas

### Paginação Eficiente
```sql
-- ❌ Ruim para tabelas grandes
SELECT * FROM items ORDER BY created_at LIMIT 10 OFFSET 1000;

-- ✅ Cursor-based pagination
SELECT * FROM items 
WHERE created_at < $1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Evitar N+1
```sql
-- ❌ N+1 queries
SELECT * FROM posts;
-- Loop: SELECT * FROM users WHERE id = post.user_id;

-- ✅ JOIN ou subquery
SELECT 
  posts.*,
  users.name as author_name
FROM posts
JOIN auth.users ON posts.user_id = users.id;
```

### Aggregations
```sql
-- Contagem com filtro
SELECT 
  status,
  COUNT(*) as total
FROM items
WHERE user_id = auth.uid()
GROUP BY status;

-- Stats em uma query
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM items
WHERE user_id = auth.uid();
```

---

## Problemas Comuns

### Connection Pooling
- Usar `?pgbouncer=true` na connection string para serverless
- Limitar conexões em Edge Functions

### Timeouts
```sql
-- Definir timeout para queries longas
SET statement_timeout = '30s';
```

### Locks
```sql
-- Verificar locks ativos
SELECT * FROM pg_locks WHERE NOT granted;

-- SELECT FOR UPDATE com cuidado
SELECT * FROM items WHERE id = $1 FOR UPDATE NOWAIT;
```
