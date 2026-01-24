const request = require('supertest');
const app = require('../../index');
const { getTestToken } = require('../utils/auth-helper');
const empresaRepo = require('../../repositorios/empresa.repositorio');
const usuarioRepo = require('../../repositorios/usuario.repositorio');

// Mock dos repositórios
jest.mock('../../repositorios/empresa.repositorio');
jest.mock('../../repositorios/usuario.repositorio');

describe('Company API (Integration)', () => {
    const token = `Bearer ${getTestToken()}`;

    beforeEach(() => {
        jest.clearAllMocks();
        usuarioRepo.buscarPorId.mockResolvedValue({ id: 1, ativo: true, empresa_id: 1 });
        empresaRepo.buscarPorId.mockResolvedValue({ id: 1, nome: 'Empresa Teste', status: 'ativo' });
    });

    describe('GET /api/empresa', () => {
        it('deve retornar os dados da empresa autenticada', async () => {
            const response = await request(app)
                .get('/api/empresa')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            expect(response.body.empresa.nome).toBe('Empresa Teste');
        });
    });

    describe('GET /api/empresa/uso', () => {
        it('deve retornar estatísticas de uso', async () => {
            const { query } = require('../../config/database');
            query.mockResolvedValue({ rows: [{ count: '5' }] }); // Para usuários, instâncias e contatos

            const response = await request(app)
                .get('/api/empresa/uso')
                .set('Authorization', token);

            expect(response.status).toBe(200);
            expect(response.body.uso).toHaveProperty('usuarios');
        });
    });
});
