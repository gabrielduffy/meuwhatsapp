const request = require('supertest');
const app = require('../../index');
const whatsapp = require('../../services/whatsapp');

// Mock do serviço WhatsApp
jest.mock('../../services/whatsapp');

describe('Messages API (Integration)', () => {
    const apiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/message/send-text', () => {
        it('deve enviar mensagem de texto com sucesso', async () => {
            whatsapp.sendText.mockResolvedValue({
                success: true,
                message: { key: { id: 'msg123' } }
            });

            const response = await request(app)
                .post('/api/message/send-text')
                .set('X-API-Key', apiKey)
                .send({
                    instanceName: 'test-inst',
                    to: '5511999999999',
                    text: 'Olá do teste!'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(whatsapp.sendText).toHaveBeenCalledWith('test-inst', '5511999999999', 'Olá do teste!', {});
        });

        it('deve retornar 400 se faltar parâmetros', async () => {
            const response = await request(app)
                .post('/api/message/send-text')
                .set('X-API-Key', apiKey)
                .send({
                    instanceName: 'test-inst'
                    // faltando 'to' e 'text'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });
    });
});
