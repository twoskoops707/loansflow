#!/usr/bin/env node
/* Daily health snapshot of https://loansflow.loan. Appends one JSON line to monitoring/history.jsonl and exits non-zero on problems,
   so a scheduled GitHub Actions run both builds a history and emails you when something breaks. */
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const BASE = process.env.SITE_BASE || 'https://loansflow.loan';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'history.jsonl');
const UA = 'LoansFlowHealthCheck/1.0 (+https://loansflow.loan/)';
async function get(url) {
  const t = Date.now();
  try { const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' }); const body = await r.text(); return { url, status: r.status, ms: Date.now() - t, body }; }
  catch (e) { return { url, status: 0, ms: Date.now() - t, body: '', error: String(e) }; }
}
const sitemap = await get(BASE + '/sitemap.xml');
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const problems = [];
if (sitemap.status !== 200 || !urls.length) problems.push('sitemap unavailable or empty');
const pages = []; let i = 0;
async function worker() { while (i < urls.length) { const u = urls[i++]; pages.push(await get(u)); } }
await Promise.all([worker(), worker(), worker(), worker()]);
let noindex = 0, noTitle = 0, noCanonical = 0, slow = 0, bad = 0;
for (const p of pages) {
  if (p.status !== 200) { bad++; problems.push(`${p.status} ${p.url}`); continue; }
  if (/<meta name="robots" content="[^"]*noindex/i.test(p.body)) { noindex++; problems.push(`noindex in sitemap: ${p.url}`); }
  if (!/<title>[^<]{5,}/i.test(p.body)) noTitle++;
  if (!/<link rel="canonical"/i.test(p.body)) noCanonical++;
  if (p.ms > 3000) slow++;
}
const ads = await get(BASE + '/ads.txt'); if (!/google\.com, pub-\d+, DIRECT/.test(ads.body)) problems.push('ads.txt missing or malformed');
const robots = await get(BASE + '/robots.txt'); if (/Disallow:\s*\/\s*$/m.test(robots.body)) problems.push('robots.txt blocks the whole site');
const news = await get(BASE + '/data/market-news.json'); let newsAge = null;
try { newsAge = Math.round((Date.now() - new Date(JSON.parse(news.body).updatedAt)) / 36e5); if (newsAge > 72) problems.push(`rate data is ${newsAge}h old`); } catch { problems.push('market-news.json unreadable'); }
const rates = await get(BASE + '/data/rates.json'); try { const rj = JSON.parse(rates.body); const age = Math.round((Date.now() - new Date(rj.updatedAt)) / 36e5); if (age > 72) problems.push(`rates.json is ${age}h old`); } catch { problems.push('rates.json unreadable'); }
const avg = pages.length ? Math.round(pages.reduce((a, p) => a + p.ms, 0) / pages.length) : null;
const row = { date: new Date().toISOString(), urls: urls.length, ok: pages.length - bad, bad, noindex, noTitle, noCanonical, slow, avgMs: avg, rateDataAgeHours: newsAge, adsTxt: ads.status, problems: problems.slice(0, 20) };
appendFileSync(OUT, JSON.stringify(row) + '\n');
console.log(JSON.stringify(row, null, 1));
process.exit(problems.length ? 1 : 0);
