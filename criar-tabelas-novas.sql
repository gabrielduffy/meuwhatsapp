-- ==========================================
-- SCRIPT PARA CRIAR APENAS AS TABELAS NOVAS
-- Execute este arquivo no banco de dados
-- ==========================================

-- Este script cria APENAS as tabelas que faltam:
-- 1. SaaS (empresas, planos, usuários, etc)
-- 2. CRM Kanban
-- 3. Follow-up Inteligente
-- 4. White Label

-- Para executar no Easypanel (Terminal ou psql):
-- psql -h POSTGRES_HOST -U POSTGRES_USER -d POSTGRES_DB -f criar-tabelas-novas.sql

\echo '=== Iniciando criação das tabelas novas ==='

-- ==========================================
-- INCLUIR SCHEMA SAAS
-- ==========================================
\echo 'Criando tabelas SaaS...'
\i src/config/saas-schema.sql

-- ==========================================
-- INCLUIR SCHEMA CRM
-- ==========================================
\echo 'Criando tabelas CRM Kanban...'
\i src/config/crm-schema.sql

-- ==========================================
-- INCLUIR SCHEMA FOLLOW-UP
-- ==========================================
\echo 'Criando tabelas Follow-up...'
\i src/config/followup-schema.sql

-- ==========================================
-- INCLUIR SCHEMA WHITE LABEL
-- ==========================================
\echo 'Criando tabelas White Label...'
\i src/config/whitelabel-schema.sql

\echo '=== Tabelas criadas com sucesso! ==='
