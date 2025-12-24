# 📱 WhatsApp API Pro v2.0

API WhatsApp profissional multi-instância com aquecimento automático via IA.

## ✨ Funcionalidades

### 📋 Instâncias
- ✅ Múltiplas instâncias simultâneas
- ✅ Conexão via QR Code ou Código de Pareamento
- ✅ Suporte a Proxy por instância
- ✅ Reconexão automática
- ✅ Rejeição automática de chamadas

### 💬 Mensagens
- ✅ Texto, Imagem, Vídeo, Áudio, Documento
- ✅ Stickers, Localização, Contatos
- ✅ Enquetes (Polls)
- ✅ Reações (Emoji)
- ✅ Responder mensagem (Quote)
- ✅ Mencionar usuários
- ✅ Deletar mensagens
- ✅ Marcar como lido
- ✅ Simular digitação/gravando

### 👥 Grupos
- ✅ Criar grupos
- ✅ Listar grupos
- ✅ Adicionar/Remover participantes
- ✅ Promover/Rebaixar admins
- ✅ Alterar nome/descrição/foto
- ✅ Obter/Revogar link de convite
- ✅ Entrar em grupo via link
- ✅ Sair do grupo

### 🔔 Webhooks
- ✅ Eventos em tempo real
- ✅ Filtro por tipo de evento
- ✅ Mensagens, Conexão, Grupos, Chamadas

### 🔥 Aquecimento (Anti-Ban)
- ✅ Conversas automáticas com IA (Groq)
- ✅ Delays aleatórios humanizados
- ✅ Horários configuráveis
- ✅ Personalidades variadas
- ✅ Entrada automática em grupos
- ✅ Estatísticas de aquecimento

### 🛡️ Segurança
- ✅ Autenticação por API Key
- ✅ Rate limiting
- ✅ Proxy por instância
- ✅ CORS e Helmet

## 🚀 Deploy no Easypanel

### 1. Criar Repositório no GitHub

Faça upload de todos os arquivos para um repositório GitHub.

### 2. Configurar no Easypanel

1. Crie um novo App
2. Source: GitHub → seu repositório
3. Build: Dockerfile
4. Environment Variables:
   - `API_KEY`: sua-chave-secreta
   - `PORT`: 3000
   - `SESSIONS_DIR`: /app/sessions
   - `DATA_DIR`: /app/data

5. Volumes:
   - `/app/sessions` (persistir sessões)
   - `/app/data` (persistir dados)

6. Domains:
   - Port: 3000

### 3. Deploy

Clique em Deploy e aguarde o build.

## 📖 Documentação

Após o deploy, acesse:

- **Manager**: `https://seu-dominio/manager`
- **Docs**: `https://seu-dominio/docs`
- **Health**: `https://seu-dominio/health`

## 🔥 Configurar Aquecimento

1. Crie uma conta gratuita no [Groq](https://console.groq.com)
2. Copie sua API Key
3. No Manager, vá em "Aquecimento"
4. Configure:
   - Instância principal
   - Instância parceira (para conversarem)
   - Chave Groq
   - Mensagens por dia (comece com 10-20)
   - Intervalo (30-120 minutos)
   - Horário ativo (8h-22h)
5. Clique em "Iniciar Aquecimento"

## ⚠️ Dicas Anti-Ban

1. **Aquecimento Gradual**
   - Dia 1-7: 5-10 msgs/dia
   - Dia 8-14: 20-30 msgs/dia
   - Dia 15-30: 50-100 msgs/dia

2. **Use Proxy**
   - Cada instância com IP diferente
   - Preferência: proxies residenciais

3. **Simule Comportamento Humano**
   - Ative "Simular digitação"
   - Use delays aleatórios
   - Varie os horários

4. **Personalize Mensagens**
   - Use nome do destinatário
   - Varie emojis
   - Evite mensagens idênticas

## 📁 Estrutura do Projeto

```
whatsapp-api-pro/
├── src/
│   ├── index.js              # Entry point
│   ├── routes/
│   │   ├── instance.js       # Rotas de instância
│   │   ├── message.js        # Rotas de mensagem
│   │   ├── group.js          # Rotas de grupo
│   │   ├── chat.js           # Rotas de chat
│   │   ├── webhook.js        # Rotas de webhook
│   │   ├── warming.js        # Rotas de aquecimento
│   │   └── misc.js           # Utilitários
│   ├── services/
│   │   ├── whatsapp.js       # Serviço principal
│   │   └── warming.js        # Serviço de aquecimento
│   └── middlewares/
│       ├── auth.js           # Autenticação
│       └── rateLimit.js      # Rate limiting
├── public/
│   ├── manager.html          # Interface de gerenciamento
│   └── docs.html             # Documentação
├── Dockerfile
├── package.json
└── README.md
```

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| API_KEY | Chave de autenticação | sua-chave-secreta-aqui |
| PORT | Porta do servidor | 3000 |
| SESSIONS_DIR | Diretório de sessões | ./sessions |
| DATA_DIR | Diretório de dados | ./data |

## 📝 Exemplos de Uso

### cURL

```bash
# Criar instância
curl -X POST "https://sua-api/instance/create" \
  -H "X-API-Key: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "whats1"}'

# Enviar mensagem
curl -X POST "https://sua-api/message/send-text" \
  -H "X-API-Key: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"whats1","to":"5511999999999","text":"Olá!"}'
```

### JavaScript

```javascript
const API_URL = 'https://sua-api';
const API_KEY = 'sua-chave';

async function sendMessage(to, text) {
  const response = await fetch(`${API_URL}/message/send-text`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instanceName: 'whats1',
      to,
      text
    })
  });
  return response.json();
}
```

### Python

```python
import requests

API_URL = 'https://sua-api'
API_KEY = 'sua-chave'

def send_message(to, text):
    response = requests.post(
        f'{API_URL}/message/send-text',
        headers={'X-API-Key': API_KEY},
        json={
            'instanceName': 'whats1',
            'to': to,
            'text': text
        }
    )
    return response.json()
```

## 📄 Licença

MIT

## ⚠️ Aviso

Esta é uma API não oficial do WhatsApp. Use por sua conta e risco.
O uso indevido pode resultar em banimento do número.
