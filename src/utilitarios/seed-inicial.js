const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs'); // Assumindo que usa bcryptjs como visto em outros arquivos ou padrão
const logger = require('../config/logger');

async function seedInicial() {
    logger.info('Verificando dados iniciais (Seed)...');

    try {
        // 1. Verificar se existe algum plano
        const planosRes = await query('SELECT id FROM planos LIMIT 1');
        let planoId = null;

        if (planosRes.rows.length === 0) {
            logger.info('Criando planos padrão...');
            // Inserir plano Business
            const planoSql = `
        INSERT INTO planos (nome, slug, preco_mensal, creditos_mensais, max_usuarios, max_instancias, max_contatos, funcionalidades)
        VALUES ('Business', 'business', 197.00, 10000, 10, 5, 10000, '{"todas": true}')
        RETURNING id
      `;
            const novoPlano = await query(planoSql);
            planoId = novoPlano.rows[0].id;
        } else {
            planoId = planosRes.rows[0].id;
        }

        // 2. Verificar se existe alguma empresa
        const empresasRes = await query('SELECT id FROM empresas LIMIT 1');
        let empresaId = null;

        if (empresasRes.rows.length === 0) {
            logger.info('Nenhuma empresa encontrada. Criando empresa padrão...');

            const empresaSql = `
        INSERT INTO empresas (nome, slug, email, telefone, plano_id, status)
        VALUES ('Minha Empresa', 'minha-empresa', 'admin@meuwhatsapp.com', '5511999999999', $1, 'ativo')
        RETURNING id
      `;
            const novaEmpresa = await query(empresaSql, [planoId]);
            empresaId = novaEmpresa.rows[0].id;
            logger.info(`Empresa padrão criada com ID: ${empresaId}`);
        } else {
            empresaId = empresasRes.rows[0].id;
        }

        // 3. Verificar se existe usuário admin
        const usuariosRes = await query('SELECT id FROM usuarios WHERE empresa_id = $1 LIMIT 1', [empresaId]);

        if (usuariosRes.rows.length === 0) {
            logger.info('Criando usuário administrador padrão...');

            // Gerar hash de senha (senha padrão: 123456)
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash('123456', salt);

            const usuarioSql = `
        INSERT INTO usuarios (empresa_id, nome, email, senha_hash, funcao, ativo)
        VALUES ($1, 'Administrador', 'admin@meuwhatsapp.com', $2, 'admin', true)
      `;
            await query(usuarioSql, [empresaId, senhaHash]);
            logger.info('Usuário admin criado: admin@meuwhatsapp.com / 123456');
        }

        logger.info('Verificação de seed concluída.');
    } catch (error) {
        logger.error('Erro ao executar seed inicial:', error);
    }
}

module.exports = { seedInicial };
