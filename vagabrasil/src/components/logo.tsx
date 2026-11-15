import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0B1F3A" />
      <path d="M8 10.5 13.6 22h1.9L21.2 10.5h-3l-3.6 8-3.6-8H8Z" fill="#fff" />
      <circle cx="23.5" cy="21" r="2.5" fill="#1D63ED" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="VagaBrasil — página inicial">
      <LogoMark className="size-8" />
      <span className={cn("font-display text-[19px] font-bold tracking-tight", inverted ? "text-white" : "text-navy-900")}>
        Vaga<span className={inverted ? "text-brand-300" : "text-brand-600"}>Brasil</span>
      </span>
    </Link>
  );
}
