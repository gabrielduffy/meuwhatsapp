const request = require('supertest');
const app = require('../../index');
const { getTestToken } = require('../utils/auth-helper');
const usuarioRepo = require('../../repositorios/usuario.repositorio');
const empresaRepo = require('../../repositorios/empresa.repositorio');

// Mock dos repositórios
jest.mock('../../repositorios/usuario.repositorio');
jest.mock('../../repositorios/empresa.repositorio');

describe('Users API (Integration)', () => {
    const token = `Bearer ${getTestToken()}`;

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mocks for auth middleware
        usuarioRepo.buscarPorId.mockResolvedValue({ id: 1, email: 'test@example.com', ativo: true, empresa_id: 1, funcao: 'admin' });
        empresaRepo.buscarPorId.mockResolvedValue({ id: 1, nome: 'Test Corp', status: 'ativo' });
    });

    describe('GET /api/usuarios', () => {
        it('deve listar usuários para um admin autenticado', async () => {
            usuarioRepo.listarPorEmpresa.mockResolvedValue([
                { id: 1, nome: 'User 1', email: 'u1@ex.com' },
                { id: 2, nome: 'User 2', email: 'u2@ex.com' }
            ]);

            const response = await request(app)
                .get('/api/usuarios')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            expect(response.body.usuarios).toHaveLength(2);
            expect(usuarioRepo.listarPorEmpresa).toHaveBeenCalledWith(1, expect.any(Object));
        });

        it('deve retornar 401 para requisição sem token', async () => {
            const response = await request(app).get('/api/usuarios');
            expect(response.status).toBe(401);
        });
    });
});
