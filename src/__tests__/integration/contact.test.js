const request = require('supertest');
const app = require('../../index');
const { getTestToken } = require('../utils/auth-helper');
const contatoRepo = require('../../repositorios/contato.repositorio');
const usuarioRepo = require('../../repositorios/usuario.repositorio');
const empresaRepo = require('../../repositorios/empresa.repositorio');

// Mock dos repositórios
jest.mock('../../repositorios/contato.repositorio');
jest.mock('../../repositorios/usuario.repositorio');
jest.mock('../../repositorios/empresa.repositorio');

describe('Contact API (Integration)', () => {
    const token = `Bearer ${getTestToken()}`;

    beforeEach(() => {
        jest.clearAllMocks();
        usuarioRepo.buscarPorId.mockResolvedValue({ id: 1, ativo: true, empresa_id: 1 });
        empresaRepo.buscarPorId.mockResolvedValue({ id: 1, nome: 'Empresa Teste', status: 'ativo' });
    });

    describe('POST /api/contatos', () => {
        it('deve criar um novo contato com sucesso', async () => {
            contatoRepo.buscarPorTelefone.mockResolvedValue(null);
            contatoRepo.criar.mockResolvedValue({
                id: 1,
                nome: 'Lead Teste',
                telefone: '5511999999999'
            });

            const response = await request(app)
                .post('/api/contatos')
                .set('Authorization', token)
                .send({
                    nome: 'Lead Teste',
                    telefone: '5511999999999',
                    email: 'lead@ex.com'
                });

            expect(response.status).toBe(201);
            expect(response.body.contato.nome).toBe('Lead Teste');
            expect(contatoRepo.criar).toHaveBeenCalled();
        });

        it('deve retornar 400 se o contato já existir', async () => {
            contatoRepo.buscarPorTelefone.mockResolvedValue({ id: 99, telefone: '5511999999999' });

            const response = await request(app)
                .post('/api/contatos')
                .set('Authorization', token)
                .send({
                    nome: 'Lead Duplicado',
                    telefone: '5511999999999'
                });

            expect(response.status).toBe(400);
            expect(response.body.erro).toContain('Já existe um contato');
        });
    });
});
