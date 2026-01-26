# PLANO DE REFATORAÇÃO: Motor de Prospecção Pro Max 🚀

## 1. Diagnóstico do Fracasso Atual
O sistema atual baseia-se em Headless Browser (Puppeteer).
- **Pontos de Falha**: Bloqueios de CSS pelo Google, lentidão na renderização, alto consumo de RAM, dependência de proxies residenciais para visualização.
- **Resultado**: Baixa taxa de sucesso e experiência do usuário frustrante.

## 2. Nova Arquitetura: API-First & High Speed
O objetivo é sair do "Scraping de Interface" para o "Scraping de Dados".

### Fase 1: Backend (Refatoração de API)
- [ ] **Módulo Proxy Manager**: Implementar um pooling de proxies mais eficiente ou preparar para integração com Scraping APIs (SerpApi, ScraperAPI).
- [ ] **Extrator de Metadados**: Mudar o `gmaps.servico.js` para usar busca por Sitemaps e metadados JSON (extração de 150 leads em < 15s).
- [ ] **Endpoint Sync/Async**: Permitir que pequenas buscas (< 20 leads) sejam síncronas (resposta imediata) e grandes buscas sejam via Webhook robusto.

### Fase 2: Robustez de Dados
- [ ] **Normalização de WhatsApp**: Implementar validação real (HLR/WhatsApp Check) para garantir 100% de entrega.
- [ ] **Deduplicação Inteligente**: Impedir que leads repetidos ocupem a cota do usuário dentro do mesmo Job.

### Fase 3: Monitoramento
- [ ] **Dashboard de Saúde da API**: Mostrar no log se as Proxys estão ativas ou se o Google aplicou um bloqueio severo.

## 3. Atribuição de Agentes
- **`backend-specialist`**: Implementação do novo motor de busca.
- **`debugger`**: Identificação e correção de gargalos de rede e proxy.
- **`test-engineer`**: Criação de testes de estresse para garantir que 150 leads funcionem sempre.

## 4. Cronograma de Execução
1. **Cleanup**: Remover códigos de simulação de clique desnecessários.
2. **Implementation**: Novo motor de extração JSON.
3. **Verification**: Teste de velocidade comparativo.
