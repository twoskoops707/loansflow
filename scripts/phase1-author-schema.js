#!/usr/bin/env node
/* Phase 1: author box + Person/Article/WebApplication/FAQPage JSON-LD on loan, guide and calculator pages.
   Idempotent: re-running skips pages that already carry the author box. */
const fs = require('fs');
const path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const SITE = 'https://loansflow.loan';
const PERSON_ID = SITE + '/author.html#person';
const hasPhoto = fs.existsSync(path.join(PUB, 'img', 'joshua-miller.jpg'));

const avatar = hasPhoto
  ? '<img src="/img/joshua-miller.jpg" alt="Joshua Miller, CPA" width="72" height="72" loading="lazy" decoding="async">'
  : '<img class="author-icon" src="/img/author-icon.svg?v=2" alt="" width="72" height="72" loading="lazy" decoding="async">';

const BOX = `<section class="author-box">
  ${avatar}
  <p><strong>Authored by <a href="/author">Joshua Miller, CPA</a></strong><br>
  Licensed CPA (California, 2009) with a B.S. from Cal Poly Humboldt and nearly two decades helping businesses and individuals secure loans, from private lenders to SBA and everywhere in between, for acquisitions and growth, plus tax, valuations and succession. LoansFlow is educational and independent &mdash; not a lender.</p>
</section>`;

const PERSON = {
  '@context': 'https://schema.org', '@type': 'Person', '@id': PERSON_ID,
  name: 'Joshua Miller', honorificSuffix: 'CPA', jobTitle: 'Certified Public Accountant',
  worksFor: { '@type': 'Organization', name: 'LoansFlow' },
  url: SITE + '/author.html',
};
const ld = (o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`;

function iso(html, fallback) {
  const m = html.match(/Updated\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return fallback;
  const d = new Date(`${m[1]} ${m[2]}, ${m[3]} 00:00:00 UTC`);
  return isNaN(d) ? fallback : d.toISOString().slice(0, 10);
}
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

function faqFrom(html) {
  const out = [];
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = re.exec(html))) out.push({ '@type': 'Question', name: strip(m[1]), acceptedAnswer: { '@type': 'Answer', text: strip(m[2]) } });
  return out;
}

function processFile(rel, kind) {
  const fp = path.join(PUB, rel);
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('class="author-box"')) return 'skip';
  const url = SITE + '/' + rel.replace(/\.html$/, '');
  const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const desc = ((html.match(/<meta name="description" content="([^"]*)"/) || [])[1]) || '';
  const modified = iso(html, '2026-11-02');
  const blocks = [PERSON];

  if (kind === 'calc') {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: h1, url, description: desc,
      applicationCategory: 'FinanceApplication', operatingSystem: 'Any (runs in the browser)',
      browserRequirements: 'Requires JavaScript', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@id': PERSON_ID }, publisher: { '@type': 'Organization', name: 'LoansFlow', url: SITE + '/' },
    });
  } else {
    // Existing Article entity (guides): point author at the Person instead of adding a duplicate Article.
    let patched = false;
    html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (all, body) => {
      if (!/"@type":\s*"Article"/.test(body)) return all;
      try {
        const data = JSON.parse(body);
        const g = data['@graph'] || [data];
        for (const e of g) if (e['@type'] === 'Article') { e.author = { '@id': PERSON_ID }; patched = true; }
        return patched ? `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>` : all;
      } catch (e) { return all; }
    });
    if (!patched) {
      blocks.push({
        '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: desc,
        mainEntityOfPage: url, dateModified: modified,
        author: { '@id': PERSON_ID }, publisher: { '@type': 'Organization', name: 'LoansFlow', url: SITE + '/' },
      });
    }
  }
  if (!/"@type":\s*"FAQPage"/.test(html)) {
    const q = faqFrom(html);
    if (q.length) blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: q });
  }

  const schema = blocks.map(ld).join('\n');
  // place the author box at the end of the main content
  if (kind === 'loan' && html.includes('</article>')) html = html.replace('</article>', BOX + '\n    </article>');
  else if (html.includes('</div></main>')) html = html.replace('</div></main>', BOX + '\n  </div></main>');
  else html = html.replace('</main>', BOX + '\n  </main>');
  html = html.replace('</head>', schema + '\n</head>');
  fs.writeFileSync(fp, html);
  return 'ok';
}

const sets = [['loans', 'loan'], ['guides', 'guide'], ['calculators', 'calc']];
for (const [dir, kind] of sets) {
  for (const f of fs.readdirSync(path.join(PUB, dir)).filter((x) => x.endsWith('.html') && x !== 'index.html')) {
    console.log(processFile(`${dir}/${f}`, kind), `${dir}/${f}`);
  }
}
