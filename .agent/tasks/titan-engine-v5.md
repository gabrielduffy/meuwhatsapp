# Plano de Implementação: TITAN-ENGINE Multi-Source v5

Este plano descreve a evolução do motor de scraping para suportar múltiplas fontes (Instagram, LinkedIn, OLX, Facebook, Threads) com o mesmo nível de robustez e visibilidade do Google Maps (TITAN-v4).

## 📋 Objetivos
- Unificar o sistema de logs em tempo real para todas as fontes de busca.
- Implementar o padrão "TITAN" (Stealth + Proxies + Multi-Search Dorking) em todas as fontes.
- Garantir compatibilidade cross-platform (Windows/Linux/Docker).
- Validar a captura de leads com testes de integração.

## 🛠️ Arquitetura
O sistema utilizará uma abordagem híbrida:
1. **Google Maps:** Extração via XHR/RPC e DOM Scraping (já implementado).
2. **Web Sources (Social Media):** Dorking via mecanismos de busca (DuckDuckGo/Google) para evitar bans de conta e login.

## 🚀 Fases de Implementação

### Fase 1: Padronização do Web Scraper (TITAN-v5)
- [ ] Atualizar `src/servicos/web_scraper.servico.js` para aceitar `jobId` e reportar logs ao banco de dados (`logs_processamento`).
- [ ] Remover caminhos de executável hardcoded (garantir que funcione em Docker/Easypanel).
- [ ] Melhorar o Regex de extração de telefones para suportar variações de formato internacionais e locais.
- [ ] Implementar rotação de `sessionId` para proxies em cada query.

### Fase 2: Integração na Fila (Queue)
- [ ] Atualizar `src/queues/mapScraperQueue.js` para passar o `jobIdStr` para todas as funções de busca.
- [ ] Refinar a lógica de divisão de limite entre fontes.

### Fase 3: Novos Motores (Específicos)
- [ ] **Instagram:** Refinar dorks para focar em bios e posts.
- [ ] **LinkedIn:** Focar em perfis públicos e páginas de empresa.
- [ ] **OLX:** Focar em anúncios de nicho específico.

### Fase 4: Testes e Validação
- [ ] Criar `test_multi_source.js` para validar cada fonte individualmente.
- [ ] Executar testes reais e documentar os resultados.

## ⚠️ Considerações Técnicas
- **Proxies:** Utilizar a credencial residencial `gw.dataimpulse.com:823`.
- **Stealth:** Manter `puppeteer-extra-plugin-stealth` ativo.
- **Segurança:** Assegurar que falhas em uma fonte não interrompam a busca nas outras.
