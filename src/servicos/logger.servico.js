const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.join(process.cwd(), 'logs', 'operacoes.log');

// Garantir que a pasta de logs existe
if (!fs.existsSync(path.dirname(LOGS_FILE))) {
    fs.mkdirSync(path.dirname(LOGS_FILE), { recursive: true });
}

class LoggerService {
    /**
     * Loga uma operação tanto no arquivo quanto no Banco de Dados
     */
    async log(contexto, mensagem, nivel = 'info', dados = {}, empresaId = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            nivel,
            contexto,
            mensagem,
            empresaId,
            dados
        };

        // 1. Log no Arquivo (JSONL para fácil leitura pela IA)
        try {
            fs.appendFileSync(LOGS_FILE, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error('Erro ao escrever log no arquivo:', err.message);
        }

        // 2. Log no Banco de Dados (Persistente e pesquisável)
        try {
            await query(`
                INSERT INTO logs_sistema (contexto, nivel, mensagem, dados, empresa_id)
                VALUES ($1, $2, $3, $4, $5)
            `, [contexto, nivel, mensagem, JSON.stringify(dados), empresaId]);
        } catch (err) {
            // Falha silenciosa no console para não derrubar a aplicação
            console.warn(`[Logger] Falha ao persistir no DB: ${err.message}`);
        }

        // 3. Log no Console para monitoramento em tempo real (Easypanel/PM2)
        const color = nivel === 'error' ? '\x1b[31m' : nivel === 'warn' ? '\x1b[33m' : '\x1b[36m';
        console.log(`${color}[${contexto.toUpperCase()}] ${mensagem}\x1b[0m`, dados ? JSON.stringify(dados) : '');
    }

    async info(contexto, mensagem, dados, empresaId) {
        return this.log(contexto, mensagem, 'info', dados, empresaId);
    }

    async error(contexto, mensagem, dados, empresaId) {
        return this.log(contexto, mensagem, 'error', dados, empresaId);
    }

    async warn(contexto, mensagem, dados, empresaId) {
        return this.log(contexto, mensagem, 'warn', dados, empresaId);
    }
}

module.exports = new LoggerService();
