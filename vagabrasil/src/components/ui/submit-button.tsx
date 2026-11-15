"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonVariant } from "./button";

export function SubmitButton({ children, pendingText, variant, size, className, disabled, name, value }: {
  children: React.ReactNode; pendingText?: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
