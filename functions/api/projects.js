import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import {
  buildProjectFieldData,
  chunkArray,
  deleteMediaItemsAndUnsharedAssets,
  listAllCollectionItems,
  publishCollectionItems,
  resolveSiteAndSchemas,
  slugify,
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
    const { projectsCollection, mediaCollection, fieldMap } = resolved;
    const pFields = fieldMap.projects;
    const projectFieldBySlug = new Map(
      (projectsCollection.fields || []).map((f) => [f.slug, f])
    );

    if (action === "create") {
      const data = body?.project || {};
      const name = String(data.name || "").trim();
      if (!name) {
        return jsonError("Project Title is required.", 400);
      }

      const slug = slugify(data.slug || name) || `project-${Date.now()}`;
      const fieldData = buildProjectFieldData(
        {
          ...data,
          name,
          slug,
        },
        pFields,
        projectFieldBySlug
      );

      // Webflow rejects non-draft creation if required Cover or Gallery fields are still empty
      const missingRequiredMediaRefs =
        (pFields.cover && projectFieldBySlug.get(pFields.cover)?.isRequired && !fieldData[pFields.cover]) ||
        (pFields.gallery && projectFieldBySlug.get(pFields.gallery)?.isRequired && (!Array.isArray(fieldData[pFields.gallery]) || !fieldData[pFields.gallery].length));

      const mustCreateAsDraft = Boolean(data.isDraft) || missingRequiredMediaRefs;
      const created = await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            isDraft: mustCreateAsDraft,
            fieldData,
          }),
        }
      );

      let published = false;
      if (publishMode === "live" && !mustCreateAsDraft && created?.id) {
        await publishCollectionItems(env, projectsCollection.id, [created.id]);
        published = true;
      }

      return jsonResponse({
        action: "create",
        projectId: created?.id || null,
        isDraft: mustCreateAsDraft,
        createdAsDraftForMedia: missingRequiredMediaRefs,
        published,
      });
    }

    if (action === "update") {
      const projectId = String(body?.projectId || "").trim();
      if (!projectId) return jsonError("projectId is required.", 400);

      const data = body?.project || {};
      const fieldData = buildProjectFieldData(data, pFields, projectFieldBySlug);
      const patchBody = { fieldData };
      if (typeof data.isDraft === "boolean") {
        patchBody.isDraft = data.isDraft;
      }

      const updated = await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify(patchBody),
        }
      );

      let published = false;
      let skippedPublishBecauseDraft = false;
      if (publishMode === "live") {
        if (updated?.isDraft) {
          skippedPublishBecauseDraft = true;
        } else {
          await publishCollectionItems(env, projectsCollection.id, [projectId]);
          published = true;
        }
      }

      return jsonResponse({
        action: "update",
        projectId,
        isDraft: Boolean(updated?.isDraft),
        published,
        skippedPublishBecauseDraft,
      });
    }

    if (action === "reorder") {
      const updates = Array.isArray(body?.updates) ? body.updates : [];
      if (!updates.length) {
        return jsonError("updates array is required.", 400);
      }

      const patchItems = [];
      const liveCandidateIds = [];

      for (const u of updates) {
        if (!u?.id) continue;
        const fieldData = {};
        if (pFields.sequence && u.sequence !== undefined) {
          fieldData[pFields.sequence] = u.sequence === null || u.sequence === "" ? null : Number(u.sequence);
        }
        if (pFields.featured && typeof u.featured === "boolean") {
          fieldData[pFields.featured] = u.featured;
        }
        if (pFields.featuredSequence && u.featuredSequence !== undefined) {
          fieldData[pFields.featuredSequence] =
            u.featuredSequence === null || u.featuredSequence === "" ? null : Number(u.featuredSequence);
        }
        if (Object.keys(fieldData).length > 0) {
          patchItems.push({ id: u.id, fieldData });
          if (!u.isDraft) liveCandidateIds.push(u.id);
        }
      }

      if (!patchItems.length) {
        return jsonError("No mapped order fields to update. Check Field Mapping.", 400);
      }

      for (const chunk of chunkArray(patchItems, 100)) {
        await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items`,
          {
            method: "PATCH",
            body: JSON.stringify({ items: chunk }),
          }
        );
      }

      let publishedCount = 0;
      if (publishMode === "live" && liveCandidateIds.length > 0) {
        publishedCount = await publishCollectionItems(env, projectsCollection.id, liveCandidateIds);
      }

      return jsonResponse({
        action: "reorder",
        updatedCount: patchItems.length,
        publishedCount,
        publishMode,
      });
    }

    if (action === "publish") {
      const projectId = String(body?.projectId || "").trim();
      if (!projectId) return jsonError("projectId is required.", 400);

      const updated = await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isDraft: false }),
        }
      );

      const galleryIds =
        pFields.gallery && Array.isArray(updated?.fieldData?.[pFields.gallery])
          ? updated.fieldData[pFields.gallery]
          : [];
      const coverId = pFields.cover ? updated?.fieldData?.[pFields.cover] : null;
      const mediaIdsToPublish = Array.from(
        new Set([...galleryIds, ...(typeof coverId === "string" ? [coverId] : [])].filter(Boolean))
      );

      if (mediaIdsToPublish.length > 0) {
        // Ensure linked media items are also non-draft and published so live site references don't 404
        for (const chunk of chunkArray(mediaIdsToPublish, 100)) {
          await webflowRequest(
            env,
            `/collections/${mediaCollection.id}/items`,
            {
              method: "PATCH",
              body: JSON.stringify({
                items: chunk.map((id) => ({ id, isDraft: false })),
              }),
            }
          );
        }
        await publishCollectionItems(env, mediaCollection.id, mediaIdsToPublish);
      }

      await publishCollectionItems(env, projectsCollection.id, [projectId]);

      return jsonResponse({
        action: "publish",
        projectId,
        publishedMediaCount: mediaIdsToPublish.length,
      });
    }

    if (action === "unpublish") {
      const projectId = String(body?.projectId || "").trim();
      if (!projectId) return jsonError("projectId is required.", 400);

      await webflowRequest(
        env,
        `/collections/${projectsCollection.id}/items/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isDraft: true }),
        }
      );
      await unpublishCollectionItem(env, projectsCollection.id, projectId);

      return jsonResponse({ action: "unpublish", projectId });
    }

    if (action === "delete") {
      const rawProjectIds = Array.isArray(body?.projectIds)
        ? body.projectIds
        : (body?.projectId ? [body.projectId] : []);
      const projectIds = rawProjectIds.map((id) => String(id || "").trim()).filter(Boolean);
      if (!projectIds.length) return jsonError("projectId or projectIds is required.", 400);

      const deleteProjectIdSet = new Set(projectIds);

      const mFields = fieldMap.media;
      const toRefId = (v) => (typeof v === "string" ? v : v?.id || "");
      const collectProjectMediaIds = (proj) => {
        const fd = proj?.fieldData || {};
        const ids = new Set();
        if (pFields.gallery && Array.isArray(fd[pFields.gallery])) {
          for (const ref of fd[pFields.gallery]) {
            const id = toRefId(ref);
            if (id) ids.add(id);
          }
        }
        if (pFields.cover && fd[pFields.cover]) {
          const id = toRefId(fd[pFields.cover]);
          if (id) ids.add(id);
        }
        return ids;
      };

      const allProjects = await listAllCollectionItems(env, projectsCollection.id);
      const allMedia = mediaCollection?.id ? await listAllCollectionItems(env, mediaCollection.id) : [];

      const targetProjects = allProjects.filter((p) => deleteProjectIdSet.has(p.id));
      const candidateMediaIds = new Set();
      for (const p of targetProjects) {
        for (const id of collectProjectMediaIds(p)) {
          candidateMediaIds.add(id);
        }
      }

      const sharedMediaIds = new Set();
      for (const proj of allProjects) {
        if (deleteProjectIdSet.has(proj.id)) continue;
        for (const id of collectProjectMediaIds(proj)) {
          sharedMediaIds.add(id);
        }
      }

      if (mFields?.parent) {
        for (const item of allMedia) {
          const parentId = toRefId(item?.fieldData?.[mFields.parent]);
          if (deleteProjectIdSet.has(parentId)) {
            candidateMediaIds.add(item.id);
          } else if (parentId && allProjects.some((p) => p.id === parentId)) {
            sharedMediaIds.add(item.id);
          }
        }
      }

      const mediaIdsToDelete = Array.from(candidateMediaIds).filter((id) => !sharedMediaIds.has(id));
      const preservedMediaCount = candidateMediaIds.size - mediaIdsToDelete.length;

      // Delete the projects first so Webflow clears its Media references before deleting those Media items.
      for (const projectId of deleteProjectIdSet) {
        try {
          await unpublishCollectionItem(env, projectsCollection.id, projectId);
        } catch {}
        try {
          await webflowRequest(
            env,
            `/collections/${projectsCollection.id}/items/${projectId}`,
            { method: "DELETE" }
          );
        } catch (delErr) {
          if (!(delErr instanceof WebflowApiError) || delErr.status !== 404) {
            throw delErr;
          }
        }
      }

      let deletedMediaCount = 0;
      let deletedAssetCount = 0;
      if (mediaCollection?.id && mediaIdsToDelete.length > 0) {
        ({ deletedMediaCount, deletedAssetCount } = await deleteMediaItemsAndUnsharedAssets(
          env,
          mediaCollection.id,
          mediaIdsToDelete,
          allMedia,
          mFields
        ));
      }

      return jsonResponse({
        action: "delete",
        projectIds: Array.from(deleteProjectIdSet),
        projectId: projectIds[0] || null,
        deletedProjectCount: deleteProjectIdSet.size,
        deletedMediaCount,
        deletedAssetCount,
        preservedMediaCount,
      });
    }

    if (action === "migrate-category") {
      const fromCategoryId = String(body?.fromCategoryId || "").trim();
      const toCategoryId = String(body?.toCategoryId || "").trim();
      const deleteSource = body?.deleteSource !== false;
      const publishMode = body?.publishMode || "live";

      if (!fromCategoryId || !toCategoryId) {
        return jsonError("fromCategoryId and toCategoryId are required.", 400);
      }
      if (fromCategoryId === toCategoryId) {
        return jsonError("fromCategoryId and toCategoryId cannot be identical.", 400);
      }

      const allProjects = await listAllCollectionItems(env, projectsCollection.id);
      const catSlug = pFields.category;
      if (!catSlug) return jsonError("Category field is not mapped.", 400);

      const touchedProjects = [];
      const touchedProjectIdsToPublish = [];

      for (const proj of allProjects) {
        const fd = proj.fieldData || {};
        const catVal = fd[catSlug];
        const currentCatIds = Array.isArray(catVal)
          ? catVal.map((c) => (typeof c === "string" ? c : c?.id)).filter(Boolean)
          : (catVal ? [typeof catVal === "string" ? catVal : catVal?.id].filter(Boolean) : []);

        if (!currentCatIds.includes(fromCategoryId)) continue;

        const nextCatIds = Array.from(
          new Set(currentCatIds.map((id) => (id === fromCategoryId ? toCategoryId : id)).filter(Boolean))
        );

        const fieldData = buildProjectFieldData({ categoryIds: nextCatIds }, pFields, projectFieldBySlug);
        await webflowRequest(
          env,
          `/collections/${projectsCollection.id}/items/${proj.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ fieldData }),
          }
        );

        touchedProjects.push({ id: proj.id, name: fd.name || proj.id });
        if (!proj.isDraft) {
          touchedProjectIdsToPublish.push(proj.id);
        }
      }

      if (publishMode === "live" && touchedProjectIdsToPublish.length > 0) {
        await publishCollectionItems(env, projectsCollection.id, touchedProjectIdsToPublish);
      }

      let deletedSource = false;
      let deleteError = null;
      if (deleteSource && resolved.categoryCollection?.id) {
        try {
          await unpublishCollectionItem(env, resolved.categoryCollection.id, fromCategoryId);
        } catch (unpubErr) {
          console.warn("Unpublish category warning:", unpubErr);
        }
        try {
          await webflowRequest(env, `/collections/${resolved.categoryCollection.id}/items/${fromCategoryId}`, {
            method: "DELETE",
          });
          deletedSource = true;
        } catch (delErr) {
          deleteError = delErr?.message || String(delErr);
          console.error("Failed to delete category item:", delErr);
        }
      }

      return jsonResponse({
        success: true,
        updatedProjectCount: touchedProjects.length,
        updatedProjects: touchedProjects,
        fromCategoryId,
        toCategoryId,
        deletedSource,
        deleteError,
        publishedProjectsCount: touchedProjectIdsToPublish.length,
      });
    }

    return jsonError(`Unsupported action: ${action}`, 400);
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Project CMS operation failed.", 500);
  }
}

