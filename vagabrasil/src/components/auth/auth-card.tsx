export function AuthCard({ title, subtitle, children, wide }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`card w-full ${wide ? "max-w-xl" : "max-w-md"} p-6 sm:p-8`}>
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
