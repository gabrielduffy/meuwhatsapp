const request = require('supertest');
const app = require('../../index');
const { query } = require('../../config/database');
const autenticacaoServico = require('../../servicos/autenticacao.servico');

// Mock do serviço de autenticação para isolar o teste da rota
jest.mock('../../servicos/autenticacao.servico');

describe('Auth API (Integration)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/autenticacao/entrar', () => {
        it('deve retornar 200 e token ao fazer login com sucesso', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                nome: 'Test User'
            };

            autenticacaoServico.entrar.mockResolvedValue({
                token: 'mock-jwt-token',
                usuario: mockUser,
                empresa: { id: 1, nome: 'Test Corp' }
            });

            const response = await request(app)
                .post('/api/autenticacao/entrar')
                .send({
                    email: 'test@example.com',
                    senha: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.usuario.email).toBe('test@example.com');
        });

        it('deve retornar 401 para credenciais inválidas', async () => {
            autenticacaoServico.entrar.mockRejectedValue(new Error('Email ou senha incorretos'));

            const response = await request(app)
                .post('/api/autenticacao/entrar')
                .send({
                    email: 'wrong@example.com',
                    senha: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('erro', 'Email ou senha incorretos');
        });
    });

    describe('GET /api/autenticacao/eu', () => {
        it('deve retornar 401 se não houver token', async () => {
            const response = await request(app).get('/api/autenticacao/eu');
            expect(response.status).toBe(401);
        });
    });
});
