import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verificarToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ehAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const autenticado = token ? await verificarToken(token) : false;

  if (ehAdmin && !autenticado) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("de", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && autenticado) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Só o que é privado. A loja é pública e não deve pagar um verify de JWT
  // a cada visita.
  matcher: ["/admin/:path*", "/login"],
};
