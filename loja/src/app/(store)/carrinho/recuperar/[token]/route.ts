import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { CART_COOKIE } from "@/lib/cart";
import { env } from "@/lib/env";

/** Link de recuperação de carrinho (e-mail/WhatsApp): restaura a sacola neste navegador. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cart = /^[\w-]{10,60}$/.test(token) ? await db.cart.findUnique({ where: { recoveryToken: token } }) : null;
  const res = NextResponse.redirect(new URL(cart && !cart.convertedAt ? "/carrinho?recuperado=1" : "/carrinho", env.siteUrl));
  if (cart && !cart.convertedAt) {
    const cookieToken = randomToken();
    await db.cart.update({ where: { id: cart.id }, data: { tokenHash: sha256(cookieToken) } });
    res.cookies.set(CART_COOKIE, cookieToken, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 60 * 86400 });
  }
  return res;
}
