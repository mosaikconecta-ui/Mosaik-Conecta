# Mosaik — loja de dropshipping (Next.js + PostgreSQL)

E-commerce completo para operar dropshipping no Brasil: vitrine, carrinho, checkout com Mercado Pago, área do cliente, rastreamento, painel administrativo e estrutura de fornecedores. Interface em PT-BR, valores em R$.

> **Estado atual:** o sistema roda de ponta a ponta com dados de **demonstração** (marcados como tal). Pagamento, e-mail, analytics e APIs de fornecedores dependem de credenciais externas — sem elas, cada fluxo fica desativado e avisa claramente; **nada é simulado**. Veja [docs/INTEGRACOES.md](docs/INTEGRACOES.md).

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) + React 19 + TypeScript |
| Estilo | Tailwind CSS 4, sistema de design próprio (`src/app/globals.css`) |
| Banco | PostgreSQL + Prisma 6 |
| Validação | Zod 4 (todas as entradas validadas no servidor) |
| Auth | Sessões próprias em banco (cookie httpOnly, token com hash SHA-256), senhas com scrypt |
| Pagamento | Mercado Pago Checkout Pro (Pix, cartão, boleto) + webhook com assinatura HMAC |
| Testes | Vitest (unitários) + Playwright (E2E) |

## Rodando localmente

Pré-requisitos: Node 20.9+ (testado com Node 22) e PostgreSQL 14+.

```bash
cd loja
cp .env.example .env            # ajuste DATABASE_URL e SEED_ADMIN_PASSWORD
npm install                     # também gera o Prisma Client
npx prisma migrate deploy       # cria as tabelas
npm run db:seed                 # dados de demonstração + usuário admin
npm run dev                     # http://localhost:3000
```

- Loja: `http://localhost:3000`
- Painel: `http://localhost:3000/admin` (login com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- Cupons de demonstração: `BEMVINDO10`, `FRETEGRATIS`, `MOSAIK30`

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build && npm start` | build e servidor de produção |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes unitários (preço, cupom, frete, combos, CPF, webhook, CSV) |
| `npm run test:e2e` | E2E nos fluxos principais (requer app rodando; `ADMIN_PASSWORD=... BASE_URL=...`) |
| `npm run db:migrate` | cria nova migração após alterar `prisma/schema.prisma` |
| `npm run db:seed` | recria os dados de demonstração (idempotente) |

## O que está implementado

**Loja:** home editorial (hero, categorias, mais vendidos *reais* ou curadoria, campanha, novidades, destaque, benefícios, depoimentos somente de avaliações verificadas), catálogo com busca, filtro por categoria/preço/estoque, ordenação e paginação, busca instantânea no cabeçalho, página de produto (galeria por cor, variações, parcelamento, estoque, cálculo de frete por CEP, especificações, combos "compre junto", relacionados por co-compra), favoritos, sacola lateral e página de carrinho (quantidade, cupom, frete, combos), checkout em uma página (ViaCEP, endereços salvos, entrega, resumo), página do pedido com nova tentativa de pagamento, rastreamento por pedido+e-mail ou código, área do cliente (pedidos, dados, endereços, avaliação pós-entrega, exportação e exclusão de dados — LGPD), cadastro, login, recuperação de senha, institucionais (sobre, contato, FAQ, privacidade, trocas, termos, entrega).

**Painel (`/admin`):** dashboard (faturamento, pedidos, ticket médio, margem bruta, conversão quando há ≥200 sessões, status, gráfico diário, mais vendidos, estoque baixo), pedidos (filtros, detalhe, status com regras de transição, fulfillment por fornecedor, rastreio, notas, CSV), produtos (variações, imagens com upload, custo, preço, margem, estoque rápido, SEO), categorias, combos, clientes (contas e visitantes, histórico, perfis de acesso), carrinhos abandonados (e-mail, WhatsApp, link), cupons, fornecedores (prazos, integração, sincronização CSV de estoque/custo, logs), frete, moderação de avaliações, status das integrações e logs de auditoria/webhooks.

**Dropshipping:** cada produto/variação tem fornecedor, SKU do fornecedor e custo. Ao aprovar o pagamento, o pedido é dividido em *fulfillments* por fornecedor, com custo, status (pendente → encaminhado → confirmado → enviado → entregue), nº do pedido no fornecedor e rastreio. O encaminhamento usa o adaptador da integração (e-mail para fornecedores manuais; AliExpress/CJ preparados). O prazo exibido ao cliente soma separação + transporte do fornecedor + modalidade.

**Inteligência comercial:** combos com desconto automático, relacionados por co-compra, sugestões no carrinho, recuperação de carrinho (e-mail/WhatsApp/link + cron), cupons, eventos de conversão (GA4, Meta Pixel e funil interno), SEO técnico (metadados, canonical, sitemap, robots, JSON-LD de Produto/Breadcrumb/FAQ/Loja, URLs amigáveis).

Documentação detalhada:
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — estrutura, fluxos de pedido/pagamento, segurança e LGPD
- [docs/INTEGRACOES.md](docs/INTEGRACOES.md) — como configurar cada serviço externo e o que falta
- [docs/DEPLOY.md](docs/DEPLOY.md) — publicação em produção e checklist antes de vender

## Imagens

As fotos de produto são **renderizações 3D de demonstração** geradas por `scripts/render/render_products.py` (Blender/Cycles). Substitua-as pelas fotos reais dos fornecedores pelo painel antes de operar.
