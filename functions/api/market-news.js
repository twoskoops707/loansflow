/**
 * Cloudflare Pages Function — live Market News & Rates payload.
 * GET /api/market-news
 *
 * Caches at the edge for 30 minutes. Falls back gracefully when a source fails.
 */
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
    source: null,
    url: 'https://news.google.com/rss/search?q=mortgage+rates+when:7d&hl=en-US&gl=US&ceid=US:en',
    limit: 8,
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
    if (!title || !link) continue;
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
  const headline =
    (html.match(/<h3[^>]*class="h2"[^>]*>([^<]+)<\/h3>/i) || [])[1] ||
    'Freddie Mac Primary Mortgage Market Survey';
  return {
    headline: decodeXml(headline),
    summary: decodeXml(desc),
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
  return /compare (today|current)|current mortgage rates:|mortgage rates this week|best .* rates today|save thousands in interest/i.test(
    title
  );
}

function articleFromItem(item, category, fallbackSource) {
  const source = item.source || fallbackSource || 'News';
  const title = stripSourceSuffix(item.title);
  return {
    category,
    source,
    title,
    summary: cleanSummary(item.description, item.title, source, category),
    url: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
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
          label: '30-Yr Refinance',
          value: latest.fixed30 != null ? fmtPct(latest.fixed30 + 0.05) : null,
          note: 'Approx. vs purchase avg.',
        },
        {
          label: '5/1 ARM',
          value: fmtPct(latest.arm51),
          note:
            latest.arm51 == null
              ? 'Not published this week'
              : deltaLabel(latest.arm51, prev?.arm51),
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
    const rows = (await fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPRIME'))
      .trim().split(/\r?\n/).slice(1).map((l) => l.split(','))
      .filter(([, v]) => !Number.isNaN(parseFloat(v)));
    const [asOf, v] = rows[rows.length - 1];
    prime = { value: parseFloat(v), asOf, source: 'FRED (DPRIME)' };
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
      const items = parseRssItems(xml).slice(0, feed.limit);
      for (const item of items) {
        const article = articleFromItem(item, feed.category, feed.source);
        const key = article.title.toLowerCase();
        if (seen.has(key)) continue;
        if (
          /australia|westpac|canada|uk\b|britain/i.test(article.title) &&
          feed.id !== 'fed-monetary'
        ) {
          continue;
        }
        if (isLowSignalHeadline(article.title)) continue;
        seen.add(key);
        articles.push(article);
      }
    } catch (err) {
      errors.push(`${feed.id}: ${err.message}`);
    }
  }

  if (!articles.length && !rates) {
    throw new Error(`No market data. Errors: ${errors.join('; ') || 'none'}`);
  }

  return {
    updatedAt: new Date().toISOString(),
    rates,
    prime,
    articles: articles.slice(0, 8),
    errors: errors.length ? errors : undefined,
  };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/market-news', context.request.url).toString(), {
    method: 'GET',
  });

  const bypass = new URL(context.request.url).searchParams.get('fresh') === '1';
  if (!bypass) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  try {
    const payload = await buildPayload();
    const body = JSON.stringify(payload);
    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
        'Access-Control-Allow-Origin': '*',
        'CDN-Cache-Control': 'public, max-age=1800',
      },
    });
    if (!bypass) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  } catch (err) {
    // Fall back to static snapshot when live aggregation fails
    try {
      const snapUrl = new URL('/data/market-news.json', context.request.url);
      const snap = await fetch(snapUrl.toString());
      if (snap.ok) {
        const text = await snap.text();
        return new Response(text, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'X-Market-News-Fallback': 'static',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (_) {
      /* ignore */
    }
    return new Response(
      JSON.stringify({ error: 'market_news_unavailable', message: String(err.message || err) }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
