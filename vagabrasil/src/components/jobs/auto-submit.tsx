"use client";
import { useRef } from "react";

/** Envia o formulário de filtros automaticamente ao alterar selects (progressive enhancement). */
export function AutoSubmitForm({ children, ...props }: React.ComponentProps<"form">) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      {...props}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "radio") ref.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
