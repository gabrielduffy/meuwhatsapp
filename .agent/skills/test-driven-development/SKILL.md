---
name: test-driven-development
description: Guia Claude a seguir práticas rigorosas de TDD (Test-Driven Development). Use quando o usuário pedir para implementar features, corrigir bugs, adicionar funcionalidades, ou quando mencionar testes, TDD, cobertura de código, unit tests, integration tests, ou quando disser "implementar", "criar função", "adicionar feature", "fix bug". Esta skill garante que Claude sempre escreva testes ANTES da implementação.
---

# Test-Driven Development

Skill para garantir que Claude siga o ciclo TDD rigorosamente: Red → Green → Refactor.

## O Ciclo TDD

```
┌─────────────────────────────────────────────┐
│                                             │
│    1. RED                                   │
│    Escrever teste que falha                 │
│                 │                           │
│                 ▼                           │
│    2. GREEN                                 │
│    Escrever código mínimo para passar       │
│                 │                           │
│                 ▼                           │
│    3. REFACTOR                              │
│    Melhorar código mantendo testes verdes   │
│                 │                           │
│                 ▼                           │
│    ← ─ ─ ─ ─ ─ ┘ (repetir)                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Regras Fundamentais

### SEMPRE seguir esta ordem:

1. **Entender o requisito** - O que precisa ser implementado?
2. **Escrever o teste primeiro** - Teste que define o comportamento esperado
3. **Executar teste (deve falhar)** - Confirmar que o teste está correto
4. **Implementar código mínimo** - Apenas o suficiente para passar
5. **Executar teste (deve passar)** - Confirmar implementação
6. **Refatorar** - Melhorar sem quebrar testes
7. **Repetir** - Próximo requisito

### NUNCA:
- Escrever código de produção sem teste
- Escrever mais código do que necessário para passar o teste
- Refatorar com testes falhando
- Pular a etapa de ver o teste falhar

---

## Estrutura de Testes

### Padrão AAA (Arrange-Act-Assert)

```javascript
describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    // Arrange - Preparar
    const calculator = new Calculator();
    
    // Act - Executar
    const result = calculator.add(2, 3);
    
    // Assert - Verificar
    expect(result).toBe(5);
  });
});
```

### Padrão Given-When-Then

```javascript
describe('UserService', () => {
  it('should create user when valid data provided', () => {
    // Given - Dado que
    const userData = { name: 'John', email: 'john@test.com' };
    
    // When - Quando
    const user = userService.create(userData);
    
    // Then - Então
    expect(user.id).toBeDefined();
    expect(user.name).toBe('John');
  });
});
```

---

## Tipos de Teste

### Unit Tests (70%)
Testam unidades isoladas (funções, classes, módulos).

```javascript
// ✅ Bom - Testa uma única responsabilidade
it('should validate email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
});
```

### Integration Tests (20%)
Testam interação entre componentes.

```javascript
// ✅ Bom - Testa fluxo completo
it('should save user to database', async () => {
  const user = await userService.create({ name: 'John' });
  const found = await userRepository.findById(user.id);
  expect(found.name).toBe('John');
});
```

### E2E Tests (10%)
Testam sistema completo do ponto de vista do usuário.

```javascript
// ✅ Bom - Testa jornada do usuário
it('should complete checkout flow', async () => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  await expect(page.locator('.success')).toBeVisible();
});
```

---

## Exemplo Completo de Ciclo TDD

### Requisito: Criar função que valida senha forte

#### Ciclo 1: Deve ter no mínimo 8 caracteres

```javascript
// 1. RED - Escrever teste
describe('isStrongPassword', () => {
  it('should return false for password shorter than 8 characters', () => {
    expect(isStrongPassword('abc123')).toBe(false);
  });
  
  it('should return true for password with 8+ characters', () => {
    expect(isStrongPassword('abc12345')).toBe(true);
  });
});

// 2. GREEN - Implementar mínimo
function isStrongPassword(password) {
  return password.length >= 8;
}

// 3. REFACTOR - Nada a melhorar ainda
```

#### Ciclo 2: Deve ter letra maiúscula

```javascript
// 1. RED - Adicionar teste
it('should return false for password without uppercase', () => {
  expect(isStrongPassword('abc12345')).toBe(false);
});

it('should return true for password with uppercase', () => {
  expect(isStrongPassword('Abc12345')).toBe(true);
});

// 2. GREEN - Expandir implementação
function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  return true;
}

// 3. REFACTOR - Melhorar legibilidade
function isStrongPassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  
  return password.length >= minLength && hasUppercase;
}
```

#### Ciclo 3: Deve ter número

```javascript
// 1. RED
it('should return false for password without number', () => {
  expect(isStrongPassword('Abcdefgh')).toBe(false);
});

// 2. GREEN
function isStrongPassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return password.length >= minLength && hasUppercase && hasNumber;
}

// 3. REFACTOR - Extrair regras
const passwordRules = [
  { test: (p) => p.length >= 8, message: 'Min 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'Needs uppercase' },
  { test: (p) => /[0-9]/.test(p), message: 'Needs number' },
];

function isStrongPassword(password) {
  return passwordRules.every(rule => rule.test(password));
}
```

---

## Boas Práticas

### Nomenclatura de Testes
```javascript
// ✅ Bom - Descreve comportamento
it('should throw error when email is invalid')
it('should return empty array when no users found')
it('should send notification after order completed')

// ❌ Ruim - Vago
it('works correctly')
it('test email')
it('handles error')
```

### Um Assert por Teste (quando possível)
```javascript
// ✅ Bom - Fácil identificar falha
it('should set correct name', () => {
  const user = createUser({ name: 'John' });
  expect(user.name).toBe('John');
});

it('should set correct email', () => {
  const user = createUser({ email: 'john@test.com' });
  expect(user.email).toBe('john@test.com');
});

// ❌ Ruim - Difícil saber o que falhou
it('should create user', () => {
  const user = createUser({ name: 'John', email: 'john@test.com' });
  expect(user.name).toBe('John');
  expect(user.email).toBe('john@test.com');
  expect(user.id).toBeDefined();
  expect(user.createdAt).toBeDefined();
});
```

### Testes Independentes
```javascript
// ✅ Bom - Cada teste é isolado
beforeEach(() => {
  database.clear();
});

// ❌ Ruim - Testes dependem uns dos outros
it('should create user', () => { /* cria user */ });
it('should find created user', () => { /* depende do anterior */ });
```

### Test Doubles

```javascript
// Mock - Substitui dependência
const emailService = { send: jest.fn() };

// Stub - Retorno fixo
jest.spyOn(userRepo, 'findById').mockResolvedValue({ id: 1, name: 'John' });

// Spy - Observa chamadas
const spy = jest.spyOn(console, 'log');
expect(spy).toHaveBeenCalledWith('message');
```

---

## Frameworks por Linguagem

### JavaScript/TypeScript
```bash
# Jest (recomendado)
npm install --save-dev jest @types/jest

# Vitest (para Vite)
npm install --save-dev vitest

# Testing Library (React)
npm install --save-dev @testing-library/react
```

### Python
```bash
# pytest (recomendado)
pip install pytest pytest-cov

# unittest (built-in)
python -m unittest
```

### Go
```go
// Built-in testing package
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("expected 5, got %d", result)
    }
}
```

---

## Cobertura de Código

### Metas Razoáveis
- **80%+** para código crítico (auth, payments)
- **70%+** para código de negócio
- **60%+** para código geral

### Comandos
```bash
# Jest
jest --coverage

# pytest
pytest --cov=src --cov-report=html

# Go
go test -cover ./...
```

### ⚠️ Cobertura ≠ Qualidade
- 100% de cobertura não garante código sem bugs
- Foque em testar comportamentos, não linhas
- Testes ruins com alta cobertura são piores que poucos testes bons

---

## Comandos Rápidos

- `/tdd` - Iniciar ciclo TDD para feature
- `/test <feature>` - Gerar testes para feature existente
- `/coverage` - Analisar cobertura atual
- `/refactor` - Refatorar mantendo testes verdes
- `/test-fix <bug>` - Criar teste que reproduz bug, depois corrigir
