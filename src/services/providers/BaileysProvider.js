/**
 * Provedor Baileys (Não-Oficial)
 * Encapsula a lógica original do whatsapp.js
 */
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

class BaileysProvider {
    constructor(instanceName, options = {}) {
        this.instanceName = instanceName;
        this.options = options;
        this.socket = null;
        this.isConnected = false;
        this.qrCode = null;
        this.qrCodeBase64 = null;
        this.sessionsDir = path.resolve(process.env.WHATSAPP_SESSION_DIR || './sessions');
        this.logger = pino({ level: process.env.LOG_LEVEL || 'info' }).child({ instance: instanceName });
    }

    async initialize() {
        const sessionPath = path.join(this.sessionsDir, this.instanceName);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        let version = [2, 3000, 1017531287];

        try {
            const fetched = await fetchLatestBaileysVersion();
            version = fetched.version;
        } catch (err) {
            console.warn(`[${this.instanceName}] Usando fallback de versão Baileys`);
        }

        this.socket = makeWASocket({
            version,
            logger: this.logger,
            auth: {
                creds: state.creds,
                keys: state.keys
            },
            printQRInTerminal: false,
            browser: ['Windows', 'Chrome', '125.0.0.0']
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', (update) => {
            const { connection, qr } = update;
            if (qr) this.qrCode = qr;
            if (connection === 'open') {
                this.isConnected = true;
                this.qrCode = null;
            }
            if (connection === 'close') {
                this.isConnected = false;
            }
        });

        return this;
    }

    async sendText(to, text) {
        if (!this.isConnected) throw new Error('Instância não conectada');
        const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
        return await this.socket.sendMessage(jid, { text });
    }

    async logout() {
        if (this.socket) {
            await this.socket.logout();
            this.isConnected = false;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            qr: this.qrCode,
            type: 'baileys'
        };
    }
}

module.exports = BaileysProvider;
