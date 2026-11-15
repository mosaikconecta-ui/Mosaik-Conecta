# Arquitetura

```
loja/
├─ prisma/                 schema.prisma (modelo de dados), migrations/, seed.ts (demonstração)
├─ public/products/        imagens de demonstração (renderizações 3D)
├─ scripts/render/         gerador das imagens (Blender)
├─ src/
│  ├─ app/
│  │  ├─ (store)/          loja pública: home, produtos, categoria, produto, carrinho, pedido,
│  │  │                    rastreamento, favoritos, conta/*, institucionais
│  │  ├─ (checkout)/       checkout com layout enxuto (sem distrações)
│  │  ├─ admin/            painel (cada página chama requireStaff(permissão))
│  │  ├─ api/              webhooks/mercadopago, cron, search, events, produtos, conta/exportar, admin/pedidos/export
│  │  ├─ sitemap.ts, robots.ts, icon.svg
│  ├─ actions/             server actions (carrinho, checkout, auth, conta, admin-*)
│  ├─ components/          ui/ (botões, preço, badges), store/, account/, admin/
│  ├─ lib/                 regras de negócio
│  │  ├─ pricing.ts        motor de preço puro: combos, cupons, frete, totais (testado)
│  │  ├─ cart.ts           carrinho no servidor (cookie httpOnly → Cart no banco)
│  │  ├─ orders.ts         criação de pedido, pagamento, estoque, fulfillment, status
│  │  ├─ payments/         PaymentProvider + Mercado Pago
│  │  ├─ suppliers/        SupplierAdapter + manual/CSV + AliExpress/CJ (preparados)
│  │  ├─ auth.ts           sessões, permissões por perfil, limite de tentativas
│  │  ├─ catalog.ts        consultas de vitrine, busca, relacionados, mais vendidos
│  │  ├─ email.ts, recovery.ts, metrics.ts, seo.tsx, validation.ts, audit.ts, storage.ts
│  └─ proxy.ts             bloqueio otimista de /admin e /conta sem cookie
└─ tests/                  unit/ (Vitest) e e2e/ (Playwright)
```

## Princípios

- **Servidor é a fonte da verdade.** Preço, desconto, frete e estoque são sempre recalculados no servidor a partir do banco. O navegador só envia IDs e quantidades.
- **Valores em centavos (Int).** Nenhum float monetário.
- **Snapshot no pedido.** O `OrderItem` guarda nome, SKU, preço e custo da época; alterações posteriores no produto não mudam pedidos antigos.
- **Integrações por contrato.** `PaymentProvider` e `SupplierAdapter` isolam serviços externos.
- **Nada simulado.** Sem credenciais, o fluxo para em um estado honesto ("aguardando pagamento", "encaminhar manualmente").

## Ciclo do pedido

```
Carrinho ─► Checkout (validação Zod + recálculo) ─► Order PENDING_PAYMENT ─► Preferência Mercado Pago
   ─► cliente paga ─► webhook (assinatura HMAC) ─► GET /v1/payments/{id} ─► valor confere?
   ─► PAID: baixa estoque, uso de cupom, Fulfillment por fornecedor, e-mail, evento purchase
   ─► encaminhar ao fornecedor (auto ou painel) ─► PROCESSING
   ─► rastreio informado em todos os fulfillments ─► SHIPPED (e-mail com rastreio)
   ─► entregues ─► DELIVERED (libera avaliação verificada)
Cancelado/Reembolsado ─► devolve estoque (se baixado)
Não pago em 3 dias ─► cron cancela
```

Transições manuais permitidas estão em `src/lib/order-status.ts` (`ALLOWED_TRANSITIONS`). "Pagamento aprovado" nunca é definido manualmente.

## Permissões

| Perfil | Acesso |
|---|---|
| CUSTOMER | loja e área do cliente |
| OPERATOR | painel: visão geral, pedidos, clientes, carrinhos, fornecedores, avaliações |
| ADMIN | tudo, incluindo produtos, preços, cupons, frete, categorias, combos, logs e perfis |

Verificação em três camadas: `proxy.ts` (sem cookie → login), `requireStaff()` em cada página e `assertStaff()` em cada server action/rota.

## Segurança

- Senhas com **scrypt** (N=16384) + salt; comparação em tempo constante; resposta igual para e-mail inexistente.
- Sessão: token aleatório de 256 bits em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; banco guarda só o hash SHA-256. Redefinição de senha derruba todas as sessões.
- Limite de tentativas de login (5 por e-mail / 25 por IP em 15 min); limite em recuperação de senha, contato e rastreamento.
- Server Actions do Next verificam a origem (proteção CSRF); redirecionamentos pós-login aceitam só caminhos internos.
- Webhook: HMAC-SHA256 `x-signature`, janela de tempo, idempotência (`WebhookEvent`), consulta à API oficial e checagem de valor.
- Cabeçalhos: CSP, HSTS (produção), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Upload: tipo verificado pelos bytes (JPG/PNG/WebP), limite 5 MB, nome aleatório.
- CSV exportado protegido contra injeção de fórmulas.
- **Nenhum dado de cartão** trafega ou é armazenado (Checkout Pro).
- `AuditLog`: login de equipe, alterações de produto/preço/estoque/cupom/fornecedor/frete, status de pedido, visualização de dados de cliente, exportações, LGPD.

## LGPD

- Banner de consentimento: GA4/Meta Pixel só carregam após "Aceitar todos"; preferência alterável no rodapé.
- Minimização: CPF opcional; dados pessoais exibidos só a quem tem permissão, com registro de acesso.
- Direitos do titular na conta: exportação (JSON) e exclusão (anonimização; pedidos mantidos pelo prazo fiscal).
- Newsletter com consentimento explícito registrado (data e IP).
- Política de privacidade descreve finalidades, bases legais, compartilhamento (gateway, fornecedores, transportadoras) e retenção — **revisar com jurídico** e preencher dados da empresa/DPO.

## Performance

- Páginas de vitrine com ISR (`revalidate = 300`) e revalidação imediata ao salvar no painel.
- Estado do carrinho/favoritos carregado no cliente, mantendo as páginas de catálogo cacheáveis.
- `next/image` com AVIF/WebP, `sizes` corretos e `priority` só nas imagens acima da dobra.
- Fontes self-hosted via `next/font` (`display: swap`), sem bibliotecas de UI pesadas.
