# WhatsApp API Multi-Instância

API não oficial do WhatsApp com suporte a múltiplas instâncias. Baseada na biblioteca Baileys.

## 🚀 Deploy no Easypanel

### Passo 1: Subir para o GitHub

1. Crie um repositório no GitHub
2. Faça upload destes arquivos ou use:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/whatsapp-api.git
git push -u origin main
```

### Passo 2: Configurar no Easypanel

1. Acesse seu Easypanel
2. Clique em **"New Service"** → **"App"**
3. Selecione **GitHub** e conecte seu repositório
4. Configurações importantes:
   - **Build**: Dockerfile
   - **Port**: 3000

### Passo 3: Configurar Variáveis de Ambiente

No Easypanel, vá em **Environment** e adicione:

| Variável | Valor |
|----------|-------|
| `PORT` | `3000` |
| `API_KEY` | `sua-chave-secreta-aqui` |
| `SESSIONS_DIR` | `/app/sessions` |

### Passo 4: Configurar Volume (IMPORTANTE!)

Para manter as sessões após restart:

1. Vá em **Mounts/Volumes**
2. Adicione um volume:
   - **Path**: `/app/sessions`
   - **Type**: Volume

### Passo 5: Deploy

Clique em **Deploy** e aguarde!

---

## 📖 Como Usar a API

### Autenticação

Todas as requisições precisam do header:
```
X-API-Key: sua-chave-secreta
```

Ou query param: `?apikey=sua-chave-secreta`

---

## 🔌 Endpoints

### Instâncias

#### Criar Instância
```bash
curl -X POST https://sua-api.com/instance/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{"instanceName": "minha-instancia"}'
```

#### Obter QR Code
```bash
curl https://sua-api.com/instance/minha-instancia/qrcode \
  -H "X-API-Key: sua-chave"
```

Resposta:
```json
{
  "status": "pending",
  "qrcode": "2@abc123...",
  "qrcodeBase64": "data:image/png;base64,..."
}
```

> **Dica**: Use o `qrcodeBase64` para exibir como imagem no navegador:
> ```html
> <img src="data:image/png;base64,..." />
> ```

#### Status da Instância
```bash
curl https://sua-api.com/instance/minha-instancia/status \
  -H "X-API-Key: sua-chave"
```

#### Listar Todas Instâncias
```bash
curl https://sua-api.com/instances \
  -H "X-API-Key: sua-chave"
```

#### Deletar Instância
```bash
curl -X DELETE https://sua-api.com/instance/minha-instancia \
  -H "X-API-Key: sua-chave"
```

#### Logout (Desconectar)
```bash
curl -X POST https://sua-api.com/instance/minha-instancia/logout \
  -H "X-API-Key: sua-chave"
```

---

### Mensagens

#### Enviar Texto
```bash
curl -X POST https://sua-api.com/message/send-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "text": "Olá, mundo!"
  }'
```

#### Enviar Imagem
```bash
curl -X POST https://sua-api.com/message/send-image \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "imageUrl": "https://exemplo.com/imagem.jpg",
    "caption": "Legenda opcional"
  }'
```

#### Enviar Documento
```bash
curl -X POST https://sua-api.com/message/send-document \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "documentUrl": "https://exemplo.com/arquivo.pdf",
    "fileName": "contrato.pdf",
    "mimetype": "application/pdf"
  }'
```

#### Enviar Áudio (Mensagem de Voz)
```bash
curl -X POST https://sua-api.com/message/send-audio \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "audioUrl": "https://exemplo.com/audio.mp3",
    "ptt": true
  }'
```

#### Enviar Localização
```bash
curl -X POST https://sua-api.com/message/send-location \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "São Paulo",
    "address": "Centro de SP"
  }'
```

#### Enviar Contato
```bash
curl -X POST https://sua-api.com/message/send-contact \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "to": "5511999999999",
    "contactName": "João Silva",
    "contactNumber": "5511888888888"
  }'
```

---

### Grupos

#### Criar Grupo
```bash
curl -X POST https://sua-api.com/group/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "groupName": "Meu Grupo",
    "participants": ["5511999999999", "5511888888888"]
  }'
```

#### Adicionar Participantes
```bash
curl -X POST https://sua-api.com/group/123456789@g.us/add \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "participants": ["5511777777777"]
  }'
```

#### Remover Participantes
```bash
curl -X POST https://sua-api.com/group/123456789@g.us/remove \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "participants": ["5511777777777"]
  }'
```

---

### Webhook

#### Configurar Webhook
```bash
curl -X POST https://sua-api.com/webhook/set \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{
    "instanceName": "minha-instancia",
    "webhookUrl": "https://seu-servidor.com/webhook"
  }'
```

#### Ver Webhook Configurado
```bash
curl https://sua-api.com/webhook/minha-instancia \
  -H "X-API-Key: sua-chave"
```

**Eventos enviados para o webhook:**
- `connection` - Mudanças de conexão
- `message` - Novas mensagens recebidas
- `message.update` - Status de mensagens (enviada, entregue, lida)

---

### Utilitários

#### Verificar se Número Existe no WhatsApp
```bash
curl https://sua-api.com/check-number/minha-instancia/5511999999999 \
  -H "X-API-Key: sua-chave"
```

#### Obter Foto de Perfil
```bash
curl https://sua-api.com/profile-picture/minha-instancia/5511999999999 \
  -H "X-API-Key: sua-chave"
```

---

## ⚠️ Avisos Importantes

1. **Esta é uma API NÃO OFICIAL** - O WhatsApp pode bloquear números que usam APIs não oficiais
2. **Use com responsabilidade** - Evite spam e respeite os termos de uso do WhatsApp
3. **Faça backup das sessões** - Configure volumes no Easypanel
4. **Mude a API_KEY** - Use uma chave forte e única

---

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Ou com Docker
docker-compose up -d
```

---

## 📝 Licença

MIT - Use como quiser, mas por sua conta e risco!
