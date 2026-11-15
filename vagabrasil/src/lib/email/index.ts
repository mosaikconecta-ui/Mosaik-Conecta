import "server-only";
import { Resend } from "resend";
import { SITE_NAME, SITE_URL } from "@/lib/env";

let client: Resend | null = null;
const resend = () => (process.env.RESEND_API_KEY ? (client ??= new Resend(process.env.RESEND_API_KEY)) : null);

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  const r = resend();
  if (!r) {
    console.info(`[email:dev] Para: ${to} | Assunto: ${subject}`);
    return { ok: false as const, skipped: true };
  }
  const { error } = await r.emails.send({
    from: process.env.EMAIL_FROM || `${SITE_NAME} <nao-responda@vagabrasil.com.br>`,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error("[email]", error);
    return { ok: false as const, skipped: false };
  }
  return { ok: true as const, skipped: false };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Layout HTML simples e compatível com clientes de e-mail. */
export function emailLayout({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: string } }) {
  const href = cta ? (cta.href.startsWith("http") ? cta.href : `${SITE_URL}${cta.href}`) : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#0b1f3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:10px;border:1px solid #e3e8ef">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e3e8ef;font-weight:700;font-size:20px;color:#0b1f3a">Vaga<span style="color:#1d63ed">Brasil</span></td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
${cta ? `<p style="margin:28px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#1d63ed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e3e8ef;font-size:12px;color:#64748b">Você recebeu este e-mail porque possui conta no ${SITE_NAME}. Gerencie suas notificações em <a href="${SITE_URL}" style="color:#1d63ed">${SITE_URL.replace(/^https?:\/\//, "")}</a>.<br>O ${SITE_NAME} nunca cobra taxas de candidatos.</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc as escapeHtml };
