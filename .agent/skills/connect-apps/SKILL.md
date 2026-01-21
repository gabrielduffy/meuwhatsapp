---
name: Connect Apps
description: Conecta Claude a apps externos para executar ações reais. Use quando o usuário quiser enviar emails, criar issues, postar mensagens, atualizar databases, ou integrar com ferramentas como Gmail, Slack, GitHub, Notion, Jira, Trello, Discord, Google Drive, Airtable, Linear, Asana, HubSpot, Salesforce, Zapier, e outros. Também ativa para automação de workflows, integrações e quando o usuário mencionar "conectar", "integrar", "enviar para", "postar em", "criar issue", "atualizar no".
---

# Connect Apps

Skill para conectar Claude a aplicativos externos e executar ações reais via MCP (Model Context Protocol) ou APIs diretas.

## Capacidades

### Comunicação
- **Email** (Gmail, Outlook): Enviar, ler, responder, organizar
- **Slack**: Postar mensagens, criar canais, reagir, threads
- **Discord**: Enviar mensagens, gerenciar servers
- **Microsoft Teams**: Mensagens, reuniões, canais

### Gestão de Projetos
- **GitHub**: Issues, PRs, reviews, actions, releases
- **GitLab**: Issues, MRs, pipelines
- **Jira**: Criar/atualizar issues, transições, sprints
- **Linear**: Issues, projetos, ciclos
- **Asana**: Tasks, projetos, subtasks
- **Trello**: Cards, boards, listas
- **Notion**: Páginas, databases, blocos

### Produtividade
- **Google Drive**: Upload, download, compartilhar
- **Google Sheets**: Ler, escrever, criar planilhas
- **Google Calendar**: Eventos, convites, disponibilidade
- **Airtable**: Records, bases, views

### CRM & Marketing
- **HubSpot**: Contatos, deals, empresas
- **Salesforce**: Leads, oportunidades, contas
- **Mailchimp**: Campanhas, listas, subscribers

### Databases
- **Supabase**: Queries, inserts, updates
- **Firebase**: Firestore, Realtime DB
- **PostgreSQL**: Queries diretas
- **MongoDB**: Documents, collections

---

## Configuração

### Via MCP Server

```json
// claude_desktop_config.json ou .claude/mcp.json
{
  "mcpServers": {
    "connect-apps": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-connect"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx",
        "SLACK_TOKEN": "xoxb-xxx",
        "NOTION_TOKEN": "secret_xxx"
      }
    }
  }
}
```

### Via Composio

```bash
# Instalar CLI
pip install composio-core

# Autenticar apps
composio add github
composio add slack
composio add notion

# Gerar MCP config
composio mcp-config
```

---

## Padrões de Uso

### Enviar Email
```
Usuário: "Envia um email para joao@empresa.com sobre o relatório de vendas"

Claude irá:
1. Verificar conexão com Gmail/Outlook
2. Compor email com assunto e corpo apropriados
3. Confirmar antes de enviar (se configurado)
4. Enviar e confirmar sucesso
```

### Criar Issue no GitHub
```
Usuário: "Cria uma issue no repo frontend sobre o bug do botão de login"

Claude irá:
1. Identificar repositório (perguntar se ambíguo)
2. Criar issue com título e descrição formatados
3. Adicionar labels apropriadas (bug)
4. Retornar link da issue criada
```

### Postar no Slack
```
Usuário: "Posta no canal #dev que o deploy foi concluído"

Claude irá:
1. Identificar canal
2. Formatar mensagem apropriadamente
3. Postar mensagem
4. Confirmar com link
```

### Workflow Automatizado
```
Usuário: "Quando chegar email de cliente com 'urgente', cria uma issue no Linear e avisa no Slack"

Claude irá:
1. Explicar como configurar o workflow
2. Criar os triggers necessários
3. Conectar as ações em sequência
```

---

## Formato de Ações

### Antes de Executar Ações Destrutivas

Sempre confirmar com o usuário:
- Envio de emails
- Posts públicos
- Deleções
- Modificações em produção

```
⚠️ Confirmar ação:

**Ação:** Enviar email
**Para:** joao@empresa.com
**Assunto:** Relatório de Vendas Q4
**Preview:** "Olá João, segue em anexo..."

Deseja prosseguir? [Sim/Não]
```

### Após Executar

```
✅ Ação concluída:

**Email enviado**
- Para: joao@empresa.com
- Assunto: Relatório de Vendas Q4
- Horário: 14:32

[Ver no Gmail →]
```

---

## Integrações Suportadas

### Tier 1 (Suporte Completo)
| App | Ações |
|-----|-------|
| GitHub | Issues, PRs, Reviews, Actions, Releases |
| Slack | Messages, Channels, Reactions, Threads |
| Notion | Pages, Databases, Blocks, Comments |
| Gmail | Send, Read, Reply, Labels, Search |
| Google Drive | Upload, Download, Share, Search |

### Tier 2 (Suporte Parcial)
| App | Ações |
|-----|-------|
| Jira | Issues, Transitions, Comments |
| Linear | Issues, Projects, Cycles |
| Trello | Cards, Lists, Boards |
| Airtable | Records, Bases |
| Discord | Messages, Channels |

### Tier 3 (Básico)
| App | Ações |
|-----|-------|
| HubSpot | Contacts, Deals |
| Salesforce | Leads, Opportunities |
| Asana | Tasks, Projects |
| Calendar | Events, Availability |

---

## Troubleshooting

### "App não conectado"
1. Verificar se token está configurado
2. Verificar permissões do token
3. Re-autenticar via `composio add <app>`

### "Permissão negada"
1. Verificar scopes do OAuth
2. Verificar se usuário tem acesso ao recurso
3. Verificar rate limits

### "Ação falhou"
1. Verificar formato dos dados
2. Verificar se recurso existe
3. Verificar logs do MCP server

---

## Segurança

### ✅ Boas Práticas
- Usar tokens com escopo mínimo necessário
- Configurar confirmação para ações destrutivas
- Revisar logs de ações executadas
- Rotacionar tokens periodicamente

### ❌ Evitar
- Tokens com acesso total (admin)
- Ações automáticas sem confirmação em produção
- Compartilhar configurações com tokens
- Ignorar erros de autenticação

---

## Comandos Rápidos

- `/connect <app>` - Verificar/configurar conexão com app
- `/apps` - Listar apps conectados
- `/send <app> <ação>` - Executar ação específica
- `/workflow` - Criar automação multi-app
