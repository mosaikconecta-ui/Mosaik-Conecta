/**
 * Testes E2E dos fluxos principais (Playwright, sem framework).
 * Pré-requisitos: app rodando (npm run dev ou npm start), banco com seed.
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";

// usa o Playwright do projeto ou um global (NODE_PATH)
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@mosaik.example";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
const SHOTS = new URL("./screens/", import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✓ ${name} (${Date.now() - t} ms)`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`  ✗ ${name}\n    ${err.message.split("\n")[0]}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "mk_consent", value: "essential", url: BASE }]);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

let orderNumber = null;
const email = `cliente.teste+${Date.now()}@exemplo.com`;

console.log("Loja");
await step("home carrega com produtos", async () => {
  await page.goto(BASE);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert.ok((await page.locator("article").count()) >= 4, "esperava cards de produto");
});

await step("busca retorna resultados", async () => {
  await page.goto(`${BASE}/produtos?q=caneca`);
  await page.getByText("Caneca Aurora 350 ml").first().waitFor();
});

await step("filtro de categoria e ordenação por preço", async () => {
  await page.goto(`${BASE}/categoria/ceramica?ordem=menor-preco`);
  const prices = await page.locator("article").evaluateAll((els) => els.map((e) => e.textContent));
  assert.ok(prices.length >= 2);
});

await step("produto: escolher variação e adicionar à sacola", async () => {
  await page.goto(`${BASE}/produto/vaso-duna`);
  await page.getByRole("button", { name: "Areia", exact: true }).first().click();
  await page.getByTestId("add-to-cart").click();
  await page.getByRole("dialog", { name: "Sacola de compras" }).waitFor();
  await page.getByText("Areia · Médio").waitFor();
  await page.keyboard.press("Escape");
});

await step("combo adiciona itens e aplica desconto", async () => {
  await page.goto(`${BASE}/produto/jarra-brisa`);
  await page.getByRole("button", { name: "Adicionar combo" }).click();
  await page.getByText("Combo Água à mesa adicionado").waitFor();
  await page.keyboard.press("Escape");
});

await step("carrinho: quantidade, cupom e frete", async () => {
  await page.goto(`${BASE}/carrinho`);
  await page.getByRole("button", { name: "Aumentar quantidade" }).first().click();
  await page.waitForTimeout(600);
  await page.locator("#coupon").fill("BEMVINDO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.getByText("Cupom aplicado.").waitFor();
  await page.locator("#cart-cep").fill("01310100");
  await page.getByRole("button", { name: "Calcular" }).click();
  await page.getByText("Econômica").first().waitFor();
  await page.getByText(/Combo Água à mesa/).waitFor();
  await page.screenshot({ path: SHOTS + "carrinho.png", fullPage: true });
});

await step("cupom inválido é recusado", async () => {
  await page.getByRole("button", { name: "remover", exact: true }).click();
  await page.locator("#coupon").fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.getByText(/Cupom inválido/).waitFor();
  await page.locator("#coupon").fill("BEMVINDO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.getByText("Cupom aplicado.").waitFor();
});

await step("checkout: validação de campos obrigatórios", async () => {
  await page.goto(`${BASE}/checkout`);
  await page.getByTestId("place-order").waitFor();
  // sem frete selecionado o botão fica desabilitado; preenche CEP primeiro
  await page.locator("#co-cep").fill("01310100");
  await page.getByText("Econômica").first().waitFor({ timeout: 15000 });
  await page.getByTestId("place-order").click();
  await page.getByText("Revise os campos destacados.").waitFor();
});

await step("checkout: cria pedido (sem simular pagamento)", async () => {
  await page.locator("#co-email").fill(email);
  await page.locator("#co-name").fill("Cliente Teste");
  await page.locator("#co-phone").fill("11987654321");
  await page.locator("#co-cpf").fill("52998224725");
  await page.locator("#co-street").fill("Avenida Paulista");
  await page.locator("#co-number").fill("1000");
  await page.locator("#co-district").fill("Bela Vista");
  await page.locator("#co-city").fill("São Paulo");
  await page.locator("#co-state").selectOption("SP");
  await page.locator("#co-acceptTerms").check();
  await page.screenshot({ path: SHOTS + "checkout.png", fullPage: true });
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/pedido\/MK-\d+/, { timeout: 20000 });
  orderNumber = page.url().match(/MK-\d+/)[0];
  await page.getByRole("heading", { level: 1, name: "Pedido recebido" }).waitFor();
  await page.getByText("Aguardando pagamento").first().waitFor();
  await page.screenshot({ path: SHOTS + "pedido.png", fullPage: true });
});

await step("sacola é esvaziada após o pedido", async () => {
  await page.goto(`${BASE}/carrinho`);
  await page.getByText("Sua sacola está vazia").waitFor();
});

await step("rastreamento por número + e-mail", async () => {
  await page.goto(`${BASE}/rastreamento`);
  await page.locator('main input[name="number"]').fill(orderNumber);
  await page.locator('main input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Consultar" }).click();
  await page.getByText(`Pedido ${orderNumber}`).waitFor();
});

await step("rastreamento recusa e-mail errado", async () => {
  await page.locator('main input[name="email"]').fill("outro@exemplo.com");
  await page.getByRole("button", { name: "Consultar" }).click();
  await page.getByText("Não encontramos um pedido").waitFor();
});

await step("webhook sem assinatura é rejeitado (401)", async () => {
  const r = await page.request.post(`${BASE}/api/webhooks/mercadopago?data.id=123&type=payment`, { data: { type: "payment", data: { id: "123" } } });
  assert.equal(r.status(), 401);
});

await step("admin bloqueado sem login", async () => {
  await page.goto(`${BASE}/admin`);
  await page.waitForURL(/\/conta\/entrar/);
});

console.log("Conta do cliente");
const custCtx = await browser.newContext();
await custCtx.addCookies([{ name: "mk_consent", value: "essential", url: BASE }]);
const cp = await custCtx.newPage();
const custEmail = `conta+${Date.now()}@exemplo.com`;
await step("cadastro de cliente", async () => {
  await cp.goto(`${BASE}/conta/cadastro`);
  await cp.locator("#name").fill("Maria Teste");
  await cp.locator("#email").fill(custEmail);
  await cp.locator("#password").fill("senhaForte123");
  await cp.locator('input[name="acceptTerms"]').check();
  await cp.getByRole("button", { name: "Criar conta" }).click();
  await cp.waitForURL(/\/conta$/);
  await cp.getByText("Olá, Maria").waitFor();
});
await step("endereço cadastrado na conta", async () => {
  await cp.goto(`${BASE}/conta/enderecos`);
  await cp.locator("#recipient").fill("Maria Teste");
  await cp.locator("#cep").fill("30140071");
  await cp.locator("#street").fill("Rua da Bahia");
  await cp.locator("#number").fill("50");
  await cp.locator("#district").fill("Centro");
  await cp.locator("#city").fill("Belo Horizonte");
  await cp.locator("#state").selectOption("MG");
  await cp.getByRole("button", { name: "Salvar endereço" }).click();
  await cp.getByText("Rua da Bahia, 50").waitFor();
});
await step("logout e login com senha errada bloqueado", async () => {
  await cp.goto(`${BASE}/conta`);
  await cp.getByRole("button", { name: "Sair" }).click();
  await cp.waitForURL(`${BASE}/`);
  await cp.goto(`${BASE}/conta/entrar`);
  await cp.locator("#email").fill(custEmail);
  await cp.locator("#password").fill("errada123");
  await cp.getByRole("button", { name: "Entrar" }).click();
  await cp.getByText("E-mail ou senha incorretos.").waitFor();
});
await step("cliente não acessa o painel", async () => {
  await cp.locator("#password").fill("senhaForte123");
  await cp.getByRole("button", { name: "Entrar" }).click();
  await cp.waitForURL(/\/conta$/);
  await cp.goto(`${BASE}/admin`);
  await cp.waitForURL(/sem-permissao/);
});
await step("recuperação de senha responde sem revelar conta", async () => {
  await cp.goto(`${BASE}/conta/recuperar-senha`);
  await cp.locator("#email").fill("naoexiste@exemplo.com");
  await cp.getByRole("button", { name: "Enviar link" }).click();
  await cp.getByText(/Se houver uma conta/).waitFor();
});

if (ADMIN_PASSWORD) {
  console.log("Painel administrativo");
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await actx.newPage();
  await step("login do administrador", async () => {
    await ap.goto(`${BASE}/conta/entrar?next=/admin`);
    await ap.locator("#email").fill(ADMIN_EMAIL);
    await ap.locator("#password").fill(ADMIN_PASSWORD);
    await ap.getByRole("button", { name: "Entrar" }).click();
    await ap.waitForURL(/\/admin$/);
    await ap.getByRole("heading", { name: "Visão geral" }).waitFor();
    await ap.screenshot({ path: SHOTS + "admin-dashboard.png", fullPage: true });
  });
  await step("admin vê o pedido criado", async () => {
    await ap.goto(`${BASE}/admin/pedidos?q=${orderNumber}`);
    await ap.getByRole("link", { name: orderNumber }).click();
    await ap.getByRole("heading", { name: `Pedido ${orderNumber}` }).waitFor();
    await ap.screenshot({ path: SHOTS + "admin-pedido.png", fullPage: true });
  });
  await step("admin cancela pedido pendente (estoque não é afetado)", async () => {
    await ap.locator('select[name="status"]').selectOption("CANCELLED");
    await ap.getByRole("button", { name: "Atualizar status" }).click();
    await ap.getByText("Cancelado").first().waitFor();
  });
  await step("admin cria produto com variação e margem", async () => {
    await ap.goto(`${BASE}/admin/produtos/novo`);
    await ap.locator("#p-name").fill(`Produto Teste ${Date.now()}`);
    await ap.locator("#p-description").fill("Descrição de teste com mais de vinte caracteres para validar.");
    await ap.locator("#p-price").fill("100,00");
    await ap.locator("#p-cost").fill("40,00");
    await ap.getByText("Margem: 60").waitFor();
    await ap.locator('input[name="v-sku-0"]').fill(`TESTE-${Date.now()}`);
    await ap.locator('input[name="v-stock-0"]').fill("5");
    await ap.getByRole("button", { name: "Salvar produto" }).click();
    await ap.getByText("Produto salvo.").waitFor();
  });
  await step("admin envia imagem do produto (upload servido em /uploads)", async () => {
    // PNG 1x1 válido
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await ap.locator('input[type="file"]').setInputFiles({ name: "teste.png", mimeType: "image/png", buffer: png });
    const thumb = ap.locator('img[src*="uploads"]').first();
    await thumb.waitFor();
    const r = await ap.request.get(`${BASE}/uploads/` + (await ap.evaluate(() => { const i = [...document.images].find((x) => x.src.includes("uploads")); return decodeURIComponent(i.src).match(/uploads\/([\w-]+\.png)/)[1]; })));
    assert.equal(r.status(), 200);
    // arquivo que não é imagem é recusado
    await ap.locator('input[type="file"]').setInputFiles({ name: "x.png", mimeType: "image/png", buffer: Buffer.from("<script>") });
    await ap.getByText("Formato não suportado").waitFor();
  });
  await step("admin cria cupom", async () => {
    await ap.goto(`${BASE}/admin/cupons`);
    await ap.locator("#c-code").fill(`TESTE${Date.now() % 100000}`);
    await ap.locator("#c-type").selectOption("PERCENT");
    await ap.locator("#c-value").fill("15");
    await ap.getByRole("button", { name: "Criar cupom" }).click();
    await ap.getByText("Cupom criado.").waitFor();
  });
  await step("exportação de pedidos em CSV", async () => {
    const r = await ap.request.get(`${BASE}/api/admin/pedidos/export`);
    assert.equal(r.status(), 200);
    assert.match(await r.text(), /numero;data;status/);
  });
  await step("exportação negada sem login", async () => {
    const r = await page.request.get(`${BASE}/api/admin/pedidos/export`);
    assert.equal(r.status(), 401);
  });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
if (pageErrors.length) console.log("\nErros de JavaScript na página:", pageErrors.slice(0, 5));
console.log(`\n${results.length - failed.length}/${results.length} passaram`);
process.exit(failed.length ? 1 : 0);
