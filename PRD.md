# 📄 Documento de Requisitos de Produto (PRD) - WhatsBenemax v2.1

## 1. Visão Geral do Produto
O **WhatsBenemax** é uma plataforma SaaS multi-instância projetada para gerenciar comunicações via WhatsApp de forma profissional e automatizada. O sistema combina o poder da biblioteca **Baileys** com Inteligência Artificial (**Groq API**) para oferecer uma solução completa de atendimento, prospecção e automação de mensagens.

## 2. Objetivos Principais
- **Escalabilidade SaaS**: Permitir múltiplas empresas (tenants) gerenciarem suas próprias instâncias de WhatsApp de forma isolada.
- **Automação Inteligente**: Integrar agentes de IA que respondem clientes de forma humana e contextualizada.
- **Confiabilidade Técnica**: Utilizar tecnologias robustas (PostgreSQL, Redis, Bull) para garantir entrega de mensagens e persistência de dados.
- **Experiência do Usuário (UX)**: Facilitar o pareamento via QR Code ou código e oferecer um dashboard intuitivo (em migração para React).

## 3. Público-Alvo
- Agências de Marketing e Atendimento.
- Pequenas e médias empresas que buscam automação no WhatsApp.
- Desenvolvedores que precisam de uma API de WhatsApp robusta para integrações.

## 4. Requisitos Funcionais (Principais Módulos)

### 4.1. Gestão de Instâncias
- **Conectividade**: Criação de instâncias ilimitadas com suporte a QR Code e Código de Pareamento (Pairing Code).
- **Estabilidade**: Sistema de reconexão automática e monitoramento de status da conexão.
- **Segurança Antiban**: Cada instância pode ter seu próprio Proxy configurado.

### 4.2. Motor de Mensagens
- **Formatos**: Envio e recebimento de Texto, Imagens, Vídeos, Áudios (com conversão), Documentos, Stickers e Localização.
- **Funcionalidades Chat**: Reações com emojis, respostas (quotes), enquetes (polls) e menções.
- **Humanização**: Simulação de estados "digitando..." e "gravando áudio...".

### 4.3. Inteligência Artificial (Agente IA)
- **Motor Groq**: Integração nativa com modelos Llama/Mixtral via Groq SDK para respostas ultra-rápidas.
- **Personalidade**: Configuração de tom de voz, regras gerais e contexto de negócio por agente.
- **Gatilhos**: Respostas automáticas baseadas em primeira mensagem, palavras-chave ou "sempre responder".
- **Sistema de Créditos**: Controle de consumo por empresa baseado no uso de tokens de IA.

### 4.4. Automação e CRM
- **AutoResponder**: Sistema de respostas automáticas configuráveis via JSON/Banco.
- **Prospecção**: Módulo para disparo de campanhas de mensagens em massa (Broadcast).
- **Scheduler**: Agendamento de mensagens futuras.
- **Follow-up**: Automação de lembretes e sequências de mensagens.

### 4.5. Webhooks e Integrações
- **Webhooks v2**: Notificações em tempo real para mensagens recebidas, status de bateria, mudanças de conexão e status de mensagens.
- **Logging**: Sistema avançado de logs de webhooks com retry em caso de falha.

## 5. Requisitos Não Funcionais

### 5.1. Arquitetura Técnica (Backend)
- **Linguagem**: Node.js com Express.
- **Banco de Dados**: **PostgreSQL** para dados persistentes (Mensagens, Usuários, Empresas).
- **Cache e Filas**: **Redis** e **Bull** para processamento assíncrono e cache de performance.
- **Validação**: Uso de **Zod** para validação rigorosa de payloads de entrada.
- **Logging**: **Winston** para monitoramento de erros estruturado (arquivos e console).

### 5.2. Frontend (Em Evolução)
- **Stack**: React + TypeScript + Vite + Tailwind CSS.
- **Design System Premium**: Uso de Framer Motion para animações, Lucide-React para ícones e componentes baseados em Radix UI.

### 5.3. Segurança
- Autenticação via JWT.
- Proteção de rotas com middlewares de multi-tenancy (`empresa_id`).
- Rate limiting configurado para proteção contra ataques de força bruta/DoS.

## 6. Integrações Externas
- **WhatsApp**: Via protocolo Baileys (Socket).
- **IA**: Groq SDK (Llama 3/Mixtral).
- **Notificações**: Email e Telegram para avisos de sistema/instância offline.

## 7. Roadmap Futuro (Próximos Passos)
- [ ] Concluir a migração de 100% das páginas para a interface em React.
- [ ] Implementar suporte a múltiplos modelos de IA simultâneos (OpenAI/Anthropic).
- [ ] Criar sistema de "Aquecimento de Chip" mais avançado para evitar banimentos em contas novas.
- [ ] Gerador de relatórios em PDF/XLSX customizáveis.
