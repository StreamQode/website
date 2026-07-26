export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const started = performance.now();

  const runCheck = async (path: string) => {
    const checkStarted = performance.now();
    try {
      await $fetch(`${config.public.apiBase}${path}`, {
        timeout: 5000,
        retry: 0,
      });
      return { ok: true, latencyMs: Math.round(performance.now() - checkStarted) };
    } catch {
      return { ok: false, latencyMs: Math.round(performance.now() - checkStarted) };
    }
  };

  const [controlPlane, catalogue] = await Promise.all([
    runCheck("/healthz"),
    runCheck(`/v1/public/${encodeURIComponent(config.public.defaultTenant)}/products`),
  ]);
  const ok = controlPlane.ok && catalogue.ok;

  setResponseStatus(ok ? 200 : 503);
  return {
    status: ok ? "healthy" : "degraded",
    service: "web-experience",
    runtime: "nuxt-ssr",
    tenantMode: "default",
    checks: { controlPlane, catalogue },
    responseTimeMs: Math.round(performance.now() - started),
    checkedAt: new Date().toISOString(),
  };
});
