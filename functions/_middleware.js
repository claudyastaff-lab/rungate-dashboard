// Cloudflare Pages Function — password-gates the whole dashboard.
// Lives at: functions/_middleware.js  (Cloudflare runs it on every request).
//
// Credentials are read from environment variables you set in the Cloudflare
// dashboard, so no password is ever stored in this repo.
//
//   Shared team login:   AUTH_USER = clay        AUTH_PASS = your-password
//   Individual logins:   AUTH_USERS = clay:pw1,maria:pw2,diego:pw3
//
// If none are set yet, the site stays open (so setup can't lock you out).

export const onRequest = async (context) => {
  const { request, env, next } = context;

  const allowed = [];
  if (env.AUTH_USERS) {
    env.AUTH_USERS.split(",").forEach((pair) => {
      const p = pair.trim();
      if (p.includes(":")) allowed.push(p);
    });
  }
  if (env.AUTH_USER && env.AUTH_PASS) {
    allowed.push(env.AUTH_USER + ":" + env.AUTH_PASS);
  }

  // Not configured yet -> let everyone through.
  if (allowed.length === 0) return next();

  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = atob(header.slice(6)); } catch (e) { decoded = ""; }
    if (allowed.includes(decoded)) return next();
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="RunGate Cash", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
};
