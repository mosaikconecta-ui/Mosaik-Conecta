import "server-only";
import { env, integrations, store } from "./env";
import { formatBRL } from "./format";
import { logError, logInfo } from "./audit";

type Email = { to: string; subject: string; html: string; text?: string; replyTo?: string };

/**
 * Envio transacional via Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Sem RESEND_API_KEY, o e-mail NÃO é enviado: em desenvolvimento o conteúdo é registrado no log do servidor.
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean; reason?: string }> {
  if (!integrations.email()) {
    if (!env.isProd) logInfo("email:dev", `E-mail não enviado (RESEND_API_KEY ausente) → ${email.to}: ${email.subject}`, { preview: email.text ?? stripHtml(email.html).slice(0, 600) });
    return { sent: false, reason: "provedor de e-mail não configurado" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resend.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.resend.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, reply_to: email.replyTo }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { sent: true };
  } catch (err) {
    logError("email", err, { to: email.to, subject: email.subject });
    return { sent: false, reason: "falha no envio" };
  }
}

const stripHtml = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:#191816">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbfaf7;border:1px solid #d9d2c4">
  <tr><td style="padding:28px 32px;border-bottom:1px solid #d9d2c4;font-size:22px;letter-spacing:.02em"><strong>mosaik</strong></td></tr>
  <tr><td style="padding:32px"><h1 style="font-size:22px;font-weight:600;margin:0 0 16px">${esc(title)}</h1>${body}</td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #d9d2c4;font-size:12px;color:#615c53">${store.name} · ${store.email}<br>Você recebeu este e-mail por causa de uma interação com nossa loja.</td></tr>
  </table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#191816;color:#fff;padding:14px 22px;text-decoration:none;display:inline-block;font-weight:600">${esc(label)}</a></p>`;

type OrderMailData = {
  number: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  accessUrl: string;
  items: { productName: string; variantName: string | null; quantity: number; totalCents: number }[];
};

const itemsTable = (o: OrderMailData) =>
  `<table width="100%" style="border-collapse:collapse;font-size:14px">${o.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e0d8ca">${i.quantity}× ${esc(i.productName)}${i.variantName ? ` <span style="color:#615c53">(${esc(i.variantName)})</span>` : ""}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e0d8ca">${formatBRL(i.totalCents)}</td></tr>`)
    .join("")}<tr><td style="padding:12px 0"><strong>Total</strong></td><td align="right"><strong>${formatBRL(o.totalCents)}</strong></td></tr></table>`;

export const emails = {
  orderPaid: (o: OrderMailData) => sendEmail({
    to: o.customerEmail,
    subject: `Pagamento confirmado — pedido ${o.number}`,
    html: layout(`Obrigado, ${o.customerName.split(" ")[0]}!`, `<p>Recebemos o pagamento do pedido <strong>${o.number}</strong>. Agora ele segue para separação e você receberá o código de rastreamento assim que for enviado.</p>${itemsTable(o)}${button(o.accessUrl, "Acompanhar pedido")}`),
  }),
  orderCreated: (o: OrderMailData) => sendEmail({
    to: o.customerEmail,
    subject: `Pedido ${o.number} recebido — aguardando pagamento`,
    html: layout("Recebemos seu pedido", `<p>O pedido <strong>${o.number}</strong> foi registrado e aguarda a confirmação do pagamento.</p>${itemsTable(o)}${button(o.accessUrl, "Ver pedido e pagamento")}`),
  }),
  orderShipped: (o: OrderMailData & { trackingCode: string; trackingUrl: string | null }) => sendEmail({
    to: o.customerEmail,
    subject: `Seu pedido ${o.number} foi enviado`,
    html: layout("Pedido a caminho", `<p>Seu pedido <strong>${o.number}</strong> foi postado. Código de rastreamento: <strong>${esc(o.trackingCode)}</strong>.</p>${button(o.trackingUrl ?? o.accessUrl, "Rastrear entrega")}`),
  }),
  orderStatus: (o: OrderMailData & { statusLabel: string; message?: string }) => sendEmail({
    to: o.customerEmail,
    subject: `Pedido ${o.number}: ${o.statusLabel}`,
    html: layout(o.statusLabel, `<p>${esc(o.message ?? `O status do pedido ${o.number} foi atualizado.`)}</p>${button(o.accessUrl, "Ver pedido")}`),
  }),
  passwordReset: (to: string, name: string, url: string) => sendEmail({
    to,
    subject: "Redefinição de senha — Mosaik",
    html: layout(`Olá, ${name.split(" ")[0]}`, `<p>Recebemos um pedido para redefinir sua senha. O link vale por 1 hora e só pode ser usado uma vez.</p>${button(url, "Criar nova senha")}<p style="font-size:13px;color:#615c53">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`),
    text: `Redefina sua senha: ${url}`,
  }),
  abandonedCart: (to: string, name: string | null, url: string, items: string[]) => sendEmail({
    to,
    subject: "Seus itens continuam reservados no carrinho",
    html: layout(`${name ? name.split(" ")[0] + ", seu" : "Seu"} carrinho está guardado`, `<p>Você deixou estes itens no carrinho:</p><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>${button(url, "Voltar ao carrinho")}<p style="font-size:13px;color:#615c53">Não quer mais receber lembretes? Responda este e-mail.</p>`),
  }),
  supplierOrder: (to: string, subject: string, html: string) => sendEmail({ to, subject, html: layout(subject, html) }),
};
