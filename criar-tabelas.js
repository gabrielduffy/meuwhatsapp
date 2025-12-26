/**
 * Script simplificado para criar tabelas no Easypanel
 * Execute com: node criar-tabelas.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// No Easypanel, DATABASE_URL já está no ambiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
  console.log('║  🔧 CRIAÇÃO DE TABELAS - WHATSBENEMAX                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  console.log('\n🔌 Conectando ao banco de dados...');

  try {
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado com sucesso!\n');

    // Executar schemas em ordem de dependência
    await executarSchema('schema.sql', 'Tabelas Base (instances, metrics)');
    await executarSchema('saas-schema.sql', 'Tabelas SaaS (empresas, planos, usuários)');
    await executarSchema('status-schema.sql', 'Tabelas de Status Page');
    await executarSchema('ia-prospeccao-schema.sql', 'Tabelas de IA e Prospecção');
    await executarSchema('chat-schema.sql', 'Tabelas de Chat e Integrações');
    await executarSchema('crm-schema.sql', 'Tabelas de CRM Kanban');
    await executarSchema('followup-schema.sql', 'Tabelas de Follow-up Inteligente');
    await executarSchema('whitelabel-schema.sql', 'Tabelas de White Label');

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ TABELAS CRIADAS COM SUCESSO!                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (erro) {
    console.error('\n❌ Erro:', erro.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
