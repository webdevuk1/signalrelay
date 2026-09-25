import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function deskAuthOk(request: NextRequest, password: string) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(auth.slice(6));
    const colon = decoded.indexOf(":");
    const pass = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    return pass === password;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const password = process.env.SIGNALRELAY_DESK_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/webhook")) return NextResponse.next();

  if (deskAuthOk(request, password)) return NextResponse.next();

  return new NextResponse("SignalRelay desk requires login.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SignalRelay", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
