import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false } };

export default async function ResetPage() {
  if (!(await getCurrentUser())) redirect("/recuperar-senha?expirado=1");
  return (
    <AuthCard title="Defina uma nova senha">
      <ResetForm />
    </AuthCard>
  );
}
