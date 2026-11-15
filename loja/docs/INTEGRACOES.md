# Integrações externas

Status real de cada integração. A página **/admin/integracoes** mostra o mesmo diagnóstico em tempo real.

| Serviço | Situação no código | Verificado neste ambiente? | O que falta |
|---|---|---|---|
| Mercado Pago (Checkout Pro) | Implementado (criação de preferência, retorno, webhook, consulta do pagamento) | Não — sem credenciais e com rede bloqueada para api.mercadopago.com. Assinatura do webhook coberta por testes unitários. | Access Token de teste + chave do webhook; testar em sandbox |
| E-mail (Resend) | Implementado (pedido recebido/pago/enviado/status, senha, carrinho, fornecedor) | Não — sem chave. Em dev, o conteúdo vai para o log do servidor | `RESEND_API_KEY` e domínio verificado |
| ViaCEP | Implementado no navegador do cliente | Não (rede do ambiente bloqueada); com falha, o formulário pede preenchimento manual | Nada |
| GA4 / Meta Pixel | Implementado, carrega só após consentimento LGPD | Não — sem IDs | IDs das propriedades |
| WhatsApp | Links `wa.me` (atendimento, recuperação de carrinho, contato com cliente) | Sim (geração de links) | Número oficial; para envio automático, API oficial (Cloud API) |
| AliExpress | **Preparado, não implementado** (adaptador retorna "não ativo") | — | App aprovado + implementação das chamadas |
| CJdropshipping | **Preparado, não implementado** | — | API Key + implementação das chamadas |
| Frete em tempo real | Tabela própria por região/peso (funcional) | Sim | Contrato Correios/Melhor Envio/Frenet para cotação real |

---

## 1. Mercado Pago

Fluxo: checkout cria o pedido (`PENDING_PAYMENT`) → servidor cria a *preferência* com os valores recalculados → cliente paga no Mercado Pago → MP chama `POST /api/webhooks/mercadopago` → a assinatura é validada → **o pagamento é consultado na API oficial** (`GET /v1/payments/{id}`) → só então o pedido vira `PAID`, o estoque é baixado e os fulfillments são criados. O valor pago precisa bater com o total do pedido; divergências ficam registradas e o pedido não é liberado.

Passo a passo (sandbox):
1. Em https://www.mercadopago.com.br/developers/panel/app crie uma aplicação (Checkout Pro).
2. Copie o **Access Token de teste** para `MERCADOPAGO_ACCESS_TOKEN`. Para testar com contas de teste (comprador/vendedor), use o token do usuário de teste vendedor e defina `MERCADOPAGO_USE_SANDBOX_URL=true` se necessário.
3. Em **Webhooks**, cadastre a URL `https://SEU_DOMINIO/api/webhooks/mercadopago`, evento **Pagamentos**, e copie a **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET`.
   - Localmente, exponha a porta 3000 com um túnel HTTPS (ngrok, Cloudflare Tunnel) e use essa URL em `NEXT_PUBLIC_SITE_URL`.
4. Faça uma compra com os [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards) e confira em `/admin/pedidos` e `/admin/logs` (seção Webhooks).
5. Produção: troque pelas credenciais de produção, mantenha a mesma URL de webhook.

Reembolsos/estornos são feitos no painel do Mercado Pago; o webhook atualiza o pedido para "Reembolsado" e devolve o estoque.

**Stripe (opcional):** implemente `PaymentProvider` em `src/lib/payments/stripe.ts` (Checkout Session + `stripe-signature`) e registre em `src/lib/payments/index.ts`. O restante do fluxo é reaproveitado.

## 2. E-mail (Resend)

1. Crie conta em https://resend.com, verifique seu domínio (SPF/DKIM).
2. Defina `RESEND_API_KEY` e `EMAIL_FROM` (endereço do domínio verificado).
3. E-mails enviados: pedido recebido, pagamento confirmado, pedido enviado (com rastreio), mudanças de status, redefinição de senha, lembrete de carrinho, pedido para fornecedor manual, mensagens de contato (para `atendimento@`).

Para trocar de provedor, altere apenas `sendEmail()` em `src/lib/email.ts`.

## 3. Tarefas agendadas

Defina `CRON_SECRET` e agende a cada 30–60 min:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU_DOMINIO/api/cron
```

Executa: lembrete de carrinho abandonado (1 por carrinho, após 60 min), cancelamento de pedidos não pagos após 3 dias (devolve estoque reservado), limpeza de sessões e carrinhos antigos. Na Vercel, use `vercel.json` → `crons` (envie o header via Vercel Cron Secret) ou um agendador externo.

## 4. Fornecedores e plataformas de dropshipping

Arquitetura (`src/lib/suppliers/`): cada integração implementa `SupplierAdapter` (`forwardOrder`, `fetchTracking`, `fetchInventory`, `status`). O painel, os pedidos e os fulfillments não mudam quando uma nova integração é adicionada.

**Funcionando hoje:**
- **MANUAL** — envia o pedido por e-mail ao fornecedor (requer Resend) ou o operador encaminha por fora e clica em "Marcar como encaminhado". Rastreio inserido no painel.
- **CSV** — além do anterior, importa planilha `supplier_sku;stock;cost` (em Fornecedores → fornecedor) e atualiza estoque e custo das variações. Gera log de sincronização.
- Opção "encaminhar pedidos pagos automaticamente" por fornecedor.

**Preparado (não ativo):**
- **AliExpress** — requer conta no AliExpress Open Platform como dropshipper, app aprovado (App Key/Secret) e OAuth do vendedor (Access Token). Implementar em `platforms.ts`: busca de produto/estoque (`aliexpress.ds.product.get`), criação de pedido (`aliexpress.ds.order.create`) e rastreio (`aliexpress.ds.order.tracking.get`), com assinatura das requisições conforme a documentação oficial.
- **CJdropshipping** — gerar API Key em CJ → Authorization; obter access token (`/api2.0/v1/authentication/getAccessToken`); implementar estoque (`/product/stock/queryByVid`), pedido (`/shopping/order/createOrderV2`) e rastreio (`/logistic/getTrackInfo`). O token expira — guardar e renovar.

Nenhuma dessas chamadas foi implementada sem credenciais para validação, para não declarar como pronta uma integração que nunca foi testada.

## 5. Frete

Hoje: modalidades configuráveis em `/admin/frete` (base + valor por kg × multiplicador por região, frete grátis acima de um valor, dias extras). O prazo soma separação e transporte do fornecedor. Para cotação real, implemente um provedor (Melhor Envio, Frenet ou Correios contrato) e chame-o em `quoteShipping` / `loadPricingContext` mantendo o mesmo formato `ShippingQuote`.

## 6. Analytics

- `NEXT_PUBLIC_GA4_ID`: eventos `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (disparado na página do pedido somente após pagamento aprovado).
- `NEXT_PUBLIC_META_PIXEL_ID`: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` (com `eventID` = nº do pedido para deduplicar com a futura Conversions API).
- Funil interno anônimo (`AnalyticsEvent`) alimenta a taxa de conversão do painel.
- Tudo só é carregado após o visitante aceitar cookies de análise.
