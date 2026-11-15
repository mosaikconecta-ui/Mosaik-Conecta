import { z } from "zod";
import { city, cnpj, email, optionalText, phone, requiredText, ufSchema, url } from "./common";

export const companySchema = z.object({
  legal_name: requiredText(3, 160, "Razão social"),
  trade_name: requiredText(2, 120, "Nome fantasia"),
  cnpj,
  email,
  phone,
  website: url,
  address: optionalText(240),
  city,
  state: ufSchema,
  description: optionalText(4000),
});
export type CompanyInput = z.input<typeof companySchema>;

export const inviteSchema = z.object({ email });
