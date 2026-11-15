import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem otimista: sem cookie de sessão, nem chega a renderizar áreas protegidas.
 * A verificação real (sessão válida + permissão) acontece no servidor em cada página/ação.
 */
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("mk_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/conta/entrar";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/conta", "/conta/dados", "/conta/enderecos", "/conta/privacidade", "/conta/avaliar/:path*"],
};
