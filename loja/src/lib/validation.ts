import { z } from "zod";
import { UFS, isValidCEP, isValidCPF, isValidPhone, onlyDigits } from "./br";

const trimmed = (max = 200) => z.string().trim().max(max);
const requiredText = (msg: string, max = 200) => z.string({ error: msg }).trim().min(1, msg).max(max);

export const emailSchema = z.string({ error: "Informe o e-mail." }).trim().toLowerCase().pipe(z.email({ error: "E-mail inválido." })).pipe(z.string().max(160));

export const passwordSchema = z
  .string({ error: "Informe a senha." })
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "Senha muito longa.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letras e números na senha.");

export const cpfSchema = z.string().trim().refine((v) => isValidCPF(v), "CPF inválido.");
export const phoneSchema = z.string({ error: "Informe o telefone." }).trim().refine(isValidPhone, "Telefone inválido (DDD + número).");
export const cepSchema = z.string({ error: "Informe o CEP." }).trim().refine(isValidCEP, "CEP inválido.");
export const ufSchema = z.enum(UFS, { error: "Selecione o estado." });

export const addressFields = {
  cep: cepSchema,
  street: requiredText("Informe o endereço."),
  number: requiredText("Informe o número.", 20),
  complement: trimmed(80).optional().or(z.literal("")),
  district: requiredText("Informe o bairro.", 80),
  city: requiredText("Informe a cidade.", 80),
  state: ufSchema,
};

export const checkoutSchema = z.object({
  name: requiredText("Informe seu nome completo.", 120).refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  email: emailSchema,
  phone: phoneSchema,
  cpf: z.string().trim().optional().or(z.literal("")).refine((v) => !v || isValidCPF(v), "CPF inválido."),
  ...addressFields,
  shippingMethodId: requiredText("Selecione a forma de entrega.", 40),
  notes: trimmed(500).optional().or(z.literal("")),
  saveAddress: z.boolean().optional(),
  acceptTerms: z.literal(true, { error: "É preciso aceitar os termos e a política de privacidade." }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const registerSchema = z.object({
  name: requiredText("Informe seu nome.", 120),
  email: emailSchema,
  password: passwordSchema,
  marketingOptIn: z.boolean().optional(),
  acceptTerms: z.literal(true, { error: "É preciso aceitar os termos e a política de privacidade." }),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe a senha.").max(128) });

export const addressSchema = z.object({ label: trimmed(30).optional(), recipient: requiredText("Informe o destinatário.", 120), ...addressFields, isDefault: z.boolean().optional() });

export const profileSchema = z.object({
  name: requiredText("Informe seu nome.", 120),
  phone: z.string().trim().optional().or(z.literal("")).refine((v) => !v || isValidPhone(v), "Telefone inválido."),
  cpf: z.string().trim().optional().or(z.literal("")).refine((v) => !v || isValidCPF(v), "CPF inválido."),
  marketingOptIn: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: requiredText("Informe seu nome.", 120),
  email: emailSchema,
  subject: requiredText("Selecione o assunto.", 80),
  orderNumber: trimmed(20).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Escreva pelo menos 10 caracteres.").max(3000),
});

export const reviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: trimmed(80).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Conte um pouco mais (mín. 10 caracteres).").max(2000),
});

// ── Admin ──
const cents = z.coerce.number().int().min(0).max(100_000_000);

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: requiredText("SKU obrigatório.", 60).regex(/^[A-Za-z0-9._-]+$/, "SKU: use letras, números, ponto, hífen ou _."),
  color: trimmed(40).optional().nullable(),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable().or(z.literal("")),
  size: trimmed(30).optional().nullable(),
  priceCents: cents.optional().nullable(),
  compareAtCents: cents.optional().nullable(),
  costCents: cents.optional().nullable(),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  supplierSku: trimmed(80).optional().nullable(),
  active: z.boolean().default(true),
});

export const productInputSchema = z.object({
  name: requiredText("Informe o nome.", 120),
  slug: z.string().trim().max(90).regex(/^[a-z0-9-]*$/, "Slug: letras minúsculas, números e hífens.").optional().or(z.literal("")),
  subtitle: trimmed(160).optional().nullable(),
  description: z.string().trim().min(20, "Descrição muito curta (mín. 20 caracteres).").max(10000),
  specs: z.array(z.object({ label: trimmed(60), value: trimmed(200) })).max(30).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  featured: z.boolean().default(false),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  priceCents: cents.refine((v) => v > 0, "Preço de venda obrigatório."),
  compareAtCents: cents.optional().nullable(),
  costCents: cents,
  weightGrams: z.coerce.number().int().min(1).max(100000),
  colorLabel: trimmed(20).optional(),
  sizeLabel: trimmed(20).optional(),
  seoTitle: trimmed(70).optional().nullable(),
  seoDescription: trimmed(170).optional().nullable(),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(20).default([]),
  images: z.array(z.object({ url: z.string().trim().min(1).max(500), alt: trimmed(160), colorKey: trimmed(40).optional().nullable() })).max(15),
  variants: z.array(variantInputSchema).min(1, "Cadastre ao menos uma variação (SKU)."),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(3, "Código muito curto.").max(30).regex(/^[A-Z0-9_-]+$/, "Use letras, números, - ou _."),
  description: trimmed(160).optional().or(z.literal("")),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().int().min(0),
  minSubtotalCents: cents.default(0),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.coerce.number().int().min(1).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  active: z.boolean().default(true),
}).refine((c) => c.type !== "PERCENT" || (c.value >= 1 && c.value <= 100), { message: "Percentual entre 1 e 100.", path: ["value"] })
  .refine((c) => c.type !== "FIXED" || c.value > 0, { message: "Informe o valor do desconto.", path: ["value"] });

export const supplierInputSchema = z.object({
  name: requiredText("Informe o nome.", 120),
  integration: z.enum(["MANUAL", "CSV", "ALIEXPRESS", "CJ", "CUSTOM_API"]),
  contactName: trimmed(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().optional().or(z.literal("")).refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
  phone: trimmed(30).optional().or(z.literal("")),
  website: trimmed(200).optional().or(z.literal("")),
  notes: trimmed(2000).optional().or(z.literal("")),
  processingDays: z.coerce.number().int().min(0).max(60),
  shippingDaysMin: z.coerce.number().int().min(0).max(90),
  shippingDaysMax: z.coerce.number().int().min(0).max(120),
  autoForward: z.boolean().default(false),
  active: z.boolean().default(true),
}).refine((s) => s.shippingDaysMax >= s.shippingDaysMin, { message: "Prazo máximo deve ser ≥ mínimo.", path: ["shippingDaysMax"] });

export const normalizeDigits = onlyDigits;

/** Converte erros do zod em { campo: mensagem } para exibir nos formulários. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
