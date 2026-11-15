"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para uma action do useActionState SEM o reset automático do React 19
 * (que apagaria os campos digitados quando há erro de validação).
 */
export function submitWith(dispatch: (fd: FormData) => void, before?: (e: FormEvent<HTMLFormElement>) => boolean | void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (before && before(e) === false) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
