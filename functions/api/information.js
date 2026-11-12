import { jsonError, jsonResponse, requireAuth, webflowErrorResponse } from "../../shared/auth.js";
import {
  buildInformationFieldData,
  extractMediaFileId,
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

  const action = String(body?.action || "update").trim();
  const publishMode = body?.publishMode === "live" ? "live" : "staged";
  const fieldMapOverride = body?.fieldMapOverride || null;

  try {
    const resolved = await resolveSiteAndSchemas(env, fieldMapOverride);
    const { informationCollection, mediaCollection, fieldMap } = resolved;

    if (!informationCollection?.id) {
      return jsonError("Information collection could not be found. Check Field Mapping.", 400);
    }

    const iFields = fieldMap.information;
    if (!iFields) {
      return jsonError("Information fields could not be mapped. Check Field Mapping.", 400);
    }

    const existingItems = await listAllCollectionItems(env, informationCollection.id);
    let targetItem = null;
    const requestedId = String(body?.itemId || "").trim();
    if (requestedId) {
      targetItem = existingItems.find((it) => it.id === requestedId);
    }
    if (!targetItem) {
      targetItem = existingItems.find((it) => !it.isArchived) || existingItems[0] || null;
    }

    if (action === "update") {
      const input = body?.information || {};
      const fieldData = buildInformationFieldData(input, iFields);
      const oldPic = iFields.profilePicture ? targetItem?.fieldData?.[iFields.profilePicture] : null;
      const oldFileId = oldPic && typeof oldPic === "object" && oldPic.fileId ? String(oldPic.fileId) : "";
      const newFileId =
        input.profilePicture === null
          ? ""
          : input.profilePicture?.fileId
            ? String(input.profilePicture.fileId)
            : oldFileId;

      let itemId = targetItem?.id || null;
      let isDraft = false;

      if (itemId) {
        const patchRes = await webflowRequest(
          env,
          `/collections/${informationCollection.id}/items/${itemId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ fieldData }),
          }
        );
        isDraft = Boolean(patchRes?.isDraft);
      } else {
        // Auto-create initial Information item if none existed
        const defaultName = String(input.name || "Milena Gorum").trim();
        const defaultSlug = String(input.slug || "milena-gorum").trim();
        fieldData.name = defaultName;
        fieldData.slug = defaultSlug;

        const createRes = await webflowRequest(
          env,
          `/collections/${informationCollection.id}/items`,
          {
            method: "POST",
            body: JSON.stringify({ isDraft: false, fieldData }),
          }
        );
        itemId = createRes?.id || null;
        isDraft = Boolean(createRes?.isDraft);
      }

      if (input.profilePicture !== undefined && oldFileId && newFileId !== oldFileId) {
        const mediaItems = mediaCollection?.id ? await listAllCollectionItems(env, mediaCollection.id) : [];
        const stillUsed = mediaItems.some((m) => extractMediaFileId(m?.fieldData, fieldMap.media) === oldFileId);
        if (!stillUsed) {
          try {
            await webflowRequest(env, `/assets/${oldFileId}`, { method: "DELETE" });
          } catch (err) {
            if (!(err instanceof WebflowApiError) || (err.status !== 404 && err.status !== 403)) {
              throw err;
            }
          }
        }
      }

      let published = false;
      let skippedPublishBecauseDraft = false;
      if (publishMode === "live" && itemId) {
        if (isDraft) {
          skippedPublishBecauseDraft = true;
        } else {
          await publishCollectionItems(env, informationCollection.id, [itemId]);
          published = true;
        }
      }

      return jsonResponse({
        action: "update",
        itemId,
        isDraft,
        published,
        skippedPublishBecauseDraft,
      });
    }

    if (action === "publish") {
      if (!targetItem?.id) return jsonError("No Information item found to publish.", 404);
      await publishCollectionItems(env, informationCollection.id, [targetItem.id]);
      return jsonResponse({ action: "publish", itemId: targetItem.id, published: true });
    }

    if (action === "unpublish") {
      if (!targetItem?.id) return jsonError("No Information item found to unpublish.", 404);
      await unpublishCollectionItem(env, informationCollection.id, targetItem.id);
      return jsonResponse({ action: "unpublish", itemId: targetItem.id, published: false, isDraft: true });
    }

    return jsonError(`Unsupported action: ${action}`, 400);
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Information operation failed.", 500);
  }
}
