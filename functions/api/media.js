import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import {
  buildMediaFieldData,
  fetchBunnyThumbnailAsAsset,
  listAllCollectionItems,
  publishCollectionItems,
  resolveSiteAndSchemas,
  unpublishCollectionItem,
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

  const action = String(body?.action || "").trim();
  const publishMode = body?.publishMode === "live" ? "live" : "staged";
  const fieldMapOverride = body?.fieldMapOverride || null;

  if (!action) {
    return jsonError("action is required.", 400);
  }

  try {
    const resolved = await resolveSiteAndSchemas(env, fieldMapOverride);
    const { site, projectsCollection, mediaCollection, fieldMap } = resolved;
    const mFields = fieldMap.media;
    const pFields = fieldMap.projects;
    const mediaFieldBySlug = new Map(
      (mediaCollection.fields || []).map((f) => [f.slug, f])
    );
    const projectFieldBySlug = new Map(
      (projectsCollection.fields || []).map((f) => [f.slug, f])
    );

    if (action === "update") {
      const mediaId = String(body?.mediaId || "").trim();
      if (!mediaId) return jsonError("mediaId is required.", 400);

      let slide = { ...(body?.slide || {}) };
      if (slide.syncBunnyThumb && slide.videoId && (!slide.fileId || !slide.url) && mFields.image) {
        const uploadedThumb = await fetchBunnyThumbnailAsAsset(env, site.id, slide.videoId);
        slide = {
          ...slide,
          fileId: uploadedThumb.fileId,
          url: uploadedThumb.url,
        };
      }

      const fieldData = buildMediaFieldData(slide, mFields, mediaFieldBySlug);
      if (!Object.keys(fieldData).length) {
        return jsonError("No fields to update.", 400);
      }

      const updated = await webflowRequest(
        env,
        `/collections/${mediaCollection.id}/items/${mediaId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ fieldData }),
        }
      );

      let published = false;
      if (publishMode === "live" && !updated?.isDraft) {
        await publishCollectionItems(env, mediaCollection.id, [mediaId]);
        published = true;
      }

      return jsonResponse({
        action: "update",
        mediaId,
        published,
        updatedThumbUrl: slide.url || null,
        updatedFileId: slide.fileId || null,
      });
    }

    if (action === "remove-from-gallery" || action === "delete") {
      const mediaId = String(body?.mediaId || "").trim();
      const projectId = String(body?.projectId || "").trim();
      if (!mediaId) return jsonError("mediaId is required.", 400);

      if (action === "remove-from-gallery") {
        if (!projectId) return jsonError("projectId is required.", 400);
        if (!pFields.gallery) return jsonError("Gallery field is not mapped.", 400);

        const projectItem = await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items/${projectId}`
        );
        const existingGallery = Array.isArray(projectItem?.fieldData?.[pFields.gallery])
          ? projectItem.fieldData[pFields.gallery]
          : [];
        const nextGallery = existingGallery.filter((id) => id !== mediaId);

        const coverRequired = Boolean(pFields.cover && projectFieldBySlug.get(pFields.cover)?.isRequired);
        const galleryRequired = Boolean(projectFieldBySlug.get(pFields.gallery)?.isRequired);

        if ((galleryRequired || coverRequired) && nextGallery.length === 0 && !projectItem?.isDraft) {
          return jsonError(
            "Cannot remove the last slide from a published project while Gallery/Cover is required. Add another slide first or unpublish the project.",
            400
          );
        }

        const patchData = { [pFields.gallery]: nextGallery };
        let reassignedCoverId = null;
        if (pFields.cover) {
          const curCover = projectItem?.fieldData?.[pFields.cover];
          const curCoverId = typeof curCover === "string" ? curCover : curCover?.id || null;
          if (curCoverId === mediaId) {
            reassignedCoverId = nextGallery[0] || null;
            patchData[pFields.cover] = reassignedCoverId;
          }
        }

        await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items/${projectId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ fieldData: patchData }),
          }
        );

        let published = false;
        if (publishMode === "live" && !projectItem?.isDraft) {
          await publishCollectionItems(env, projectsCollection.id, [projectId]);
          published = true;
        }

        return jsonResponse({
          action: "remove-from-gallery",
          projectId,
          mediaId,
          nextGallery,
          reassignedCoverId,
          published,
        });
      }

      // action === "delete": detach from any referencing projects first so Webflow permits permanent deletion
      const allProjects = await listAllCollectionItems(env, projectsCollection.id);
      const touchedProjectIdsToPublish = [];
      const coverRequired = Boolean(pFields.cover && projectFieldBySlug.get(pFields.cover)?.isRequired);
      const galleryRequired = Boolean(pFields.gallery && projectFieldBySlug.get(pFields.gallery)?.isRequired);

      for (const proj of allProjects) {
        const fd = proj.fieldData || {};
        const gallery = pFields.gallery && Array.isArray(fd[pFields.gallery]) ? fd[pFields.gallery] : [];
        const curCover = pFields.cover ? fd[pFields.cover] : null;
        const curCoverId = typeof curCover === "string" ? curCover : curCover?.id || null;

        const inGallery = gallery.includes(mediaId);
        const isCover = curCoverId === mediaId;
        if (!inGallery && !isCover) continue;

        const nextGallery = gallery.filter((id) => id !== mediaId);
        if ((galleryRequired || coverRequired) && nextGallery.length === 0 && !proj.isDraft) {
          return jsonError(
            `Slide is the last image/cover for published project "${fd.name || proj.id}". Add another slide or unpublish the project before deleting.`,
            400
          );
        }

        const patchData = {};
        if (inGallery && pFields.gallery) patchData[pFields.gallery] = nextGallery;
        if (isCover && pFields.cover) patchData[pFields.cover] = nextGallery[0] || null;

        await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items/${proj.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ fieldData: patchData }),
          }
        );
        if (!proj.isDraft) touchedProjectIdsToPublish.push(proj.id);
      }

      if (publishMode === "live" && touchedProjectIdsToPublish.length > 0) {
        await publishCollectionItems(env, projectsCollection.id, touchedProjectIdsToPublish);
      }

      await unpublishCollectionItem(env, mediaCollection.id, mediaId);
      await webflowRequest(
        env,
        `/collections/${mediaCollection.id}/items/${mediaId}`,
        { method: "DELETE" }
      );

      return jsonResponse({
        action: "delete",
        mediaId,
        detachedProjectCount: touchedProjectIdsToPublish.length,
      });
    }

    return jsonError(`Unsupported action: ${action}`, 400);
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Media CMS operation failed.", 500);
  }
}
