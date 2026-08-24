---
name: website-design
description: Restyle or design websites for clients. Use Refero Styles (styles.refero.design) as the primary source for real-world design-system templates, extract their tokens, and adapt them to the client's brand.
---

# Website Design

When a user asks to restyle a site, apply a "style" from a link, or design a new page, use this workflow.

## 1. Template source: Refero Styles

**Refero Styles (https://styles.refero.design) is the go-to spot for design templates.** It is a curated library of 2,000+ design systems extracted from real product/agency websites (Apple, Stripe, Linear, monopo saigon, etc.). Every style is packaged as:

- a **DESIGN.md** for AI agents (colors, typography, spacing, components, rules), and
- structured JSON tokens (colors, typeScale, spacing, surfaces, components, motion).

Each style lives at a URL like `https://styles.refero.design/style/<uuid>`. The page is JS-rendered and generates the DESIGN.md client-side, so **do not scrape the HTML** — use the API below.

### Extracting a style's design system (verified working)

```bash
curl -sL "https://styles.refero.design/api/styles/<STYLE_ID>?includeSimilar=0"
```

The response is `{ "style": { ..., "fullResult": { "designSystem": {...} } } }` where `designSystem` contains:

| key | what it gives you |
|---|---|
| `colors` | named colors with hex, role, group (neutral vs brand) |
| `typography` | typefaces, weights, sizes, line-heights, substitutes |
| `typeScale` | role → size / lineHeight / letterSpacing |
| `spacing` | radius rules, element/section gaps, card padding, page max-width |
| `layout` | container width, section rhythm, band alternation, nav/footer behavior |
| `surfaces` | surface stack (levels with hex + purpose) |
| `components` | named components with full styling descriptions |
| `dos` / `donts` | hard design rules (radius discipline, shadows, weights, alignment) |
| `elevationPhilosophy` | how depth is done (or deliberately avoided) |
| `customSections` | agent prompt guides, motion personality |
| `northStar` | one-line summary of the aesthetic |

The `style` object also gives `colorScheme` (light/dark) and `industry`.

## 2. Adapting the style to a client

- **Ask before guessing** when "adjust to my colors" is ambiguous: confirm the client's palette (existing CSS vars are usually the answer) vs. the template's original palette.
- Map template roles to client colors (e.g. Obsidian #000000 → client's ink; Paper #ffffff → client's paper; template's one chromatic accent → client's brand accent).
- Honor the template's *rules*, not just its colors: radius discipline (e.g. 0px everywhere except full-pill buttons), no box-shadows, hairline borders, type-weight ceilings, motion curves, alignment rules. These are what make a style feel like itself.
- Keep the client's existing class names / markup where possible — restyle via CSS so pages keep working.

## 3. Verify

- Serve the site locally and check every page + asset returns 200 (remember extensionless URLs like `/about`; use a clean-URL static server, e.g. `python3 -m http.server` won't do this — a small handler that maps `/about` → `about.html` will).
- Grep for stale references (old font names, removed colors, box-shadows if the style bans them).
- Never push/deploy without the user's OK; offer a local preview instead.
