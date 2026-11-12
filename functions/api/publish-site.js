import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import { resolveSiteAndSchemas, WebflowApiError, webflowRequest } from "../../shared/webflow.js";

export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  try {
    const resolved = await resolveSiteAndSchemas(env);
    const { site } = resolved;

    let customDomainIds = [];
    try {
      const domainsRes = await webflowRequest(env, `/sites/${site.id}/custom_domains`);
      const domains = Array.isArray(domainsRes?.customDomains) ? domainsRes.customDomains : [];
      customDomainIds = domains.map((d) => d.id).filter(Boolean);
    } catch {
      customDomainIds = [];
    }

    const result = await webflowRequest(env, `/sites/${site.id}/publish`, {
      method: "POST",
      body: JSON.stringify({
        publishToWebflowSubdomain: true,
        ...(customDomainIds.length ? { customDomains: customDomainIds } : {}),
      }),
    });

    return jsonResponse({
      published: true,
      siteId: site.id,
      customDomainsCount: customDomainIds.length,
      result,
    });
  } catch (err) {
    if (err instanceof WebflowApiError) {
      if (err.status === 403) {
        return jsonError(
          "Webflow API token lacks 'sites:write' scope for full-site publish. CMS item publishing already works immediately with 'cms:write'; add 'sites:write' to WEBFLOW_API_TOKEN to enable full-site publish.",
          403,
          { code: "MISSING_SITES_WRITE_SCOPE" }
        );
      }
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Failed to trigger Webflow site publish.", 500);
  }
}

