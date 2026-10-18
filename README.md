# LensGrade

A focused, mobile-first photo critique and stock research app. Upload 1–10 images, receive grounded AI feedback and improvements, compare variants, and open keyword searches on major stock marketplaces.

## Features
- JPEG, PNG, WebP and HEIC/HEIF images. HEIC uses a browser-side conversion fallback.
- Local image previews, resizing and metadata; images aren't persistently stored by this project.
- Vision critique: aesthetics, technical impression, stock suitability, strengths and actionable improvements.
- Relative comparison of up to 10 images with best-overall and best-for-stock selections.
- Stock keyword searches linking to Adobe Stock, Shutterstock and iStock. **These are not reverse-image search, actual price measurements, sales statistics or demand forecasts.**
- Responsive mobile layout, accessible controls and clear error states.

## Get started

Requires Node.js 20+ and npm.

```bash
npm install
# terminal 1: start Worker (requires .dev.vars)
npx wrangler dev
# terminal 2: start Vite with /api proxy
npm run dev
```

Create a `.dev.vars` file locally (never commit):

```text
OPENAI_API_KEY=your_api_key_here
```

If no key is provided, the UI remains accessible but real analysis returns an explicit configuration error.

## Deploy

```bash
npm run build
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

Deployment to Cloudflare needs an authenticated Cloudflare account. The API key stays in a Worker secret, not in client JavaScript. Add rate limits / Turnstile and optionally authentication **before** publicizing a paid AI endpoint; the default backend has no user authentication or billing protection.

## Architecture
- React + Vite + TypeScript + Lucide
- Cloudflare Worker with Static Assets
- OpenAI Responses API with a strict JSON schema
- Zod validation of the returned report
- No database, accounts, analytics, or hosted image storage

The browser prepares a compressed 1600 px-long-edge JPEG copy and sends it to the Worker. Original images remain local. Because these are reduced copies, technical scores are *visual estimates*, not instrument-grade sharpness or noise measurements. The original dimensions are shown in the UI. OpenAI processes uploaded image copies according to its API terms.

## Known limitations
- HEIC conversion support varies between browser versions. Test on actual iPhone Safari.
- RAW/DNG is not supported.
- No commercial stock-provider API is used; links search by generated keywords.
- Model scores are qualitative judgments and may vary, not objective guarantees.
- Large batches may run against Cloudflare request-body or model limits.
- Run `npm run build` locally/CI after dependency installation before production rollout.

## Planned next steps
- Browser/device regression tests with Playwright
- Rate limiting and spam protection before public access
- Optional authenticated image similarity provider integration
- Offline shell/installable PWA after core analysis is stable
