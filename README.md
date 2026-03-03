# Cadastro de clientes - Loja de roupas

Sistema web para substituir a ficha de papel no controle de compras, parcelas e pagamentos dos clientes.

## Funcionalidades

- Menu inicial com abas: **Dashboard** (padrão ao abrir) e **Clientes**.
- Dashboard com indicadores de total de clientes, clientes vencidos e total em atraso.
- Lista de clientes com parcelas vencidas no dashboard.
- Cadastro de cliente com **ID** (manual ou automático), nome, telefone, e-mail e limite.
- Edição e exclusão de cliente.
- Registro de compras com valor e tipo de pagamento (`ficha`, cartão, dinheiro, PIX).
- Vencimento e parcelamento apenas para compras no tipo **ficha**.
- Registro de pagamentos com valor, tipo e data.
- Edição e exclusão de compras e pagamentos no histórico.
- Geração de relatório da ficha do cliente em PDF (via tela de impressão do navegador).

## Como usar

1. Abra `index.html` no navegador.
2. Na aba **Dashboard**, acompanhe clientes vencidos.
3. Na aba **Clientes**, cadastre clientes e registre compras/pagamentos.
4. Use os botões de edição/exclusão no histórico quando necessário.
5. Clique em **Gerar relatório (PDF)** para salvar a ficha do cliente.

## Estrutura

- `index.html`: interface principal, abas e seções.
- `styles.css`: estilos da aplicação e dashboard.
- `script.js`: regras de cadastro, dashboard, cálculos e persistência.
