// POST /api/contact — website contact form.
// Emails the message to the site owner (CONTACT_TO, a secret, never shown on the
// site) and sends the visitor a fixed "we got your message" auto-reply.
// Uses the Cloudflare Email Service REST API because Pages Functions can't take
// a send_email binding.
//
// Required Pages env (Settings → Variables and Secrets):
//   CONTACT_TO      secret — where messages go (must be a verified Email Routing destination)
//   CF_EMAIL_TOKEN  secret — API token with Email Sending permission
//   CF_ACCOUNT_ID   plain  — Cloudflare account id
//   CONTACT_FROM    optional — defaults to info@loansflow.loan
//
// The owner notification is free (verified destination). The visitor auto-reply
// goes to an arbitrary address, which needs the Workers Paid plan; if that send
// fails the submission still succeeds.

const LIMITS = { name: 100, email: 254, phone: 40, subject: 150, message: 5000 };
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Strip CR/LF so nothing user-supplied can break an email header line.
const oneLine = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();

async function sendEmail(env, payload) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CF_EMAIL_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const err = (data.errors && data.errors[0]) || {};
    throw new Error(`email send failed (${res.status}): ${err.code || ''} ${err.message || ''}`.trim());
  }
  return data;
}

export async function onRequestPost({ request, env }) {
  // Same-origin only — the form lives on this site.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ ok: false, error: 'Forbidden' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request' }, 400);
  }

  // Bot traps: hidden field must stay empty, and a human takes more than 3s to fill the form.
  if (body.website) return json({ ok: true });
  const elapsed = Date.now() - Number(body.startedAt || 0);
  if (!(elapsed > 3000)) return json({ ok: false, error: 'Please take a moment and try again.' }, 400);

  const f = {
    name: oneLine(body.name),
    email: oneLine(body.email),
    phone: oneLine(body.phone),
    subject: oneLine(body.subject),
    message: String(body.message || '').trim(),
  };
  const errors = {};
  if (!f.name) errors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(f.email)) errors.email = 'Please enter a valid email address.';
  if (!f.subject) errors.subject = 'Please add a subject.';
  if (!f.message) errors.message = 'Please write a message.';
  for (const k of Object.keys(LIMITS)) {
    if (f[k].length > LIMITS[k]) errors[k] = `Too long (max ${LIMITS[k]} characters).`;
  }
  if (Object.keys(errors).length) return json({ ok: false, errors }, 422);

  if (!env.CONTACT_TO || !env.CF_EMAIL_TOKEN || !env.CF_ACCOUNT_ID) {
    console.error('contact: missing CONTACT_TO / CF_EMAIL_TOKEN / CF_ACCOUNT_ID');
    return json({ ok: false, error: 'The contact form is not set up yet. Please try again later.' }, 503);
  }
  const from = { address: env.CONTACT_FROM || 'info@loansflow.loan', name: 'LoansFlow' };

  const rows = [['Name', f.name], ['Email', f.email], ['Phone', f.phone || '—'], ['Subject', f.subject]];
  try {
    await sendEmail(env, {
      to: env.CONTACT_TO,
      from,
      reply_to: f.email,
      subject: `[LoansFlow contact] ${f.subject}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${f.message}\n`,
      html:
        '<table cellpadding="4">' +
        rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join('') +
        `</table><p style="white-space:pre-wrap">${escapeHtml(f.message)}</p>`,
    });
  } catch (err) {
    console.error('contact: owner notification', err.message);
    return json({ ok: false, error: "Sorry, we couldn't send your message right now. Please try again later." }, 502);
  }

  // Fixed text on purpose: echoing visitor input would let the form be used to spam third parties.
  try {
    await sendEmail(env, {
      to: f.email,
      from,
      subject: 'We received your message — LoansFlow',
      text:
        'Thanks for contacting LoansFlow.\n\nWe have received your message and will be getting back to you shortly.\n\n— The LoansFlow team\nhttps://loansflow.loan',
      html:
        '<p>Thanks for contacting LoansFlow.</p><p>We have received your message and will be getting back to you shortly.</p><p>— The LoansFlow team<br><a href="https://loansflow.loan">loansflow.loan</a></p>',
    });
  } catch (err) {
    console.error('contact: auto-reply', err.message);
  }

  return json({ ok: true });
}
