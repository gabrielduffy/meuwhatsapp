/**
 * Configuração do Swagger/OpenAPI
 * Documentação interativa da API
 */

const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./env');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsBenemax Business API',
      version: '2.5.0',
      description: `
        # 🚀 WhatsBenemax Business API
        
        Bem-vindo à documentação oficial da **WhatsBenemax API**. Nossa solução foi projetada para oferecer escalabilidade, segurança e alta performance para suas integrações com o WhatsApp.

        ## 🔐 Autenticação
        Existem dois níveis de segurança em nossa API:
        1. **Global API Key**: Usada para gerenciar instâncias e funções administrativas.
           - Header: \`X-API-Key\`
        2. **Instance Token**: Cada instância possui seu próprio token de segurança.
           - Header: \`X-Instance-Token\`

        ## 📱 Recursos Principais
        - **Multi-instâncias**: Gerencie centenas de conexões simultâneas.
        - **IA Integrada**: Agentes inteligentes que respondem por você.
        - **Webhooks Avançados**: Receba eventos em tempo real com retry automático.
        - **Media Management**: Envio de áudios (como gravação), imagens, vídeos e documentos.

        ---
        *Para suporte técnico, acesse nosso portal do cliente.*
      `,
      contact: {
        name: 'Suporte WhatsBenemax',
        email: 'suporte@whatsbenemax.com',
        url: 'https://whatsbenemax.com/suporte'
      }
    },
    license: {
      name: 'Proprietary',
      url: 'https://whatsbenemax.com/terms'
    }
  },
  servers: [
    {
      url: 'https://meuwhatsapp-meuwhatsapp.ax5glv.easypanel.host',
      description: 'Servidor Easypanel (Atual)'
    },
    {
      url: 'https://api.whatsbenemax.com',
      description: 'Produção Principal'
    },
    {
      url: 'http://localhost:3000',
      description: 'Desenvolvimento Local'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido através do endpoint /api/auth/login'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Chave de API para rotas legadas (definida no arquivo .env)'
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
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../middlewares/*.js')
  ]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Customizar tema do Swagger UI (Premium Dark Theme)
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #8e44ad; }
    .swagger-ui .opblock.opblock-post { background: rgba(142, 68, 173, 0.1); border-color: #8e44ad; }
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #8e44ad; }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #8e44ad; }
    .swagger-ui .btn.execute { background-color: #8e44ad; color: white; border: none; }
    .swagger-ui .btn.execute:hover { background-color: #7d3c98; }
    body { background-color: #1b1b1b !important; color: #e0e0e0 !important; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    .swagger-ui .microlight { filter: invert(100%) hue-rotate(180deg); }
  `,
  customSiteTitle: 'WhatsBenemax Business API',
  customfavIcon: 'https://whatsbenemax.com/favicon.ico'
};

module.exports = {
  swaggerUi,
  swaggerDocs,
  swaggerUiOptions
};
