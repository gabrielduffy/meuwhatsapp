/**
 * Provedor Oficial do WhatsApp (Meta Cloud API)
 */
class OfficialProvider {
    constructor(instanceName, config) {
        this.instanceName = instanceName;
        this.config = config; // { accessToken, phoneNumberId, wabaId, verifyToken }
        this.isConnected = false;
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
