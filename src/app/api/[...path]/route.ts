import { getApiUrl } from "../../../lib/api/client";

type AdminApiRouteContext = {
  params: Promise<{ path: string[] }>;
};

const hopByHopHeaders = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
];

async function proxyAdminApi(request: Request, context: AdminApiRouteContext): Promise<Response> {
  const { path } = await context.params;
  const allowedPath = (path[0] === "v1" && path[1] === "admin")
    || (path[0] === "admin" && path[1] === "auth");

  if (!allowedPath) {
    return Response.json({
      success: false,
      error: { code: "NOT_FOUND", message: "Admin API route was not found." },
    }, { status: 404 });
  }

  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(`${encodedPath}${new URL(request.url).search}`, `${getApiUrl().replace(/\/+$/, "")}/`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });
  const responseHeaders = new Headers(upstream.headers);
  for (const name of hopByHopHeaders) responseHeaders.delete(name);

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length) {
    responseHeaders.delete("set-cookie");
    for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyAdminApi;
export const POST = proxyAdminApi;
