import { apiBase } from "@/lib/apiBase";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "host",
]);

function withTrailingSlash(pathname) {
  if (!pathname || pathname.endsWith("/")) return pathname || "/";
  return `${pathname}/`;
}

/**
 * Reenvía al API de Django y devuelve el cuerpo final.
 * Un 301/308 de la barra final se sigue aquí: si llega al navegador, Chrome lo cachea
 * y entra en bucle con el 308 de Next.
 */
export async function forwardApi(request, djangoPath) {
  const base = apiBase().replace(/\/$/, "");
  const path = withTrailingSlash(djangoPath.startsWith("/") ? djangoPath : `/${djangoPath}`);
  const target = `${base}${path}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Buffer.from(await request.arrayBuffer());
  }

  let upstream = await fetch(target, init);
  if (upstream.status >= 300 && upstream.status < 400) {
    const loc = upstream.headers.get("location");
    if (loc) {
      const nextUrl = new URL(loc, target);
      const retry = {
        method: request.method,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
      };
      if (request.method !== "GET" && request.method !== "HEAD" && (upstream.status === 307 || upstream.status === 308)) {
        retry.body = init.body;
      }
      upstream = await fetch(nextUrl, retry);
    }
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  out.set("cache-control", "no-store");
  const body = await upstream.arrayBuffer();
  return new Response(body, { status: upstream.status, headers: out });
}
