# Publicação em produção

## Opção A — Vercel + Postgres gerenciado (Neon, Supabase, RDS)

1. Crie o banco e copie a URL (com `?sslmode=require` se o provedor exigir) para `DATABASE_URL`.
2. Importe o repositório na Vercel com **Root Directory = `loja`**.
3. Configure as variáveis do `.env.example` (no mínimo `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_MODE=false`, `CRON_SECRET`).
4. Build command: `npx prisma migrate deploy && npm run build`. O build acessa o banco (páginas da vitrine são pré-renderizadas).
5. Primeira carga: rode `npm run db:seed` apontando para o banco de produção **somente** se quiser os dados de demonstração; para produção real, crie apenas o admin (defina `SEED_ADMIN_PASSWORD` forte e rode o seed, depois arquive/exclua os produtos de demonstração no painel).
6. **Uploads:** o disco da Vercel é efêmero. Antes de cadastrar produtos pelo painel, troque `storeImage()` em `src/lib/storage.ts` por um driver de objeto (Vercel Blob, S3, R2 ou Cloudinary) e adicione o domínio em `images.remotePatterns` e no CSP (`next.config.ts`).
7. Agende `GET /api/cron` (Vercel Cron ou externo) com `Authorization: Bearer $CRON_SECRET`.
8. Configure o webhook do Mercado Pago para `https://SEU_DOMINIO/api/webhooks/mercadopago`.

## Opção B — VPS / container (Node 20+)

```bash
cd loja
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production npm start   # porta 3000, coloque atrás de Nginx/Caddy com HTTPS
```

Uploads ficam em `storage/uploads` (ou `UPLOAD_DIR`) e são servidos por `/uploads/<arquivo>` — monte como volume persistente e inclua no backup. Use crontab para o `/api/cron`.

## Checklist antes de vender

- [ ] `NEXT_PUBLIC_DEMO_MODE=false`; produtos, fornecedores e cupons de demonstração removidos/arquivados
- [ ] Fotos reais (com direito de uso) e descrições revisadas
- [ ] Razão social, CNPJ, endereço, e-mail e DPO nas páginas legais e no rodapé; revisão jurídica das políticas
- [ ] Mercado Pago em produção, webhook com assinatura, compra real de baixo valor testada e estornada
- [ ] Domínio de e-mail verificado (SPF/DKIM) e e-mails transacionais testados
- [ ] Contratos com fornecedores: prazos reais cadastrados, SKUs mapeados, política de devolução combinada
- [ ] Tabela de frete revisada (ou cotação real integrada)
- [ ] Emissão de nota fiscal definida (ERP/emissor — fora do escopo deste sistema)
- [ ] GA4/Meta Pixel configurados; Search Console com o sitemap
- [ ] Senha forte do admin; contas de operação com perfil OPERATOR
- [ ] Backups automáticos do banco
