export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let suppliedOrigin: string;
  try { suppliedOrigin = new URL(origin).origin; }
  catch { return false; }
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : requestOrigin;
  return suppliedOrigin === requestOrigin || suppliedOrigin === configuredOrigin;
}
