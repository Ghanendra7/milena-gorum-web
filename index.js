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
    let appearTimeline = null;
    const indexMarqueeTimelines = [];

    const killIndexMarquees = () => {
        indexMarqueeTimelines.forEach((tl) => {
            try { tl.kill(); } catch (_) { }
        });
        indexMarqueeTimelines.length = 0;
    };

    const createIndexMarquee = (wrap, textEl) => {
        if (!wrap || !textEl || typeof gsap === "undefined") return;

        gsap.killTweensOf(textEl);
        gsap.set(textEl, { clearProps: "transform,x" });

        const containerWidth = wrap.clientWidth;
        const textWidth = Math.ceil(textEl.scrollWidth || textEl.getBoundingClientRect().width);
        const overflowDistance = textWidth - containerWidth;

        if (overflowDistance > 4) {
            wrap.classList.add("is-overflowing");

            // Subtle reading speed: ~26px per second, minimum 3.0s duration
            const duration = Math.max(3.0, overflowDistance / 26);

            const tl = gsap.timeline({
                repeat: -1
            });

            tl.to(textEl, {
                x: -overflowDistance,
                duration: duration,
                ease: "sine.inOut",
                force3D: true
            }, "+=1.8")
            .to(textEl, {
                x: 0,
                duration: duration,
                ease: "sine.inOut",
                force3D: true
            }, "+=1.8");

            indexMarqueeTimelines.push(tl);
        } else {
            wrap.classList.remove("is-overflowing");
            gsap.set(textEl, { x: 0 });
        }
    };

    const setupIndexMarquees = (containerList) => {
        const root = containerList || (indexScope ? indexScope.querySelector(".index-list") : null) || document.querySelector(".index-list");
        if (!root || typeof gsap === "undefined") return;

        killIndexMarquees();

        const rows = root.querySelectorAll(".index-row");
        rows.forEach((row) => {
            // 1. Client text marquee
            let clientWrap = row.querySelector(".index-client-wrap");
            const clientEl = row.querySelector(".index-col-client");
            if (!clientWrap && clientEl) {
                clientWrap = document.createElement("div");
                clientWrap.className = "index-client-wrap";
                clientEl.parentNode.insertBefore(clientWrap, clientEl);
                clientWrap.appendChild(clientEl);
            }
            if (clientWrap && clientEl) {
                createIndexMarquee(clientWrap, clientEl);
            }

            // 2. Sub-title text marquee
            let titleWrap = row.querySelector(".index-title-wrap");
            const titleEl = row.querySelector(".index-col-title");
            if (!titleWrap && titleEl) {
                titleWrap = document.createElement("div");
                titleWrap.className = "index-title-wrap";
                titleEl.parentNode.insertBefore(titleWrap, titleEl);
                titleWrap.appendChild(titleEl);
            }
            if (titleWrap && titleEl) {
                createIndexMarquee(titleWrap, titleEl);
            }
        });
    };

    const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";
    const PREVIEW_FILENAME = "play_480p.mp4";
    const TABLET_PORTRAIT_BREAKPOINT = 1024;
    const projectMediaCache = new Map();

    const isMobileLayout = () => {
        return window.matchMedia ? window.matchMedia("(max-width: 1024px)").matches : window.innerWidth <= TABLET_PORTRAIT_BREAKPOINT;
    };

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
    // APPEAR ANIMATION (Subtle Floating Column Stagger)
    // ----------------------------------------------------
    let isAppearAnimating = false;

    const playAppearAnimation = (list) => {
        if (!list) return;

        const colNums = Array.from(list.querySelectorAll(".index-col-num"));
        const clientWraps = Array.from(list.querySelectorAll(".index-client-wrap")).length
            ? Array.from(list.querySelectorAll(".index-client-wrap"))
            : Array.from(list.querySelectorAll(".index-col-client"));
        const titleWraps = Array.from(list.querySelectorAll(".index-title-wrap")).length
            ? Array.from(list.querySelectorAll(".index-title-wrap"))
            : Array.from(list.querySelectorAll(".index-col-title"));

        if (!colNums.length && !clientWraps.length && !titleWraps.length) return;

        const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const executeAnim = () => {
            if (typeof gsap === "undefined") return;

            if (appearTimeline) {
                appearTimeline.kill();
                appearTimeline = null;
            }

            isAppearAnimating = true;
            list.classList.add("is-appearing");
            list.style.pointerEvents = "none";

            const allTargets = [...colNums, ...clientWraps, ...titleWraps];
            gsap.set(allTargets, { opacity: 0, y: 22, force3D: true });

            appearTimeline = gsap.timeline({
                onComplete: () => {
                    gsap.set(allTargets, { clearProps: "transform,opacity" });
                    appearTimeline = null;
                    isAppearAnimating = false;
                    list.classList.remove("is-appearing");
                    list.style.pointerEvents = "";

                    setupIndexMarquees(list);

                    const hoveredRow = list.querySelector(".index-row:hover");
                    if (hoveredRow && !isMobileLayout()) {
                        list.classList.add("has-hovered-item");
                        hoveredRow.classList.add("is-hovered");

                        const slug = getProjectSlug(hoveredRow);
                        const desktopMediaContainer = hoveredRow.querySelector(".index-media-desktop");
                        const currentMedia = hoveredRow._mediaItems || [];
                        if (desktopMediaContainer && currentMedia.length) {
                            desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b, idx) => {
                                b.classList.toggle("is-active", idx === 0);
                            });
                            showDesktopPreview(currentMedia[0], slug);
                        }
                    }
                }
            });

            appearTimeline
                .to(colNums, { opacity: 1, y: 0, duration: 0.85, ease: "power2.inOut", force3D: true }, 0.02)
                .to(clientWraps, { opacity: 1, y: 0, duration: 0.85, ease: "power2.inOut", force3D: true }, 0.12)
                .to(titleWraps, { opacity: 1, y: 0, duration: 0.85, ease: "power2.inOut", force3D: true }, 0.22);
        };

        if (typeof gsap !== "undefined") {
            executeAnim();
        } else {
            const checkGsap = setInterval(() => {
                if (typeof gsap !== "undefined") {
                    clearInterval(checkGsap);
                    executeAnim();
                }
            }, 20);
            setTimeout(() => clearInterval(checkGsap), 2000);
        }
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

        // Check for saved mobile state to restore (ONLY when returning from project-detail)
        let restoreSlug = null;
        let restoreSlide = 0;
        let restoreScroll = null;
        let isRestoreFromDetail = false;

        try {
            isRestoreFromDetail = sessionStorage.getItem("mg_index_restore_from_detail") === "true";
            if (isRestoreFromDetail) {
                restoreSlug = sessionStorage.getItem("mg_index_restore_slug");
                const savedSlide = sessionStorage.getItem("mg_index_restore_slide");
                restoreSlide = savedSlide !== null ? parseInt(savedSlide, 10) : 0;
                const savedScroll = sessionStorage.getItem("mg_index_restore_scroll");
                if (savedScroll !== null) {
                    restoreScroll = parseFloat(savedScroll);
                }
            }
        } catch (_) { }

        const isRestoring = Boolean(isRestoreFromDetail && (restoreSlug || (restoreScroll !== null && restoreScroll > 0)));

        // Subtle GSAP appear animation for columns: numbers -> client name -> subtitle
        if (!scope._deferAppear && !window.__mgEnteringFromHome && !isRestoring) {
            playAppearAnimation(list);
        } else if (isRestoring) {
            const allTargets = list.querySelectorAll(".index-col-num, .index-client-wrap, .index-title-wrap, .index-col-client, .index-col-title");
            if (typeof gsap !== "undefined" && allTargets.length) {
                gsap.set(allTargets, { opacity: 1, y: 0, clearProps: "transform,opacity" });
            }
            list.classList.remove("is-appearing");
            list.style.pointerEvents = "";
            setupIndexMarquees(list);
        } else {
            setupIndexMarquees(list);
        }

        indexAbortController = new AbortController();
        const { signal } = indexAbortController;

        const rows = Array.from(list.querySelectorAll(".index-row"));
        if (!rows.length) return;

        // Neutralize broken 403 Webflow SVG placeholders
        const TRANSPARENT_PIXEL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
        scope.querySelectorAll(".index-mobile-img, .index-preview-img").forEach((img) => {
            const s = img.getAttribute("src") || "";
            if (s.includes("placeholder")) {
                img.src = TRANSPARENT_PIXEL;
            }
        });

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
            previewVideoEl.setAttribute("controlsList", "nodownload");
            previewVideoEl.setAttribute("disablePictureInPicture", "true");
            previewVideoEl.setAttribute("oncontextmenu", "return false;");
            previewVideoEl.setAttribute("draggable", "false");
            previewVideoEmbed.appendChild(previewVideoEl);
        }

        // Preview stage click: links to the project page for the currently previewed media
        if (previewStage) {
            previewStage.addEventListener("click", () => {
                if (isMobileLayout()) return;
                const slug = previewStage.dataset.currentSlug;
                const idx = parseInt(previewStage.dataset.currentIdx || "0", 10);
                if (slug) {
                    navigateToProject(slug, idx);
                }
            }, { signal });
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
        // PROJECT NAVIGATION HANDLER
        // ----------------------------------------------------
        const navigateToProject = (slug, slideIndex = 0) => {
            if (!slug) return;
            const cleanSlug = slug.replace(/^\/projects\//, "").replace(/^\//, "").trim();
            if (!cleanSlug) return;

            const safeSlide = Math.max(0, parseInt(slideIndex || 0, 10));

            // Save mobile accordion & scroll state when navigating to project detail
            try {
                if (isMobileLayout() && activeMobileRow) {
                    const openSlug = getProjectSlug(activeMobileRow);
                    const activeBtn = activeMobileRow.querySelector(".index-media-mobile .index-media-item.is-active");
                    const activeIdx = activeBtn ? parseInt(activeBtn.getAttribute("data-media-idx") || "0", 10) : safeSlide;
                    sessionStorage.setItem("mg_index_restore_slug", openSlug);
                    sessionStorage.setItem("mg_index_restore_slide", String(activeIdx));
                }
                sessionStorage.setItem("mg_index_restore_scroll", String(window.scrollY || window.pageYOffset || 0));
                sessionStorage.setItem("mg_index_restore_from_detail", "true");
            } catch (_) { }

            // Store target slide in sessionStorage (0-based)
            try {
                sessionStorage.setItem("mg_target_slide", String(safeSlide));
            } catch (_) { }

            // Target URL (1-based query parameter for human-readable URLs)
            const targetUrl = safeSlide > 0 ? `/projects/${cleanSlug}?slide=${safeSlide + 1}` : `/projects/${cleanSlug}`;

            if (typeof barba !== "undefined" && barba.go) {
                if (barba.transitions && barba.transitions.isRunning) {
                    setTimeout(() => {
                        if (barba.transitions && !barba.transitions.isRunning) {
                            try { barba.go(targetUrl); return; } catch (_) { }
                        }
                        window.location.href = targetUrl;
                    }, 100);
                    return;
                }
                try {
                    barba.go(targetUrl);
                    return;
                } catch (err) {
                    console.warn("[Index] barba.go failed:", err);
                }
            }
            window.location.href = targetUrl;
        };

        // ----------------------------------------------------
        // DESKTOP PREVIEW CONTROLLER
        // ----------------------------------------------------
        const showDesktopPreview = (media, slug) => {
            if (!previewStage || isMobileLayout() || window.__mgIsTransitioning) return;

            if (slug) previewStage.dataset.currentSlug = slug;
            if (media && media.idx !== undefined) previewStage.dataset.currentIdx = String(media.idx);

            // 1. Always display the thumbnail/poster image first
            const posterSrc = media.poster || media.imgSrc;
            if (previewImg && posterSrc) {
                previewImg.removeAttribute("srcset");
                previewImg.removeAttribute("sizes");
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
            delete previewStage.dataset.currentSlug;
            delete previewStage.dataset.currentIdx;

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
            if (!row || !media) return;
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
                mobileVideoEl.setAttribute("controlsList", "nodownload");
                mobileVideoEl.setAttribute("disablePictureInPicture", "true");
                mobileVideoEl.setAttribute("oncontextmenu", "return false;");
                mobileVideoEl.setAttribute("draggable", "false");
                mobileVideoEmbed.appendChild(mobileVideoEl);
            }

            // 1. Always display thumbnail/poster immediately
            const posterSrc = media.poster || media.imgSrc;
            if (mobileImg && posterSrc) {
                mobileImg.removeAttribute("srcset");
                mobileImg.removeAttribute("sizes");
                mobileImg.src = posterSrc;
                mobileImg.style.display = "block";
                mobileImg.style.opacity = "1";
                mobileImg.style.visibility = "visible";
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
                                if (p && typeof p.catch === "function") p.catch(() => { });
                            }
                        };

                        mobileVideoEl.load();
                    }

                    if (mobileVideoEmbed) {
                        mobileVideoEmbed.style.display = "block";
                    }

                    const tryPlay = () => {
                        const playPromise = mobileVideoEl.play();
                        if (playPromise && typeof playPromise.catch === "function") {
                            playPromise.catch(() => {
                                const onCanPlay = () => {
                                    mobileVideoEl.removeEventListener("canplay", onCanPlay);
                                    mobileVideoEl.removeEventListener("loadeddata", onCanPlay);
                                    mobileVideoEl.play().catch(() => { });
                                };
                                mobileVideoEl.addEventListener("canplay", onCanPlay, { once: true });
                                mobileVideoEl.addEventListener("loadeddata", onCanPlay, { once: true });
                            });
                        }
                    };

                    if (window.__mgIsTransitioning) {
                        window.addEventListener("mg-transition-complete", tryPlay, { once: true });
                    } else {
                        tryPlay();
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
            const slug = getProjectSlug(row);

            // 1. Desktop buttons
            const desktopMediaContainer = row.querySelector(".index-media-desktop");
            if (desktopMediaContainer) {
                const currentActiveIdx = desktopMediaContainer.querySelector(".index-media-item.is-active")?.getAttribute("data-media-idx");
                const activeIdxNum = currentActiveIdx ? parseInt(currentActiveIdx, 10) : (row.classList.contains("is-hovered") ? 0 : -1);

                desktopMediaContainer.innerHTML = "";
                mediaList.forEach((media, mIdx) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `index-media-item${mIdx === activeIdxNum ? " is-active" : ""}`;
                    btn.textContent = media.label;
                    btn.setAttribute("data-media-idx", String(mIdx));
                    btn.setAttribute("aria-label", `Show media ${media.label}`);

                    btn.addEventListener("pointerenter", (e) => {
                        e.stopPropagation();
                        if (isAppearAnimating || row.closest(".index-list")?.classList.contains("is-appearing")) return;
                        desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b) => b.classList.remove("is-active"));
                        btn.classList.add("is-active");
                        showDesktopPreview(media, slug);
                    }, { signal: signalToUse });

                    btn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (slug) {
                            navigateToProject(slug, mIdx);
                        }
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
        // ASYNC HYDRATION (FETCH PROJECT DETAIL PAGE)
        // ----------------------------------------------------
        async function hydrateProjectMedia(row, slug, projectNum) {
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
                            const video = slide.querySelector("video");
                            let imgSrc = img?.getAttribute("src") || img?.getAttribute("data-src") || "";
                            if (!imgSrc && img?.getAttribute("srcset")) {
                                imgSrc = img.getAttribute("srcset").split(",")[0].trim().split(" ")[0];
                            }
                            const posterAttr = img?.getAttribute("poster") || video?.getAttribute("poster") || "";
                            if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

                            const videoId = findVideoIdInItem(slide);
                            const poster = imgSrc || posterAttr || (videoId ? getBunnyThumbnailUrl(videoId) : "");

                            return {
                                label: `${projectNum}-${padTwoDigits(idx + 1)}`,
                                idx,
                                imgSrc: imgSrc || posterAttr,
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

            // Synchronize the row with authoritative project detail media
            if (fullMedia && fullMedia.length > 0) {
                buildMediaButtons(row, fullMedia, signal);

                // If this row is currently the active expanded mobile row, re-sync active preview
                if (activeMobileRow === row) {
                    const activeBtn = row.querySelector(".index-media-mobile .index-media-item.is-active");
                    const aIdx = activeBtn ? parseInt(activeBtn.getAttribute("data-media-idx") || "0", 10) : 0;
                    selectMobileMedia(row, fullMedia[aIdx] || fullMedia[0]);
                }
            }
        }

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
                if (isAppearAnimating || list.classList.contains("is-appearing")) return;
                list.classList.add("has-hovered-item");
                row.classList.add("is-hovered");

                const slug = getProjectSlug(row);
                const desktopMediaContainer = row.querySelector(".index-media-desktop");
                const currentMedia = row._mediaItems || [];

                if (desktopMediaContainer && currentMedia.length) {
                    const hoveredBtn = desktopMediaContainer.querySelector(".index-media-item:hover");
                    const targetIdx = hoveredBtn ? parseInt(hoveredBtn.getAttribute("data-media-idx") || "0", 10) : 0;
                    const safeIdx = (targetIdx >= 0 && targetIdx < currentMedia.length) ? targetIdx : 0;

                    desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b, idx) => {
                        b.classList.toggle("is-active", idx === safeIdx);
                    });

                    showDesktopPreview(currentMedia[safeIdx], slug);
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

            // If cursor moves back from media buttons to the name or title on this line, re-highlight 1st image
            const nameStack = row.querySelector(".index-details-stack");
            const titleCol = row.querySelector(".index-col-title");
            const reHighlightFirstMedia = () => {
                if (isMobileLayout()) return;
                if (isAppearAnimating || list.classList.contains("is-appearing")) return;
                const desktopMediaContainer = row.querySelector(".index-media-desktop");
                const currentMedia = row._mediaItems || [];
                const slug = getProjectSlug(row);
                if (!desktopMediaContainer || !currentMedia.length) return;

                desktopMediaContainer.querySelectorAll(".index-media-item").forEach((b, idx) => {
                    b.classList.toggle("is-active", idx === 0);
                });
                showDesktopPreview(currentMedia[0], slug);
            };

            if (nameStack) nameStack.addEventListener("pointerenter", reHighlightFirstMedia, { signal });
            if (titleCol) titleCol.addEventListener("pointerenter", reHighlightFirstMedia, { signal });

            // Row Click Handler: Mobile accordion expand/collapse OR Desktop project link (opens image 01)
            const rowHeader = row.querySelector(".index-row-header") || row;
            rowHeader.addEventListener("click", (e) => {
                if (isMobileLayout()) {
                    if (e.target.closest("a")) return;
                    if (e.target.closest(".index-row-drawer")) return;

                    if (row.classList.contains("is-expanded")) {
                        collapseRow(row);
                    } else {
                        expandRow(row);
                    }
                    return;
                }

                // Desktop Click: Clicking the name or any part of the line opens image 01
                if (e.target.closest("a")) return;
                if (e.target.closest(".index-media-desktop")) return; // Individual media buttons handle their own click

                const slug = getProjectSlug(row);
                if (slug) {
                    navigateToProject(slug, 0);
                }
            }, { signal });

            // Mobile Media Box Click: links to project detail opening the active mobile media
            const mobileMediaBox = row.querySelector(".index-mobile-media-box");
            if (mobileMediaBox) {
                mobileMediaBox.addEventListener("click", (e) => {
                    if (!isMobileLayout()) return;
                    e.stopPropagation();
                    const slug = getProjectSlug(row);
                    const activeBtn = row.querySelector(".index-media-mobile .index-media-item.is-active");
                    const activeIdx = activeBtn ? parseInt(activeBtn.getAttribute("data-media-idx") || "0", 10) : 0;
                    if (slug) {
                        navigateToProject(slug, activeIdx);
                    }
                }, { signal });
            }

            // ----------------------------------------------------
            // ASYNC HYDRATION (> 5 ITEMS)
            // Fetch project detail page to bypass Webflow's 5-item nested cap
            // ----------------------------------------------------
            const projectSlug = getProjectSlug(row);
            if (projectSlug) {
                hydrateProjectMedia(row, projectSlug, projectNum);
            }
        });

        // ----------------------------------------------------
        // RESTORE SAVED STATE (MOBILE ACCORDION & SCROLL)
        // ----------------------------------------------------
        if (isRestoring && isMobileLayout() && restoreSlug) {
            const targetRow = rows.find((r) => getProjectSlug(r) === restoreSlug);
            if (targetRow) {
                activeMobileRow = targetRow;
                targetRow.classList.add("is-expanded");
                list.classList.add("has-active-mobile");

                const drawer = targetRow.querySelector(".index-row-drawer");
                if (drawer) {
                    drawer.style.height = "auto";
                    drawer.style.opacity = "1";
                    drawer.style.pointerEvents = "auto";
                }

                const cached = projectMediaCache.get(restoreSlug);
                if (cached && cached.length) {
                    targetRow._mediaItems = cached;
                    buildMediaButtons(targetRow, cached, signal);
                }

                const rowMedia = targetRow._mediaItems || [];
                const safeSlide = (restoreSlide >= 0 && restoreSlide < rowMedia.length) ? restoreSlide : 0;
                if (rowMedia.length) {
                    selectMobileMedia(targetRow, rowMedia[safeSlide] || rowMedia[0]);
                }
            }
        }

        if (isRestoring && restoreScroll !== null && !isNaN(restoreScroll) && restoreScroll > 0) {
            if (scope && scope.style.position === "fixed") {
                scope.scrollTop = restoreScroll;
            }
            window.scrollTo(0, restoreScroll);
            if (window.lenis && typeof window.lenis.scrollTo === "function") {
                try { window.lenis.scrollTo(restoreScroll, { immediate: true }); } catch (_) { }
            }
            requestAnimationFrame(() => {
                window.scrollTo(0, restoreScroll);
                if (window.lenis && typeof window.lenis.scrollTo === "function") {
                    try { window.lenis.scrollTo(restoreScroll, { immediate: true }); } catch (_) { }
                }
            });
            setTimeout(() => {
                window.scrollTo(0, restoreScroll);
                if (window.lenis && typeof window.lenis.scrollTo === "function") {
                    try { window.lenis.scrollTo(restoreScroll, { immediate: true }); } catch (_) { }
                }
            }, 50);
            setTimeout(() => {
                window.scrollTo(0, restoreScroll);
                if (window.lenis && typeof window.lenis.scrollTo === "function") {
                    try { window.lenis.scrollTo(restoreScroll, { immediate: true }); } catch (_) { }
                }
            }, 200);
        }

        // Clean up the one-time restoration flag once restoration is initiated
        if (isRestoreFromDetail) {
            try {
                sessionStorage.removeItem("mg_index_restore_from_detail");
                sessionStorage.removeItem("mg_index_restore_slug");
                sessionStorage.removeItem("mg_index_restore_slide");
                sessionStorage.removeItem("mg_index_restore_scroll");
            } catch (_) { }
        }

        // Window resize handler: collapse mobile drawer if transitioning to desktop, or clean desktop hover if transitioning to mobile
        let resizeMarqueeTimer = null;
        window.addEventListener("resize", () => {
            if (isMobileLayout()) {
                hideDesktopPreview();
                list.classList.remove("has-hovered-item");
                list.querySelectorAll(".index-row.is-hovered").forEach((r) => r.classList.remove("is-hovered"));
            } else if (activeMobileRow) {
                collapseRow(activeMobileRow);
            }
            clearTimeout(resizeMarqueeTimer);
            resizeMarqueeTimer = setTimeout(() => {
                if (!isAppearAnimating) {
                    setupIndexMarquees(list);
                }
            }, 150);
        }, { signal, passive: true });

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (!isAppearAnimating) {
                    setupIndexMarquees(list);
                }
            }).catch(() => { });
        }

        // Transition completion: ensure active mobile media preview is fully rendered
        window.addEventListener("mg-transition-complete", (e) => {
            if (e.detail?.namespace === "index" || !e.detail?.namespace) {
                if (isMobileLayout() && activeMobileRow) {
                    const currentMedia = activeMobileRow._mediaItems || [];
                    const activeBtn = activeMobileRow.querySelector(".index-media-mobile .index-media-item.is-active");
                    const aIdx = activeBtn ? parseInt(activeBtn.getAttribute("data-media-idx") || "0", 10) : 0;
                    if (currentMedia.length && currentMedia[aIdx]) {
                        selectMobileMedia(activeMobileRow, currentMedia[aIdx]);
                    }
                }
            }
        }, { signal });
    }

    // ----------------------------------------------------
    // CLEANUP & TEARDOWN
    // ----------------------------------------------------
    function destroyIndex() {
        killIndexMarquees();
        if (appearTimeline) {
            appearTimeline.kill();
            appearTimeline = null;
        }
        isAppearAnimating = false;

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
            const list = indexScope.querySelector(".index-list");
            if (list && typeof gsap !== "undefined") {
                const allTargets = list.querySelectorAll(".index-col-num, .index-client-wrap, .index-title-wrap, .index-col-client, .index-col-title");
                if (allTargets.length) {
                    gsap.set(allTargets, { clearProps: "transform,opacity" });
                }
            }

            indexScope._isIndexMounted = false;
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

    // Auto-boot if page loaded directly
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            const container = document.querySelector('[data-barba="container"][data-barba-namespace="index"]') || document.querySelector(".index-section");
            if (container && !container._isIndexMounted) {
                initIndex(container);
            }
        });
    } else {
        const container = document.querySelector('[data-barba="container"][data-barba-namespace="index"]') || document.querySelector(".index-section");
        if (container && !container._isIndexMounted) {
            initIndex(container);
        }
    }
})();
