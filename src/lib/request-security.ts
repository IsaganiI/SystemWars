/**
 * Blocks cross-site requests (CSRF): state-changing requests must come from this site's own pages.
 *
 * Behind a reverse proxy (Caddy, nginx) the app sees its internal address, such as http://127.0.0.1:3000,
 * while browsers send the public one, such as https://play.example.com. The public address is configured in
 * BETTER_AUTH_URL (Better Auth uses the same value), so both are accepted.
 */
function configuredOrigin() {
  try { return process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : null; }
  catch { return null; }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let suppliedOrigin: string;
  try { suppliedOrigin = new URL(origin).origin; }
  catch { return false; }
  const requestOrigin = new URL(request.url).origin;
  return suppliedOrigin === requestOrigin || suppliedOrigin === configuredOrigin();
}
