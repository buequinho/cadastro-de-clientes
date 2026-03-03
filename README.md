# Cadastro de clientes - Loja de roupas

Sistema web para substituir a ficha de papel no controle de compras, parcelas e pagamentos dos clientes.

## Funcionalidades

- Cadastro, edição, busca e exclusão de clientes.
- Registro de compras com:
  - valor,
  - data da compra,
  - tipo de pagamento (cartão, dinheiro, PIX),
  - quantidade de parcelas,
  - vencimento da primeira parcela.
- Geração automática de parcelas mensais com vencimentos.
- Registro de pagamento com:
  - valor,
  - data de pagamento (selecionável/editável),
  - tipo de pagamento (cartão, dinheiro, PIX).
- Cálculo automático de total comprado, total pago, saldo devedor e valor em atraso.

## Como usar

1. Abra `index.html` no navegador.
2. Cadastre o cliente.
3. Em **Registrar compra**, informe tipo de pagamento e parcelamento.
4. Em **Registrar pagamento**, selecione a data e o tipo (cartão/dinheiro/PIX).
5. Verifique em **Compras e parcelas** os vencimentos e o status de atraso.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: estilos da aplicação.
- `script.js`: regras de cadastro, compras parceladas, pagamentos e cálculos.
