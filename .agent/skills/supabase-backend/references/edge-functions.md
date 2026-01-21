# Edge Functions - Guia Detalhado

## Estrutura de Projeto

```
supabase/
└── functions/
    ├── _shared/           # Código compartilhado
    │   ├── cors.ts
    │   ├── supabase.ts
    │   └── validation.ts
    ├── function-name/
    │   └── index.ts
    └── another-function/
        └── index.ts
```

---

## Template Base Completo

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Schema de validação
const RequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar método
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Parse e validar body
    const body = await req.json()
    const data = RequestSchema.parse(body)

    // Criar client Supabase com auth do usuário
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticação (opcional)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Lógica da função
    const result = await processData(supabase, user.id, data)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // Erro de validação
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Erro genérico
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processData(supabase: any, userId: string, data: z.infer<typeof RequestSchema>) {
  // Implementar lógica aqui
  return { processed: true }
}
```

---

## Código Compartilhado

### CORS Helper
```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
```

### Supabase Client Factory
```typescript
// supabase/functions/_shared/supabase.ts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export function createSupabaseClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )
}

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}
```

---

## Patterns Comuns

### Webhook Handler
```typescript
serve(async (req) => {
  // Verificar secret do webhook
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await req.json()
  
  // Processar webhook
  await processWebhook(payload)

  return new Response('ok', { status: 200 })
})
```

### Scheduled Function (Cron)
```typescript
// Invocada via pg_cron ou external scheduler
serve(async (req) => {
  // Verificar se é chamada autorizada
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Executar tarefa scheduled
  await cleanupOldRecords(supabaseAdmin)

  return new Response('ok')
})
```

### File Upload Handler
```typescript
serve(async (req) => {
  const formData = await req.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return new Response(
      JSON.stringify({ error: 'No file provided' }),
      { status: 400 }
    )
  }

  const supabase = createSupabaseClient(req)
  
  // Upload para Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(`${crypto.randomUUID()}-${file.name}`, file)

  if (error) throw error

  return new Response(
    JSON.stringify({ path: data.path }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## Secrets e Variáveis

### Definir Secrets
```bash
# Via CLI
supabase secrets set MY_SECRET=value

# Listar secrets
supabase secrets list
```

### Acessar no Código
```typescript
const apiKey = Deno.env.get('MY_API_KEY')

// Variáveis automáticas disponíveis:
// SUPABASE_URL
// SUPABASE_ANON_KEY
// SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_DB_URL
```

---

## Deploy

### Local Development
```bash
# Iniciar supabase local
supabase start

# Servir functions localmente
supabase functions serve

# Servir function específica
supabase functions serve my-function
```

### Deploy para Produção
```bash
# Deploy de todas as functions
supabase functions deploy

# Deploy de function específica
supabase functions deploy my-function

# Deploy com secrets
supabase functions deploy my-function --env-file .env.production
```

---

## Invocar do Client

```typescript
// Com Supabase JS Client
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { name: 'John', email: 'john@example.com' }
})

// Com fetch direto
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/my-function`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name: 'John' })
  }
)
```

---

## Erros Comuns

### ❌ CORS não configurado
```typescript
// Sempre incluir CORS headers
return new Response(data, {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

### ❌ Secrets expostos
```typescript
// ❌ NUNCA logar secrets
console.log(Deno.env.get('SERVICE_ROLE_KEY'))

// ✅ Logar apenas dados não sensíveis
console.log('Processing request for user:', userId)
```

### ❌ Sem tratamento de erro
```typescript
// ✅ Sempre usar try/catch
try {
  // lógica
} catch (error) {
  console.error('Error:', error)
  return new Response(
    JSON.stringify({ error: 'Internal error' }),
    { status: 500 }
  )
}
```

### ❌ Memory leaks em loops
```typescript
// ❌ Criar client dentro de loop
for (const item of items) {
  const supabase = createClient(...) // Novo client a cada iteração
}

// ✅ Reutilizar client
const supabase = createClient(...)
for (const item of items) {
  await supabase.from('items').update(...)
}
```
