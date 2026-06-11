import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication.
const publicPaths = ["/", "/login", "/signup", "/pricing"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact match on "/", prefix match on the others.
  const isPublic = publicPaths.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get("hr_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
