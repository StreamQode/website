import { probePlatform } from "../utils/catalogue";

export default defineEventHandler(async (event) => {
  const started = performance.now();
  try {
    const platform = await probePlatform(event);
    return {
      status: "healthy",
      service: "web-experience",
      domainBound: platform.domainBound,
      responseTimeMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    };
  } catch {
    setResponseStatus(event, 503);
    return {
      status: "degraded",
      service: "web-experience",
      responseTimeMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    };
  }
});
