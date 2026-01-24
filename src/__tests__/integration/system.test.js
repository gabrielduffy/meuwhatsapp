const request = require('supertest');
const app = require('../../index');
const usuarioRepo = require('../../repositorios/usuario.repositorio');
const empresaRepo = require('../../repositorios/empresa.repositorio');

// Mock dos repositórios
jest.mock('../../repositorios/usuario.repositorio');
jest.mock('../../repositorios/empresa.repositorio');

describe('System & Plans API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usuarioRepo.buscarPorId.mockResolvedValue({ id: 1, email: 'test@example.com', ativo: true, empresa_id: 1, funcao: 'admin' });
        empresaRepo.buscarPorId.mockResolvedValue({ id: 1, nome: 'Test Corp', status: 'ativo' });
    });
    describe('GET /health', () => {
        it('deve retornar status OK', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('ok');
        });
    });

    describe('GET /api/status/api/current', () => {
        it('deve retornar 200 (rota pública ou mockada)', async () => {
            // Mocking the repository response for status
            const { query } = require('../../config/database');
            query.mockResolvedValue({
                rows: [
                    { id: 1, name: 'API Principal', status: 'operational' }
                ]
            });

            const response = await request(app).get('/api/status/api/current');
            expect(response.status).toBe(200);
            expect(response.body.overall).toBeDefined();
        });
    });

    describe('GET /api/planos', () => {
        it('deve listar planos disponíveis', async () => {
            const { query } = require('../../config/database');
            const { getTestToken } = require('../utils/auth-helper');
            const token = `Bearer ${getTestToken()}`;

            query.mockResolvedValue({
                rows: [
                    { id: 1, nome: 'Starter', slug: 'starter' },
                    { id: 2, nome: 'Pro', slug: 'pro' }
                ]
            });

            const response = await request(app)
                .get('/api/planos')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            expect(response.body.planos).toBeDefined();
            expect(Array.isArray(response.body.planos)).toBe(true);
            expect(response.body.planos[0].nome).toBe('Starter');
        });
    });
});
