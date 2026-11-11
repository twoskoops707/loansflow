/* Placeholder email-capture endpoint (Cloudflare Pages Function). No third-party keys are committed.
   GET  /api/subscribe  -> { enabled: boolean }   (the form stays hidden until a destination is configured)
   POST /api/subscribe  -> forwards { email, source } as JSON to the URL in the SUBSCRIBE_WEBHOOK_URL environment
                           variable (set it in the Cloudflare Pages dashboard; point it at your email provider's
                           form/webhook endpoint). Without it, the endpoint responds 503 and stores nothing. */
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }) {
  return json({ enabled: Boolean(env.SUBSCRIBE_WEBHOOK_URL) });
}

export async function onRequestPost({ request, env }) {
  // Same-origin only.
  const origin = request.headers.get('origin');
  try { if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false, error: 'forbidden' }, 403); } catch (_) { return json({ ok: false, error: 'forbidden' }, 403); }
  if (Number(request.headers.get('content-length') || 0) > 2048) return json({ ok: false, error: 'too_large' }, 413);
  if (!env.SUBSCRIBE_WEBHOOK_URL) return json({ ok: false, error: 'not_configured' }, 503);
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'bad_request' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json({ ok: false, error: 'invalid_email' }, 400);
  if (body.website) return json({ ok: true }); // honeypot: pretend success to bots
  try {
    const res = await fetch(env.SUBSCRIBE_WEBHOOK_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, source: String(body.source || '').slice(0, 100), list: 'monthly-sba-rate-update' }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? json({ ok: true }) : json({ ok: false, error: 'upstream' }, 502);
  } catch (_) {
    return json({ ok: false, error: 'upstream' }, 502);
  }
}
