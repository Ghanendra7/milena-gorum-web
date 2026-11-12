import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import {
  buildMediaFieldData,
  chunkArray,
  extractVideoUuid,
  fetchBunnyThumbnailAsAsset,
  publishCollectionItems,
  randomShortId,
  resolveSiteAndSchemas,
  slugify,
  WebflowApiError,
  webflowRequest,
} from "../../shared/webflow.js";

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
    const { site, projectsCollection, mediaCollection, fieldMap } = resolved;
    const mFields = fieldMap.media;
    const pFields = fieldMap.projects;

    if (!mFields.parent && !pFields.gallery) {
      return jsonError(
        "Neither a Media 'Parent' Reference field nor a Project 'Gallery' Multi-Reference field is mapped. Check Field Mapping.",
        400,
        { fieldMap, mediaCollection, projectsCollection }
      );
    }

    const mediaFieldBySlug = new Map(
      (mediaCollection.fields || []).map((f) => [f.slug, f])
    );
    const imageFieldRequired = Boolean(mFields.image && mediaFieldBySlug.get(mFields.image)?.isRequired);

    const hasImageSlide = slides.some((s) => Boolean(s?.fileId && s?.url));
    if ((hasImageSlide || imageFieldRequired) && !mFields.image) {
      return jsonError(
        "Could not find the Image field in the Media collection. Check Field Mapping.",
        400,
        { fieldMap, mediaCollection }
      );
    }

    // Auto-fetch & upload Bunny Stream poster thumbnails for video slides missing an explicit image
    const hydratedSlides = [];
    for (const slide of slides) {
      if (mFields.image && slide?.videoId && (!slide.fileId || !slide.url)) {
        const videoUuid = extractVideoUuid(slide.videoId);
        let uploadedThumb = null;
        let thumbError = null;

        try {
          uploadedThumb = await fetchBunnyThumbnailAsAsset(env, site.id, videoUuid);
        } catch (err) {
          thumbError = err?.message || "Failed to fetch Bunny thumbnail";
        }

        if (!uploadedThumb && imageFieldRequired) {
          return jsonError(
            `Video slide "${slide.name || videoUuid}" needs a thumbnail image (Media 'image' is required), and Bunny's thumbnail.jpg could not be fetched (${thumbError}). Use "Custom Poster" on the video card.`,
            400
          );
        }

        hydratedSlides.push({
          ...slide,
          ...(uploadedThumb ? { fileId: uploadedThumb.fileId, url: uploadedThumb.url } : {}),
        });
      } else {
        hydratedSlides.push(slide);
      }
    }

    // Fetch current project item first so we validate it exists and read existing Gallery Multi-Ref + Cover
    const projectItem = await webflowRequest(
      env,
      `/collections/${projectsCollection.id}/items/${projectId}`
    );
    const projectName = projectItem?.fieldData?.name || "Project";
    const projectSlug = slugify(projectItem?.fieldData?.slug || projectName) || "project";

    const batchStamp = randomShortId(4);
    const itemsToCreate = hydratedSlides.map((slide, idx) => {
      const orderNum = Number.isFinite(Number(slide.order)) ? Number(slide.order) : idx + 1;
      const paddedOrder = String(Math.round(orderNum)).padStart(2, "0");
      const baseName = String(slide.name || `${projectName} ${paddedOrder}`).trim().slice(0, 200);
      const uniqueSlug = `${projectSlug}-${paddedOrder}-${batchStamp}-${idx + 1}`.slice(0, 200);

      const fieldData = buildMediaFieldData(slide, mFields, mediaFieldBySlug, {
        includeIdentity: true,
        baseName,
        slug: uniqueSlug,
      });

      if (mFields.parent) {
        fieldData[mFields.parent] = projectId;
      }
      if (mFields.order) {
        fieldData[mFields.order] = orderNum;
      }

      return {
        isDraft: false,
        fieldData,
      };
    });

    const createdItems = [];
    for (const chunk of chunkArray(itemsToCreate, 100)) {
      const bulkRes = await webflowRequest(
        env,
        `/collections/${mediaCollection.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({ items: chunk }),
        }
      );
      if (Array.isArray(bulkRes?.items)) {
        createdItems.push(...bulkRes.items);
      } else if (bulkRes?.id) {
        createdItems.push(bulkRes);
      }
    }

    const createdIds = createdItems.map((it) => it.id).filter(Boolean);

    // Append created Media IDs to Project's Gallery Multi-Ref & set Cover if currently empty
    let updatedGalleryCount = null;
    let assignedCoverId = null;
    const projectPatchData = {};

    if (pFields.gallery && createdIds.length > 0) {
      const existingGallery = Array.isArray(projectItem?.fieldData?.[pFields.gallery])
        ? projectItem.fieldData[pFields.gallery]
        : [];
      const mergedGallery = Array.from(new Set([...existingGallery, ...createdIds]));
      projectPatchData[pFields.gallery] = mergedGallery;
      updatedGalleryCount = mergedGallery.length;
    }

    if (pFields.cover && createdIds.length > 0) {
      const existingCover = projectItem?.fieldData?.[pFields.cover];
      const existingCoverId = typeof existingCover === "string" ? existingCover : existingCover?.id || null;
      if (!existingCoverId) {
        projectPatchData[pFields.cover] = createdIds[0];
        assignedCoverId = createdIds[0];
      }
    }

    if (Object.keys(projectPatchData).length > 0) {
      await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ fieldData: projectPatchData }),
        }
      );
    }

    let published = false;
    let skippedProjectPublishBecauseDraft = false;
    if (publishMode === "live" && createdIds.length > 0) {
      await publishCollectionItems(env, mediaCollection.id, createdIds);
      if (!projectItem?.isDraft) {
        await publishCollectionItems(env, projectsCollection.id, [projectId]);
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
      assignedCoverId,
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
