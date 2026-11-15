"use client";
import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { ActionResult } from "@/lib/actions";

/**
 * Formulário com React Hook Form + Zod no cliente e a MESMA validação no servidor (Server Action).
 * Erros de campo retornados pelo servidor são exibidos nos respectivos campos.
 */
export function useActionForm<S extends z.ZodType<FieldValues, FieldValues>, R = unknown>(
  schema: S,
  action: (input: z.output<S>) => Promise<ActionResult<R>>,
  defaultValues?: DefaultValues<z.input<S>>,
  opts?: { onSuccess?: (r: { ok: true; message?: string; data?: R }) => void; resetOnSuccess?: boolean },
) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    defaultValues,
    mode: "onTouched",
  });
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    setSuccess(null);
    start(async () => {
      const result = await action(values);
      if (!result) return; // redirecionado
      if (result.ok) {
        setSuccess(result.message ?? null);
        if (opts?.resetOnSuccess) form.reset();
        opts?.onSuccess?.(result);
      } else {
        setServerError(result.error);
        for (const [k, v] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(k as Path<z.input<S>>, { message: v });
        }
      }
    });
  });

  const err = (name: string) => {
    const parts = name.split(".");
    let cur: unknown = form.formState.errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return (cur as { message?: string } | undefined)?.message;
  };

  return { form, onSubmit, pending, serverError, success, err, setSuccess };
}
