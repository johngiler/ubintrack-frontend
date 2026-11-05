import { forwardApi } from "@/lib/forwardApi";

export const dynamic = "force-dynamic";

async function forward(request, context) {
  const { path } = await context.params;
  return forwardApi(request, `/api/${path.join("/")}`);
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
export const OPTIONS = forward;
