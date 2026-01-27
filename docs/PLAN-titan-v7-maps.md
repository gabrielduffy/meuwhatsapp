# PLANO TITAN-v7: Refatoração Nuclear Google Maps

Este plano foca em transformar o motor de prospecção do Google Maps em uma ferramenta de alta performance, capaz de extrair centenas de leads com precisão de "rede de arrasto", simulando a eficiência do Outscraper.

## 🎯 OBJETIVOS
1. **Volume Massivo:** Garantir a extração de 150+ leads por única pesquisa.
2. **Precisão de Dados:** Capturar telefone direto da fonte de rede (JSON interno) e não apenas do que o "olho" vê no site.
3. **Resiliência:** Implementar rotação de proxy e scroll infinito real que não "trave" ou "vaze" memória.
4. **Custo Zero:** Zero dependência de APIs pagas do Google.

## 🛠 ARQUITETURA DE EXTRAÇÃO (TITAN-v7)

### Fase 1: Análise de Intercepção gRPC/XHR
Em vez de depender apenas do DOM (que o Google vive mudando as classes), o motor vai focar 100% na **interceptação de rede**.
- O Google Maps envia pacotes de dados via protocolo interno (gRPC-web/XHR).
- Esses pacotes contêm telefone, categoria, site e endereço de forma estruturada.
- **Ação:** Refatorar o listener de rede para filtrar e decodificar esses pacotes em tempo real.

### Fase 2: Motor de Scroll Infinito "Human-Like"
O motivo de falhar em 10-20 leads é que o scroll atual não está disparando o carregamento de novas páginas de forma correta.
- **Ação:** Implementar um algoritmo de scroll que:
  1. Identifica o contêiner de scroll exato.
  2. Rola até o final, aguarda o símbolo de "carregando" (spinner) sumir.
  3. Verifica se o número de itens na lista aumentou.
  4. Repete até atingir o limite solicitado (ex: 150).

### Fase 3: Grid Search Auto-Split (Opcional se necessário)
O Google limita a lista lateral a cerca de 120-400 resultados dependendo da área.
- **Ação:** Se o limite solicitado for maior que o retorno de uma busca única, o sistema fará um "zoom-in" em 4 quadrantes da cidade automaticamente.

### Fase 4: Refatoração do `gmaps.servico.js`
- Substituição do script de extração atual por um motor de intercepção mais agressivo.
- Implementação de um `Set` de deduplicação global por Job para evitar leads repetidos no mesmo banco.

---

## 📅 CRONOGRAMA DE EXECUÇÃO

| Fase | Descrição | Agente Responsável |
|------|-----------|-------------------|
| 1 | Refatoração do Listener de Rede (XHR) | backend-specialist |
| 2 | Implementação do Smart Scroll Contínuo | backend-specialist |
| 3 | Teste de Stress (Extração de 150 leads) | test-engineer |
| 4 | Integração com Fila Bull e Logs Reais | orchestrator |

---

## ✅ CHECKLIST DE VERIFICAÇÃO
- [ ] O robô consegue carregar mais de 50 resultados na sidebar?
- [ ] Os telefones estão vindo formatados e validados por DDD?
- [ ] O consumo de RAM do Puppeteer está estável durante a extração longa?
- [ ] Os logs mostram o contador subindo até 150+?

---
**Próximo Passo:** Solicitar autorização do usuário para iniciar a Fase 1.
