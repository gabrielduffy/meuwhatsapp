# Responsividade - Guia Detalhado

## Breakpoints Padrão

```css
/* Mobile First */
--bp-xs: 320px;   /* Smartphones pequenos */
--bp-sm: 375px;   /* Smartphones */
--bp-md: 768px;   /* Tablets */
--bp-lg: 1024px;  /* Tablets landscape / Laptops */
--bp-xl: 1440px;  /* Desktops */
--bp-2xl: 1920px; /* Monitores grandes */
```

## Tailwind Equivalentes
- `sm:` = 640px
- `md:` = 768px
- `lg:` = 1024px
- `xl:` = 1280px
- `2xl:` = 1536px

## Padrões de Layout Responsivo

### Container Fluido
```css
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 3rem);
}
```

### Grid Responsivo
```css
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}
```

### Tipografia Fluida
```css
.fluid-text {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
}
```

## Imagens Responsivas

### Pattern Básico
```html
<img 
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="Descrição"
  loading="lazy"
/>
```

### Picture Element
```html
<picture>
  <source media="(max-width: 768px)" srcset="mobile.webp" type="image/webp">
  <source media="(max-width: 768px)" srcset="mobile.jpg">
  <source srcset="desktop.webp" type="image/webp">
  <img src="desktop.jpg" alt="Descrição">
</picture>
```

## Touch Targets

Mínimo recomendado:
- **iOS**: 44x44px
- **Android**: 48x48px
- **WCAG**: 44x44px

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}
```

## Container Queries

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}
```

## Problemas Comuns

### ❌ Overflow horizontal
```css
/* Problema */
.element { width: 100vw; }

/* Solução */
.element { width: 100%; max-width: 100vw; overflow-x: hidden; }
```

### ❌ Fontes muito pequenas no mobile
```css
/* Problema */
body { font-size: 12px; }

/* Solução */
body { font-size: clamp(14px, 4vw, 16px); }
```

### ❌ Touch targets pequenos
```css
/* Problema */
button { padding: 4px 8px; }

/* Solução */
button { padding: 12px 16px; min-height: 44px; }
```

## Testes Essenciais

1. **Chrome DevTools**: Device toolbar (Ctrl+Shift+M)
2. **Viewport sizes**: 320, 375, 414, 768, 1024, 1440, 1920
3. **Orientação**: Portrait e Landscape
4. **Zoom**: 100%, 150%, 200%
5. **Touch simulation**: Ativar no DevTools
