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

function normalizeImageField(val) {
  if (!val) return { fileId: null, url: "", alt: "" };
  if (typeof val === "string") return { fileId: null, url: val, alt: "" };
  return {
    fileId: val.fileId || null,
    url: val.url || "",
    alt: val.alt || "",
  };
}

function toFinitePercent(val, fallback = 50) {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export async function onRequestGet({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  try {
    const resolved = await resolveSiteAndSchemas(env);
    const {
      site,
      projectsCollection,
      mediaCollection,
      categoryCollection,
      informationCollection,
      fieldMap,
    } = resolved;

    const [projectItems, mediaItems, categoryItems, informationItems] = await Promise.all([
      listAllCollectionItems(env, projectsCollection.id),
      listAllCollectionItems(env, mediaCollection.id),
      categoryCollection ? listAllCollectionItems(env, categoryCollection.id) : Promise.resolve([]),
      informationCollection ? listAllCollectionItems(env, informationCollection.id) : Promise.resolve([]),
    ]);

    const mFields = fieldMap.media;
    const pFields = fieldMap.projects;

    const rawMediaMap = new Map();
    const mediaById = {};
    const statsByProjectId = new Map();

    for (const m of mediaItems) {
      if (m.isArchived) continue;
      rawMediaMap.set(m.id, m);
      const fd = m.fieldData || {};

      const parentVal = mFields.parent ? fd[mFields.parent] : null;
      const parentId = typeof parentVal === "string" ? parentVal : parentVal?.id || null;
      if (parentId) {
        const orderNum = mFields.order ? Number.parseFloat(fd[mFields.order]) : NaN;
        const prev = statsByProjectId.get(parentId) || { count: 0, maxOrder: 0 };
        prev.count += 1;
        if (Number.isFinite(orderNum) && orderNum > prev.maxOrder) {
          prev.maxOrder = orderNum;
        }
        statsByProjectId.set(parentId, prev);
      }

      const img = mFields.image ? normalizeImageField(fd[mFields.image]) : { fileId: null, url: "", alt: "" };
      mediaById[m.id] = {
        id: m.id,
        name: fd.name || "(Untitled Slide)",
        slug: fd.slug || "",
        isDraft: Boolean(m.isDraft),
        lastPublished: m.lastPublished || null,
        imageUrl: img.url,
        fileId: img.fileId,
        alt: (mFields.alt && fd[mFields.alt]) || img.alt || "",
        videoId: (mFields.videoId && fd[mFields.videoId]) || "",
        fillDesktop: Boolean(mFields.fillDesktop && fd[mFields.fillDesktop]),
        fillMobile: Boolean(mFields.fillMobile && fd[mFields.fillMobile]),
        focusX: toFinitePercent(mFields.focusX ? fd[mFields.focusX] : undefined, 50),
        focusY: toFinitePercent(mFields.focusY ? fd[mFields.focusY] : undefined, 50),
      };
    }

    const categories = categoryItems
      .filter((c) => !c.isArchived)
      .map((c) => ({
        id: c.id,
        name: c.fieldData?.name || "(Untitled)",
        slug: c.fieldData?.slug || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const projects = projectItems
      .filter((p) => !p.isArchived)
      .map((p) => {
        const fd = p.fieldData || {};
        const seqRaw = pFields.sequence ? fd[pFields.sequence] : null;
        const clientRaw = pFields.client ? fd[pFields.client] : null;
        const subtitleRaw = pFields.subtitle ? fd[pFields.subtitle] : null;
        const detailsRaw = pFields.details ? fd[pFields.details] : null;
        const projectTypeRaw = pFields.projectType ? fd[pFields.projectType] : "";
        const categoryRaw = pFields.category ? fd[pFields.category] : null;
        const categoryIds = Array.isArray(categoryRaw)
          ? categoryRaw.map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean)
          : categoryRaw
            ? [typeof categoryRaw === "string" ? categoryRaw : categoryRaw?.id].filter(Boolean)
            : [];

        const galleryIds =
          pFields.gallery && Array.isArray(fd[pFields.gallery])
            ? fd[pFields.gallery].map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean)
            : [];

        const coverRaw = pFields.cover ? fd[pFields.cover] : null;
        const coverId = typeof coverRaw === "string" ? coverRaw : coverRaw?.id || null;
        const coverUrl =
          (coverId && mediaById[coverId]?.imageUrl) ||
          (galleryIds[0] && mediaById[galleryIds[0]]?.imageUrl) ||
          "";

        const featured = Boolean(pFields.featured && fd[pFields.featured]);
        const featuredSeqRaw = pFields.featuredSequence ? fd[pFields.featuredSequence] : null;

        const stats = statsByProjectId.get(p.id) || { count: 0, maxOrder: 0 };
        let maxOrder = stats.maxOrder;

        for (const refId of galleryIds) {
          const media = rawMediaMap.get(refId);
          if (!media || !mFields.order) continue;
          const ord = Number.parseFloat(media.fieldData?.[mFields.order]);
          if (Number.isFinite(ord) && ord > maxOrder) maxOrder = ord;
        }

        const slideCount = Math.max(stats.count, galleryIds.length);

        return {
          id: p.id,
          name: fd.name || "(Untitled Project)",
          slug: fd.slug || "",
          isDraft: Boolean(p.isDraft),
          createdOn: p.createdOn || p["created-on"] || fd.createdOn || fd["created-on"] || p.lastUpdated || null,
          lastPublished: p.lastPublished || null,
          sequence: seqRaw ?? "",
          sequenceSort: toSequenceNumber(seqRaw),
          client: clientRaw || fd.name || "",
          subtitle: subtitleRaw || "",
          details: detailsRaw || "",
          projectType: projectTypeRaw || "",
          categoryIds,
          galleryIds,
          coverId,
          coverUrl,
          featured,
          featuredSequence: featuredSeqRaw ?? "",
          featuredSequenceSort: toSequenceNumber(featuredSeqRaw),
          existingSlideCount: slideCount,
          maxOrder,
          nextOrder: maxOrder > 0 ? Math.floor(maxOrder) + 1 : slideCount + 1,
          galleryRefCount: galleryIds.length,
        };
      })
      .sort((a, b) => {
        if (a.sequenceSort !== b.sequenceSort) return a.sequenceSort - b.sequenceSort;
        return a.name.localeCompare(b.name);
      });

    let informationData = null;
    if (informationCollection && informationItems.length > 0) {
      const activeInfoItem = informationItems.find((it) => !it.isArchived) || informationItems[0];
      const iFields = fieldMap.information || {};
      const ifd = activeInfoItem?.fieldData || {};
      const pic = iFields.profilePicture
        ? normalizeImageField(ifd[iFields.profilePicture])
        : { fileId: null, url: "", alt: "" };

      informationData = {
        id: activeInfoItem.id,
        name: ifd.name || "Milena Gorum",
        slug: ifd.slug || "milena-gorum",
        isDraft: Boolean(activeInfoItem.isDraft),
        lastPublished: activeInfoItem.lastPublished || null,
        profilePicture: pic,
        infoHtml: (iFields.info && ifd[iFields.info]) || "",
        servicesHtml: (iFields.services && ifd[iFields.services]) || "",
        locationHtml: (iFields.location && ifd[iFields.location]) || "",
        contactHtml: (iFields.contact && ifd[iFields.contact]) || "",
        pressHtml: (iFields.press && ifd[iFields.press]) || "",
        interviewsHtml: (iFields.interviews && ifd[iFields.interviews]) || "",
      };
    }

    return jsonResponse({
      site,
      collections: {
        projects: projectsCollection,
        media: mediaCollection,
        category: categoryCollection,
        information: informationCollection,
      },
      fieldMap,
      categories,
      mediaById,
      projects,
      information: informationData,
    });
  } catch (err) {
    if (err instanceof WebflowApiError) {
      return webflowErrorResponse(err);
    }
    return jsonError(err?.message || "Failed to load Webflow CMS bootstrap data.", 500);
  }
}
