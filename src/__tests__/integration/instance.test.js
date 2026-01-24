const request = require('supertest');
const app = require('../../index');
const { query } = require('../../config/database');
const whatsapp = require('../../services/whatsapp');

// Mock do serviço WhatsApp
jest.mock('../../services/whatsapp');

describe('Instance API (Integration)', () => {
    const apiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        query.mockResolvedValue({
            rows: [{ id: 1, nome: 'Empresa Teste', count: '0' }]
        });
        whatsapp.getInstance.mockReturnValue(null);
        whatsapp.getAllInstances.mockReturnValue({});
        whatsapp.createInstance.mockResolvedValue({
            success: true,
            instanceName: 'new-inst'
        });
    });

    describe('GET /api/instance/list', () => {
        it('deve listar instâncias para uma empresa autenticada', async () => {
            query.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Empresa Teste' }] }); // Middleware
            query.mockResolvedValueOnce({
                rows: [
                    { instance_name: 'test-inst', status: 'connected', empresa_id: 1 }
                ]
            });

            const response = await request(app)
                .get('/api/instance/list')
                .set('X-API-Key', apiKey);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('POST /api/instance/create', () => {
        it('deve criar uma nova instância', async () => {
            whatsapp.createInstance.mockResolvedValue({
                success: true,
                instanceName: 'new-inst'
            });

            const response = await request(app)
                .post('/api/instance/create')
                .set('X-API-Key', apiKey)
                .send({
                    instanceName: 'new-inst'
                });

            expect(response.status).toBe(200); // Route returns 200 actually, not 201
            expect(response.body.instance).toHaveProperty('instanceName', 'new-inst');
        });
    });
});
