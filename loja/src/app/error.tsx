"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-28 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Algo deu errado</p>
      <h1 className="mt-4 font-serif text-[44px] leading-tight">Não conseguimos carregar esta página</h1>
      <p className="mt-4 text-ink-2">Tente novamente em instantes. Se o problema continuar, fale com o atendimento.</p>
      <button onClick={reset} className="mt-8 h-12 bg-ink px-6 font-semibold text-paper">Tentar novamente</button>
    </div>
  );
}
