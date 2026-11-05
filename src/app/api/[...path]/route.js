import { forwardApi } from "@/lib/forwardApi";

export const dynamic = "force-dynamic";

async function forward(request) {
  return forwardApi(request, request.nextUrl.pathname);
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
export const OPTIONS = forward;
