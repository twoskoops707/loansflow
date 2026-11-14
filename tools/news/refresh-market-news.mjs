#!/usr/bin/env node
/**
 * Refresh public/data/market-news.json from public rate + news sources.
 * Used by CI (scheduled) and local: node tools/news/refresh-market-news.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../public/data/market-news.json');

const UA =
  'LoansFlowMarketNewsBot/1.0 (+https://loansflow.loan/; educational calculator suite)';

const FEEDS = [
  {
    id: 'fed-monetary',
    category: 'Fed Policy',
    source: 'Federal Reserve',
    url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    limit: 2,
  },
  {
    id: 'mortgage-news',
    category: 'Rates',
    source: null, // use <source> from Google News when present
    url: 'https://news.google.com/rss/search?q=mortgage+rates+when:7d&hl=en-US&gl=US&ceid=US:en',
    limit: 8,
  },
  {
    id: 'cfpb-newsroom',
    category: 'Consumer Protection',
    source: 'Consumer Financial Protection Bureau',
    url: 'https://www.consumerfinance.gov/about-us/newsroom/feed/',
    limit: 3,
  },
  {
    id: 'fed-press',
    category: 'Fed Policy',
    source: 'Federal Reserve',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    limit: 2,
  },
  {
    id: 'smallbiz-lending-news',
    category: 'Small Business',
    source: null,
    url: 'https://news.google.com/rss/search?q=%22small+business%22+loans+OR+lending+when:7d&hl=en-US&gl=US&ceid=US:en',
    limit: 5,
  },
  {
    id: 'equipment-finance-news',
    category: 'Equipment Finance',
    source: null,
    url: 'https://news.google.com/rss/search?q=%22equipment+finance%22+OR+%22equipment+financing%22+when:14d&hl=en-US&gl=US&ceid=US:en',
    limit: 3,
  },
  {
    id: 'cre-lending-news',
    category: 'Commercial Real Estate',
    source: null,
    url: 'https://news.google.com/rss/search?q=%22commercial+real+estate%22+lending+OR+%22commercial+mortgage%22+when:14d&hl=en-US&gl=US&ceid=US:en',
    limit: 3,
  },
  {
    id: 'sba-news',
    category: 'SBA Policy',
    source: null,
    url: 'https://news.google.com/rss/search?q=SBA+loan+OR+%227(a)%22+OR+%22504+loan%22+when:14d&hl=en-US&gl=US&ceid=US:en',
    limit: 4,
  },
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/xml,text/xml,text/csv,text/html,*/*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000), // a stalled source must not hang the daily job
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSourceSuffix(title) {
  // Google News titles often end with " - Source Name"
  return title.replace(/\s+-\s+[^-]+$/, '').trim();
}

function parseRssItems(xml) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const chunk = block.split(/<\/item>/i)[0] || '';
    const title = decodeXml((chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const link = decodeXml((chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1]);
    const pubDate = decodeXml((chunk.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1]);
    const description = decodeXml(
      (chunk.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1]
    );
    const source =
      decodeXml((chunk.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1]) || null;
    if (!title || !/^https?:\/\//i.test(link)) continue; // only real web links ever reach the page
    items.push({ title, link, pubDate, description, source });
  }
  return items;
}

function parsePmmsCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('PMMS CSV empty');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const date = cols[idx.date];
    const pmms30 = parseFloat(cols[idx.pmms30]);
    const pmms15 = parseFloat(cols[idx.pmms15]);
    const pmms51 = parseFloat(cols[idx.pmms51]);
    if (!date || Number.isNaN(pmms30)) continue;
    rows.push({
      date,
      fixed30: pmms30,
      fixed15: Number.isNaN(pmms15) ? null : pmms15,
      arm51: Number.isNaN(pmms51) ? null : pmms51,
    });
  }
  if (!rows.length) throw new Error('No PMMS rows parsed');
  const latest = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  return { latest, prev };
}

function parseFreddieSummary(html) {
  const desc =
    (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1] || '';
  const asOf =
    (html.match(/U\.S\. weekly mortgage rate averages as of\s+([^<]+)/i) || [])[1] ||
    null;
  const headline =
    (html.match(/<h3[^>]*class="h2"[^>]*>([^<]+)<\/h3>/i) || [])[1] ||
    'Freddie Mac Primary Mortgage Market Survey';
  return {
    headline: decodeXml(headline),
    summary: decodeXml(desc),
    asOf: asOf ? decodeXml(asOf) : null,
  };
}

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return null;
  return `${n.toFixed(2)}%`;
}

function deltaLabel(curr, prev) {
  if (curr == null || prev == null) return null;
  const d = Math.round((curr - prev) * 100) / 100;
  if (d === 0) return 'unchanged vs last week';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(2)} pts vs last week`;
}

function cleanSummary(raw, title, source, category) {
  let summary = String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Google News descriptions often repeat "Title   Source"
  const bareTitle = stripSourceSuffix(title);
  if (
    !summary ||
    summary === title ||
    summary === bareTitle ||
    summary.toLowerCase().startsWith(bareTitle.toLowerCase())
  ) {
    return `${source} coverage of recent ${category.toLowerCase()} developments. Open the full report for details.`;
  }
  if (summary.length > 280) {
    summary = summary.slice(0, 277).replace(/\s+\S*$/, '') + '…';
  }
  return summary;
}

function isLowSignalHeadline(title) {
  // Rate-table roundups, "best of" shopping lists, product demos and event notices are not lending news.
  return /compare (today|current)|compare your options|current mortgage rates:|mortgage rates this week|mortgage rates today|best .* rates today|save thousands in interest|^best\b|\breviews? of\b|\bdemo\b|\b(annual|virtual) (conference|summit|webinar)\b|\bconference$/i.test(
    title
  );
}

function articleFromItem(item, category, fallbackSource) {
  // Some feeds prefix the publisher with a separator ("| Florida Realtors"); keep only the name.
  const source = String(item.source || fallbackSource || 'News').replace(/^[\s|:\-]+/, '').trim() || 'News';
  const title = stripSourceSuffix(item.title);
  const published = item.pubDate ? new Date(item.pubDate) : null;
  return {
    category,
    source,
    title,
    summary: cleanSummary(item.description, item.title, source, category),
    url: item.link,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
  };
}

async function buildPayload() {
  const errors = [];
  let rates = null;
  let freddieStory = null;

  try {
    const csv = await fetchText('https://www.freddiemac.com/pmms/docs/PMMS_history.csv');
    const { latest, prev } = parsePmmsCsv(csv);
    rates = {
      asOf: latest.date,
      source: 'Freddie Mac PMMS',
      sourceUrl: 'https://www.freddiemac.com/pmms',
      cells: [
        {
          label: '30-Yr Fixed',
          value: fmtPct(latest.fixed30),
          note: deltaLabel(latest.fixed30, prev?.fixed30),
        },
        {
          label: '15-Yr Fixed',
          value: fmtPct(latest.fixed15),
          note: deltaLabel(latest.fixed15, prev?.fixed15),
        },
        {
          label: '5/1 ARM',
          value: fmtPct(latest.arm51),
          note: latest.arm51 == null ? 'Not published this week' : deltaLabel(latest.arm51, prev?.arm51),
        },
      ].filter((c) => c.value != null),
      disclaimer:
        'National averages from Freddie Mac Primary Mortgage Market Survey®. Individual rates vary by credit profile, down payment, and lender. Not a rate quote.',
    };
  } catch (err) {
    errors.push(`pmms: ${err.message}`);
  }

  let prime = null;
  try {
    // WSJ/bank prime rate, daily, via FRED (keyless CSV). Drives SBA + LOC defaults.
    // Accept only real CSV rows (YYYY-MM-DD,value) with a plausible rate; an HTML error page must never parse as data.
    const rows = (await fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPRIME'))
      .trim().split(/\r?\n/).filter((l) => /^\d{4}-\d{2}-\d{2},/.test(l)).map((l) => l.split(','))
      .filter(([, v]) => { const n = parseFloat(v); return n > 0 && n < 30; });
    if (!rows.length) throw new Error('no valid DPRIME rows');
    const [asOf, v] = rows[rows.length - 1];
    // Change points only (date the rate first took its new value), most recent 16, for the SBA rates tracker page.
    const history = []; let last = null;
    for (const [d, val] of rows) { const x = parseFloat(val); if (x !== last) { history.push({ date: d, value: x }); last = x; } }
    prime = { value: parseFloat(v), asOf, source: 'FRED (DPRIME)', history: history.slice(-16) };
  } catch (err) {
    errors.push(`prime: ${err.message}`);
  }

  try {
    const html = await fetchText('https://www.freddiemac.com/pmms');
    freddieStory = parseFreddieSummary(html);
  } catch (err) {
    errors.push(`freddie-html: ${err.message}`);
  }

  const articles = [];
  if (freddieStory?.summary) {
    articles.push({
      category: 'Rates',
      source: 'Freddie Mac',
      title: freddieStory.headline,
      summary: freddieStory.summary,
      url: 'https://www.freddiemac.com/pmms',
      publishedAt: rates?.asOf
        ? new Date(`${rates.asOf} UTC`).toISOString()
        : new Date().toISOString(),
    });
  }

  const seen = new Set(articles.map((a) => a.title.toLowerCase()));
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      let taken = 0;
      for (const item of parseRssItems(xml)) {
        if (taken >= feed.limit) break;
        const article = articleFromItem(item, feed.category, feed.source);
        const key = article.title.toLowerCase();
        if (seen.has(key)) continue;
        // Prefer US-relevant / skip clearly off-topic international noise
        if (/australia|westpac|canada|\buk\b|britain/i.test(article.title) && feed.id !== 'fed-monetary') {
          continue;
        }
        if (isLowSignalHeadline(article.title)) continue;
        seen.add(key);
        articles.push(article);
        taken++;
      }
    } catch (err) {
      errors.push(`${feed.id}: ${err.message}`);
    }
  }

  if (!articles.length) {
    throw new Error(`No articles assembled. Errors: ${errors.join('; ') || 'none'}`);
  }

  // A source outage must never blank a published figure. Keep the last good reading (it carries its own
  // as-of date, so the page stays truthful) and report the outage in `errors`.
  let previous = {};
  try { if (existsSync(OUT)) previous = JSON.parse(readFileSync(OUT, 'utf8')); } catch { previous = {}; }
  if (!rates && previous.rates) { rates = previous.rates; errors.push('pmms: kept previous reading'); }
  if (!prime && previous.prime) { prime = previous.prime; errors.push('prime: kept previous reading'); }

  return {
    updatedAt: new Date().toISOString(),
    rates,
    prime,
    articles: articles.slice(0, 24),
    errors: errors.length ? errors : undefined,
  };
}

const payload = await buildPayload();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(
  `Wrote ${OUT} (${payload.articles.length} articles, rates=${payload.rates?.asOf || 'n/a'})`
);
if (payload.errors?.length) console.warn('Partial errors:', payload.errors);
