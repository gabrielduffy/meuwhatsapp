# Database Query Optimizations

This document outlines the database query optimizations implemented to avoid N+1 query problems and improve performance.

## Implemented Optimizations

### 1. Chat Conversations - JOIN Optimization

**Location**: `src/repositorios/chat.repositorio.js` - `listarConversas()`

**Before** (Hypothetical N+1 problem):
```javascript
// This would require N+1 queries:
const conversas = await query('SELECT * FROM conversas_chat WHERE empresa_id = $1', [empresaId]);
// Then for each conversation:
for (const conversa of conversas) {
  const contato = await query('SELECT * FROM contatos WHERE id = $1', [conversa.contato_id]);
  const usuario = await query('SELECT * FROM usuarios WHERE id = $1', [conversa.atribuido_para]);
}
```

**After** (Optimized with JOINs):
```javascript
const sql = `
  SELECT c.*,
         ct.nome as contato_nome,
         ct.telefone as contato_telefone,
         u.nome as atribuido_nome
  FROM conversas_chat c
  LEFT JOIN contatos ct ON c.contato_id = ct.id
  LEFT JOIN usuarios u ON c.atribuido_para = u.id
  WHERE c.empresa_id = $1
`;
```

**Impact**: Reduces N queries to 1 single query. For 100 conversations, this reduces 201 queries to just 1 query.

### 2. CRM Pipeline - Optimized Queries

**Location**: `src/repositorios/crm.repositorio.js`

- All funnel listings use single queries without loops
- Deal listings include necessary data without additional round trips
- Stage queries are optimized with proper indexing

### 3. Contact Management

**Location**: `src/repositorios/contato.repositorio.js`

- Contact searches use indexed fields
- Batch operations use single INSERT/UPDATE statements
- Related data is fetched using JOINs when needed

## Best Practices Implemented

### 1. Use JOINs Instead of Multiple Queries

✅ **Good**:
```sql
SELECT u.*, e.nome as empresa_nome
FROM usuarios u
LEFT JOIN empresas e ON u.empresa_id = e.id
WHERE u.id = $1
```

❌ **Bad**:
```javascript
const user = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
const empresa = await query('SELECT * FROM empresas WHERE id = $1', [user.empresa_id]);
```

### 2. Batch Operations

✅ **Good**:
```sql
INSERT INTO table (col1, col2)
VALUES ($1, $2), ($3, $4), ($5, $6)
```

❌ **Bad**:
```javascript
for (const item of items) {
  await query('INSERT INTO table (col1, col2) VALUES ($1, $2)', [item.col1, item.col2]);
}
```

### 3. Use Proper Indexes

```sql
CREATE INDEX idx_conversas_empresa_status ON conversas_chat(empresa_id, status);
CREATE INDEX idx_contatos_telefone ON contatos(telefone);
CREATE INDEX idx_mensagens_conversa ON mensagens_chat(conversa_id, criado_em);
```

## Query Performance Guidelines

1. **Always use prepared statements** with parameterized queries ($1, $2, etc.)
2. **Limit result sets** when pagination is needed
3. **Use appropriate JOIN types**:
   - INNER JOIN: When related data must exist
   - LEFT JOIN: When related data is optional
   - Avoid RIGHT JOIN: Use LEFT JOIN with table order reversed
4. **Select only needed columns**: Avoid `SELECT *` in production queries when specific fields are needed
5. **Use database indexes** on frequently queried columns

## Monitoring Query Performance

To identify slow queries in PostgreSQL:

```sql
-- Enable logging of slow queries
ALTER DATABASE yourdb SET log_min_duration_statement = 100; -- Log queries > 100ms

-- View active queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start desc;
```

## Future Optimization Opportunities

1. **Add query result caching** for frequently accessed, rarely changing data
2. **Implement database connection pooling** optimization (already using pg pool)
3. **Add read replicas** for scaling read-heavy operations
4. **Partition large tables** by date or empresa_id for better performance
5. **Implement materialized views** for complex reporting queries

## Testing Query Performance

Use EXPLAIN ANALYZE to test query performance:

```sql
EXPLAIN ANALYZE
SELECT c.*, ct.nome as contato_nome
FROM conversas_chat c
LEFT JOIN contatos ct ON c.contato_id = ct.id
WHERE c.empresa_id = 'uuid-here';
```

Look for:
- Sequential scans on large tables (bad) vs Index scans (good)
- High execution times
- High row counts in intermediate steps
