# 🦁 TITAN v8 - Sistema Anti-Detecção para Scraping

## Visão Geral
O TITAN v8 é um sistema de scraping de leads com técnicas avançadas para evitar banimentos e shadow-bans.

## Arquitetura
- `src/antidetect/`: Módulos de proteção (GeoSync, HumanScroll, HumanMouse, UserAgents, FingerprintManager, ProxyHealth).
- `src/config/titan.config.js`: Configurações centralizadas.
- `src/servicos/gmaps.servico.js`: Motor principal integrado.

## Como Usar
### Scraping Básico
```javascript
const { buscarLeadsNoMaps } = require('./src/servicos/gmaps.servico');
buscarLeadsNoMaps('Restaurante', 'São Paulo', 100, (p) => console.log(p.msg));
```

### Executar Testes
```bash
npm run test:antidetect
npm run test:scraping
```

## Configurações
Ajuste os valores em `src/config/titan.config.js` para controlar a agressividade e a segurança do scraper.
