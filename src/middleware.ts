import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // If no locale cookie exists, set default to Uzbek
  if (!request.cookies.get("locale")) {
    response.cookies.set("locale", "uz", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico|uploads|api).*)",
  ],
};
