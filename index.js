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
    const PREVIEW_FILENAME = "preview_hq.mp4";
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

    const getBunnyPreviewUrl = (videoId) => {
        if (!videoId) return "";
        const cleanId = extractVideoId(videoId);
        return `${BUNNY_STREAM_BASE}/${cleanId}/${PREVIEW_FILENAME}`;
    };

    const getBunnyThumbnailUrl = (videoId) => {
        if (!videoId) return "";
        const cleanId = extractVideoId(videoId);
        return `${BUNNY_STREAM_BASE}/${cleanId}/thumbnail.jpg`;
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
            previewVideoEl.loop = true;
            previewVideoEl.autoplay = true;
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
                        imgEl?.currentSrc ||
                        imgEl?.getAttribute("data-src") || "";

                    // Normalize protocol-relative URLs
                    if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

                    const rawVideoId = mediaDataEl?.getAttribute("data-video-id") ||
                        item.getAttribute("data-video-id") ||
                        "";
                    const videoId = extractVideoId(rawVideoId);

                    const label = `${projectNum}-${padTwoDigits(idx + 1)}`;
                    mediaItems.push({
                        label,
                        idx,
                        imgSrc,
                        videoId,
                        poster: videoId ? getBunnyThumbnailUrl(videoId) : imgSrc,
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

            if (media.videoId) {
                const videoSrc = getBunnyPreviewUrl(media.videoId);
                if (previewVideoEl) {
                    if (previewVideoEl.src !== videoSrc) {
                        previewVideoEl.src = videoSrc;
                        previewVideoEl.poster = media.poster || media.imgSrc;
                        previewVideoEl.load();
                    }
                    previewVideoEl.play().catch(() => { });
                    activeDesktopVideo = previewVideoEl;
                }
                if (previewVideoEmbed) previewVideoEmbed.style.display = "block";
                if (previewImg) previewImg.style.display = "none";
            } else {
                if (previewVideoEl) {
                    try {
                        previewVideoEl.pause();
                        previewVideoEl.removeAttribute("src");
                        previewVideoEl.load();
                    } catch (_) { }
                }
                if (previewVideoEmbed) previewVideoEmbed.style.display = "none";
                if (previewImg) {
                    previewImg.src = media.imgSrc;
                    previewImg.style.display = "block";
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
                    activeDesktopVideo.load();
                } catch (_) { }
                activeDesktopVideo = null;
            }
        };

        // ----------------------------------------------------
        // MOBILE ACCORDION & MEDIA SWITCHER
        // ----------------------------------------------------
        const selectMobileMedia = (row, media) => {
            const mobileMediaBox = row.querySelector(".index-mobile-media-box");
            if (!mobileMediaBox) return;

            const mobileImg = mobileMediaBox.querySelector(".index-mobile-img");
            const mobileVideoEmbed = mobileMediaBox.querySelector(".index-mobile-video-embed");
            let mobileVideoEl = mobileVideoEmbed ? mobileVideoEmbed.querySelector("video") : null;

            if (mobileVideoEmbed && !mobileVideoEl) {
                mobileVideoEl = document.createElement("video");
                mobileVideoEl.playsInline = true;
                mobileVideoEl.setAttribute("playsinline", "");
                mobileVideoEl.setAttribute("webkit-playsinline", "true");
                mobileVideoEl.muted = true;
                mobileVideoEl.loop = true;
                mobileVideoEl.autoplay = true;
                mobileVideoEmbed.appendChild(mobileVideoEl);
            }

            if (media.videoId) {
                const videoSrc = getBunnyPreviewUrl(media.videoId);
                if (mobileVideoEl) {
                    if (mobileVideoEl.src !== videoSrc) {
                        mobileVideoEl.src = videoSrc;
                        mobileVideoEl.poster = media.poster || media.imgSrc;
                        mobileVideoEl.load();
                    }
                    mobileVideoEl.play().catch(() => { });
                    activeMobileVideo = mobileVideoEl;
                }
                if (mobileVideoEmbed) mobileVideoEmbed.style.display = "block";
                if (mobileImg) mobileImg.style.display = "none";
            } else {
                if (mobileVideoEl) {
                    try {
                        mobileVideoEl.pause();
                        mobileVideoEl.removeAttribute("src");
                        mobileVideoEl.load();
                    } catch (_) { }
                }
                if (mobileVideoEmbed) mobileVideoEmbed.style.display = "none";
                if (mobileImg) {
                    mobileImg.src = media.imgSrc;
                    mobileImg.style.display = "block";
                }
            }

            // Update active state on mobile buttons
            const mobileBtns = row.querySelectorAll(".index-media-mobile .index-media-item");
            mobileBtns.forEach((btn, i) => {
                btn.classList.toggle("is-active", i === media.idx);
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
                    mobileVideo.load();
                } catch (_) { }
            }

            if (activeMobileRow === row) {
                activeMobileRow = null;
                list.classList.remove("has-active-mobile");
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

            // Extract Media Items
            const mediaItems = parseRowMedia(row, projectNum);
            row._mediaItems = mediaItems;

            // 1. Populate Desktop Media Numbers Container
            const desktopMediaContainer = row.querySelector(".index-media-desktop");
            if (desktopMediaContainer) {
                desktopMediaContainer.innerHTML = "";
                mediaItems.forEach((media, mIdx) => {
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

            // 2. Populate Mobile Drawer Media Numbers Container
            const mobileMediaContainer = row.querySelector(".index-media-mobile");
            if (mobileMediaContainer) {
                mobileMediaContainer.innerHTML = "";
                mediaItems.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `index-media-item is-mobile${mIdx === 0 ? " is-active" : ""}`;
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

            // 3. Desktop Hover Handlers
            row.addEventListener("pointerenter", () => {
                if (isMobileLayout()) return;
                list.classList.add("has-hovered-item");
                row.classList.add("is-hovered");

                // Preload first media
                if (mediaItems.length && mediaItems[0].imgSrc) {
                    const preloadImg = new Image();
                    preloadImg.src = mediaItems[0].imgSrc;
                }
            }, { signal });

            row.addEventListener("pointerleave", () => {
                if (isMobileLayout()) return;
                row.classList.remove("is-hovered");
                hideDesktopPreview();

                if (desktopMediaContainer) {
                    desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                }

                // If no row is hovered, remove parent dimming
                if (!list.querySelector(".index-row.is-hovered")) {
                    list.classList.remove("has-hovered-item");
                }
            }, { signal });

            // 4. Mobile Tap to Expand/Collapse
            const rowHeader = row.querySelector(".index-row-header") || row;
            rowHeader.addEventListener("click", (e) => {
                if (!isMobileLayout()) return;

                // Ignore if clicked on a direct link
                if (e.target.closest("a")) return;

                if (row.classList.contains("is-expanded")) {
                    collapseRow(row);
                } else {
                    expandRow(row);
                }
            }, { signal });

            // ----------------------------------------------------
            // ASYNC HYDRATION FOR > 5 ITEMS
            // If Webflow capped nested list at 5 items, fetch project template page
            // to retrieve items 6+ without any extra manual CMS fields!
            // ----------------------------------------------------
            const projectSlug = row.getAttribute("data-slug");
            if (projectSlug && mediaItems.length === 5) {
                hydrateProjectMediaBeyondFive(row, projectSlug, projectNum, signal);
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
    // ASYNC HYDRATION (> 5 ITEMS)
    // ----------------------------------------------------
    async function hydrateProjectMediaBeyondFive(row, slug, projectNum, signal) {
        let fullMedia = projectMediaCache.get(slug);

        if (!fullMedia) {
            try {
                const targetUrl = `/projects/${slug}`;
                const res = await fetch(targetUrl, { signal });
                if (!res.ok) return;

                const html = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                const slides = Array.from(doc.querySelectorAll(".main-swiper .swiper-slide, .thumb-swiper .swiper-slide"));
                if (slides.length > 5) {
                    fullMedia = slides.map((slide, idx) => {
                        const img = slide.querySelector("img");
                        const vidEmbed = slide.querySelector("[data-video-id], video");
                        const rawVidId = vidEmbed?.getAttribute("data-video-id") || vidEmbed?.src || "";
                        const videoId = extractVideoId(rawVidId);
                        let imgSrc = img?.getAttribute("src") || img?.currentSrc || "";
                        if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

                        return {
                            label: `${projectNum}-${padTwoDigits(idx + 1)}`,
                            idx,
                            imgSrc,
                            videoId,
                            poster: videoId ? getBunnyThumbnailUrl(videoId) : imgSrc,
                        };
                    });
                    projectMediaCache.set(slug, fullMedia);
                }
            } catch (_) {
                return;
            }
        }

        if (fullMedia && fullMedia.length > row._mediaItems.length) {
            row._mediaItems = fullMedia;

            // Append additional desktop buttons
            const desktopMediaContainer = row.querySelector(".index-media-desktop");
            if (desktopMediaContainer) {
                for (let i = 5; i < fullMedia.length; i++) {
                    const media = fullMedia[i];
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "index-media-item";
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(i));
                    btn.setAttribute("aria-label", `Show media ${media.label}`);

                    btn.addEventListener("pointerenter", () => {
                        desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                        btn.classList.add("is-active");
                        // Trigger desktop preview
                        const stage = document.querySelector(".index-preview-stage");
                        const img = stage?.querySelector(".index-preview-img");
                        if (img) img.src = media.imgSrc;
                        if (stage) stage.classList.add("is-visible");
                    }, { signal });

                    desktopMediaContainer.appendChild(btn);
                }
            }

            // Append additional mobile buttons
            const mobileMediaContainer = row.querySelector(".index-media-mobile");
            if (mobileMediaContainer) {
                for (let i = 5; i < fullMedia.length; i++) {
                    const media = fullMedia[i];
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "index-media-item is-mobile";
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(i));
                    btn.setAttribute("aria-label", `Select media ${media.label}`);

                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const mobileMediaBox = row.querySelector(".index-mobile-media-box");
                        const mobileImg = mobileMediaBox?.querySelector(".index-mobile-img");
                        if (mobileImg) mobileImg.src = media.imgSrc;
                        mobileMediaContainer.querySelectorAll(".index-media-item").forEach((b, idx) => {
                            b.classList.toggle("is-active", idx === i);
                        });
                    }, { signal });

                    mobileMediaContainer.appendChild(btn);
                }
            }
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
                activeDesktopVideo.load();
            } catch (_) { }
            activeDesktopVideo = null;
        }

        if (activeMobileVideo) {
            try {
                activeMobileVideo.pause();
                activeMobileVideo.removeAttribute("src");
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
