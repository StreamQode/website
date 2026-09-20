# StreamQode — Website (Showroom)

The public showroom for StreamQode tenants. **Nuxt 3 (SSR), deployed on Vercel.** It is
a decoupled frontend: it holds no state and reads the platform's regional public
resolver and site catalogue APIs over HTTPS. The Azure backend is a separate repo.

See the platform repo for the architecture decisions: ADR 0006 (hosting shape),
ADR 0007 (async media), ADR 0008 (this stack: Nuxt on Vercel, interaction model).

## Run locally

Requires Node 20 LTS.

```bash
npm install
cp .env.example .env   # optional — defaults already point at prod
npm run dev            # http://localhost:3000
```

Set `NUXT_PLATFORM_API_ORIGIN` from Platform Terraform's
`frontdoor_endpoint_hostname` output. The hostname serving the website must have
an active `websites.domain_bindings` record; the resolver selects the site and
its regional catalogue. Missing configuration or a missing binding fails visibly.

## Configuration

Server runtime config (set in Vercel and local `.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `NUXT_PLATFORM_API_ORIGIN` | Required | `https://` plus the Platform `frontdoor_endpoint_hostname` output; no path |

## Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** this repo. Nuxt is auto-detected (build
   `nuxt build`, output handled by Nitro's Vercel preset).
3. Set `NUXT_PLATFORM_API_ORIGIN` under **Settings → Environment Variables** after the Platform Front Door exists.
4. Register each public hostname in Vercel and the Platform resolver's active domain bindings.
5. Deploy. `/api/health` verifies the Nuxt app and both regional resolver paths; `domainBound` reports whether the request hostname resolves to a site.

## What's next (not built yet)

- **The kinetic experience** (ADR 0008): desktop continuous-canvas + mobile vertical
  feed, GSAP + Lenis, video virtualization (HLS). Reference feel is in the platform
  repo under `apps/showroom/concept-*.html`.
- `@nuxt/image` for optimized media, per-tenant theming, rich OG/video share cards.
