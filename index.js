/**
 * Milena Gorum - Index Page Engine
 * Hosted on Cloudflare Pages (index.js)
 */

(function () {
    let indexAbortController = null;
    let indexScope = null;
    let activeMobileRow = null;
    let activeDesktopVideo = null;
    let activeMobileVideo = null;

    const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";
    const PREVIEW_FILENAME = "play_480p.mp4";
    const TABLET_PORTRAIT_BREAKPOINT = 1024;
    const projectMediaCache = new Map();

    const isMobileLayout = () => window.innerWidth <= TABLET_PORTRAIT_BREAKPOINT;

    const padTwoDigits = (val) => {
        if (val === undefined || val === null) return "";
        const str = String(val).trim();
        if (!str) return "";
        const num = parseInt(str, 10);
        return !isNaN(num) ? String(num).padStart(2, "0") : str;
    };

    const extractVideoId = (input) => {
        if (!input) return "";
        const trimmed = input.trim();
        const idMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return idMatch ? idMatch[0] : trimmed;
    };

    const getBunny480pUrl = (videoId) => {
        if (!videoId) return "";
        const cleanId = extractVideoId(videoId);
        return `${BUNNY_STREAM_BASE}/${cleanId}/${PREVIEW_FILENAME}`;
    };

    const getBunnyThumbnailUrl = (videoId) => {
        if (!videoId) return "";
        const cleanId = extractVideoId(videoId);
        return `${BUNNY_STREAM_BASE}/${cleanId}/thumbnail.jpg`;
    };

    const fallbackVideoUrls = (videoId) => {
        const cleanId = extractVideoId(videoId);
        return [
            `${BUNNY_STREAM_BASE}/${cleanId}/play_480p.mp4`,
            `${BUNNY_STREAM_BASE}/${cleanId}/play_720p.mp4`,
            `${BUNNY_STREAM_BASE}/${cleanId}/play_360p.mp4`,
            `${BUNNY_STREAM_BASE}/${cleanId}/play_1080p.mp4`,
        ];
    };

    // Comprehensive video ID finder across any attributes, embeds, or text blocks
    const findVideoIdInItem = (item) => {
        if (!item) return "";

        // 1. Check direct attributes on item
        const attrNames = [
            "data-video-id",
            "data-video",
            "data-bunny-id",
            "data-bunny-video-id",
            "data-src",
        ];
        for (const attr of attrNames) {
            const val = item.getAttribute(attr);
            if (val && extractVideoId(val)) return extractVideoId(val);
        }

        // 2. Check child elements with attributes
        for (const attr of attrNames) {
            const child = item.querySelector(`[${attr}]`);
            if (child) {
                const val = child.getAttribute(attr);
                if (val && extractVideoId(val)) return extractVideoId(val);
            }
        }

        // 3. Check video or source tags
        const vidOrSource = item.querySelector("video, source");
        if (vidOrSource) {
            const src = vidOrSource.getAttribute("src") || vidOrSource.getAttribute("data-src") || "";
            if (src && extractVideoId(src)) return extractVideoId(src);
        }

        // 4. Check classes
        const classTargets = item.querySelectorAll(".media-data, .video-id, .bunny-video-id, .video-embed, .video-data, [data-field='video']");
        for (const el of classTargets) {
            const dataVal = el.getAttribute("data-video-id") || el.getAttribute("data-src");
            if (dataVal && extractVideoId(dataVal)) return extractVideoId(dataVal);
            const txt = el.textContent?.trim() || "";
            if (txt && extractVideoId(txt)) return extractVideoId(txt);
        }

        // 5. Fallback: inspect any text container for UUID
        const textNodes = item.querySelectorAll("div, span, p");
        for (const el of textNodes) {
            if (el.children.length === 0) {
                const txt = el.textContent?.trim() || "";
                const match = txt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                if (match) return match[0];
            }
        }

        return "";
    };

    // Derives or retrieves the exact project slug with robust fallbacks
    const getProjectSlug = (row) => {
        if (!row) return "";

        // 1. Direct attribute on row
        let s = row.getAttribute("data-slug") || row.getAttribute("data-project-slug") || "";
        if (s) return s.replace(/^\/projects\//, "").replace(/^\//, "").trim();

        // 2. Attribute on any child element
        const childWithSlug = row.querySelector("[data-slug], [data-project-slug]");
        if (childWithSlug) {
            s = childWithSlug.getAttribute("data-slug") || childWithSlug.getAttribute("data-project-slug") || "";
            if (s) return s.replace(/^\/projects\//, "").replace(/^\//, "").trim();
        }

        // 3. Link block inside row (e.g. <a href="/projects/olivia-rodrigo">)
        const link = row.querySelector("a[href*='/projects/']");
        if (link) {
            const href = link.getAttribute("href") || "";
            const parts = href.split("/projects/");
            if (parts[1]) return parts[1].split("/")[0].split("?")[0].trim();
        }

        // 4. Derive from client name / title via slugification
        const clientEl = row.querySelector(".index-col-client, [data-client]");
        const clientTxt = clientEl?.getAttribute("data-client") || clientEl?.textContent?.trim() || "";
        if (clientTxt) {
            return clientTxt
                .toLowerCase()
                .trim()
                .replace(/\$/g, "-")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        }

        return "";
    };

    // ----------------------------------------------------
    // INITIALIZATION & TEARDOWN
    // ----------------------------------------------------
    function initIndex(container) {
        const scope = container || document.querySelector(".index-section") || document;
        const section = scope.classList?.contains("index-section") ? scope : scope.querySelector(".index-section");
        const list = scope.querySelector(".index-list");

        if (!section || !list) return;
        if (scope && scope._isIndexMounted) return;
        destroyIndex();
        if (scope) scope._isIndexMounted = true;
        indexScope = scope;

        indexAbortController = new AbortController();
        const { signal } = indexAbortController;

        const rows = Array.from(list.querySelectorAll(".index-row"));
        if (!rows.length) return;

        // Desktop Preview Stage Elements
        const previewStage = scope.querySelector(".index-preview-stage");
        const previewImg = previewStage ? previewStage.querySelector(".index-preview-img") : null;
        const previewVideoEmbed = previewStage ? previewStage.querySelector(".index-preview-video-embed") : null;

        // Ensure video element exists inside previewVideoEmbed
        let previewVideoEl = previewVideoEmbed ? previewVideoEmbed.querySelector("video") : null;
        if (previewVideoEmbed && !previewVideoEl) {
            previewVideoEl = document.createElement("video");
            previewVideoEl.playsInline = true;
            previewVideoEl.setAttribute("playsinline", "");
            previewVideoEl.setAttribute("webkit-playsinline", "true");
            previewVideoEl.muted = true;
            previewVideoEl.defaultMuted = true;
            previewVideoEl.setAttribute("muted", "");
            previewVideoEl.loop = true;
            previewVideoEl.setAttribute("loop", "");
            previewVideoEl.autoplay = true;
            previewVideoEl.setAttribute("autoplay", "");
            previewVideoEmbed.appendChild(previewVideoEl);
        }

        // ----------------------------------------------------
        // MEDIA DATA EXTRACTION
        // ----------------------------------------------------
        const parseRowMedia = (row, projectNum) => {
            const gallerySource = row.querySelector(".index-gallery-source");
            const mediaItems = [];

            if (gallerySource) {
                const nestedItems = Array.from(gallerySource.querySelectorAll(".index-gallery-item, .w-dyn-item"));
                nestedItems.forEach((item, idx) => {
                    const imgEl = item.querySelector("img");
                    const mediaDataEl = item.querySelector(".media-data, [data-img], [data-video-id]");

                    let imgSrc = mediaDataEl?.getAttribute("data-img") ||
                        imgEl?.getAttribute("src") ||
                        imgEl?.getAttribute("data-src") || "";

                    if (!imgSrc && imgEl?.getAttribute("srcset")) {
                        imgSrc = imgEl.getAttribute("srcset").split(",")[0].trim().split(" ")[0];
                    }

                    if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

                    const videoId = findVideoIdInItem(item);
                    const poster = imgSrc || (videoId ? getBunnyThumbnailUrl(videoId) : "");
                    const label = `${projectNum}-${padTwoDigits(idx + 1)}`;

                    mediaItems.push({
                        label,
                        idx,
                        imgSrc,
                        videoId,
                        poster,
                    });
                });
            }

            // Fallback: If no nested items found, check for a single cover image
            if (!mediaItems.length) {
                const fallbackImg = row.querySelector("img");
                const imgSrc = fallbackImg?.getAttribute("src") || fallbackImg?.currentSrc || "";
                if (imgSrc) {
                    mediaItems.push({
                        label: `${projectNum}-01`,
                        idx: 0,
                        imgSrc,
                        videoId: "",
                        poster: imgSrc,
                    });
                }
            }

            return mediaItems;
        };

        // ----------------------------------------------------
        // DESKTOP PREVIEW CONTROLLER
        // ----------------------------------------------------
        const showDesktopPreview = (media) => {
            if (!previewStage || isMobileLayout()) return;

            // 1. Always display the thumbnail/poster image first
            const posterSrc = media.poster || media.imgSrc;
            if (previewImg && posterSrc) {
                previewImg.src = posterSrc;
                previewImg.style.display = "block";
            }

            // 2. Load and play video if this media is a motion item
            if (media.videoId) {
                const videoSrc = getBunny480pUrl(media.videoId);
                if (previewVideoEl) {
                    if (previewVideoEl.dataset.currentId !== media.videoId) {
                        previewVideoEl.dataset.currentId = media.videoId;
                        if (posterSrc) previewVideoEl.poster = posterSrc;
                        previewVideoEl.src = videoSrc;

                        // Fallback chain for video variants
                        const fallbacks = fallbackVideoUrls(media.videoId);
                        let attemptIndex = 0;
                        previewVideoEl.onerror = () => {
                            attemptIndex++;
                            if (attemptIndex < fallbacks.length) {
                                previewVideoEl.src = fallbacks[attemptIndex];
                                previewVideoEl.load();
                                previewVideoEl.play().catch(() => { });
                            }
                        };

                        previewVideoEl.load();
                    }

                    if (previewVideoEmbed) {
                        previewVideoEmbed.style.display = "block";
                    }

                    previewVideoEl.play().catch(() => { });
                    activeDesktopVideo = previewVideoEl;
                }
            } else {
                // Pure image item
                if (previewVideoEl) {
                    try {
                        previewVideoEl.pause();
                        previewVideoEl.removeAttribute("src");
                        delete previewVideoEl.dataset.currentId;
                        previewVideoEl.load();
                    } catch (_) { }
                }
                if (previewVideoEmbed) {
                    previewVideoEmbed.style.display = "none";
                }
            }

            previewStage.classList.add("is-visible");
        };

        const hideDesktopPreview = () => {
            if (!previewStage) return;
            previewStage.classList.remove("is-visible");

            if (activeDesktopVideo) {
                try {
                    activeDesktopVideo.pause();
                    activeDesktopVideo.removeAttribute("src");
                    delete activeDesktopVideo.dataset.currentId;
                    activeDesktopVideo.load();
                } catch (_) { }
                activeDesktopVideo = null;
            }

            if (previewVideoEmbed) {
                previewVideoEmbed.style.display = "none";
            }
        };

        // ----------------------------------------------------
        // MOBILE ACCORDION & MEDIA SWITCHER
        // ----------------------------------------------------
        const selectMobileMedia = (row, media) => {
            const mobileMediaBox = row.querySelector(".index-mobile-media-box");
            if (!mobileMediaBox) return;

            const mobileImg = mobileMediaBox.querySelector(".index-mobile-img");
            const mobileVideoEmbed = mobileMediaBox.querySelector(".index-mobile-video-embed, .index-preview-video-embed, .w-embed");
            let mobileVideoEl = mobileVideoEmbed ? mobileVideoEmbed.querySelector("video") : null;

            if (mobileVideoEmbed && !mobileVideoEl) {
                mobileVideoEl = document.createElement("video");
                mobileVideoEl.playsInline = true;
                mobileVideoEl.setAttribute("playsinline", "");
                mobileVideoEl.setAttribute("webkit-playsinline", "true");
                mobileVideoEl.muted = true;
                mobileVideoEl.defaultMuted = true;
                mobileVideoEl.setAttribute("muted", "");
                mobileVideoEl.loop = true;
                mobileVideoEl.setAttribute("loop", "");
                mobileVideoEl.autoplay = true;
                mobileVideoEl.setAttribute("autoplay", "");
                mobileVideoEmbed.appendChild(mobileVideoEl);
            }

            // 1. Always display thumbnail/poster immediately
            const posterSrc = media.poster || media.imgSrc;
            if (mobileImg && posterSrc) {
                mobileImg.src = posterSrc;
                mobileImg.style.display = "block";
            }

            // 2. Play 480p video if motion item
            if (media.videoId) {
                const videoSrc = getBunny480pUrl(media.videoId);
                if (mobileVideoEl) {
                    if (mobileVideoEl.dataset.currentId !== media.videoId) {
                        mobileVideoEl.dataset.currentId = media.videoId;
                        if (posterSrc) mobileVideoEl.poster = posterSrc;
                        mobileVideoEl.muted = true;
                        mobileVideoEl.defaultMuted = true;
                        mobileVideoEl.setAttribute("muted", "");
                        mobileVideoEl.src = videoSrc;

                        const fallbacks = fallbackVideoUrls(media.videoId);
                        let attemptIndex = 0;
                        mobileVideoEl.onerror = () => {
                            attemptIndex++;
                            if (attemptIndex < fallbacks.length) {
                                mobileVideoEl.src = fallbacks[attemptIndex];
                                mobileVideoEl.load();
                                const p = mobileVideoEl.play();
                                if (p && typeof p.catch === "function") p.catch(() => {});
                            }
                        };

                        mobileVideoEl.load();
                    }

                    if (mobileVideoEmbed) {
                        mobileVideoEmbed.style.display = "block";
                    }

                    const playPromise = mobileVideoEl.play();
                    if (playPromise && typeof playPromise.catch === "function") {
                        playPromise.catch(() => {
                            const onCanPlay = () => {
                                mobileVideoEl.removeEventListener("canplay", onCanPlay);
                                mobileVideoEl.removeEventListener("loadeddata", onCanPlay);
                                mobileVideoEl.play().catch(() => {});
                            };
                            mobileVideoEl.addEventListener("canplay", onCanPlay, { once: true });
                            mobileVideoEl.addEventListener("loadeddata", onCanPlay, { once: true });
                        });
                    }
                    activeMobileVideo = mobileVideoEl;
                }
            } else {
                if (mobileVideoEl) {
                    try {
                        mobileVideoEl.pause();
                        mobileVideoEl.removeAttribute("src");
                        delete mobileVideoEl.dataset.currentId;
                        mobileVideoEl.load();
                    } catch (_) { }
                }
                if (mobileVideoEmbed) {
                    mobileVideoEmbed.style.display = "none";
                }
            }

            // Update active state on mobile buttons
            const mobileBtns = row.querySelectorAll(".index-media-mobile .index-media-item");
            mobileBtns.forEach((btn) => {
                const bIdx = parseInt(btn.getAttribute("data-media-idx") || "-1", 10);
                btn.classList.toggle("is-active", bIdx === media.idx);
            });
        };

        const expandRow = (row) => {
            if (activeMobileRow && activeMobileRow !== row) {
                collapseRow(activeMobileRow);
            }

            activeMobileRow = row;
            row.classList.add("is-expanded");
            list.classList.add("has-active-mobile");

            const drawer = row.querySelector(".index-row-drawer");
            if (!drawer) return;

            const mediaItems = row._mediaItems || [];
            if (mediaItems.length) {
                selectMobileMedia(row, mediaItems[0]);
            }

            // GSAP Smooth Accordion Expansion
            if (typeof gsap !== "undefined") {
                gsap.killTweensOf(drawer);
                gsap.fromTo(
                    drawer,
                    { height: 0, opacity: 0 },
                    {
                        height: "auto",
                        opacity: 1,
                        duration: 0.35,
                        ease: "power2.out",
                        force3D: true,
                    }
                );
            } else {
                drawer.style.height = "auto";
                drawer.style.opacity = "1";
            }
        };

        const collapseRow = (row) => {
            if (!row) return;
            row.classList.remove("is-expanded");

            const drawer = row.querySelector(".index-row-drawer");
            if (drawer) {
                if (typeof gsap !== "undefined") {
                    gsap.killTweensOf(drawer);
                    gsap.to(drawer, {
                        height: 0,
                        opacity: 0,
                        duration: 0.25,
                        ease: "power2.inOut",
                        force3D: true,
                        onComplete: () => {
                            drawer.style.height = "0";
                        },
                    });
                } else {
                    drawer.style.height = "0";
                    drawer.style.opacity = "0";
                }
            }

            // Clean up any playing video in mobile drawer
            const mobileVideo = drawer ? drawer.querySelector("video") : null;
            if (mobileVideo) {
                try {
                    mobileVideo.pause();
                    mobileVideo.removeAttribute("src");
                    delete mobileVideo.dataset.currentId;
                    mobileVideo.load();
                } catch (_) { }
            }
            const mobileEmbed = drawer ? drawer.querySelector(".index-mobile-video-embed, .index-preview-video-embed, .w-embed") : null;
            if (mobileEmbed) {
                mobileEmbed.style.display = "none";
            }

            if (activeMobileRow === row) {
                activeMobileRow = null;
                list.classList.remove("has-active-mobile");
            }
        };

        // ----------------------------------------------------
        // MEDIA BUTTON BUILDER
        // ----------------------------------------------------
        const buildMediaButtons = (row, mediaList, signalToUse) => {
            row._mediaItems = mediaList;

            // 1. Desktop buttons
            const desktopMediaContainer = row.querySelector(".index-media-desktop");
            if (desktopMediaContainer) {
                desktopMediaContainer.innerHTML = "";
                mediaList.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "index-media-item";
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(mIdx));
                    btn.setAttribute("aria-label", `Show media ${media.label}`);

                    btn.addEventListener("pointerenter", () => {
                        desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                        btn.classList.add("is-active");
                        showDesktopPreview(media);
                    }, { signal: signalToUse });

                    desktopMediaContainer.appendChild(btn);
                });
            }

            // 2. Mobile buttons
            const mobileMediaContainer = row.querySelector(".index-media-mobile");
            if (mobileMediaContainer) {
                const currentActiveIdx = mobileMediaContainer.querySelector(".index-media-item.is-active")?.getAttribute("data-media-idx");
                const activeIdxNum = currentActiveIdx ? parseInt(currentActiveIdx, 10) : 0;

                mobileMediaContainer.innerHTML = "";
                mediaList.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `index-media-item is-mobile${mIdx === activeIdxNum ? " is-active" : ""}`;
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(mIdx));
                    btn.setAttribute("aria-label", `Select media ${media.label}`);

                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        selectMobileMedia(row, media);
                    }, { signal: signalToUse });

                    mobileMediaContainer.appendChild(btn);
                });
            }
        };

        // ----------------------------------------------------
        // BUILD ROW DOM & INTERACTION BINDINGS
        // ----------------------------------------------------
        rows.forEach((row, rowIndex) => {
            // Project Sequence
            const colNum = row.querySelector(".index-col-num");
            const rawNum = row.getAttribute("data-project-num") || (colNum ? colNum.textContent.trim() : "");
            const projectNum = padTwoDigits(rawNum || rowIndex + 1);
            if (colNum) colNum.textContent = projectNum;

            // Extract initial Media Items from nested Webflow source
            const mediaItems = parseRowMedia(row, projectNum);
            buildMediaButtons(row, mediaItems, signal);

            // Desktop Hover Handlers
            row.addEventListener("pointerenter", () => {
                if (isMobileLayout()) return;
                list.classList.add("has-hovered-item");
                row.classList.add("is-hovered");

                // Preload first media
                if (row._mediaItems && row._mediaItems.length) {
                    const preloadSrc = row._mediaItems[0].poster || row._mediaItems[0].imgSrc;
                    if (preloadSrc) {
                        const preloadImg = new Image();
                        preloadImg.src = preloadSrc;
                    }
                }
            }, { signal });

            row.addEventListener("pointerleave", () => {
                if (isMobileLayout()) return;
                row.classList.remove("is-hovered");
                hideDesktopPreview();

                const desktopMediaContainer = row.querySelector(".index-media-desktop");
                if (desktopMediaContainer) {
                    desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                }

                if (!list.querySelector(".index-row.is-hovered")) {
                    list.classList.remove("has-hovered-item");
                }
            }, { signal });

            // Mobile Tap to Expand/Collapse
            const rowHeader = row.querySelector(".index-row-header") || row;
            rowHeader.addEventListener("click", (e) => {
                if (!isMobileLayout()) return;
                if (e.target.closest("a")) return;
                if (e.target.closest(".index-row-drawer")) return;

                if (row.classList.contains("is-expanded")) {
                    collapseRow(row);
                } else {
                    expandRow(row);
                }
            }, { signal });

            // ----------------------------------------------------
            // ASYNC HYDRATION (> 5 ITEMS)
            // Fetch project detail page to bypass Webflow's 5-item nested cap
            // ----------------------------------------------------
            const projectSlug = getProjectSlug(row);
            if (projectSlug) {
                hydrateProjectMedia(row, projectSlug, projectNum, signal);
            }
        });

        // Window resize handler: collapse mobile drawer if transitioning to desktop
        window.addEventListener("resize", () => {
            if (!isMobileLayout() && activeMobileRow) {
                collapseRow(activeMobileRow);
            }
        }, { signal, passive: true });
    }

    // ----------------------------------------------------
    // ASYNC HYDRATION (FETCH PROJECT DETAIL PAGE)
    // ----------------------------------------------------
    async function hydrateProjectMedia(row, slug, projectNum, signal) {
        let fullMedia = projectMediaCache.get(slug);

        if (!fullMedia) {
            try {
                const targetUrl = `/projects/${slug}`;
                const res = await fetch(targetUrl, { signal });
                if (!res.ok) return;

                const html = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                // Target ONLY main swiper slides (never duplicate with thumb-swiper)
                let slides = Array.from(doc.querySelectorAll(".main-swiper .swiper-slide:not(.swiper-slide-duplicate), .main-stage .swiper-slide:not(.swiper-slide-duplicate)"));
                if (!slides.length) {
                    slides = Array.from(doc.querySelectorAll(".thumb-swiper .swiper-slide:not(.swiper-slide-duplicate)"));
                }

                if (slides.length > 0) {
                    fullMedia = slides.map((slide, idx) => {
                        const img = slide.querySelector(".main-media-img, .thumb-img, img");
                        let imgSrc = img?.getAttribute("src") || img?.getAttribute("data-src") || "";
                        if (!imgSrc && img?.getAttribute("srcset")) {
                            imgSrc = img.getAttribute("srcset").split(",")[0].trim().split(" ")[0];
                        }
                        if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

                        const videoId = findVideoIdInItem(slide);
                        const poster = imgSrc || (videoId ? getBunnyThumbnailUrl(videoId) : "");

                        return {
                            label: `${projectNum}-${padTwoDigits(idx + 1)}`,
                            idx,
                            imgSrc,
                            videoId,
                            poster,
                        };
                    });

                    projectMediaCache.set(slug, fullMedia);
                }
            } catch (_) {
                return;
            }
        }

        // If detail page has more media items than the initial nested list, upgrade the row
        if (fullMedia && fullMedia.length > (row._mediaItems ? row._mediaItems.length : 0)) {
            // Rebuild with complete collection of media items
            const desktopMediaContainer = row.querySelector(".index-media-desktop");
            if (desktopMediaContainer) {
                desktopMediaContainer.innerHTML = "";
                fullMedia.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "index-media-item";
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(mIdx));
                    btn.setAttribute("aria-label", `Show media ${media.label}`);

                    btn.addEventListener("pointerenter", () => {
                        desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                        btn.classList.add("is-active");
                        showDesktopPreview(media);
                    }, { signal });

                    desktopMediaContainer.appendChild(btn);
                });
            }

            const mobileMediaContainer = row.querySelector(".index-media-mobile");
            if (mobileMediaContainer) {
                const currentActiveIdx = mobileMediaContainer.querySelector(".index-media-item.is-active")?.getAttribute("data-media-idx");
                const activeIdxNum = currentActiveIdx ? parseInt(currentActiveIdx, 10) : 0;

                mobileMediaContainer.innerHTML = "";
                fullMedia.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `index-media-item is-mobile${mIdx === activeIdxNum ? " is-active" : ""}`;
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(mIdx));
                    btn.setAttribute("aria-label", `Select media ${media.label}`);

                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        selectMobileMedia(row, media);
                    }, { signal });

                    mobileMediaContainer.appendChild(btn);
                });
            }

            row._mediaItems = fullMedia;
        }
    }

    // ----------------------------------------------------
    // CLEANUP & TEARDOWN
    // ----------------------------------------------------
    function destroyIndex() {
        if (indexAbortController) {
            indexAbortController.abort();
            indexAbortController = null;
        }

        if (activeDesktopVideo) {
            try {
                activeDesktopVideo.pause();
                activeDesktopVideo.removeAttribute("src");
                delete activeDesktopVideo.dataset.currentId;
                activeDesktopVideo.load();
            } catch (_) { }
            activeDesktopVideo = null;
        }

        if (activeMobileVideo) {
            try {
                activeMobileVideo.pause();
                activeMobileVideo.removeAttribute("src");
                delete activeMobileVideo.dataset.currentId;
                activeMobileVideo.load();
            } catch (_) { }
            activeMobileVideo = null;
        }

        if (indexScope) {
            indexScope._isIndexMounted = false;
            const list = indexScope.querySelector(".index-list");
            if (list) {
                list.classList.remove("has-hovered-item", "has-active-mobile");
            }
            indexScope = null;
        }

        activeMobileRow = null;
    }

    // Expose lifecycle hooks globally
    window.initIndex = initIndex;
    window.destroyIndex = destroyIndex;
})();
