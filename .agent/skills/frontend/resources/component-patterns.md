# Padrões de Componentes - Guia Detalhado

## Sistema de Espaçamento

### Escala Base (4px)
```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-20: 5rem;    /* 80px */
  --space-24: 6rem;    /* 96px */
}
```

### Uso Semântico
```css
:root {
  /* Componentes */
  --padding-button: var(--space-2) var(--space-4);
  --padding-input: var(--space-2) var(--space-3);
  --padding-card: var(--space-4);
  
  /* Layout */
  --gap-items: var(--space-4);
  --gap-sections: var(--space-12);
  --container-padding: var(--space-4);
}
```

## Escala Tipográfica

```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

## Botões

### Anatomia Completa
```css
.btn {
  /* Reset */
  appearance: none;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  
  /* Base */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  
  /* Sizing */
  padding: var(--space-2) var(--space-4);
  min-height: 44px; /* Touch target */
  
  /* Typography */
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: 1;
  text-decoration: none;
  
  /* Visual */
  border-radius: var(--radius-md);
  transition: all 150ms ease;
  
  /* Focus */
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  
  /* Disabled */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* Variantes */
.btn-primary {
  background: var(--color-primary);
  color: white;
  
  &:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  
  &:hover:not(:disabled) {
    background: var(--color-primary);
    color: white;
  }
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  
  &:hover:not(:disabled) {
    background: var(--color-gray-100);
  }
}
```

### Tamanhos
```css
.btn-sm { 
  padding: var(--space-1) var(--space-3); 
  font-size: var(--text-xs);
  min-height: 32px;
}

.btn-lg { 
  padding: var(--space-3) var(--space-6); 
  font-size: var(--text-base);
  min-height: 52px;
}
```

## Inputs

```css
.input {
  /* Reset */
  appearance: none;
  border: none;
  background: none;
  font: inherit;
  
  /* Base */
  width: 100%;
  padding: var(--space-2) var(--space-3);
  min-height: 44px;
  
  /* Visual */
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  
  /* Typography */
  font-size: var(--text-base);
  color: var(--color-text-primary);
  
  /* Transitions */
  transition: border-color 150ms ease, box-shadow 150ms ease;
  
  /* Placeholder */
  &::placeholder {
    color: var(--color-text-secondary);
    opacity: 1;
  }
  
  /* Focus */
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  /* Error */
  &[aria-invalid="true"],
  &.error {
    border-color: var(--color-error);
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }
  
  /* Disabled */
  &:disabled {
    background: var(--color-gray-100);
    cursor: not-allowed;
    opacity: 0.7;
  }
}
```

## Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  
  /* Elevação opcional */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card-interactive {
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
}
```

## Animações

### Transições Padrão
```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
  
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animações de Entrada
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes scaleIn {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

.animate-fade-in {
  animation: fadeIn var(--transition-normal) var(--ease-out);
}

.animate-slide-up {
  animation: slideUp var(--transition-normal) var(--ease-out);
}
```

## Loading States

```css
/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-gray-200);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-200) 25%,
    var(--color-gray-100) 50%,
    var(--color-gray-200) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Border Radius

```css
:root {
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.375rem; /* 6px */
  --radius-lg: 0.5rem;   /* 8px */
  --radius-xl: 0.75rem;  /* 12px */
  --radius-2xl: 1rem;    /* 16px */
  --radius-full: 9999px;
}
```

## Shadows

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```
