# Cadastro de clientes - Loja de roupas

Sistema simples para substituir a ficha de papel usada no controle de pagamentos dos clientes.

## Funcionalidades

- Cadastro de clientes com nome, telefone, e-mail e limite de crédito.
- Busca rápida por nome ou telefone.
- Registro de pagamentos por cliente.
- Controle de débito atual.
- Histórico de pagamentos.
- Persistência local no navegador com `localStorage`.

## Como usar

1. Abra o arquivo `index.html` no navegador.
2. Cadastre um cliente no formulário principal.
3. Para registrar uma nova compra no fiado, dê **duplo clique** no cartão do cliente e informe o valor.
4. Para registrar pagamento, use o campo "Registrar pagamento" no próprio cartão.
5. Os dados ficam salvos no navegador automaticamente.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: estilos da aplicação.
- `script.js`: lógica de cadastro, pagamento e persistência.
