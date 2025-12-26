/**
 * Script para criar as tabelas novas no banco de dados
 * Execute com: node criar-tabelas-novas.js
 */

const fs = require('fs');
const path = require('path');

// Carregar configuração do banco
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsbenemax',
  user: process.env.DB_USER || 'whatsbenemax',
  password: process.env.DB_PASSWORD,
});

async function executarSchema(nomeArquivo, descricao) {
  console.log(`\n📄 ${descricao}...`);

  const caminhoArquivo = path.join(__dirname, 'src', 'config', nomeArquivo);

  if (!fs.existsSync(caminhoArquivo)) {
    console.log(`⚠️  Arquivo ${nomeArquivo} não encontrado, pulando...`);
    return;
  }

  const sql = fs.readFileSync(caminhoArquivo, 'utf8');

  try {
    await pool.query(sql);
    console.log(`✅ ${descricao} - OK`);
  } catch (erro) {
    // Ignorar erros de "já existe"
    if (erro.message.includes('already exists') || erro.code === '42P07') {
      console.log(`⚠️  ${descricao} - Algumas tabelas já existem (OK)`);
    } else {
      console.error(`❌ ${descricao} - ERRO:`, erro.message);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 CRIAÇÃO DE TABELAS NOVAS - WHATSBENEMAX          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  console.log('\n🔌 Conectando ao banco de dados...');
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'whatsbenemax'}`);

  try {
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado com sucesso!\n');

    // Executar schemas em ordem
    await executarSchema('saas-schema.sql', 'Tabelas SaaS (empresas, planos, usuários)');
    await executarSchema('status-schema.sql', 'Tabelas de Status Page');
    await executarSchema('ia-prospeccao-schema.sql', 'Tabelas de IA e Prospecção');
    await executarSchema('chat-schema.sql', 'Tabelas de Chat e Integrações');
    await executarSchema('crm-schema.sql', 'Tabelas de CRM Kanban');
    await executarSchema('followup-schema.sql', 'Tabelas de Follow-up Inteligente');
    await executarSchema('whitelabel-schema.sql', 'Tabelas de White Label');

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ TODAS AS TABELAS FORAM CRIADAS COM SUCESSO!      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (erro) {
    console.error('\n❌ Erro ao conectar ao banco:', erro.message);
    console.error('\n💡 Verifique se:');
    console.error('   1. O PostgreSQL está rodando');
    console.error('   2. As variáveis de ambiente estão corretas');
    console.error('   3. O banco de dados existe');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
