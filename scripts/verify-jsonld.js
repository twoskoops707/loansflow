#!/usr/bin/env node
/* Verify JSON-LD blocks across LoansFlow pages. */
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const files = [
  'index.html',
  'tools/index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'disclaimer.html',
  'methodology.html', // may or may not exist yet; script tolerates absence
];

const FORBIDDEN = ['legalName', 'telephone', 'streetAddress', 'email',
  'address', 'foundingDate', 'aggregateRating', 'reviewRating', 'author', 'sameAs'];

function extractBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

// Recursively collect every @id defined anywhere, and every @id referenced.
function walk(obj, defined, refs) {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(x => walk(x, defined, refs)); return; }
  if (String(obj['@id'] || '') !== '') defined.push(obj['@id']);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === '@id') continue;
    if (v && typeof v === 'object') walk(v, defined, refs);
    if (k.endsWith('s') === false && v && typeof v === 'object' && v['@id']) {
      refs.push(v['@id']);
    }
  }
}
// Collect refs more simply: any "@id" value anywhere (including inside {"@id":...})
function collectIds(obj, defined, refs) {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(x => collectIds(x, defined, refs)); return; }
  if (typeof obj['@id'] === 'string') {
    // top-level entity has @id -> defined; nested ref objects also have @id
    defined.push(obj['@id']);
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') collectIds(v, defined, refs);
  }
}
function collectRefs(obj, refs) {
  // every {"@id": "url"} that appears as a value (a reference) -> the url
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(x => collectRefs(x, refs)); return; }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && typeof v['@id'] === 'string' && Object.keys(v).length === 1) {
      refs.push(v['@id']);
    } else if (v && typeof v === 'object') {
      collectRefs(v, refs);
    }
  }
}

let orgJson = null;
let errors = 0;
let warnings = 0;
const allDefined = new Set();
const allFiles = {};

for (const rel of files) {
  const fp = path.join(PUB, rel);
  if (!fs.existsSync(fp)) { console.log(`[skip] ${rel} not present`); continue; }
  const html = fs.readFileSync(fp, 'utf8');
  const blocks = extractBlocks(html);
  if (blocks.length === 0) { console.log(`[skip] ${rel}: no ld+json`); continue; }
  allFiles[rel] = { blocks, entities: [] };
  for (let i = 0; i < blocks.length; i++) {
    let data;
    try { data = JSON.parse(blocks[i]); }
    catch (e) {
      console.error(`[FAIL] ${rel} block#${i}: JSON.parse error: ${e.message}`);
      errors++;
      continue;
    }
    const graph = data['@graph'] || [data];
    for (const ent of graph) {
      const types = ent['@type'];
      console.log(`[ok] ${rel} block#${i}: ${Array.isArray(types) ? types.join('/') : types} @id=${ent['@id'] || '(none)'}`);
      allFiles[rel].entities.push({ type: types, id: ent['@id'] || null, raw: ent });
      if (ent['@id']) allDefined.add(ent['@id']);
      // forbidden props
      for (const fp of FORBIDDEN) {
        if (Object.prototype.hasOwnProperty.call(ent, fp)) {
          console.error(`[FAIL] ${rel}: forbidden property ${fp} present on ${types}`);
          errors++;
        }
      }
    }
  }
}

console.log('\n=== Organization byte-identical check ===');
let orgCount = 0;
for (const rel of Object.keys(allFiles)) {
  for (const e of allFiles[rel].entities) {
    if ((Array.isArray(e.type) && e.type.includes('Organization')) || e.type === 'Organization') {
      orgCount++;
      const s = JSON.stringify(e.raw);
      if (orgJson === null) { orgJson = s; console.log(`[ok] ${rel}: Organization first seen`); }
      else if (s === orgJson) { console.log(`[ok] ${rel}: Organization identical`); }
      else { console.error(`[FAIL] ${rel}: Organization differs from other pages`); errors++; }
      if (e.id !== 'https://loansflow.loan/#organization') {
        console.error(`[FAIL] ${rel}: Organization @id is ${e.id}, expected https://loansflow.loan/#organization`); errors++;
      }
    }
  }
}
console.log(`Organization present on ${orgCount} pages (${Object.keys(allFiles).length} files parsed)`);

console.log('\n=== WebSite only on index.html ===');
let wsCount = 0, wsFiles = [];
for (const rel of Object.keys(allFiles)) {
  for (const e of allFiles[rel].entities) {
    const t = Array.isArray(e.type) ? e.type : [e.type];
    if (t.includes('WebSite')) { wsCount++; wsFiles.push(rel); }
  }
}
if (wsCount === 1 && wsFiles[0] === 'index.html') console.log(`[ok] WebSite only on index.html`);
else { console.error(`[FAIL] WebSite on ${wsCount} files: ${wsFiles.join(', ')}`); errors++; }

console.log('\n=== @id reference resolution ===');
const refs = new Set();
for (const rel of Object.keys(allFiles)) {
  for (const e of allFiles[rel].entities) {
    const defined = [], r = [];
    collectIds(e.raw, defined, r); // collects defined @id of sub-objects too
    // instead, gather all {"@id": X} values that are references
  }
}
// Simpler: gather every @id string value everywhere, then decide defined vs ref.
const everyId = [];
function gatherAllIds(obj) {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(gatherAllIds); return; }
  if (typeof obj['@id'] === 'string') everyId.push(obj['@id']);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') gatherAllIds(v);
  }
}
for (const rel of Object.keys(allFiles)) {
  for (const e of allFiles[rel].entities) gatherAllIds(e.raw);
}
// An @id is a "reference" if it appears as the sole-key object {"@id":X} value of a property.
const refs2 = new Set();
function gatherRefs(obj, isTopDef) {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(x => gatherRefs(x, isTopDef)); return; }
  const ownId = typeof obj['@id'] === 'string';
  const ownKeys = Object.keys(obj);
  if (ownId && ownKeys.length === 1 && !isTopDef) {
    // this whole object is a reference
    refs2.add(obj['@id']);
  }
  for (const k of ownKeys) {
    if (k === '@id') continue;
    const v = obj[k];
    if (v && typeof v === 'object') gatherRefs(v, false);
  }
}
for (const rel of Object.keys(allFiles)) {
  for (const e of allFiles[rel].entities) {
    // top-level entity: its @id is a definition, recurse children as refs
    const id = e.id;
    if (id) allDefined.add(id);
    const obj = e.raw;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') gatherRefs(v, false);
    }
  }
}
for (const ref of [...refs2].sort()) {
  if (!allDefined.has(ref)) {
    console.error(`[FAIL] undefined @id reference: ${ref}`);
    errors++;
  } else {
    console.log(`[ok] @id ${ref} -> defined`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`files parsed: ${Object.keys(allFiles).length}`);
console.log(`errors: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
