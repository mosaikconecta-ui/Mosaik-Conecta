"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { formatBRL, marginPct, parseBRLToCents, slugify } from "@/lib/format";
import { deleteProductAction, saveProductAction, uploadImageAction } from "@/actions/admin-products";
import { emptyVariant, type Img, type ProductFormData, type Spec, type Variant } from "./product-form-data";

export function ProductForm({ initial, categories, suppliers }: { initial: ProductFormData; categories: { id: string; name: string }[]; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; errors?: Record<string, string> } | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) => setF((s) => ({ ...s, [k]: v }));

  const price = parseBRLToCents(f.price);
  const cost = parseBRLToCents(f.cost);
  const margin = useMemo(() => (price > 0 ? marginPct(price, cost) : null), [price, cost]);

  const updVariant = (i: number, patch: Partial<Variant>) => set("variants", f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const updImage = (i: number, patch: Partial<Img>) => set("images", f.images.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const moveImage = (i: number, dir: -1 | 1) => {
    const arr = [...f.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("images", arr);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: Img[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      const fd = new FormData();
      fd.set("file", file);
      const r = await uploadImageAction(fd);
      if (r.ok) added.push({ url: r.url, alt: f.name, colorKey: "" });
      else setResult({ ok: false, message: r.message });
    }
    set("images", [...f.images, ...added]);
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    setResult(null);
    const cents = (v: string) => (v.trim() === "" ? null : parseBRLToCents(v));
    const payload = {
      name: f.name, slug: f.slug, subtitle: f.subtitle || null, description: f.description, status: f.status, featured: f.featured,
      categoryId: f.categoryId || null, supplierId: f.supplierId || null, priceCents: price, compareAtCents: cents(f.compareAt), costCents: cost,
      weightGrams: Number(f.weight) || 0, colorLabel: f.colorLabel, sizeLabel: f.sizeLabel, seoTitle: f.seoTitle || null, seoDescription: f.seoDescription || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      specs: f.specs.filter((s) => s.label.trim() && s.value.trim()),
      images: f.images.map((im) => ({ url: im.url, alt: im.alt || f.name, colorKey: im.colorKey || null })),
      variants: f.variants.map((v) => ({
        id: v.id, sku: v.sku.trim(), color: v.color || null, colorHex: v.colorHex || null, size: v.size || null,
        priceCents: cents(v.price), compareAtCents: cents(v.compareAt), costCents: cents(v.cost), stock: Number(v.stock) || 0,
        supplierSku: v.supplierSku || null, active: v.active,
      })),
    };
    const r = await saveProductAction(f.id, payload);
    setSaving(false);
    setResult(r);
    if (r.ok && !f.id) router.replace(`/admin/produtos/${r.id}?salvo=1`);
    else if (r.ok) router.refresh();
    if (!r.ok) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const input = "field h-10 min-h-0 text-sm";
  const err = (k: string) => result && !result.ok && result.errors?.[k] ? <p className="mt-1 text-[12px] text-danger">{result.errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      {result && <Alert tone={result.ok ? "ok" : "bad"}>{result.message}</Alert>}

      <section className="grid gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Informações</h2>
        <label><span className="label">Nome</span><input id="p-name" className={input} value={f.name} onChange={(e) => set("name", e.target.value)} onBlur={() => !f.slug && set("slug", slugify(f.name))} />{err("name")}</label>
        <label><span className="label">Slug (URL)</span><input className={input} value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="gerado a partir do nome" />{err("slug")}</label>
        <label className="md:col-span-2"><span className="label">Subtítulo</span><input className={input} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></label>
        <label className="md:col-span-2"><span className="label">Descrição completa</span><textarea id="p-description" className="field min-h-[160px] text-sm" value={f.description} onChange={(e) => set("description", e.target.value)} />{err("description")}</label>
        <label><span className="label">Categoria</span><select className={input} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className="label">Fornecedor</span><select className={input} value={f.supplierId} onChange={(e) => set("supplierId", e.target.value)}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label><span className="label">Status</span><select className={input} value={f.status} onChange={(e) => set("status", e.target.value as ProductFormData["status"])}><option value="DRAFT">Rascunho</option><option value="ACTIVE">Publicado</option><option value="ARCHIVED">Arquivado</option></select></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4" /> Destacar na vitrine (curadoria)</label>
      </section>

      <section className="grid gap-4 border border-line bg-surface p-5 md:grid-cols-4">
        <h2 className="font-semibold md:col-span-4">Preço, custo e margem</h2>
        <label><span className="label">Preço de venda (R$)</span><input id="p-price" className={input} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0,00" />{err("priceCents")}</label>
        <label><span className="label">Preço “de” (promoção)</span><input className={input} inputMode="decimal" value={f.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="opcional" /></label>
        <label><span className="label">Custo do fornecedor (R$)</span><input id="p-cost" className={input} inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0,00" /></label>
        <label><span className="label">Peso (g)</span><input className={input} inputMode="numeric" value={f.weight} onChange={(e) => set("weight", e.target.value.replace(/\D/g, ""))} /></label>
        <div className="text-sm md:col-span-4">
          {margin === null ? <span className="text-muted">Informe o preço para calcular a margem.</span> : (
            <span className={margin < 30 ? "font-semibold text-danger" : "font-semibold text-moss"}>
              Margem: {margin}% · lucro bruto {formatBRL(price - cost)} por unidade{margin < 30 ? " — abaixo de 30%, revise (taxas do gateway ≈ 5% e frete grátis reduzem a margem)" : ""}
            </span>
          )}
        </div>
      </section>

      <section className="border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Variações (SKU, estoque e fornecedor)</h2>
          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1">Rótulo 1 <input className="field h-8 min-h-0 w-24 text-sm" value={f.colorLabel} onChange={(e) => set("colorLabel", e.target.value)} /></label>
            <label className="flex items-center gap-1">Rótulo 2 <input className="field h-8 min-h-0 w-24 text-sm" value={f.sizeLabel} onChange={(e) => set("sizeLabel", e.target.value)} /></label>
          </div>
        </div>
        {err("variants")}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.06em] text-muted">
              <tr><th className="pb-2 pr-2">SKU</th><th className="pr-2">{f.colorLabel || "Cor"}</th><th className="pr-2">Hex</th><th className="pr-2">{f.sizeLabel || "Tamanho"}</th><th className="pr-2">Preço próprio</th><th className="pr-2">Custo próprio</th><th className="pr-2">Estoque</th><th className="pr-2">SKU fornecedor</th><th className="pr-2">Margem</th><th>Ativa</th><th /></tr>
            </thead>
            <tbody>
              {f.variants.map((v, i) => {
                const vp = v.price ? parseBRLToCents(v.price) : price;
                const vc = v.cost ? parseBRLToCents(v.cost) : cost;
                return (
                  <tr key={v.id ?? `new-${i}`} className="align-top">
                    <td className="py-1 pr-2"><input name={`v-sku-${i}`} className={input} value={v.sku} onChange={(e) => updVariant(i, { sku: e.target.value.toUpperCase() })} /></td>
                    <td className="pr-2"><input className={input} value={v.color} onChange={(e) => updVariant(i, { color: e.target.value })} /></td>
                    <td className="pr-2"><div className="flex items-center gap-1"><input type="color" className="h-10 w-10 cursor-pointer border border-line-2" value={v.colorHex || "#cccccc"} onChange={(e) => updVariant(i, { colorHex: e.target.value })} aria-label="Cor" /></div></td>
                    <td className="pr-2"><input className={input} value={v.size} onChange={(e) => updVariant(i, { size: e.target.value })} /></td>
                    <td className="pr-2"><input className={input} value={v.price} onChange={(e) => updVariant(i, { price: e.target.value })} placeholder="padrão" /></td>
                    <td className="pr-2"><input className={input} value={v.cost} onChange={(e) => updVariant(i, { cost: e.target.value })} placeholder="padrão" /></td>
                    <td className="pr-2"><input name={`v-stock-${i}`} className={`${input} w-20`} inputMode="numeric" value={v.stock} onChange={(e) => updVariant(i, { stock: e.target.value.replace(/\D/g, "") })} /></td>
                    <td className="pr-2"><input className={input} value={v.supplierSku} onChange={(e) => updVariant(i, { supplierSku: e.target.value })} /></td>
                    <td className="whitespace-nowrap pr-2 pt-2.5 tabular-nums">{vp > 0 ? `${marginPct(vp, vc)}%` : "—"}</td>
                    <td className="pt-2.5"><input type="checkbox" checked={v.active} onChange={(e) => updVariant(i, { active: e.target.checked })} className="size-4" aria-label="Ativa" /></td>
                    <td className="pl-2"><button type="button" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} disabled={f.variants.length === 1} className="grid size-10 place-items-center text-muted hover:text-danger disabled:opacity-30" aria-label="Remover variação"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => set("variants", [...f.variants, emptyVariant()])} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"><Plus size={16} /> Adicionar variação</button>
        <p className="mt-2 text-[12px] text-muted">Deixe “preço/custo próprio” em branco para usar os valores do produto. Variações já vendidas são desativadas (não excluídas) ao remover.</p>
      </section>

      <section className="border border-line bg-surface p-5">
        <h2 className="mb-3 font-semibold">Imagens</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {f.images.map((im, i) => (
            <div key={`${im.url}-${i}`} className="flex gap-3 border border-line p-2">
              <div className="relative aspect-[4/5] w-20 shrink-0 bg-paper-2"><Image src={im.url} alt="" fill sizes="80px" className="object-cover" /></div>
              <div className="flex-1 space-y-1.5">
                <input className="field h-8 min-h-0 text-[13px]" value={im.alt} onChange={(e) => updImage(i, { alt: e.target.value })} placeholder="Texto alternativo" aria-label="Texto alternativo" />
                <input className="field h-8 min-h-0 text-[13px]" value={im.colorKey} onChange={(e) => updImage(i, { colorKey: e.target.value })} placeholder={`${f.colorLabel} associada (opcional)`} aria-label="Variação associada" />
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveImage(i, -1)} className="grid size-8 place-items-center hover:bg-paper-2" aria-label="Mover para cima"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moveImage(i, 1)} className="grid size-8 place-items-center hover:bg-paper-2" aria-label="Mover para baixo"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="ml-auto grid size-8 place-items-center text-danger hover:bg-paper-2" aria-label="Remover imagem"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-ink px-4 text-sm font-semibold">
            <Upload size={15} /> {uploading ? "Enviando…" : "Enviar imagens"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading} />
          </label>
          <UrlAdder onAdd={(url) => set("images", [...f.images, { url, alt: f.name, colorKey: "" }])} />
        </div>
        <p className="mt-2 text-[12px] text-muted">JPG, PNG ou WebP até 5 MB. A primeira imagem é a capa. Proporção recomendada 4:5.</p>
      </section>

      <section className="grid gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Especificações</h2>
        {f.specs.map((s, i) => (
          <div key={i} className="flex gap-2 md:col-span-2">
            <input className={`${input} max-w-[220px]`} value={s.label} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Ex.: Material" />
            <input className={input} value={s.value} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Ex.: Grés cerâmico" />
            <button type="button" onClick={() => set("specs", f.specs.filter((_, j) => j !== i))} className="grid size-10 shrink-0 place-items-center text-muted hover:text-danger" aria-label="Remover especificação"><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set("specs", [...f.specs, { label: "", value: "" }])} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold"><Plus size={16} /> Adicionar especificação</button>
      </section>

      <section className="grid gap-4 border border-line bg-surface p-5 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">SEO e busca</h2>
        <label><span className="label">Título SEO ({f.seoTitle.length}/70)</span><input className={input} maxLength={70} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder="usa o nome se vazio" /></label>
        <label><span className="label">Palavras-chave de busca (vírgula)</span><input className={input} value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="vaso, cerâmica, decoração" /></label>
        <label className="md:col-span-2"><span className="label">Meta descrição ({f.seoDescription.length}/170)</span><textarea className="field min-h-[70px] text-sm" maxLength={170} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></label>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-[#f7f5f0]/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Button onClick={save} loading={saving}>Salvar produto</Button>
        {f.id && <a href={`/produto/${f.slug}`} target="_blank" rel="noopener noreferrer" className="link-draw text-sm">Ver na loja</a>}
        {f.id && (
          <Button variant="danger" size="sm" className="ml-auto" onClick={async () => {
            if (!confirm("Excluir este produto? Produtos com vendas serão arquivados.")) return;
            const r = await deleteProductAction(f.id!);
            alert(r.message);
            router.push("/admin/produtos");
          }}>Excluir</Button>
        )}
      </div>
    </div>
  );
}

function UrlAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const valid = /^\/[\w\-./]+\.(jpg|jpeg|png|webp)$/i.test(url);
  return (
    <div className="flex gap-2">
      <input className="field h-10 min-h-0 w-64 text-sm" value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="/products/arquivo.jpg" aria-label="Caminho da imagem" />
      <Button type="button" size="sm" variant="secondary" className="h-10" disabled={!valid} onClick={() => { onAdd(url); setUrl(""); }}>Adicionar caminho</Button>
    </div>
  );
}

