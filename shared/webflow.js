const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WebflowApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.name = "WebflowApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function webflowRequest(env, path, options = {}, attempt = 0) {
  if (!env.WEBFLOW_API_TOKEN) {
    throw new WebflowApiError(
      "Server misconfiguration: WEBFLOW_API_TOKEN environment variable is not set.",
      500
    );
  }

  const url = path.startsWith("http") ? path : `${WEBFLOW_API_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${env.WEBFLOW_API_TOKEN}`,
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 429 && attempt < 4) {
    const retryAfterSec = Number.parseFloat(res.headers.get("Retry-After") || "0");
    const waitMs = Math.min(20000, Math.max(1500, (Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 2000 * (attempt + 1))));
    await sleep(waitMs);
    return webflowRequest(env, path, options, attempt + 1);
  }

  if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < 3) {
    await sleep(1000 * (attempt + 1));
    return webflowRequest(env, path, options, attempt + 1);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const detail = data?.message || data?.msg || data?.error || res.statusText || "Webflow API request failed";
    throw new WebflowApiError(`Webflow API (${res.status}): ${detail}`, res.status, data);
  }

  return data;
}

export async function listAllCollectionItems(env, collectionId) {
  const items = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await webflowRequest(
      env,
      `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    );
    const batch = Array.isArray(res?.items) ? res.items : [];
    items.push(...batch);

    const total = res?.pagination?.total;
    if (batch.length < limit) break;
    offset += batch.length;
    if (typeof total === "number" && offset >= total) break;
  }

  return items;
}

function findField(fields, { types = null, slugPatterns = [], namePatterns = [] }) {
  const candidates = fields.filter((f) => !types || types.includes(f.type));
  if (!candidates.length) return null;

  for (const re of slugPatterns) {
    const match = candidates.find((f) => re.test((f.slug || "").toLowerCase()));
    if (match) return match.slug;
  }
  for (const re of namePatterns) {
    const match = candidates.find((f) => re.test((f.displayName || "").toLowerCase()));
    if (match) return match.slug;
  }
  return null;
}

function getReferencedCollectionId(field) {
  return field?.metadata?.collectionId || field?.validations?.collectionId || null;
}

export function detectProjectFields(fields, mediaCollectionId) {
  const byRef = fields.find(
    (f) => f.type === "MultiReference" && getReferencedCollectionId(f) === mediaCollectionId
  );

  return {
    name: "name",
    slug: "slug",
    sequence: findField(fields, {
      types: ["Number", "PlainText"],
      slugPatterns: [/^sequence$/, /^project-number$/, /project.*number/, /number/, /sequence/, /seq/, /^order$/],
      namePatterns: [/^project\s*number$/, /project.*number/, /number/, /sequence/, /order/],
    }),
    client: findField(fields, {
      types: ["PlainText"],
      slugPatterns: [/^client/, /client-name/, /client-title/],
      namePatterns: [/client/],
    }),
    subtitle: findField(fields, {
      types: ["PlainText"],
      slugPatterns: [/subtitle/, /sub-title/, /^title$/],
      namePatterns: [/subtitle/, /sub-title/, /title/],
    }),
    gallery:
      byRef?.slug ||
      findField(fields, {
        types: ["MultiReference"],
        slugPatterns: [/gallery/, /media/, /slides/, /images/],
        namePatterns: [/gallery/, /media/, /slides/],
      }),
  };
}

export function detectMediaFields(fields, projectsCollectionId) {
  const parentRef = fields.find(
    (f) => f.type === "Reference" && getReferencedCollectionId(f) === projectsCollectionId
  );

  const imageField =
    findField(fields, {
      types: ["Image"],
      slugPatterns: [/^image$/, /media-image/, /main-image/, /photo/, /img/],
      namePatterns: [/^image$/, /image/, /photo/],
    }) || fields.find((f) => f.type === "Image")?.slug || null;

  const fillDesktop =
    findField(fields, {
      types: ["Switch"],
      slugPatterns: [/fill.*desktop/, /desktop.*fill/, /^fill-screen$/],
      namePatterns: [/fill.*desktop/, /desktop.*fill/, /^fill screen$/],
    }) ||
    findField(fields, {
      types: ["Switch"],
      slugPatterns: [/fill/],
      namePatterns: [/fill/],
    });

  const fillMobile = findField(fields, {
    types: ["Switch"],
    slugPatterns: [/fill.*mobile/, /mobile.*fill/, /is-mobile/],
    namePatterns: [/fill.*mobile/, /mobile.*fill/],
  });

  return {
    name: "name",
    slug: "slug",
    parent:
      parentRef?.slug ||
      findField(fields, {
        types: ["Reference"],
        slugPatterns: [/^parent$/, /project/, /parent-project/],
        namePatterns: [/parent/, /project/],
      }),
    order: findField(fields, {
      types: ["Number"],
      slugPatterns: [/^order$/, /sort/, /sequence/, /index/],
      namePatterns: [/^order$/, /order/, /sort/, /sequence/],
    }),
    image: imageField,
    videoId: findField(fields, {
      types: ["PlainText", "Link"],
      slugPatterns: [/video-id/, /bunny/, /video/],
      namePatterns: [/video id/, /bunny/, /video/],
    }),
    fillDesktop,
    fillMobile,
    focusX: findField(fields, {
      types: ["Number", "PlainText"],
      slugPatterns: [/focus-x/, /focal-x/, /focus_x/, /\bx-axis\b/, /coordinates-x\b/, /-x$/],
      namePatterns: [/focus\s*x/, /focal\s*x/, /\bx\s*axis\b/, /coordinates\s+x\b/],
    }),
    focusY: findField(fields, {
      types: ["Number", "PlainText"],
      slugPatterns: [/focus-y/, /focal-y/, /focus_y/, /\by-axis\b/, /coordinates-y\b/, /-y$/],
      namePatterns: [/focus\s*y/, /focal\s*y/, /\by\s*axis\b/, /coordinates\s+y\b/],
    }),
    alt: findField(fields, {
      types: ["PlainText"],
      slugPatterns: [/^alt$/, /alt-text/],
      namePatterns: [/alt/],
    }),
  };
}

function applyFieldOverrides(detected, overrideSection, validFieldSlugs) {
  if (!overrideSection || typeof overrideSection !== "object") return detected;
  const out = { ...detected };
  for (const [logicalKey, slug] of Object.entries(overrideSection)) {
    if (slug === null || slug === "") {
      out[logicalKey] = null;
    } else if (typeof slug === "string" && validFieldSlugs.has(slug)) {
      out[logicalKey] = slug;
    }
  }
  return out;
}

export async function resolveSiteAndSchemas(env, runtimeOverride = null) {
  let site = null;
  if (env.WEBFLOW_SITE_ID) {
    try {
      site = await webflowRequest(env, `/sites/${env.WEBFLOW_SITE_ID}`);
    } catch (err) {
      if (err instanceof WebflowApiError && err.status === 403) {
        // Allow operation with cms:read + cms:write + assets:write even without sites:read when WEBFLOW_SITE_ID is set
        site = {
          id: env.WEBFLOW_SITE_ID,
          displayName: "Configured Site",
          shortName: env.WEBFLOW_SITE_ID,
          previewUrl: null,
        };
      } else {
        throw err;
      }
    }
  } else {
    const sitesRes = await webflowRequest(env, "/sites");
    const sites = Array.isArray(sitesRes?.sites) ? sitesRes.sites : [];
    if (!sites.length) {
      throw new WebflowApiError("No Webflow sites found for this API token.", 404);
    }
    site =
      sites.find((s) => /milena/i.test(s.displayName || "") || /milena/i.test(s.shortName || "")) ||
      sites[0];
  }

  const colsRes = await webflowRequest(env, `/sites/${site.id}/collections`);
  const collections = Array.isArray(colsRes?.collections) ? colsRes.collections : [];
  if (!collections.length) {
    throw new WebflowApiError(`No CMS collections found on site ${site.displayName}.`, 404);
  }

  // Fetch schemas in parallel for accurate detection
  const schemas = await Promise.all(
    collections.map((c) => webflowRequest(env, `/collections/${c.id}`))
  );

  let projectsSchema = env.WEBFLOW_PROJECTS_COLLECTION_ID
    ? schemas.find((s) => s.id === env.WEBFLOW_PROJECTS_COLLECTION_ID)
    : null;
  let mediaSchema = env.WEBFLOW_MEDIA_COLLECTION_ID
    ? schemas.find((s) => s.id === env.WEBFLOW_MEDIA_COLLECTION_ID)
    : null;

  if (!mediaSchema) {
    mediaSchema =
      schemas.find((s) => {
        const hasImage = (s.fields || []).some((f) => f.type === "Image");
        const hasRef = (s.fields || []).some((f) => f.type === "Reference");
        const nameMatch = /media|gallery|slide/i.test(`${s.slug} ${s.displayName}`);
        return hasImage && hasRef && nameMatch;
      }) ||
      schemas.find((s) => {
        const hasImage = (s.fields || []).some((f) => f.type === "Image");
        const hasRef = (s.fields || []).some((f) => f.type === "Reference");
        return hasImage && hasRef;
      }) ||
      schemas.find((s) => /media|gallery|slide/i.test(`${s.slug} ${s.displayName}`));
  }

  if (!projectsSchema && mediaSchema) {
    const refField = (mediaSchema.fields || []).find(
      (f) => f.type === "Reference" && getReferencedCollectionId(f)
    );
    if (refField) {
      projectsSchema = schemas.find((s) => s.id === getReferencedCollectionId(refField));
    }
  }

  if (!projectsSchema) {
    projectsSchema =
      schemas.find((s) => /^projects?$/i.test(s.slug || "") || /project/i.test(s.displayName || "")) ||
      schemas[0];
  }

  if (!projectsSchema || !mediaSchema) {
    throw new WebflowApiError(
      "Could not auto-detect Projects and Media CMS collections. Set WEBFLOW_PROJECTS_COLLECTION_ID and WEBFLOW_MEDIA_COLLECTION_ID.",
      400,
      { collections: schemas.map((s) => ({ id: s.id, displayName: s.displayName, slug: s.slug })) }
    );
  }

  let envOverride = null;
  if (env.WEBFLOW_FIELD_MAP_JSON) {
    try {
      envOverride = JSON.parse(env.WEBFLOW_FIELD_MAP_JSON);
    } catch {
      throw new WebflowApiError("Invalid JSON in WEBFLOW_FIELD_MAP_JSON.", 500);
    }
  }

  const projectValidSlugs = new Set((projectsSchema.fields || []).map((f) => f.slug));
  const mediaValidSlugs = new Set((mediaSchema.fields || []).map((f) => f.slug));

  let projectsFields = detectProjectFields(projectsSchema.fields || [], mediaSchema.id);
  let mediaFields = detectMediaFields(mediaSchema.fields || [], projectsSchema.id);

  projectsFields = applyFieldOverrides(projectsFields, envOverride?.projects, projectValidSlugs);
  mediaFields = applyFieldOverrides(mediaFields, envOverride?.media, mediaValidSlugs);
  projectsFields = applyFieldOverrides(projectsFields, runtimeOverride?.projects, projectValidSlugs);
  mediaFields = applyFieldOverrides(mediaFields, runtimeOverride?.media, mediaValidSlugs);

  return {
    site: {
      id: site.id,
      displayName: site.displayName,
      shortName: site.shortName,
      previewUrl: site.previewUrl || null,
    },
    projectsCollection: {
      id: projectsSchema.id,
      displayName: projectsSchema.displayName,
      slug: projectsSchema.slug,
      fields: (projectsSchema.fields || []).map((f) => ({
        slug: f.slug,
        displayName: f.displayName,
        type: f.type,
        isRequired: Boolean(f.isRequired),
      })),
    },
    mediaCollection: {
      id: mediaSchema.id,
      displayName: mediaSchema.displayName,
      slug: mediaSchema.slug,
      fields: (mediaSchema.fields || []).map((f) => ({
        slug: f.slug,
        displayName: f.displayName,
        type: f.type,
        isRequired: Boolean(f.isRequired),
      })),
    },
    fieldMap: {
      projects: projectsFields,
      media: mediaFields,
    },
  };
}

export async function uploadAssetToWebflow(
  env,
  siteId,
  { blob, fileName, fileHash, size, width, height }
) {
  const assetPayload = {
    fileName,
    fileHash,
    size,
    ...(Number.isFinite(width) && width > 0 ? { width } : {}),
    ...(Number.isFinite(height) && height > 0 ? { height } : {}),
  };

  const asset = await webflowRequest(env, `/sites/${siteId}/assets`, {
    method: "POST",
    body: JSON.stringify(assetPayload),
  });

  if (asset?.uploadUrl && asset?.uploadDetails) {
    const s3Form = new FormData();
    for (const [key, val] of Object.entries(asset.uploadDetails)) {
      if (val !== undefined && val !== null) {
        s3Form.append(key, String(val));
      }
    }
    // S3 requires the file field to be appended last
    s3Form.append("file", blob, fileName);

    const s3Res = await fetch(asset.uploadUrl, {
      method: "POST",
      body: s3Form,
    });

    if (!s3Res.ok) {
      const s3ErrText = await s3Res.text().catch(() => "");
      throw new WebflowApiError(
        `S3 upload failed (${s3Res.status}): ${s3ErrText.slice(0, 200) || s3Res.statusText}`,
        502
      );
    }
  }

  const hostedUrl = asset?.hostedUrl || asset?.assetUrl || "";
  if (!asset?.id || !hostedUrl) {
    throw new WebflowApiError(
      "Webflow asset response did not include an id and hostedUrl.",
      502,
      asset
    );
  }

  return {
    fileId: asset.id,
    url: hostedUrl,
    hostedUrl,
    fileName: asset.originalFileName || fileName,
  };
}

