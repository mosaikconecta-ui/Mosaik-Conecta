"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth";
import { contactSchema, emailSchema, fieldErrors } from "@/lib/validation";
import { sendEmail } from "@/lib/email";
import { store } from "@/lib/env";

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

export async function subscribeNewsletter(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email: emailSchema, consent: z.literal("on", { error: "Confirme o consentimento para receber e-mails." }) }).safeParse({
    email: formData.get("email"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const ip = await getClientIp();
  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, consentIp: ip },
    update: { unsubscribedAt: null, consentAt: new Date(), consentIp: ip },
  });
  return { ok: true, message: "Pronto! Você vai receber nossos lançamentos e ofertas. Cancele quando quiser." };
}

export async function sendContact(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const ip = await getClientIp();
  const recent = await db.contactMessage.count({ where: { email: parsed.data.email, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 3) return { ok: false, message: `Recebemos suas mensagens. Aguarde nosso retorno ou escreva para ${store.email}.` };
  const msg = await db.contactMessage.create({ data: { ...parsed.data, orderNumber: parsed.data.orderNumber || null } });
  await sendEmail({
    to: store.email,
    replyTo: parsed.data.email,
    subject: `[Contato] ${parsed.data.subject}`,
    html: `<p><strong>${parsed.data.name}</strong> (${parsed.data.email}) — IP ${ip}</p><p>Pedido: ${parsed.data.orderNumber || "—"}</p><p>${parsed.data.message.replace(/</g, "&lt;")}</p><p>ID: ${msg.id}</p>`,
  });
  return { ok: true, message: "Mensagem enviada. Respondemos em até 1 dia útil." };
}
