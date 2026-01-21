# Auth Patterns - Guia Detalhado

## Configuração Básica

### Client-Side Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Server-Side Setup (Next.js App Router)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

---

## Fluxos de Autenticação

### Email/Password
```typescript
// Sign Up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe',
    },
    emailRedirectTo: 'https://myapp.com/auth/callback'
  }
})

// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// Sign Out
await supabase.auth.signOut()
```

### Magic Link
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://myapp.com/auth/callback'
  }
})
```

### OAuth (Google, GitHub, etc.)
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://myapp.com/auth/callback',
    scopes: 'email profile'
  }
})
```

### Phone/SMS
```typescript
// Enviar OTP
const { error } = await supabase.auth.signInWithOtp({
  phone: '+5511999999999'
})

// Verificar OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+5511999999999',
  token: '123456',
  type: 'sms'
})
```

---

## Auth Callback Handler

### Next.js Route Handler
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

---

## Session Management

### Verificar Sessão
```typescript
// Client-side
const { data: { session } } = await supabase.auth.getSession()

// Server-side
const { data: { user } } = await supabase.auth.getUser()
```

### Listener de Mudança de Auth
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        // Usuário logou
      } else if (event === 'SIGNED_OUT') {
        // Usuário deslogou
      } else if (event === 'TOKEN_REFRESHED') {
        // Token foi atualizado
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

### Refresh Token
```typescript
// Automático pelo client, mas pode forçar:
const { data, error } = await supabase.auth.refreshSession()
```

---

## Proteção de Rotas

### Middleware Next.js
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()

  // Rotas protegidas
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Redirecionar se já logado
  if (req.nextUrl.pathname.startsWith('/login')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}
```

---

## User Metadata

### App Metadata (Admin Only)
```typescript
// Apenas via service_role ou SQL
const { error } = await supabaseAdmin.auth.admin.updateUserById(
  userId,
  {
    app_metadata: {
      role: 'admin',
      plan: 'premium'
    }
  }
)
```

### User Metadata (User Can Update)
```typescript
const { error } = await supabase.auth.updateUser({
  data: {
    full_name: 'John Doe',
    avatar_url: 'https://...'
  }
})
```

### Acessar Metadata
```typescript
const { data: { user } } = await supabase.auth.getUser()

// User metadata
const fullName = user?.user_metadata?.full_name

// App metadata (em policies)
// auth.jwt() -> 'app_metadata' ->> 'role'
```

---

## Password Reset

```typescript
// Solicitar reset
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: 'https://myapp.com/auth/reset-password' }
)

// Atualizar senha (após callback)
const { error } = await supabase.auth.updateUser({
  password: 'new-secure-password'
})
```

---

## Email Templates

Customizar em: Dashboard > Authentication > Email Templates

### Variáveis Disponíveis
- `{{ .ConfirmationURL }}` - Link de confirmação
- `{{ .Token }}` - Token OTP
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do site
- `{{ .Email }}` - Email do usuário

---

## Hooks de Auth (Database)

### Trigger em Novo Usuário
```sql
-- Criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Trigger em Delete de Usuário
```sql
-- Cascade delete de dados relacionados
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletar dados do usuário
  DELETE FROM public.user_data WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();
```

---

## Segurança

### ✅ Boas Práticas
- Sempre usar HTTPS
- Configurar redirect URLs permitidas
- Usar PKCE para OAuth
- Validar email antes de permitir ações críticas
- Implementar rate limiting em auth endpoints

### ❌ Evitar
- Expor service_role key no client
- Confiar apenas em client-side auth checks
- Permitir qualquer redirect URL
- Senhas fracas (configurar em Auth Settings)
