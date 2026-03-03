# Cadastro de clientes - Loja de roupas

Sistema web para substituir a ficha de papel no controle de compras, parcelas e pagamentos dos clientes.

## Funcionalidades

- Cadastro de cliente com **ID** (manual ou automático), nome, telefone, e-mail e limite.
- Edição e exclusão de cliente.
- Registro de compras com valor e tipo de pagamento (`ficha`, cartão, dinheiro, PIX).
- Vencimento e parcelamento apenas para compras no tipo **ficha**.
- Geração automática dos vencimentos mensais das parcelas da ficha.
- Registro de pagamentos com valor, tipo e data.
- **Edição e exclusão de compras e pagamentos** no histórico.
- Cálculo automático de total comprado, total pago, saldo devedor e valor em atraso.
- **Geração de relatório da ficha do cliente em PDF** (via tela de impressão do navegador).

## Como usar

1. Abra `index.html` no navegador.
2. Cadastre o cliente (com ID próprio ou deixando em branco para gerar automático).
3. Registre compras e pagamentos no cartão do cliente.
4. Use os botões **Editar/Excluir** no histórico para ajustar compras e pagamentos.
5. Clique em **Gerar relatório (PDF)** para abrir a ficha e salvar em PDF.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: estilos da aplicação.
- `script.js`: regras de cadastro, compras parceladas, pagamentos, edição e relatório.
