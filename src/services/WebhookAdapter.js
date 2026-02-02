/**
 * Adaptador de Webhooks para Múltiplos Provedores
 * Normaliza payloads da Meta Cloud API e Baileys para um formato interno comum
 */
class WebhookAdapter {
    /**
     * Transforma o webhook da Meta (Official Cloud API) no formato interno
     */
    static fromOfficial(payload, instanceName) {
        const entry = payload.entry?.[0];
        const change = entry?.changes?.[0]?.value;

        if (!change) return null;

        // 1. Processar MENSAGENS
        if (change.messages) {
            const message = change.messages[0];
            const contact = change.contacts?.[0];
            const profileName = contact?.profile?.name || message.from;

            const typeMapping = {
                text: 'texto',
                image: 'imagem',
                audio: 'audio',
                video: 'video',
                document: 'documento',
                sticker: 'sticker',
                location: 'localização',
                contacts: 'contato'
            };

            let conteudo = '';
            let midiaUrl = null;

            if (message.type === 'text') {
                conteudo = message.text.body;
            } else if (message[message.type]) {
                // Para mídias, a Cloud API envia um ID. 
                // O sistema principal chamará provider.downloadMedia(id) se necessário
                midiaUrl = `official_media_id:${message[message.type].id}`;
                conteudo = message[message.type].caption || '';
            }

            return {
                instanceName: instanceName,
                event: 'messages.upsert',
                data: {
                    key: {
                        remoteJid: `${message.from}@s.whatsapp.net`,
                        fromMe: false,
                        id: message.id
                    },
                    pushName: profileName,
                    message: {
                        conversation: message.text?.body || ''
                    },
                    messageTimestamp: message.timestamp,
                    owner: instanceName
                },
                contatoTelefone: message.from,
                contatoNome: profileName,
                whatsappMensagemId: message.id,
                tipoMensagem: typeMapping[message.type] || 'texto',
                conteudo: conteudo,
                midiaUrl: midiaUrl,
                status: 'recebida',
                direcao: 'recebida',
                metadados: { raw: payload, official_id: message.id }
            };
        }

        // 2. Processar STATUS (entregue, lida, enviada)
        if (change.statuses) {
            const statusUpdate = change.statuses[0];
            return {
                instanceName: instanceName,
                event: 'messages.update',
                data: {
                    key: {
                        remoteJid: `${statusUpdate.recipient_id}@s.whatsapp.net`,
                        id: statusUpdate.id,
                        fromMe: true
                    },
                    status: statusUpdate.status // 'sent', 'delivered', 'read', 'failed'
                }
            };
        }

        return null;
    }

    /**
     * Transforma o payload do Baileys
     */
    static fromBaileys(payload, instanceName) {
        return {
            ...payload,
            instanceName,
            provider: 'baileys'
        };
    }
}

module.exports = WebhookAdapter;
