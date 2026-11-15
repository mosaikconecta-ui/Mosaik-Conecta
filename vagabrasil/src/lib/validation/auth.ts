import { z } from "zod";
import { city, email, password, phone, requiredText, ufSchema } from "./common";

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha"),
  redirect: z.string().optional(),
});

export const candidateSignUpSchema = z
  .object({
    full_name: requiredText(3, 120, "Nome"),
    email,
    password,
    password_confirm: z.string(),
    phone,
    city,
    state: ufSchema,
    privacy_consent: z.literal(true, { message: "É necessário aceitar os termos e a política de privacidade" }),
    marketing_consent: z.boolean().optional(),
  })
  .refine((d) => d.password === d.password_confirm, { path: ["password_confirm"], message: "As senhas não conferem" });

export const companySignUpSchema = z
  .object({
    full_name: requiredText(3, 120, "Nome do responsável"),
    email,
    password,
    password_confirm: z.string(),
    phone,
    privacy_consent: z.literal(true, { message: "É necessário aceitar os termos e a política de privacidade" }),
    invite: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirm, { path: ["password_confirm"], message: "As senhas não conferem" });

export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ password, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, { path: ["password_confirm"], message: "As senhas não conferem" });

export type CandidateSignUp = z.input<typeof candidateSignUpSchema>;
export type CompanySignUp = z.input<typeof companySignUpSchema>;
