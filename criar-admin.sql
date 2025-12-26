-- ================================================
-- CRIAR USUÁRIO ADMINISTRADOR
-- Email: gabriel.duffy@hotmail.com
-- Senha: 412trocar
-- ================================================

-- 1. Criar empresa principal
INSERT INTO empresas (
  nome,
  cnpj,
  email,
  telefone,
  plano,
  status,
  limite_usuarios,
  limite_instancias,
  limite_mensagens_mes,
  criado_em
) VALUES (
  'WhatsBenemax Admin',
  '00.000.000/0001-00',
  'admin@whatsbenemax.com',
  '(00) 00000-0000',
  'enterprise',
  'ativa',
  999,
  999,
  999999,
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome;

-- 2. Criar usuário administrador
-- Senha: 412trocar (hash bcrypt)
INSERT INTO usuarios (
  empresa_id,
  nome,
  email,
  senha_hash,
  funcao,
  ativo,
  avatar_url,
  criado_em
) VALUES (
  (SELECT id FROM empresas WHERE email = 'admin@whatsbenemax.com'),
  'Gabriel Duffy',
  'gabriel.duffy@hotmail.com',
  '$2a$10$I4Sz55NkSm98I5/J7Byh2umHEJMGpgAnvLW/H1y2LT1a6d3Yf0cKm',
  'administrador',
  true,
  'https://ui-avatars.com/api/?name=Gabriel+Duffy&background=5B21B6&color=fff',
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  senha_hash = EXCLUDED.senha_hash,
  funcao = EXCLUDED.funcao,
  ativo = true;

-- Verificar criação
SELECT
  u.id,
  u.nome,
  u.email,
  u.funcao,
  e.nome as empresa
FROM usuarios u
JOIN empresas e ON u.empresa_id = e.id
WHERE u.email = 'gabriel.duffy@hotmail.com';
