# Cores e Acessibilidade - Guia Detalhado

## Contraste WCAG

### Requisitos Mínimos
| Nível | Texto Normal | Texto Grande | UI Components |
|-------|--------------|--------------|---------------|
| AA    | 4.5:1        | 3:1          | 3:1           |
| AAA   | 7:1          | 4.5:1        | -             |

**Texto Grande**: ≥18pt (24px) ou ≥14pt bold (18.5px bold)

### Ferramentas de Verificação
- Chrome DevTools: Inspect > Accessibility
- WebAIM Contrast Checker
- Stark (plugin Figma/Sketch)

## Sistema de Cores - Design Tokens

### Estrutura Recomendada
```css
:root {
  /* Primitivas (valores brutos) */
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-900: #1e3a8a;
  
  /* Semânticas (uso funcional) */
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-600);
  --color-background: var(--color-gray-50);
  --color-surface: white;
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-border: var(--color-gray-200);
  
  /* Estados */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Dark Mode
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-surface: var(--color-gray-800);
    --color-text-primary: var(--color-gray-50);
    --color-text-secondary: var(--color-gray-400);
    --color-border: var(--color-gray-700);
  }
}

/* Ou com classe */
.dark {
  --color-background: var(--color-gray-900);
  /* ... */
}
```

## Estados de Cor

### Botões
```css
.btn-primary {
  --btn-bg: var(--color-primary);
  --btn-bg-hover: color-mix(in srgb, var(--color-primary), black 10%);
  --btn-bg-active: color-mix(in srgb, var(--color-primary), black 20%);
  --btn-bg-disabled: var(--color-gray-300);
  
  background: var(--btn-bg);
  transition: background 150ms ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-bg-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--btn-bg-active);
}

.btn-primary:disabled {
  background: var(--btn-bg-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}
```

### Focus Visible
```css
/* Reset browser default */
:focus {
  outline: none;
}

/* Custom focus para teclado */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Focus ring acessível */
.focus-ring:focus-visible {
  box-shadow: 
    0 0 0 2px var(--color-background),
    0 0 0 4px var(--color-primary);
}
```

## Acessibilidade Visual

### Não depender só de cor
```html
<!-- ❌ Ruim -->
<span class="text-red-500">Erro no campo</span>

<!-- ✅ Bom -->
<span class="text-red-500">
  <svg aria-hidden="true"><!-- ícone erro --></svg>
  Erro no campo
</span>
```

### Links em texto
```css
/* Garantir identificação além da cor */
a {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

a:hover {
  text-decoration-thickness: 2px;
}
```

## Daltonismo

### Cores Problemáticas
- Vermelho + Verde (8% dos homens)
- Azul + Amarelo (mais raro)

### Soluções
1. Usar ícones junto com cores
2. Padrões/texturas diferentes
3. Labels de texto
4. Contraste de luminosidade

```css
/* Usar saturação e luminosidade diferentes */
--color-success: hsl(142, 76%, 36%); /* Verde escuro */
--color-error: hsl(0, 84%, 60%);     /* Vermelho claro */
```

## Paletas Prontas (Acessíveis)

### Escala de Cinzas
```css
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Combinações Seguras (AA compliant)
- Texto escuro em fundo claro: gray-900 em gray-50 ✓
- Texto claro em fundo escuro: gray-50 em gray-800 ✓
- Primária em branco: blue-600+ em white ✓

## Checklist de Cores

- [ ] Todas as combinações texto/fundo passam 4.5:1
- [ ] Componentes interativos passam 3:1
- [ ] Estados (hover, focus, disabled) são distinguíveis
- [ ] Informações não dependem só de cor
- [ ] Dark mode mantém contrastes adequados
- [ ] Testado com simuladores de daltonismo
