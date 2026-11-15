import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";

const MAX_BYTES = 5 * 1024 * 1024;

/** Diretório persistente fora de public/ (servido por src/app/uploads/[name]/route.ts). */
export const uploadDir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");

function sniff(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/**
 * Armazena imagens enviadas pelo painel.
 * Driver local (UPLOAD_DIR, padrão ./storage/uploads) — adequado para servidor próprio/VPS com volume persistente.
 * Em hospedagem serverless (Vercel), o disco é efêmero: implemente um driver S3/R2/Cloudinary
 * com a mesma assinatura (veja docs/DEPLOY.md).
 */
export async function storeImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("Imagem acima de 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new Error("Formato não suportado. Use JPG, PNG ou WebP.");
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomToken(8)}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}
