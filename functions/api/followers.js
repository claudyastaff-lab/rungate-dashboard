// Cloudflare Pages Function — live Facebook follower counts via the Graph API.
// Lives at: functions/api/followers.js  (reachable at /api/followers)
//
// Requires a Cloudflare secret:  FB_TOKEN  (a Facebook Page or long-lived User access token)
// Optional:                      FB_PAGE_IDS (comma-separated default list of page IDs)
//
// Call from the dashboard:  /api/followers?ids=<pageId1>,<pageId2>
// Returns: { updatedAt, pages: { "<id>": { name, followers } | { error } } }

export const onRequest = async (context) => {
  const { request, env } = context;
  const token = env.FB_TOKEN;
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || env.FB_PAGE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token) return json({ error: "FB_TOKEN secret is not set in Cloudflare yet." });
  if (!ids.length) return json({ error: "No page IDs provided (use ?ids=... or set FB_PAGE_IDS)." });

  const VER = "v20.0";
  const pages = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const api =
          `https://graph.facebook.com/${VER}/${encodeURIComponent(id)}` +
          `?fields=name,followers_count,fan_count&access_token=${encodeURIComponent(token)}`;
        const r = await fetch(api);
        const d = await r.json();
        if (d.error) pages[id] = { error: d.error.message };
        else pages[id] = { name: d.name || null, followers: (d.followers_count ?? d.fan_count ?? null) };
      } catch (e) {
        pages[id] = { error: String(e) };
      }
    })
  );

  return json({ updatedAt: new Date().toISOString(), pages });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
