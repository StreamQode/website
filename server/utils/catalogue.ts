import type { H3Event } from "h3";

interface Projection {
  id: string;
  name: string;
  description?: string | null;
  media?: Array<{ kind?: string; url?: string }>;
}

export interface Catalogue {
  host: string;
  siteId: string;
  region: "uks" | "uae";
  items: Projection[];
}

function platformOrigin(event: H3Event): string {
  const configured = String(useRuntimeConfig(event).platformApiOrigin || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Platform API address is not configured" });
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.hostname === "core.streamqode.com" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw createError({ statusCode: 503, statusMessage: "Platform API address is invalid" });
  }
  return parsed.origin;
}

function requestHostname(event: H3Event): string {
  const host = getRequestHost(event).toLowerCase().split(":")[0];
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) || !host.includes(".")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid website hostname" });
  }
  return host;
}

async function readJSON(url: string): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
    if (response.status === 404) return { status: 404, body: null };
    if (!response.ok) return { status: response.status, body: null };
    return { status: response.status, body: await response.json() };
  } catch {
    return { status: 503, body: null };
  }
}

export async function resolveCatalogue(event: H3Event): Promise<Catalogue> {
  const origin = platformOrigin(event);
  const host = requestHostname(event);
  let upstreamFailed = false;
  for (const region of ["uks", "uae"] as const) {
    const base = `${origin}/resolve/${region}/v1/public`;
    const resolved = await readJSON(`${base}/resolve?host=${encodeURIComponent(host)}`);
    if (resolved.status === 404) continue;
    if (resolved.status !== 200 || !resolved.body || typeof resolved.body !== "object") {
      upstreamFailed = true;
      continue;
    }
    const binding = resolved.body as { siteId?: unknown; region?: unknown };
    if (typeof binding.siteId !== "string" || binding.region !== region) {
      throw createError({ statusCode: 502, statusMessage: "Invalid platform domain binding" });
    }
    const products = await readJSON(`${base}/site/products?host=${encodeURIComponent(host)}`);
    if (products.status !== 200 || !products.body || typeof products.body !== "object") {
      throw createError({ statusCode: 503, statusMessage: "Website catalogue is unavailable" });
    }
    const items = (products.body as { items?: unknown }).items;
    if (items !== null && !Array.isArray(items)) {
      throw createError({ statusCode: 502, statusMessage: "Invalid website catalogue" });
    }
    return { host, siteId: binding.siteId, region, items: (items ?? []) as Projection[] };
  }
  throw createError({ statusCode: upstreamFailed ? 503 : 404, statusMessage: upstreamFailed ? "Platform resolver is unavailable" : "Website domain is not registered" });
}

export async function probePlatform(event: H3Event): Promise<{ domainBound: boolean }> {
  const origin = platformOrigin(event);
  const host = requestHostname(event);
  let domainBound = false;
  for (const region of ["uks", "uae"] as const) {
    const ping = await readJSON(`${origin}/resolve/${region}/v1/public/ping`);
    const ready = ping.body as { service?: unknown; status?: unknown } | null;
    if (ping.status !== 200 || ready?.service !== "resolver" || ready.status !== "ok") {
      throw createError({ statusCode: 503, statusMessage: `${region} resolver is unavailable` });
    }
    const response = await readJSON(`${origin}/resolve/${region}/v1/public/resolve?host=${encodeURIComponent(host)}`);
    if (response.status !== 200 && response.status !== 404) {
      throw createError({ statusCode: 503, statusMessage: `${region} resolver is unavailable` });
    }
    domainBound ||= response.status === 200;
  }
  return { domainBound };
}
