import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import {
  listAllCollectionItems,
  resolveSiteAndSchemas,
  WebflowApiError,
} from "../../shared/webflow.js";

function toSequenceNumber(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = Number.parseFloat(val.trim());
    if (Number.isFinite(n)) return n;
  }
  return Number.MAX_SAFE_INTEGER;
}

export async function onRequestGet({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  try {
    const resolved = await resolveSiteAndSchemas(env);
    const { site, projectsCollection, mediaCollection, fieldMap } = resolved;

    const [projectItems, mediaItems] = await Promise.all([
      listAllCollectionItems(env, projectsCollection.id),
      listAllCollectionItems(env, mediaCollection.id),
    ]);

    const mediaById = new Map();
    const statsByProjectId = new Map();

    const parentSlug = fieldMap.media.parent;
    const orderSlug = fieldMap.media.order;

    for (const m of mediaItems) {
      mediaById.set(m.id, m);
      const fd = m.fieldData || {};
      const parentVal = parentSlug ? fd[parentSlug] : null;
      const parentId = typeof parentVal === "string" ? parentVal : parentVal?.id || null;
      if (!parentId) continue;

      const orderNum = orderSlug ? Number.parseFloat(fd[orderSlug]) : NaN;
      const prev = statsByProjectId.get(parentId) || { count: 0, maxOrder: 0 };
      prev.count += 1;
      if (Number.isFinite(orderNum) && orderNum > prev.maxOrder) {
        prev.maxOrder = orderNum;
      }
      statsByProjectId.set(parentId, prev);
    }

    const pFields = fieldMap.projects;
    const projects = projectItems
      .filter((p) => !p.isArchived)
      .map((p) => {
        const fd = p.fieldData || {};
        const seqRaw = pFields.sequence ? fd[pFields.sequence] : null;
        const clientRaw = pFields.client ? fd[pFields.client] : null;
        const subtitleRaw = pFields.subtitle ? fd[pFields.subtitle] : null;
        const galleryArr =
          pFields.gallery && Array.isArray(fd[pFields.gallery]) ? fd[pFields.gallery] : [];

        const stats = statsByProjectId.get(p.id) || { count: 0, maxOrder: 0 };
        let maxOrder = stats.maxOrder;

        // Also inspect gallery multi-ref in case items were linked there without parent ref
        for (const refId of galleryArr) {
          const media = mediaById.get(refId);
          if (!media || !orderSlug) continue;
          const ord = Number.parseFloat(media.fieldData?.[orderSlug]);
          if (Number.isFinite(ord) && ord > maxOrder) maxOrder = ord;
        }

        const slideCount = Math.max(stats.count, galleryArr.length);

        return {
          id: p.id,
          name: fd.name || "(Untitled Project)",
          slug: fd.slug || "",
          isDraft: Boolean(p.isDraft),
          sequence: seqRaw ?? "",
          sequenceSort: toSequenceNumber(seqRaw),
          client: clientRaw || fd.name || "",
          subtitle: subtitleRaw || "",
          existingSlideCount: slideCount,
          maxOrder,
          nextOrder: maxOrder > 0 ? Math.floor(maxOrder) + 1 : slideCount + 1,
          galleryRefCount: galleryArr.length,
        };
      })
      .sort((a, b) => {
        if (a.sequenceSort !== b.sequenceSort) return a.sequenceSort - b.sequenceSort;
        return a.name.localeCompare(b.name);
      });

    return jsonResponse({
      site,
      collections: {
        projects: projectsCollection,
        media: mediaCollection,
      },
      fieldMap,
      projects,
    });
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Failed to load Webflow CMS bootstrap data.", 500);
  }
}

