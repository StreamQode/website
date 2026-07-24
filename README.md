# StreamQode — Website (Showroom)

The public showroom for StreamQode tenants. **Nuxt 3 (SSR), deployed on Vercel.** It is
a decoupled frontend: it holds no state and only reads the platform's **public API**
(`GET /v1/public/{tenant}/products`) over HTTPS. The Azure backend is a separate repo.

See the platform repo for the architecture decisions: ADR 0006 (hosting shape),
ADR 0007 (async media), ADR 0008 (this stack: Nuxt on Vercel, interaction model).

## Run locally

Requires Node 20 LTS.

```bash
npm install
cp .env.example .env   # optional — defaults already point at prod
npm run dev            # http://localhost:3000
```

By default it reads `https://core.streamqode.com` and renders the `firstmotors`
tenant's published products. (If nothing is published yet, you'll see "No products
published yet" — that confirms the fetch works.)

## Configuration

Runtime config (override via env — same names in Vercel):

| Variable | Default | Purpose |
| --- | --- | --- |
| `NUXT_PUBLIC_API_BASE` | `https://core.streamqode.com` | Platform control-plane base URL |
| `NUXT_PUBLIC_DEFAULT_TENANT` | `firstmotors` | Tenant to render until host→tenant resolve lands |

## Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** this repo. Nuxt is auto-detected (build
   `nuxt build`, output handled by Nitro's Vercel preset).
3. Set the env vars above under **Settings → Environment Variables**.
4. Deploy. Custom per-tenant domains are added later under **Settings → Domains**.

## What's next (not built yet)

- **host→tenant resolve** (ADR 0006): read the request `Host`, map it to a tenant via
  the registry, replace `defaultTenant`.
- **The kinetic experience** (ADR 0008): desktop continuous-canvas + mobile vertical
  feed, GSAP + Lenis, video virtualization (HLS). Reference feel is in the platform
  repo under `apps/showroom/concept-*.html`.
- `@nuxt/image` for optimized media, per-tenant theming, rich OG/video share cards.
