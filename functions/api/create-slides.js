import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import { resolveSiteAndSchemas, WebflowApiError, webflowRequest } from "../../shared/webflow.js";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomShortId(len = 4) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

function coerceFieldValue(value, fieldMeta) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!fieldMeta) return value;

  if (fieldMeta.type === "Number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (fieldMeta.type === "PlainText" || fieldMeta.type === "Link") {
    return String(value);
  }
  if (fieldMeta.type === "Switch") {
    return Boolean(value);
  }
  return value;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  let body = null;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  const slides = Array.isArray(body?.slides) ? body.slides : [];
  const publishMode = body?.publishMode === "live" ? "live" : "staged";
  const fieldMapOverride = body?.fieldMapOverride || null;

  if (!projectId) {
    return jsonError("projectId is required.", 400);
  }
  if (!slides.length) {
    return jsonError("At least one slide is required.", 400);
  }

  try {
    const resolved = await resolveSiteAndSchemas(env, fieldMapOverride);
    const { projectsCollection, mediaCollection, fieldMap } = resolved;
    const mFields = fieldMap.media;
    const pFields = fieldMap.projects;

    if (!mFields.parent && !pFields.gallery) {
      return jsonError(
        "Neither a Media 'Parent' Reference field nor a Project 'Gallery' Multi-Reference field is mapped. Check Field Mapping.",
        400,
        { fieldMap, mediaCollection, projectsCollection }
      );
    }

    const hasImageSlide = slides.some((s) => Boolean(s?.fileId && s?.url));
    if (hasImageSlide && !mFields.image) {
      return jsonError(
        "Could not find the Image field in the Media collection. Check the Schema Mapping drawer.",
        400,
        { fieldMap, mediaCollection }
      );
    }

    // Fetch current project item first so we validate it exists and read existing Gallery Multi-Ref
    const projectItem = await webflowRequest(
      env,
      `/collections/${projectsCollection.id}/items/${projectId}`
    );
    const projectName = projectItem?.fieldData?.name || "Project";
    const projectSlug = slugify(projectItem?.fieldData?.slug || projectName) || "project";

    const mediaFieldBySlug = new Map(
      (mediaCollection.fields || []).map((f) => [f.slug, f])
    );

    const batchStamp = randomShortId(4);
    const itemsToCreate = slides.map((slide, idx) => {
      const orderNum = Number.isFinite(Number(slide.order)) ? Number(slide.order) : idx + 1;
      const paddedOrder = String(Math.round(orderNum)).padStart(2, "0");
      const baseName = String(slide.name || `${projectName} ${paddedOrder}`).trim().slice(0, 200);
      const uniqueSlug = `${projectSlug}-${paddedOrder}-${batchStamp}-${idx + 1}`.slice(0, 200);

      const fieldData = {
        name: baseName,
        slug: uniqueSlug,
      };

      if (mFields.parent) {
        fieldData[mFields.parent] = projectId;
      }

      if (mFields.order) {
        const coerced = coerceFieldValue(orderNum, mediaFieldBySlug.get(mFields.order));
        if (coerced !== undefined) fieldData[mFields.order] = coerced;
      }

      if (mFields.image && slide.fileId && slide.url) {
        fieldData[mFields.image] = {
          fileId: slide.fileId,
          url: slide.url,
          ...(slide.alt ? { alt: String(slide.alt).slice(0, 500) } : {}),
        };
      }

      if (mFields.videoId && slide.videoId) {
        const coerced = coerceFieldValue(
          String(slide.videoId).trim(),
          mediaFieldBySlug.get(mFields.videoId)
        );
        if (coerced !== undefined) fieldData[mFields.videoId] = coerced;
      }

      if (mFields.fillDesktop && typeof slide.fillDesktop === "boolean") {
        fieldData[mFields.fillDesktop] = slide.fillDesktop;
      }

      if (mFields.fillMobile && typeof slide.fillMobile === "boolean") {
        fieldData[mFields.fillMobile] = slide.fillMobile;
      }

      if (mFields.focusX && slide.focusX !== undefined && slide.focusX !== null && slide.focusX !== "") {
        const coerced = coerceFieldValue(slide.focusX, mediaFieldBySlug.get(mFields.focusX));
        if (coerced !== undefined) fieldData[mFields.focusX] = coerced;
      }

      if (mFields.focusY && slide.focusY !== undefined && slide.focusY !== null && slide.focusY !== "") {
        const coerced = coerceFieldValue(slide.focusY, mediaFieldBySlug.get(mFields.focusY));
        if (coerced !== undefined) fieldData[mFields.focusY] = coerced;
      }

      if (mFields.alt && slide.alt) {
        const coerced = coerceFieldValue(slide.alt, mediaFieldBySlug.get(mFields.alt));
        if (coerced !== undefined) fieldData[mFields.alt] = coerced;
      }

      return {
        isDraft: false,
        fieldData,
      };
    });

    const createdItems = [];
    const chunks = chunkArray(itemsToCreate, 100);
    for (const chunk of chunks) {
      const bulkRes = await webflowRequest(
        env,
        `/collections/${mediaCollection.id}/items/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ items: chunk }),
        }
      );
      if (Array.isArray(bulkRes?.items)) {
        createdItems.push(...bulkRes.items);
      }
    }

    const createdIds = createdItems.map((it) => it.id).filter(Boolean);

    // Append created Media IDs to Project's Gallery Multi-Ref (never overwriting existing refs)
    let updatedGalleryCount = null;
    if (pFields.gallery && createdIds.length > 0) {
      const existingGallery = Array.isArray(projectItem?.fieldData?.[pFields.gallery])
        ? projectItem.fieldData[pFields.gallery]
        : [];
      const mergedSet = new Set([...existingGallery, ...createdIds]);
      const mergedGallery = Array.from(mergedSet);

      await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fieldData: {
              [pFields.gallery]: mergedGallery,
            },
          }),
        }
      );
      updatedGalleryCount = mergedGallery.length;
    }

    let published = false;
    let skippedProjectPublishBecauseDraft = false;
    if (publishMode === "live" && createdIds.length > 0) {
      for (const idChunk of chunkArray(createdIds, 100)) {
        await webflowRequest(
          env,
          `/collections/${mediaCollection.id}/items/publish`,
          {
            method: "POST",
            body: JSON.stringify({ itemIds: idChunk }),
          }
        );
      }
      if (!projectItem?.isDraft) {
        await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items/publish`,
          {
            method: "POST",
            body: JSON.stringify({ itemIds: [projectId] }),
          }
        );
      } else {
        skippedProjectPublishBecauseDraft = true;
      }
      published = true;
    }

    return jsonResponse({
      createdCount: createdIds.length,
      createdIds,
      projectId,
      projectName,
      updatedGalleryCount,
      publishMode: published ? "live" : "staged",
      skippedProjectPublishBecauseDraft,
    });
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Failed to create Webflow Media items.", 500);
  }
}
