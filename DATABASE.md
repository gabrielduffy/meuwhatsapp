# 🗄️ Infraestrutura de Banco de Dados - WhatsBenemax v2.1

## 📋 Visão Geral

O WhatsBenemax v2.1 agora suporta **PostgreSQL** e **Redis** como camada de persistência e cache, preparando o sistema para evolução futura como **SaaS multi-tenant**.

### Benefícios da Nova Infraestrutura

- ✅ **Escalabilidade**: Suporte a milhares de instâncias e milhões de mensagens
- ✅ **Performance**: Cache Redis para operações frequentes
- ✅ **Confiabilidade**: PostgreSQL para dados críticos com ACID
- ✅ **Processamento Assíncrono**: Filas Bull para jobs pesados
- ✅ **Preparação SaaS**: Estrutura pronta para multi-tenant e multi-usuário
- ✅ **Migração Incremental**: Funciona em paralelo com JSON (fallback)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   WhatsBenemax API                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Routes     │  │  Services    │  │  Models  │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
│         └─────────────────┴────────────────┘       │
│                         │                          │
│              ┌──────────▼──────────┐               │
│              │   Repositories      │  (Novo!)     │
│              │  - Instance         │               │
│              │  - Metrics          │               │
│              │  - Scheduler        │               │
│              │  - Broadcast        │               │
│              │  - Autoresponder    │               │
│              │  - Webhook          │               │
│              │  - Contacts         │               │
│              │  - Warming          │               │
│              └──────────┬──────────┘               │
│                         │                          │
│         ┌───────────────┴───────────────┐          │
│         │                               │          │
│    ┌────▼─────┐                  ┌──────▼──────┐  │
│    │PostgreSQL│                  │    Redis    │  │
│    │          │                  │             │  │
│    │ - Tables │                  │ - Cache     │  │
│    │ - Indexes│                  │ - Sessions  │  │
│    │ - Triggers                  │ - Queues    │  │
│    └──────────┘                  └─────────────┘  │
│                                                    │
│              ┌──────────────────┐                 │
│              │   Bull Queues    │  (Novo!)       │
│              │                  │                 │
│              │ - schedulerQueue │                 │
│              │ - broadcastQueue │                 │
│              │ - webhookQueue   │                 │
│              └──────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## 🗃️ Estrutura do Banco de Dados

### Tabelas PostgreSQL

#### 1. **instances** - Instâncias do WhatsApp
```sql
- id (serial)
- instance_name (varchar, unique)
- status (varchar) - disconnected, connecting, connected, qr
- qr_code (text)
- phone_number (varchar)
- webhook_url (text)
- webhook_events (jsonb)
- proxy_config (jsonb)
- session_data (jsonb)
- created_at, updated_at, last_connected_at
```

#### 2. **metrics** - Métricas de uso
```sql
- id (serial)
- instance_name (varchar)
- metric_type (varchar)
- value (integer)
- metadata (jsonb)
- created_at
- period_start, period_end
```

#### 3. **scheduled_messages** - Mensagens agendadas
```sql
- id (serial)
- instance_name (varchar, FK)
- recipient (varchar)
- message (text)
- scheduled_time (timestamp)
- status (varchar) - pending, sent, failed, cancelled
- retry_count (integer)
- media_url, media_type
- created_at, sent_at
```

#### 4. **broadcast_campaigns** - Campanhas de broadcast
```sql
- id (serial)
- instance_name (varchar, FK)
- campaign_name (varchar)
- message (text)
- recipients (jsonb)
- status (varchar) - pending, running, completed, failed
- total_recipients, sent_count, failed_count
- delay_between_messages (integer)
- media_url, media_type
- started_at, completed_at, created_at
```

#### 5. **autoresponder_configs** - Configurações de IA
```sql
- id (serial)
- instance_name (varchar, FK, unique)
- enabled (boolean)
- trigger_type (varchar)
- keywords (jsonb)
- ai_model (varchar)
- system_prompt (text)
- temperature, max_tokens, context_window
- created_at, updated_at
```

#### 6. **autoresponder_history** - Histórico de conversas IA
```sql
- id (serial)
- instance_name (varchar, FK)
- chat_id (varchar)
- user_message (text)
- ai_response (text)
- model_used (varchar)
- tokens_used (integer)
- response_time_ms (integer)
- created_at
```

#### 7. **webhook_configs** - Configurações avançadas de webhook
```sql
- id (serial)
- instance_name (varchar, FK, unique)
- url (text)
- enabled (boolean)
- event_types (jsonb)
- headers (jsonb)
- max_retries, retry_delay, backoff_multiplier
- timeout (integer)
- created_at, updated_at
```

#### 8. **webhook_logs** - Logs de webhook
```sql
- id (serial)
- instance_name (varchar, FK)
- event_type (varchar)
- url (text)
- status (varchar) - success, error, failed
- status_code (integer)
- attempt, duration_ms
- error_message, error_type
- response_body (text)
- created_at
```

#### 9. **contacts** - Gerenciamento de contatos
```sql
- id (serial)
- instance_name (varchar, FK)
- phone_number (varchar)
- name (varchar)
- tags (jsonb)
- custom_fields (jsonb)
- notes (text)
- last_message_at
- message_count (integer)
- is_blocked (boolean)
- created_at, updated_at
- UNIQUE(instance_name, phone_number)
```

#### 10. **warming_configs** - Configurações de aquecimento
```sql
- id (serial)
- instance_name (varchar, FK, unique)
- enabled (boolean)
- daily_limit (integer)
- current_daily_count (integer)
- last_reset_date (date)
- warmup_stage (integer)
- created_at, updated_at
```

#### 11. **warming_stats** - Estatísticas de aquecimento
```sql
- id (serial)
- instance_name (varchar, FK)
- stat_date (date)
- messages_sent (integer)
- stage (integer)
- created_at
- UNIQUE(instance_name, stat_date)
```

### Índices para Performance

Todos os índices foram criados automaticamente no `schema.sql`:
- Índices em `instance_name` (todas as tabelas)
- Índices em `status` (instâncias, campanhas, mensagens)
- Índices em `created_at` (para queries temporais)
- Índices GIN em campos JSONB (tags, custom_fields)
- Índices compostos para queries comuns

### Triggers Automáticos

- `update_updated_at_column`: Atualiza `updated_at` automaticamente em:
  - instances
  - autoresponder_configs
  - webhook_configs
  - contacts
  - warming_configs

### Views Úteis

- **active_instances**: Instâncias conectadas
- **broadcast_stats**: Estatísticas de campanhas
- **webhook_stats**: Estatísticas de webhooks por data

---

## 🔧 Repositories (Camada de Acesso a Dados)

Todos os repositories implementam o padrão Repository para abstrair o acesso ao banco:

### instanceRepository.js
```javascript
- createInstance(instanceData)
- getInstanceByName(instanceName)
- getAllInstances()
- updateInstanceStatus(instanceName, status, additionalData)
- updateInstanceWebhook(instanceName, webhookUrl, events)
- deleteInstance(instanceName)
- getInstancesByStatus(status)
- countInstancesByStatus()
- instanceExists(instanceName)
```

### metricsRepository.js
```javascript
- addMetric(instanceName, metricType, value, metadata)
- incrementMetric(instanceName, metricType, incrementBy, metadata)
- getMetricsByInstance(instanceName, options)
- getMetricsSummary(instanceName, period)
- getTotalMetric(instanceName, metricType, period)
- getMetricsByDate(instanceName, metricType, days)
- cleanOldMetrics(daysToKeep)
```

### schedulerRepository.js
```javascript
- createScheduledMessage(messageData)
- getScheduledMessageById(id)
- updateScheduledMessageStatus(id, status, errorMessage)
- getPendingMessages(limit)
- cancelScheduledMessagesByInstance(instanceName)
- getScheduledStats(instanceName)
- rescheduleMessage(id, newScheduledTime)
```

### broadcastRepository.js
```javascript
- createBroadcastCampaign(campaignData)
- getBroadcastCampaignById(id)
- updateBroadcastStatus(id, status)
- updateBroadcastCounters(id, sentIncrement, failedIncrement)
- getPendingCampaigns(limit)
- getCampaignProgress(id)
- getBroadcastStats(instanceName)
- cancelCampaign(id)
- pauseCampaign(id)
- resumeCampaign(id)
```

### autoresponderRepository.js
```javascript
- upsertAutoresponderConfig(instanceName, config)
- getAutoresponderConfig(instanceName)
- toggleAutoresponder(instanceName, enabled)
- addAutoresponderHistory(historyData)
- getChatContext(instanceName, chatId, limit)
- getAutoresponderStats(instanceName, period)
- getTopChats(instanceName, limit)
- getTokenUsageByDate(instanceName, days)
```

### webhookRepository.js
```javascript
- upsertWebhookConfig(instanceName, config)
- getWebhookConfig(instanceName)
- toggleWebhook(instanceName, enabled)
- addWebhookLog(logData)
- getWebhookLogs(instanceName, options)
- clearWebhookLogs(instanceName)
- getWebhookStats(instanceName, period)
- getFailedWebhookLogs(instanceName, limit)
```

### contactsRepository.js
```javascript
- upsertContact(instanceName, contactData)
- getContactByPhone(instanceName, phoneNumber)
- updateContactName/Tags/CustomFields/Notes(...)
- toggleContactBlock(instanceName, phoneNumber, isBlocked)
- recordContactMessage(instanceName, phoneNumber)
- getContactsByTag(instanceName, tag)
- searchContactsByName(instanceName, searchTerm)
- getTopActiveContacts(instanceName, limit)
- getAllTags(instanceName)
- exportContacts(instanceName)
```

### warmingRepository.js
```javascript
- upsertWarmingConfig(instanceName, config)
- getWarmingConfig(instanceName)
- incrementDailyCount(instanceName)
- canSendMessage(instanceName)
- getRemainingMessages(instanceName)
- addWarmingStat(instanceName, messagesSent, stage)
- getWarmingStats(instanceName, days)
- getWarmingSummary(instanceName)
- getWarmingProgress(instanceName)
```

---

## 🚀 Filas Bull (Processamento Assíncrono)

### schedulerQueue - Mensagens Agendadas
```javascript
// Processar mensagens no horário agendado
- scheduleMessage(messageId, scheduledTime)
- cancelScheduledMessage(messageId)
- cleanSchedulerQueue()

// Job data: { messageId }
// Retry: 3 tentativas com backoff exponencial
```

### broadcastQueue - Campanhas de Broadcast
```javascript
// Processar campanhas de envio em massa
- startBroadcastCampaign(campaignId)
- pauseBroadcastCampaign(campaignId)
- cancelBroadcastCampaign(campaignId)
- getBroadcastQueueStatus()

// Job data: { campaignId }
// Progress tracking: 0-100%
// Delay configurável entre mensagens
```

### webhookQueue - Entrega de Webhooks
```javascript
// Processar envio de webhooks com retry
- sendWebhook(instanceName, url, payload, config)
- sendWebhookBatch(webhooks)
- getWebhookQueueStatus()
- clearInstanceWebhooks(instanceName)

// Job data: { instanceName, url, payload, config }
// Priority: QR codes têm prioridade 1
// Retry automático com logs
```

---

## 🔐 Cache Redis

### Estratégia de Cache

O Redis é usado para:
1. **Cache de dados frequentes** (TTL: 2-5 minutos)
   - Configurações de instâncias
   - Configs de webhook/autoresponder
   - Estatísticas agregadas

2. **Invalidação automática**
   - Ao atualizar dados, o cache é invalidado
   - Suporta patterns: `cache.invalidatePattern('metrics:*')`

3. **Sessões Bull**
   - Filas de jobs
   - Estado de processamento

### Helper Functions
```javascript
cache.get(key)                          // Buscar do cache
cache.set(key, value, ttlSeconds)       // Salvar no cache
cache.del(key)                          // Deletar chave
cache.invalidatePattern(pattern)        // Invalidar por padrão
```

---

## 📊 Migração de Dados

### Status Atual

✅ **Infraestrutura completa implementada:**
- PostgreSQL configurado e testado
- Redis configurado e testado
- 11 tabelas criadas com índices
- 8 repositories implementados
- 3 filas Bull configuradas
- Cache helpers prontos

⏳ **Próximos passos (migração incremental):**
1. Adaptar services para usar repositories
2. Manter JSON como fallback durante transição
3. Script de migração de dados JSON → PostgreSQL
4. Testes de integração
5. Remoção gradual de dependência JSON

### Migração Incremental

O sistema está preparado para **migração gradual**:

```javascript
// Exemplo: Usar repository com fallback para JSON
async function getInstance(name) {
  try {
    // Tentar buscar do PostgreSQL
    const instance = await instanceRepository.getInstanceByName(name);
    if (instance) return instance;
  } catch (error) {
    console.warn('Fallback para JSON:', error.message);
  }

  // Fallback para JSON
  return getInstanceFromJSON(name);
}
```

---

## 🔧 Variáveis de Ambiente

```bash
# PostgreSQL
DATABASE_URL=postgresql://whatsbenemax:@412Trocar@postgres:5432/whatsbenemax

# Redis
REDIS_URL=redis://:@412Trocar@redis:6379

# Node
NODE_ENV=production  # Para habilitar SSL no PostgreSQL
```

---

## 📈 Performance e Otimizações

### Indexes Criados
- 25+ índices para otimizar queries comuns
- Índices GIN para JSONB (tags, metadata)
- Índices compostos para foreign keys
- Índices em campos de timestamp

### Connection Pooling
- PostgreSQL: Pool de até 20 conexões
- Timeout: 2 segundos
- Idle timeout: 30 segundos
- Logs de queries lentas (>1s)

### Cleanup Automático
- Scheduler queue: limpeza a cada 6h
- Broadcast queue: limpeza a cada 6h
- Webhook queue: limpeza a cada 6h
- Logs antigos removidos automaticamente

---

## 🛠️ Manutenção

### Limpeza de Dados Antigos

```javascript
// Métricas
await metricsRepository.cleanOldMetrics(90);  // Manter 90 dias

// Mensagens agendadas
await schedulerRepository.cleanOldScheduledMessages(30);

// Campanhas
await broadcastRepository.cleanOldCampaigns(90);

// Logs de webhook
await webhookRepository.cleanOldWebhookLogs(30);

// Histórico de autoresponder
await autoresponderRepository.cleanOldHistory(90);

// Estatísticas de warming
await warmingRepository.cleanOldWarmingStats(180);

// Contatos inativos
await contactsRepository.cleanInactiveContacts(instanceName, 180);
```

### Monitoramento

```javascript
// Status das filas
const schedulerStatus = await schedulerQueue.getJobCounts();
const broadcastStatus = await getBroadcastQueueStatus();
const webhookStatus = await getWebhookQueueStatus();

// Conexões do banco
const pool = require('./config/database').pool;
console.log('Total connections:', pool.totalCount);
console.log('Idle connections:', pool.idleCount);
console.log('Waiting clients:', pool.waitingCount);
```

---

## 🚀 Próximos Passos (Roadmap)

### Fase 1: Infraestrutura ✅ (Concluído)
- [x] Configurar PostgreSQL
- [x] Configurar Redis
- [x] Criar schema completo
- [x] Implementar repositories
- [x] Criar filas Bull
- [x] Atualizar index.js

### Fase 2: Migração de Services (Em planejamento)
- [ ] Migrar metrics service
- [ ] Migrar scheduler service
- [ ] Migrar broadcast service
- [ ] Migrar autoresponder service
- [ ] Migrar webhook service
- [ ] Migrar contacts service
- [ ] Migrar warming service

### Fase 3: Migração de Dados
- [ ] Script de migração JSON → PostgreSQL
- [ ] Validação de dados
- [ ] Testes de integridade

### Fase 4: Evolução SaaS
- [ ] Tabela `users` (autenticação)
- [ ] Tabela `organizations` (multi-tenant)
- [ ] Permissões e roles
- [ ] Billing e planos
- [ ] API multi-tenant

---

## 📚 Referências

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

---

## 💡 Dicas de Uso

### Criar uma instância com webhook
```javascript
const instance = await instanceRepository.createInstance({
  instanceName: 'minha-instancia',
  webhookUrl: 'https://meu-webhook.com/events',
  webhookEvents: ['message', 'qr', 'connection.update']
});
```

### Adicionar métrica
```javascript
await metricsRepository.incrementMetric('minha-instancia', 'messages_sent', 1);
```

### Agendar mensagem
```javascript
const scheduled = await schedulerRepository.createScheduledMessage({
  instanceName: 'minha-instancia',
  recipient: '5511999999999',
  message: 'Olá!',
  scheduledTime: '2025-12-26T10:00:00Z'
});

await scheduleMessage(scheduled.id, scheduled.scheduled_time);
```

### Criar campanha de broadcast
```javascript
const campaign = await broadcastRepository.createBroadcastCampaign({
  instanceName: 'minha-instancia',
  campaignName: 'Promoção de Natal',
  message: 'Aproveite nossa oferta!',
  recipients: ['5511999999999', '5511888888888'],
  delayBetweenMessages: 2000
});

await startBroadcastCampaign(campaign.id);
```

---

**WhatsBenemax v2.1** - Sistema de infraestrutura de banco de dados completo e pronto para escalar! 🚀
