"use client";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { inviteRecruiterAction } from "@/actions/company";
import { inviteSchema } from "@/lib/validation/company";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";

export function InviteForm() {
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(inviteSchema, inviteRecruiterAction as never, { email: "" }, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Field label="E-mail do recrutador" htmlFor="invite-email" error={err("email")} className="flex-1">
          <Input id="invite-email" type="email" {...form.register("email")} />
        </Field>
        <Button type="submit" className="sm:mt-6" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Enviar convite</Button>
      </div>
      <FormStatus error={serverError} success={success} />
    </form>
  );
}
