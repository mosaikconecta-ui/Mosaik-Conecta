import { isSupabaseConfigured } from "@/lib/env";

/** Aviso exibido apenas quando o ambiente não possui o banco configurado. */
export function ConfigNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-900">
      Ambiente sem banco de dados configurado: defina <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
      <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja o README).
    </div>
  );
}
