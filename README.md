# Cadastro de clientes - Loja de roupas

Sistema web para substituir a ficha de papel no controle de compras e pagamentos dos clientes.

## Funcionalidades

- Cadastro de clientes com nome, telefone, e-mail e limite de crédito.
- Edição de dados do cliente.
- Registro de compras com valor, data da compra e vencimento.
- Registro de pagamentos.
- Cálculo automático de:
  - total de compras,
  - total pago,
  - saldo devedor,
  - valor em atraso (vencido).
- Busca por nome ou telefone.
- Persistência local no navegador com `localStorage`.

## Como usar

1. Abra `index.html` no navegador.
2. Cadastre o cliente.
3. No cartão do cliente:
   - use **Editar cliente** para atualizar dados;
   - use **Registrar compra** para lançar valor e vencimento;
   - use **Registrar pagamento** para abater o saldo.
4. A seção de compras mostra o que está em aberto e sinaliza compras vencidas.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: estilos da aplicação.
- `script.js`: lógica de cadastro, compras, pagamentos, vencimento e cálculos.
