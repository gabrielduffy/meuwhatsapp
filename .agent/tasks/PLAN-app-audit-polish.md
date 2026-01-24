# PLAN-app-audit-polish.md - Plano de Padronização e Funcionalidade

## 1. Análise de Situação
O projeto WhatsBenemax possui uma base visual sólida, mas sofre de "débito técnico visual" e funcionalidades incompletas em abas secundárias.

## 2. Fase 1: Padronização UI/UX (O "WOW" Factor)
- **Unificação de Backgrounds**: Remover gradientes redundantes das páginas individuais; o `Layout.tsx` deve ser o único responsável pelo fundo global.
- **Design System Centralizado**: 
    - Converter a `<table>` do `Manager.tsx` e de outras páginas para o componente `<Table />`.
    - Substituir todos os `alert()` por `react-hot-toast`.
    - Padronizar os `KPICards` do Dashboard para usarem o componente `<Card />` da UI.
- **Correção de Layout**: Sincronizar os paddings e gaps das 24 páginas para usarem os mesmos tokens do Tailwind (ex: `p-6 space-y-6`).

## 3. Fase 2: Auditoria de Funcionalidades (Backend + Frontend)
- **Integração de Métricas**: Conectar os cards de "Performance" no Manager aos endpoints reais de `/metrics`.
- **Validação de Botões**:
    - Verificar botões de "Exportar/Importar" em Contatos.
    - Testar fluxo de "Nova Negociação" no CRM.
    - Validar criação de usuários e empresas no Manager.
- **Remoção de Mocks**: Garantir que se a API falhar, o sistema exiba um "Erro de Conexão" elegante em vez de carregar dados inventados (como ocorre no Dashboard).

## 4. Fase 3: Verificação e Testes
- Executar `src/__tests__/integration/` após as correções.
- Realizar auditoria visual (responsividade e contraste).

## 5. Atribuições
- **Frontend-Specialist**: Ajustes de layout, Toasts e componentização.
- **Backend-Specialist**: Verificação de rotas e integração de métricas reais.
- **Test-Engineer**: Validação final de cada botão.
