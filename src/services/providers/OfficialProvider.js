/**
 * Provedor Oficial do WhatsApp (Meta Cloud API)
 */
const fs = require('fs');
const path = require('path');

class OfficialProvider {
    constructor(instanceName, config) {
        this.instanceName = instanceName;
        this.config = config; // { accessToken, phoneNumberId, wabaId, verifyToken }
        this.isConnected = false;
        this.uploadsDir = '/app/uploads'; // Alinhado com o sistema
    }

    async initialize() {
        console.log(`[${this.instanceName}] Inicializando Provedor Oficial...`);
        if (!this.config.accessToken || !this.config.phoneNumberId) {
            throw new Error('Configuração da API Oficial incompleta (AccessToken/PhoneNumberId ausentes)');
        }
        this.isConnected = true;
        return this;
    }

    async sendText(to, text, options = {}) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "text",
            text: { body: text, preview_url: options.preview_url || false }
        };

        return this._request(url, body);
    }

    async sendImage(to, imageUrl, caption, options = {}) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "image",
            image: { link: imageUrl, caption: caption }
        };

        return this._request(url, body);
    }

    async sendDocument(to, documentUrl, fileName, mimetype, caption, options = {}) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "document",
            document: { link: documentUrl, filename: fileName, caption: caption }
        };

        return this._request(url, body);
    }

    async sendAudio(to, audioUrl, ptt, options = {}) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "audio",
            audio: { link: audioUrl }
        };

        return this._request(url, body);
    }

    async sendVideo(to, videoUrl, caption, options = {}) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "video",
            video: { link: videoUrl, caption: caption }
        };

        return this._request(url, body);
    }

    /**
     * Enviar Mensagem via Template (Obrigatório para iniciar conversas fora da janela 24h)
     */
    async sendTemplate(to, templateName, languageCode = 'pt_BR', components = []) {
        const cleanTo = to.replace(/\D/g, '');
        const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        };

        return this._request(url, body);
    }

    /**
     * Download de mídia da Meta (Convertendo ID em arquivo local)
     */
    async downloadMedia(mediaId) {
        try {
            // 1. Obter URL temporária da mídia
            const getUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
            const responseUrl = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${this.config.accessToken}` }
            });
            const mediaData = await responseUrl.json();

            if (!mediaData.url) throw new Error('Não foi possível obter a URL da mídia');

            // 2. Baixar o arquivo real
            const fileResponse = await fetch(mediaData.url, {
                headers: { 'Authorization': `Bearer ${this.config.accessToken}` }
            });
            const buffer = Buffer.from(await fileResponse.arrayBuffer());

            // 3. Salvar no disco (uploads)
            const extension = mediaData.mime_type?.split('/')[1] || 'bin';
            const fileName = `official_${mediaId}_${Date.now()}.${extension}`;
            const fullPath = path.join(this.uploadsDir, fileName);

            fs.writeFileSync(fullPath, buffer);

            return {
                fileName,
                url: `/uploads/${fileName}`,
                mimeType: mediaData.mime_type
            };
        } catch (error) {
            console.error(`[${this.instanceName}] Falha no download de mídia:`, error.message);
            throw error;
        }
    }

    async _request(url, body) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`[${this.instanceName}] Erro Meta API:`, JSON.stringify(data));
                throw new Error(data.error?.message || 'Erro na Cloud API');
            }

            return {
                success: true,
                messageId: data.messages?.[0]?.id,
                key: { id: data.messages?.[0]?.id, remoteJid: body.to, fromMe: true }
            };
        } catch (error) {
            console.error(`[${this.instanceName}] Erro na requisição (Oficial):`, error.message);
            throw error;
        }
    }

    async logout() {
        this.isConnected = false;
        console.log(`[${this.instanceName}] Desconectando Provedor Oficial.`);
    }

    getStatus() {
        return {
            connected: this.isConnected,
            type: 'official'
        };
    }
}

module.exports = OfficialProvider;
