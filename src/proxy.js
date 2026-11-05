import { NextResponse } from "next/server";

const APP_ROUTES = new Set([
  "/dashboard",
  "/login",
  "/account/profile",
  "/core/owner",
  "/core/users",
  "/core/profiles",
  "/core/clients",
  "/inventory/products",
  "/inventory/bins",
  "/order/entries",
  "/order/exits",
  "/storage/storages",
  "/storage/cavas",
  "/storage/positions",
  "/finance/billing",
  "/finance/tariffs",
  "/tasks/tasks",
  "/tasks/trackings",
]);

function isAppRoute(pathname) {
  if (APP_ROUTES.has(pathname)) return true;
  return pathname.startsWith("/finance/billing/");
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (isAppRoute(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!apibff|api|_next/static|_next/image|media|favicon.ico|.*\\..*).*)"],
};
