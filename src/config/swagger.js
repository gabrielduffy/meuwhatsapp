/**
 * Configuração do Swagger/OpenAPI
 * Documentação interativa da API
 */

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./env');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsBenemax API',
      version: '2.1.0',
      description: `
        API completa para gerenciamento de WhatsApp Multi-tenant SaaS.

        ## Autenticação
        Todas as rotas (exceto login/registro) requerem autenticação via JWT.

        Use o header: \`Authorization: Bearer {token}\`

        ## Multi-tenancy
        Todas as operações são isoladas por \`empresa_id\` automaticamente.
      `,
      contact: {
        name: 'Suporte WhatsBenemax',
        email: 'suporte@whatsbenemax.com',
        url: 'https://whatsbenemax.com/suporte'
      },
      license: {
        name: 'Proprietary',
        url: 'https://whatsbenemax.com/terms'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Desenvolvimento Local'
      },
      {
        url: 'https://api.whatsbenemax.com',
        description: 'Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint /api/auth/login'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token ausente ou inválido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'INVALID_TOKEN' },
                      message: { type: 'string', example: 'Token inválido' }
                    }
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Dados de entrada inválidos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'VALIDATION_ERROR' },
                      message: { type: 'string', example: 'Dados inválidos' },
                      details: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            message: { type: 'string' },
                            code: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'NOT_FOUND' },
                      message: { type: 'string', example: 'Recurso não encontrado' }
                    }
                  }
                }
              }
            }
          }
        },
        InternalError: {
          description: 'Erro interno do servidor',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'INTERNAL_ERROR' },
                      message: { type: 'string', example: 'Erro interno do servidor' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@example.com' },
            funcao: {
              type: 'string',
              enum: ['administrador', 'empresa', 'usuario', 'afiliado'],
              example: 'usuario'
            },
            ativo: { type: 'boolean', example: true },
            empresa_id: { type: 'integer', example: 1 },
            criado_em: { type: 'string', format: 'date-time' },
            atualizado_em: { type: 'string', format: 'date-time' }
          }
        },
        Empresa: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nome: { type: 'string', example: 'Empresa XYZ' },
            email: { type: 'string', format: 'email' },
            telefone: { type: 'string', example: '5511999999999' },
            documento: { type: 'string', example: '12345678901234' },
            status: {
              type: 'string',
              enum: ['ativo', 'trial', 'inativo', 'bloqueado'],
              example: 'ativo'
            },
            whitelabel_ativo: { type: 'boolean', example: false },
            criado_em: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      { name: 'Auth', description: 'Autenticação e autorização' },
      { name: 'Usuários', description: 'Gerenciamento de usuários' },
      { name: 'Empresas', description: 'Gerenciamento de empresas' },
      { name: 'WhatsApp', description: 'Operações de WhatsApp (instâncias, mensagens)' },
      { name: 'CRM', description: 'Gestão de relacionamento com clientes' },
      { name: 'Agentes IA', description: 'Assistentes virtuais inteligentes' },
      { name: 'Sistema', description: 'Endpoints de sistema (health, status)' }
    ]
  },
  apis: [
    './src/rotas/*.js',
    './src/routes/*.js',
    './src/middlewares/*.js'
  ]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Customizar tema do Swagger UI
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsBenemax API Docs',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  swaggerUi,
  swaggerDocs,
  swaggerUiOptions
};
