import { jsonError, jsonResponse, requireAuth } from "../../shared/auth.js";
import { resolveSiteAndSchemas, WebflowApiError, webflowRequest } from "../../shared/webflow.js";

const MAX_WEBFLOW_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB Webflow CMS limit

function sanitizeFileName(rawName) {
  const trimmed = String(rawName || "slide.webp").trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return safe.slice(0, 95) || "slide.webp";
}

export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  let formData = null;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data body.", 400);
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return jsonError("Missing compressed image file.", 400);
  }

  if (file.size <= 0) {
    return jsonError("Uploaded file is empty.", 400);
  }

  if (file.size > MAX_WEBFLOW_IMAGE_BYTES) {
    return jsonError(
      `Compressed file (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds Webflow's 4 MB CMS limit.`,
      400
    );
  }

  const fileName = sanitizeFileName(formData.get("fileName") || file.name || "slide.webp");
  const fileHash = String(formData.get("fileHash") || "").trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(fileHash)) {
    return jsonError("Valid 32-character lowercase MD5 fileHash is required.", 400);
  }

  const width = Number.parseInt(String(formData.get("width") || ""), 10);
  const height = Number.parseInt(String(formData.get("height") || ""), 10);

  try {
    let siteId = String(formData.get("siteId") || env.WEBFLOW_SITE_ID || "").trim();
    if (!siteId) {
      const resolved = await resolveSiteAndSchemas(env);
      siteId = resolved.site.id;
    }

    const assetPayload = {
      fileName,
      fileHash,
      size: file.size,
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
      s3Form.append("file", file, fileName);

      const s3Res = await fetch(asset.uploadUrl, {
        method: "POST",
        body: s3Form,
      });

      if (!s3Res.ok) {
        const s3ErrText = await s3Res.text().catch(() => "");
        return jsonError(
          `S3 upload failed (${s3Res.status}): ${s3ErrText.slice(0, 200) || s3Res.statusText}`,
          502
        );
      }
    }

    const hostedUrl = asset?.hostedUrl || asset?.assetUrl || "";
    if (!asset?.id || !hostedUrl) {
      return jsonError("Webflow asset response did not include an id and hostedUrl.", 502, asset);
    }

    return jsonResponse({
      fileId: asset.id,
      url: hostedUrl,
      hostedUrl,
      fileName: asset.originalFileName || fileName,
    });
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return jsonError(err.message, err.status >= 400 ? err.status : 500, err.payload);
    }
    return jsonError(err?.message || "Asset upload failed.", 500);
  }
}

