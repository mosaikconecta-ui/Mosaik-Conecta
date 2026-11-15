import Image from "next/image";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-x grid gap-12 pt-10 md:pt-16 lg:grid-cols-2 lg:items-center">
      <div className="mx-auto w-full max-w-md">
        <h1 className="display text-[42px] md:text-[54px]">{title}</h1>
        {subtitle && <p className="mt-3 text-ink-2">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-sm">{footer}</div>}
      </div>
      <div className="relative hidden aspect-[4/5] max-h-[680px] bg-paper-2 lg:block">
        <Image src="/products/vela-atelie-figo-1.jpg" alt="" fill sizes="45vw" className="object-cover" />
      </div>
    </div>
  );
}
