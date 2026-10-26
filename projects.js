/**
 * Milena Gorum - Projects Overview Engine (Complete Studio Logic)
 * Hosted on Cloudflare Pages (projects.js)
 */

(function () {
    let projectsRafId = null;
    let projectsAbortController = null;

    function initProjects(container) {
        const scope = container || document.querySelector(".projects-section") || document;
        const section = scope.classList?.contains("projects-section") ? scope : scope.querySelector(".projects-section");
        const trackWrapper = scope.querySelector(".projects-track-wrapper");
        const track = scope.querySelector(".projects-track");
        const btnPlus = scope.querySelector(".btn-zoom-in") || document.querySelector(".btn-zoom-in");
        const btnMinus = scope.querySelector(".btn-zoom-out") || document.querySelector(".btn-zoom-out");
        const resetLinks = scope.querySelectorAll(".nav-reset-scale");
        const subFilterList = scope.querySelector(".sub-filter-list") || document.querySelector(".sub-filter-list");

        if (!section || !track || !trackWrapper) return;

        destroyProjects();
        projectsAbortController = new AbortController();
        const { signal } = projectsAbortController;

        const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";
        const PREVIEW_FILENAME = "preview_hq.mp4";
        const MAX_WARM_VIDEOS = 3;
        const warmVideoPool = [];

        const getBunnyPreviewUrl = (input) => {
            if (!input) return "";
            const trimmed = input.trim();
            const idMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            const videoId = idMatch ? idMatch[0] : trimmed;
            if (trimmed.startsWith("http") && !idMatch) {
                return trimmed.replace(/play_\d+p\.mp4/i, PREVIEW_FILENAME);
            }
            return `${BUNNY_STREAM_BASE}/${videoId}/${PREVIEW_FILENAME}`;
        };

        const registerWarmVideo = (videoEl) => {
            const existingIdx = warmVideoPool.indexOf(videoEl);
            if (existingIdx !== -1) warmVideoPool.splice(existingIdx, 1);
            warmVideoPool.push(videoEl);

            while (warmVideoPool.length > MAX_WARM_VIDEOS) {
                const oldestVideo = warmVideoPool.shift();
                if (oldestVideo && oldestVideo !== videoEl) {
                    oldestVideo.pause();
                    oldestVideo.removeAttribute("src");
                    oldestVideo.load();
                }
            }
        };

        const TABLET_PORTRAIT_BREAKPOINT = 1024;
        const isMobileLayout = () => window.innerWidth <= TABLET_PORTRAIT_BREAKPOINT;

        const STORAGE_KEY = "mg_projects_card_vh";
        const DEFAULT_VH = 50;
        const MAX_VH = 75;
        const MIN_VH = 15;
        const MIN_DETAIL_THRESHOLD = 18;
        const BASE_MARQUEE_SPEED = 0.55;
        const MARQUEE_DECEL_RATE = 0.16;
        const MARQUEE_ACCEL_RATE = 0.16;
        const DRAG_LERP_FACTOR = 0.11;
        const WHEEL_SMOOTH_STAGE1 = 0.16;
        const WHEEL_SMOOTH_STAGE2 = 0.09;
        const MIN_LOOP_THRESHOLD = 3;

        const ZOOM_DURATION = 650;
        const HOLD_SPEED_RATE = 0.009;
        const ZOOM_EASING = (t) => 1 - (1 - t) * (1 - t);

        const INITIAL_LEFT_OFFSET_VW = 0;
        const getInitialStartOffset = () => Math.round(window.innerWidth * INITIAL_LEFT_OFFSET_VW);

        const ZOOM_LEVELS = [15, 26.67, 38.33, 50, 62.5, 75];

        const savedVh = parseFloat(sessionStorage.getItem(STORAGE_KEY));
        let currentVh = !isNaN(savedVh) ? Math.max(MIN_VH, Math.min(MAX_VH, savedVh)) : DEFAULT_VH;
        let targetVh = currentVh;
        let zoomStartVh = currentVh;
        let zoomStartTime = 0;
        let isZoomAnimating = false;

        const formatNum = (str) => {
            const clean = (str || "").trim();
            if (!clean) return "";
            const num = parseInt(clean, 10);
            return !isNaN(num) ? String(num).padStart(2, "0") : clean;
        };

        const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const getValidVideo = (card) => {
            const embed = card.querySelector(".project-video-embed");
            if (!embed || embed.classList.contains("w-condition-invisible")) return null;
            const video = embed.querySelector(".project-preview-video");
            const rawVal = video?.getAttribute("data-video-id")?.trim() || "";
            return rawVal ? video : null;
        };

        const lockNaturalAspect = (img, wrap, callback) => {
            if (!img || !wrap) return;
            const apply = () => {
                if (img.naturalWidth && img.naturalHeight) {
                    wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    if (callback) callback();
                }
            };
            if (img.complete && img.naturalWidth) {
                apply();
            } else {
                img.addEventListener("load", apply, { once: true });
            }
        };

        const seenProjectKeys = new Set();
        const rawCards = Array.from(track.children).filter((el) => {
            if (!el.classList.contains("project-card") && !el.classList.contains("w-dyn-item")) return false;
            if (el.getAttribute("aria-hidden") === "true") return false;

            const linkHref = el.querySelector(".project-link")?.getAttribute("href") || "";
            const numText = el.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
            const clientText = el.querySelector(".project-client")?.textContent?.trim() || "";
            const uniqueKey = `${linkHref}|${numText}|${clientText}`;

            if (seenProjectKeys.has(uniqueKey)) return false;
            seenProjectKeys.add(uniqueKey);
            el.dataset.uniqueKey = uniqueKey;
            return true;
        });

        rawCards.forEach((card) => {
            card.classList.add("project-card");
            const numEl = card.querySelector(".project-number-text, .project-num, .project-number");
            if (numEl) numEl.textContent = formatNum(numEl.textContent);

            const nestedTags = Array.from(card.querySelectorAll(".card-sub-tag")).map((el) => el.textContent);
            const attrTags = (card.getAttribute("data-subcategories") || "").split(",");
            const combinedTags = [...nestedTags, ...attrTags];

            card.dataset.normalizedSubs = combinedTags
                .map(normalize)
                .filter(Boolean)
                .join("|");

            const img = card.querySelector(".project-img") || card.querySelector("img");
            const mediaWrap = card.querySelector(".project-media-wrap");
            if (img) {
                img.classList.add("project-img");
                img.setAttribute("draggable", "false");
                img.setAttribute("decoding", "async");
                lockNaturalAspect(img, mediaWrap);
            }

            const video = card.querySelector(".project-preview-video") || card.querySelector("video");
            if (video) {
                video.classList.add("project-preview-video");
                const rawVal = video.getAttribute("data-video-id") || video.getAttribute("data-video-src") || video.getAttribute("src") || "";
                if (rawVal.trim()) {
                    video.setAttribute("data-video-id", rawVal.trim());
                }
                video.removeAttribute("src");
                const sourceEl = video.querySelector("source");
                if (sourceEl) sourceEl.remove();
            }
        });

        const masterCards = rawCards.map((card) => card.cloneNode(true));
        let activeFilteredCount = masterCards.length;
        let isDesktopInfinite = activeFilteredCount > MIN_LOOP_THRESHOLD;
        let isGalleryRevealed = false;
        let userHasInteractedDesktop = false;

        const updateZoomUI = (vh) => {
            document.documentElement.style.setProperty("--card-height", `${vh.toFixed(2)}vh`);
            section.classList.toggle("is-min-size", vh <= MIN_DETAIL_THRESHOLD);
            if (btnPlus) btnPlus.classList.toggle("is-disabled", vh >= MAX_VH - 0.2);
            if (btnMinus) btnMinus.classList.toggle("is-disabled", vh <= MIN_VH + 0.2);
        };

        updateZoomUI(currentVh);

        resetLinks.forEach((link) => {
            link.addEventListener("click", () => {
                sessionStorage.removeItem(STORAGE_KEY);
                zoomStartVh = currentVh;
                targetVh = DEFAULT_VH;
                zoomStartTime = performance.now();
                isZoomAnimating = true;
            }, { signal });
        });

        let holdDirection = 0;
        let holdStartTime = 0;
        let isHolding = false;

        const triggerSteppedZoom = (dir) => {
            if (isMobileLayout()) return;
            if (dir > 0) {
                const next = ZOOM_LEVELS.find((lvl) => lvl > targetVh + 0.3);
                targetVh = next !== undefined ? next : MAX_VH;
            } else {
                const prev = [...ZOOM_LEVELS].reverse().find((lvl) => lvl < targetVh - 0.3);
                targetVh = prev !== undefined ? prev : MIN_VH;
            }

            zoomStartVh = currentVh;
            zoomStartTime = performance.now();
            isZoomAnimating = true;
            sessionStorage.setItem(STORAGE_KEY, targetVh.toFixed(2));
        };

        const bindZoomButton = (btn, dir) => {
            if (!btn) return;
            const startHold = (e) => {
                if (isMobileLayout()) return;
                e.preventDefault();
                holdDirection = dir;
                holdStartTime = performance.now();
                isHolding = false;
            };

            const endHold = () => {
                if (holdDirection !== dir) return;
                const elapsed = performance.now() - holdStartTime;
                if (elapsed < 180 && !isHolding) {
                    triggerSteppedZoom(dir);
                } else {
                    sessionStorage.setItem(STORAGE_KEY, targetVh.toFixed(2));
                }
                holdDirection = 0;
                isHolding = false;
            };

            btn.addEventListener("pointerdown", startHold, { signal });
            window.addEventListener("pointerup", endHold, { signal });
            window.addEventListener("pointercancel", endHold, { signal });
            btn.addEventListener("mouseleave", endHold, { signal });
        };

        bindZoomButton(btnPlus, 1);
        bindZoomButton(btnMinus, -1);

        let currentMarqueeSpeed = BASE_MARQUEE_SPEED;
        let isTrackHovered = false;
        let isDragging = false;
        let isWheelActive = false;
        let wheelIdleTimer = null;
        let dragMovedDist = 0;
        let startPointerX = 0;
        let lastPointerX = 0;

        let scrollPos = 0;
        let targetPos = 0;
        let rawTargetPos = 0;
        let singleSetWidth = 0;
        let minBoundedScroll = 0;
        let maxBoundedScroll = 0;
        let trackCards = [];
        let cachedCardMetrics = [];
        let hoveredCardIndex = -1;
        let lastFrameTime = performance.now();
        let renderedTrackPos = null;

        const getInitialScrollPos = () => {
            if (isDesktopInfinite) {
                return Math.max(0, singleSetWidth - getInitialStartOffset());
            }
            return 0;
        };

        const measureDesktopMetrics = () => {
            const total = trackCards.length;
            if (total === 0 || activeFilteredCount === 0) {
                singleSetWidth = 0;
                minBoundedScroll = 0;
                maxBoundedScroll = 0;
                cachedCardMetrics = [];
                return;
            }

            const prevSetWidth = singleSetWidth;
            cachedCardMetrics = new Array(total);

            for (let i = 0; i < total; i++) {
                const card = trackCards[i];
                const left = card.offsetLeft;
                const width = card.offsetWidth;
                const header = card.querySelector(".project-header");
                const clientEl = card.querySelector(".project-client") || card.querySelector(".project-number-text, .project-num, .project-number");

                const fullHeaderWidth = header ? header.offsetWidth : 0;
                const baseHeaderWidth = clientEl ? clientEl.offsetLeft + clientEl.offsetWidth : fullHeaderWidth;

                cachedCardMetrics[i] = {
                    left,
                    width,
                    baseHeaderWidth,
                    fullHeaderWidth
                };
            }

            if (isDesktopInfinite && total > activeFilteredCount) {
                singleSetWidth = cachedCardMetrics[activeFilteredCount].left - cachedCardMetrics[0].left;
                minBoundedScroll = 0;
                maxBoundedScroll = 0;

                if (!isGalleryRevealed && singleSetWidth > 0) {
                    const initPos = getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                } else if (prevSetWidth > 0 && singleSetWidth > 0 && Math.abs(singleSetWidth - prevSetWidth) > 0.5) {
                    if (userHasInteractedDesktop) {
                        const ratio = singleSetWidth / prevSetWidth;
                        scrollPos *= ratio;
                        targetPos *= ratio;
                        rawTargetPos *= ratio;
                    } else {
                        const initPos = getInitialScrollPos();
                        scrollPos = initPos;
                        targetPos = initPos;
                        rawTargetPos = initPos;
                    }
                } else if (prevSetWidth === 0 && singleSetWidth > 0) {
                    const initPos = getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                }
            } else {
                singleSetWidth = 0;
                const lastMetric = cachedCardMetrics[total - 1];
                const totalWidth = lastMetric ? lastMetric.left + lastMetric.width : 0;
                minBoundedScroll = 0;
                maxBoundedScroll = totalWidth > window.innerWidth ? Math.max(0, totalWidth - window.innerWidth + 24) : 0;
            }
        };

        const checkHeaderCollisions = () => {
            const total = trackCards.length;
            if (total === 0 || cachedCardMetrics.length !== total) return;

            for (let i = 0; i < total; i++) {
                trackCards[i].classList.remove("is-label-occluded");
            }

            if (currentVh <= MIN_DETAIL_THRESHOLD) return;

            for (let i = 0; i < total; i++) {
                const card = trackCards[i];
                if (card.classList.contains("is-label-occluded")) continue;

                const metric = cachedCardMetrics[i];
                const visibleWidth = i === hoveredCardIndex ? metric.fullHeaderWidth : metric.baseHeaderWidth;
                const headerRightEdge = metric.left + visibleWidth;

                for (let j = i + 1; j < Math.min(i + 5, total); j++) {
                    if (headerRightEdge + 10 > cachedCardMetrics[j].left) {
                        trackCards[j].classList.add("is-label-occluded");
                    } else {
                        break;
                    }
                }
            }
        };

        const startHoverVideo = (card) => {
            if (isWheelActive || isDragging) return;
            const video = getValidVideo(card);
            if (!video) return;

            const rawVal = video.getAttribute("data-video-id");
            const previewSrc = getBunnyPreviewUrl(rawVal);
            if (!previewSrc) return;

            registerWarmVideo(video);

            if (video.getAttribute("src") !== previewSrc) {
                video.setAttribute("src", previewSrc);
                video.load();
            }

            if (video.readyState >= 2) {
                card.classList.add("is-video-playing");
            } else {
                const onPlaying = () => {
                    if (card.classList.contains("is-hovered")) {
                        card.classList.add("is-video-playing");
                    }
                };
                video.addEventListener("playing", onPlaying, { once: true });
            }

            video.muted = true;
            video.loop = true;
            const playPromise = video.play();
            if (playPromise !== undefined) playPromise.catch(() => { });
        };

        const stopHoverVideo = (card) => {
            card.classList.remove("is-video-playing");
            const video = getValidVideo(card);
            if (!video) return;
            if (!video.paused) video.pause();
            video.currentTime = 0;
        };

        let metricRecalcScheduled = false;
        const scheduleMetricsRecalc = () => {
            if (metricRecalcScheduled) return;
            metricRecalcScheduled = true;
            requestAnimationFrame(() => {
                metricRecalcScheduled = false;
                measureDesktopMetrics();
                checkHeaderCollisions();
                track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
            });
        };

        const bindDesktopCard = (card, cardIdx) => {
            const img = card.querySelector(".project-img");
            const mediaWrap = card.querySelector(".project-media-wrap");
            if (img && mediaWrap) {
                lockNaturalAspect(img, mediaWrap, scheduleMetricsRecalc);
            }

            card.addEventListener("mouseenter", () => {
                if (isWheelActive || isDragging) return;
                hoveredCardIndex = cardIdx;
                track.classList.add("is-hovering-card");
                card.classList.add("is-hovered");
                checkHeaderCollisions();
                startHoverVideo(card);
            }, { signal });

            card.addEventListener("mouseleave", () => {
                if (hoveredCardIndex === cardIdx) hoveredCardIndex = -1;
                card.classList.remove("is-hovered");
                stopHoverVideo(card);
                if (hoveredCardIndex === -1) {
                    track.classList.remove("is-hovering-card");
                }
                checkHeaderCollisions();
            }, { signal });

            const link = card.querySelector(".project-link");
            if (link) {
                link.addEventListener("click", (e) => {
                    if (dragMovedDist > 6) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }, { signal });
            }
        };

        const buildDesktopLoop = (filteredTemplates) => {
            track.innerHTML = "";
            trackCards = [];
            cachedCardMetrics = [];
            hoveredCardIndex = -1;
            warmVideoPool.length = 0;
            singleSetWidth = 0;
            userHasInteractedDesktop = false;

            const count = filteredTemplates.length;
            if (count === 0) {
                isDesktopInfinite = false;
                track.classList.remove("is-no-loop");
                minBoundedScroll = 0;
                maxBoundedScroll = 0;
                scrollPos = 0;
                targetPos = 0;
                rawTargetPos = 0;
                currentMarqueeSpeed = 0;
                track.style.transform = "translate3d(0px, 0, 0)";
                return;
            }

            isDesktopInfinite = count > MIN_LOOP_THRESHOLD;
            track.classList.toggle("is-no-loop", !isDesktopInfinite);

            const setsNeeded = isDesktopInfinite ? Math.max(4, Math.ceil(40 / count) + 2) : 1;
            const fragment = document.createDocumentFragment();
            let globalIdx = 0;

            for (let s = 0; s < setsNeeded; s++) {
                filteredTemplates.forEach((tpl, tplIdx) => {
                    const clone = tpl.cloneNode(true);
                    if (s > 0) clone.setAttribute("aria-hidden", "true");
                    const isVisibleInitial = (s === 1 || (!isDesktopInfinite && s === 0)) && tplIdx < 4;
                    if (s === 1 || (!isDesktopInfinite && s === 0)) {
                        clone.setAttribute("data-initial-visible", "true");
                    }
                    const img = clone.querySelector(".project-img") || clone.querySelector("img");
                    if (img) {
                        img.setAttribute("loading", isVisibleInitial ? "eager" : "lazy");
                        img.setAttribute("decoding", "async");
                    }
                    bindDesktopCard(clone, globalIdx);
                    fragment.appendChild(clone);
                    trackCards.push(clone);
                    globalIdx += 1;
                });
            }

            track.appendChild(fragment);
            measureDesktopMetrics();

            const initPos = getInitialScrollPos();
            scrollPos = initPos;
            targetPos = initPos;
            rawTargetPos = initPos;
            if (!isDesktopInfinite) {
                currentMarqueeSpeed = 0;
            }
            track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;

            requestAnimationFrame(() => {
                measureDesktopMetrics();
                if (!userHasInteractedDesktop) {
                    const refreshedInitPos = getInitialScrollPos();
                    scrollPos = refreshedInitPos;
                    targetPos = refreshedInitPos;
                    rawTargetPos = refreshedInitPos;
                }
                checkHeaderCollisions();
                track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
            });
        };

        trackWrapper.addEventListener("mouseenter", () => {
            isTrackHovered = true;
        }, { signal });

        trackWrapper.addEventListener("mouseleave", () => {
            isTrackHovered = false;
            hoveredCardIndex = -1;
            track.classList.remove("is-hovering-card");
            trackCards.forEach((c) => {
                if (c.classList.contains("is-hovered")) {
                    c.classList.remove("is-hovered");
                    stopHoverVideo(c);
                }
            });
            checkHeaderCollisions();
        }, { signal });

        window.addEventListener(
            "wheel",
            (e) => {
                if (isMobileLayout()) return;
                if (e.ctrlKey || e.metaKey) return;

                e.preventDefault();
                userHasInteractedDesktop = true;

                if (!isDesktopInfinite && maxBoundedScroll <= minBoundedScroll) return;

                let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (e.deltaMode === 1) delta *= 32;
                else if (e.deltaMode === 2) delta *= window.innerHeight;
                if (Math.abs(delta) < 0.2) return;

                const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta), 140);

                if (!isWheelActive) {
                    isWheelActive = true;
                    track.classList.add("is-wheel-scrolling");
                    if (hoveredCardIndex !== -1) {
                        const prevCard = trackCards[hoveredCardIndex];
                        if (prevCard) {
                            prevCard.classList.remove("is-hovered");
                            stopHoverVideo(prevCard);
                        }
                        hoveredCardIndex = -1;
                        track.classList.remove("is-hovering-card");
                        checkHeaderCollisions();
                    }
                }

                clearTimeout(wheelIdleTimer);
                wheelIdleTimer = setTimeout(() => {
                    isWheelActive = false;
                    track.classList.remove("is-wheel-scrolling");
                }, 140);

                rawTargetPos += clampedDelta * 0.95;

                if (!isDesktopInfinite) {
                    rawTargetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, rawTargetPos));
                }
            },
            { passive: false, signal }
        );

        trackWrapper.addEventListener("pointerdown", (e) => {
            if (isMobileLayout() || e.button !== 0) return;
            userHasInteractedDesktop = true;
            isDragging = true;
            isWheelActive = false;
            track.classList.remove("is-wheel-scrolling");
            dragMovedDist = 0;
            startPointerX = e.clientX;
            lastPointerX = e.clientX;
            rawTargetPos = targetPos;
            trackWrapper.classList.add("is-dragging");
        }, { signal });

        window.addEventListener("pointermove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastPointerX;
            lastPointerX = e.clientX;
            dragMovedDist = Math.abs(e.clientX - startPointerX);

            if (!isDesktopInfinite && maxBoundedScroll <= minBoundedScroll) return;

            rawTargetPos -= dx * 1.35;
            targetPos = rawTargetPos;

            if (!isDesktopInfinite) {
                rawTargetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, rawTargetPos));
                targetPos = rawTargetPos;
            }
        }, { signal });

        const stopDragging = () => {
            if (!isDragging) return;
            isDragging = false;
            trackWrapper.classList.remove("is-dragging");
        };

        window.addEventListener("pointerup", stopDragging, { signal });
        window.addEventListener("pointercancel", stopDragging, { signal });

        const animateDesktop = (now) => {
            const dt = Math.min(34, Math.max(4, now - lastFrameTime));
            lastFrameTime = now;
            const dtScale = dt / 16.667;

            if (!isMobileLayout()) {
                if (holdDirection !== 0 && now - holdStartTime >= 180) {
                    isHolding = true;
                    isZoomAnimating = false;
                    targetVh = Math.max(
                        MIN_VH,
                        Math.min(MAX_VH, targetVh * (1 + holdDirection * HOLD_SPEED_RATE * dtScale))
                    );
                    currentVh = targetVh;
                    updateZoomUI(currentVh);
                    measureDesktopMetrics();
                    checkHeaderCollisions();
                    sessionStorage.setItem(STORAGE_KEY, targetVh.toFixed(2));
                }
                else if (isZoomAnimating) {
                    const elapsed = now - zoomStartTime;
                    const progress = Math.min(1, elapsed / ZOOM_DURATION);
                    const eased = ZOOM_EASING(progress);

                    currentVh = zoomStartVh + (targetVh - zoomStartVh) * eased;
                    updateZoomUI(currentVh);
                    measureDesktopMetrics();
                    checkHeaderCollisions();

                    if (progress >= 1) {
                        isZoomAnimating = false;
                        currentVh = targetVh;
                        updateZoomUI(currentVh);
                        measureDesktopMetrics();
                        checkHeaderCollisions();
                    }
                }

                if (isDesktopInfinite) {
                    const isPaused = !isGalleryRevealed || isTrackHovered || isDragging || isWheelActive || section.classList.contains("is-marquee-paused");
                    if (section.classList.contains("is-marquee-paused")) {
                        currentMarqueeSpeed = 0;
                        rawTargetPos = scrollPos;
                        targetPos = scrollPos;
                    }
                    const desiredMarqueeSpeed = isPaused ? 0 : BASE_MARQUEE_SPEED;

                    const rate = isPaused ? MARQUEE_DECEL_RATE : MARQUEE_ACCEL_RATE;
                    const speedAlpha = 1 - Math.pow(1 - rate, dtScale);
                    currentMarqueeSpeed += (desiredMarqueeSpeed - currentMarqueeSpeed) * speedAlpha;

                    rawTargetPos += currentMarqueeSpeed * dtScale;

                    if (isDragging) {
                        targetPos = rawTargetPos;
                        const dragAlpha = 1 - Math.pow(1 - DRAG_LERP_FACTOR, dtScale);
                        scrollPos += (targetPos - scrollPos) * dragAlpha;
                    } else {
                        const stage1Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE1, dtScale);
                        const stage2Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE2, dtScale);
                        targetPos += (rawTargetPos - targetPos) * stage1Alpha;
                        scrollPos += (targetPos - scrollPos) * stage2Alpha;
                    }

                    if (singleSetWidth > 0) {
                        if (scrollPos >= singleSetWidth * 2) {
                            scrollPos -= singleSetWidth;
                            targetPos -= singleSetWidth;
                            rawTargetPos -= singleSetWidth;
                        } else if (scrollPos <= 0) {
                            scrollPos += singleSetWidth;
                            targetPos += singleSetWidth;
                            rawTargetPos += singleSetWidth;
                        }
                    }
                } else {
                    currentMarqueeSpeed = 0;
                    rawTargetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, rawTargetPos));
                    const stage1Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE1, dtScale);
                    const stage2Alpha = 1 - Math.pow(1 - 0.12, dtScale);
                    targetPos += (rawTargetPos - targetPos) * stage1Alpha;
                    scrollPos += (targetPos - scrollPos) * stage2Alpha;
                }

                if (renderedTrackPos === null || Math.abs(renderedTrackPos - scrollPos) > 0.02) {
                    track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
                    renderedTrackPos = scrollPos;
                }
            }
        };

        // Mobile Gallery Logic
        const mobileMainEl = scope.querySelector(".mobile-main-swiper");
        const mobileThumbEl = scope.querySelector(".mobile-thumb-swiper");
        const mobileThumbTrack = mobileThumbEl?.querySelector(".swiper-wrapper");
        const mobileClientEl = scope.querySelector(".mobile-client-title");
        const mobileTitleEl = scope.querySelector(".mobile-project-title");

        let mobileMainSwiper = null;
        let mobileFilteredTemplates = [];
        let mobileThumbItems = [];
        let cachedThumbCenters = [];
        let thumbSingleSetWidth = 0;
        let thumbScrollPos = 0;
        let thumbTargetPos = 0;
        let thumbVelocity = 0;

        let isMobileInfinite = true;
        let isThumbTouching = false;
        let isThumbCoasting = false;
        let thumbTouchStartX = 0;
        let thumbLastTouchX = 0;
        let thumbLastTouchTime = 0;
        let thumbDragTotalDist = 0;
        let activeMobileProjectIdx = 0;
        let activeThumbCloneIdx = -1;

        const updateMobileMeta = (projectIdx) => {
            const tpl = mobileFilteredTemplates[projectIdx];
            if (!tpl) return;
            const clientText = tpl.getAttribute("data-client") || tpl.querySelector(".project-client")?.textContent || "";
            const titleText = tpl.getAttribute("data-title") || tpl.querySelector(".project-subtitle")?.textContent || "";
            if (mobileClientEl) mobileClientEl.textContent = clientText;
            if (mobileTitleEl) mobileTitleEl.textContent = titleText;
        };

        const syncMobileVideos = () => {
            if (!mobileMainSwiper || !mobileMainSwiper.slides) return;
            const activeSlideEl = mobileMainSwiper.slides[mobileMainSwiper.activeIndex];

            for (let i = 0; i < mobileMainSwiper.slides.length; i++) {
                const slide = mobileMainSwiper.slides[i];
                const video = slide.querySelector(".mobile-main-video");
                if (!video) continue;

                if (slide === activeSlideEl) {
                    const previewSrc = video.getAttribute("data-preview-src");
                    if (previewSrc) {
                        registerWarmVideo(video);
                        if (video.getAttribute("src") !== previewSrc) {
                            video.setAttribute("src", previewSrc);
                            video.load();
                        }

                        if (video.readyState >= 2) {
                            slide.classList.add("is-video-playing");
                        } else {
                            video.addEventListener("playing", () => {
                                if (mobileMainSwiper && mobileMainSwiper.slides[mobileMainSwiper.activeIndex] === slide) {
                                    slide.classList.add("is-video-playing");
                                }
                            }, { once: true });
                        }

                        video.muted = true;
                        video.defaultMuted = true;
                        video.loop = true;
                        video.playsInline = true;
                        const p = video.play();
                        if (p !== undefined) p.catch(() => { });
                    }
                } else {
                    slide.classList.remove("is-video-playing");
                    if (!video.paused) video.pause();
                    video.currentTime = 0;
                }
            }
        };

        const measureMobileThumbMetrics = () => {
            const count = mobileFilteredTemplates.length;
            const total = mobileThumbItems.length;
            if (!mobileThumbTrack || total === 0 || count === 0) {
                thumbSingleSetWidth = 0;
                cachedThumbCenters = [];
                return;
            }

            if (mobileThumbItems[0].offsetWidth === 0) {
                cachedThumbCenters = [];
                thumbSingleSetWidth = 0;
                return;
            }

            cachedThumbCenters = new Array(total);
            for (let i = 0; i < total; i++) {
                const item = mobileThumbItems[i];
                cachedThumbCenters[i] = item.offsetLeft + item.offsetWidth / 2;
            }

            if (isMobileInfinite && total > count) {
                thumbSingleSetWidth = mobileThumbItems[count].offsetLeft - mobileThumbItems[0].offsetLeft;
            } else {
                thumbSingleSetWidth = 0;
            }
        };

        const getScrollPosForThumbIdx = (idx) => {
            if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();
            if (idx < 0 || idx >= cachedThumbCenters.length) return 0;
            return cachedThumbCenters[idx] - window.innerWidth / 2;
        };

        const clampBoundedMobileThumbPos = (pos) => {
            if (isMobileInfinite || cachedThumbCenters.length === 0) return pos;
            const minPos = getScrollPosForThumbIdx(0);
            const maxPos = getScrollPosForThumbIdx(cachedThumbCenters.length - 1);
            return Math.max(minPos, Math.min(maxPos, pos));
        };

        const setActiveThumbByIdx = (cloneIdx, switchMainInstantly) => {
            if (cloneIdx < 0 || cloneIdx >= mobileThumbItems.length) return;
            const thumbEl = mobileThumbItems[cloneIdx];

            if (activeThumbCloneIdx !== cloneIdx) {
                if (activeThumbCloneIdx >= 0 && mobileThumbItems[activeThumbCloneIdx]) {
                    mobileThumbItems[activeThumbCloneIdx].classList.remove("is-active");
                }
                activeThumbCloneIdx = cloneIdx;
                thumbEl.classList.add("is-active");
            }

            const projIdx = parseInt(thumbEl.dataset.projectIdx || "0", 10);
            if (projIdx !== activeMobileProjectIdx) {
                activeMobileProjectIdx = projIdx;
                updateMobileMeta(projIdx);

                if (switchMainInstantly && mobileMainSwiper) {
                    if (isMobileInfinite) {
                        let targetReal = projIdx;
                        for (let i = 0; i < mobileMainSwiper.slides.length; i++) {
                            const s = mobileMainSwiper.slides[i];
                            if (parseInt(s.getAttribute("data-project-idx") || "-1", 10) === projIdx) {
                                targetReal = parseInt(s.getAttribute("data-swiper-slide-index") ?? i, 10);
                                break;
                            }
                        }
                        mobileMainSwiper.slideToLoop(targetReal, 0, false);
                    } else {
                        mobileMainSwiper.slideTo(projIdx, 0, false);
                    }
                    syncMobileVideos();
                }
            }
        };

        const findCenterThumbIdx = () => {
            if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();
            const total = cachedThumbCenters.length;
            if (total === 0) return -1;
            const currentCenterInTrack = thumbScrollPos + window.innerWidth / 2;
            let closestIdx = 0;
            let minDiff = Infinity;

            for (let i = 0; i < total; i++) {
                const diff = Math.abs(cachedThumbCenters[i] - currentCenterInTrack);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                }
            }
            return closestIdx;
        };

        const snapThumbStripToProjectIdx = (targetProjIdx, immediate = false) => {
            const total = mobileThumbItems.length;
            if (total === 0) return;
            if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();

            if (!isMobileInfinite) {
                setActiveThumbByIdx(targetProjIdx, false);
                thumbTargetPos = getScrollPosForThumbIdx(targetProjIdx);
                if (immediate) thumbScrollPos = thumbTargetPos;
                return;
            }

            const currentCenterInTrack = thumbScrollPos + window.innerWidth / 2;
            let bestCloneIdx = -1;
            let minDiff = Infinity;

            for (let i = 0; i < total; i++) {
                const item = mobileThumbItems[i];
                if (parseInt(item.dataset.projectIdx || "-1", 10) === targetProjIdx) {
                    const centerVal = cachedThumbCenters[i] ?? (item.offsetLeft + item.offsetWidth / 2);
                    const diff = Math.abs(centerVal - currentCenterInTrack);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestCloneIdx = i;
                    }
                }
            }

            if (bestCloneIdx !== -1) {
                setActiveThumbByIdx(bestCloneIdx, false);
                thumbTargetPos = getScrollPosForThumbIdx(bestCloneIdx);
                if (immediate) thumbScrollPos = thumbTargetPos;
            }
        };

        const buildMobileGallery = (filteredTemplates) => {
            if (!mobileMainEl || !mobileThumbEl || !mobileThumbTrack) return;

            mobileFilteredTemplates = filteredTemplates;
            mobileThumbItems = [];
            cachedThumbCenters = [];
            activeMobileProjectIdx = 0;
            activeThumbCloneIdx = -1;

            if (mobileMainSwiper) {
                mobileMainSwiper.destroy(true, true);
                mobileMainSwiper = null;
            }

            const mainWrapper = mobileMainEl.querySelector(".swiper-wrapper");
            if (!mainWrapper) return;

            mainWrapper.innerHTML = "";
            mobileThumbTrack.innerHTML = "";

            const count = filteredTemplates.length;
            if (count === 0) return;

            isMobileInfinite = count > MIN_LOOP_THRESHOLD;
            const mainRepeats = isMobileInfinite && count < 6 ? Math.ceil(6 / count) : 1;

            for (let r = 0; r < mainRepeats; r++) {
                filteredTemplates.forEach((tpl, idx) => {
                    const linkHref = tpl.querySelector(".project-link")?.getAttribute("href") || "#";
                    const imgEl = tpl.querySelector(".project-img") || tpl.querySelector("img");
                    const imgSrc = imgEl?.getAttribute("src") || "";
                    const imgSrcset = imgEl?.getAttribute("srcset") || "";

                    const validVid = getValidVideo(tpl);
                    const rawVidId = validVid?.getAttribute("data-video-id") || "";
                    const previewSrc = rawVidId ? getBunnyPreviewUrl(rawVidId) : "";

                    const mainSlide = document.createElement("div");
                    mainSlide.className = "swiper-slide";
                    mainSlide.setAttribute("data-project-idx", String(idx));
                    mainSlide.innerHTML = `
            <a href="${linkHref}" class="mobile-main-link">
              <div class="mobile-media-box">
                <img src="${imgSrc}" ${imgSrcset ? `srcset="${imgSrcset}"` : ""} decoding="async" alt="" />
                ${previewSrc
                            ? `<video class="mobile-main-video" playsinline webkit-playsinline="true" muted loop preload="none" data-preview-src="${previewSrc}"></video>`
                            : ""
                        }
              </div>
            </a>
          `;

                    const slideImg = mainSlide.querySelector("img");
                    const mediaBox = mainSlide.querySelector(".mobile-media-box");
                    lockNaturalAspect(slideImg, mediaBox);
                    mainWrapper.appendChild(mainSlide);
                });
            }

            if (typeof Swiper !== "undefined") {
                mobileMainSwiper = new Swiper(mobileMainEl, {
                    loop: isMobileInfinite,
                    slidesPerView: 1,
                    spaceBetween: 0,
                    speed: 350,
                    grabCursor: true,
                    observer: true,
                    observeParents: true
                });

                const handleMainSwipeChange = () => {
                    syncMobileVideos();
                    if (isThumbTouching || isThumbCoasting) return;
                    const activeSlide = mobileMainSwiper.slides[mobileMainSwiper.activeIndex];
                    let newProjIdx = activeSlide ? parseInt(activeSlide.getAttribute("data-project-idx") || "-1", 10) : -1;

                    if (newProjIdx < 0 || isNaN(newProjIdx)) {
                        newProjIdx = mobileMainSwiper.realIndex % count;
                    }

                    activeMobileProjectIdx = newProjIdx;
                    updateMobileMeta(newProjIdx);
                    snapThumbStripToProjectIdx(newProjIdx, false);
                };

                mobileMainSwiper.on("slideChange", handleMainSwipeChange);
                mobileMainSwiper.on("transitionStart", handleMainSwipeChange);
            }

            const thumbSetsNeeded = isMobileInfinite ? Math.max(8, Math.ceil(36 / count) + 4) : 1;
            const thumbFragment = document.createDocumentFragment();
            let cloneIdxCounter = 0;

            for (let s = 0; s < thumbSetsNeeded; s++) {
                filteredTemplates.forEach((tpl, idx) => {
                    const imgEl = tpl.querySelector(".project-img") || tpl.querySelector("img");
                    const imgSrc = imgEl?.getAttribute("src") || "";
                    const imgSrcset = imgEl?.getAttribute("srcset") || "";
                    const numText = formatNum(tpl.querySelector(".project-number-text, .project-num, .project-number")?.textContent || "");

                    const item = document.createElement("div");
                    item.className = "mobile-thumb-item";
                    item.dataset.projectIdx = String(idx);
                    item.dataset.cloneIdx = String(cloneIdxCounter);
                    item.innerHTML = `
            <div class="mobile-thumb-num">${numText}</div>
            <div class="mobile-thumb-img-wrap">
              <img src="${imgSrc}" ${imgSrcset ? `srcset="${imgSrcset}" sizes="160px"` : ""} decoding="async" alt="" />
            </div>
          `;

                    const thumbImg = item.querySelector("img");
                    const thumbWrap = item.querySelector(".mobile-thumb-img-wrap");
                    lockNaturalAspect(thumbImg, thumbWrap, () => {
                        measureMobileThumbMetrics();
                        if (!isThumbTouching && !isThumbCoasting && activeThumbCloneIdx >= 0) {
                            thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                            thumbScrollPos = thumbTargetPos;
                        }
                    });

                    thumbFragment.appendChild(item);
                    mobileThumbItems.push(item);
                    cloneIdxCounter += 1;
                });
            }

            mobileThumbTrack.appendChild(thumbFragment);
            updateMobileMeta(0);

            const initialCloneIdx = isMobileInfinite ? Math.floor(thumbSetsNeeded / 2) * count : 0;

            requestAnimationFrame(() => {
                measureMobileThumbMetrics();
                if (mobileThumbItems[initialCloneIdx]) {
                    setActiveThumbByIdx(initialCloneIdx, false);
                    if (cachedThumbCenters.length > 0) {
                        thumbTargetPos = getScrollPosForThumbIdx(initialCloneIdx);
                        thumbScrollPos = thumbTargetPos;
                        mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
                    }
                }
                if (isMobileLayout()) syncMobileVideos();
            });
        };

        if (mobileThumbEl) {
            mobileThumbEl.addEventListener("pointerdown", (e) => {
                if (!isMobileLayout()) return;
                if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();
                isThumbTouching = true;
                isThumbCoasting = false;
                thumbVelocity = 0;
                thumbTouchStartX = e.clientX;
                thumbLastTouchX = e.clientX;
                thumbLastTouchTime = performance.now();
                thumbDragTotalDist = 0;
                thumbTargetPos = thumbScrollPos;
                mobileThumbEl.setPointerCapture?.(e.pointerId);
            }, { signal });

            mobileThumbEl.addEventListener("pointermove", (e) => {
                if (!isThumbTouching) return;
                const now = performance.now();
                const dt = Math.max(1, now - thumbLastTouchTime);
                const dx = e.clientX - thumbLastTouchX;

                thumbLastTouchX = e.clientX;
                thumbLastTouchTime = now;
                thumbDragTotalDist += Math.abs(dx);

                thumbScrollPos = clampBoundedMobileThumbPos(thumbScrollPos - dx);
                thumbTargetPos = thumbScrollPos;
                thumbVelocity = (-dx / dt) * 15;
            }, { signal });

            const endThumbTouch = (e) => {
                if (!isThumbTouching) return;
                isThumbTouching = false;

                if (thumbDragTotalDist < 6) {
                    const tappedItem = document.elementFromPoint(e.clientX, e.clientY)?.closest(".mobile-thumb-item");
                    if (tappedItem && tappedItem.dataset.cloneIdx !== undefined) {
                        const tappedIdx = parseInt(tappedItem.dataset.cloneIdx, 10);
                        isThumbCoasting = false;
                        thumbVelocity = 0;
                        setActiveThumbByIdx(tappedIdx, true);
                        thumbTargetPos = getScrollPosForThumbIdx(tappedIdx);
                        return;
                    }
                }

                if (Math.abs(thumbVelocity) > 1.2) {
                    isThumbCoasting = true;
                } else {
                    isThumbCoasting = false;
                    const centerIdx = findCenterThumbIdx();
                    if (centerIdx !== -1) {
                        setActiveThumbByIdx(centerIdx, true);
                        thumbTargetPos = getScrollPosForThumbIdx(centerIdx);
                    }
                }
            };

            mobileThumbEl.addEventListener("pointerup", endThumbTouch, { signal });
            mobileThumbEl.addEventListener("pointercancel", endThumbTouch, { signal });
        }

        const animateGallery = (now) => {
            animateDesktop(now);

            if (isMobileLayout() && mobileThumbTrack && mobileThumbItems.length > 0) {
                if (cachedThumbCenters.length === 0) {
                    measureMobileThumbMetrics();
                    if (cachedThumbCenters.length > 0 && activeThumbCloneIdx >= 0) {
                        thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                        thumbScrollPos = thumbTargetPos;
                        syncMobileVideos();
                    }
                }

                if (isThumbTouching) {
                    const centerIdx = findCenterThumbIdx();
                    if (centerIdx !== -1) setActiveThumbByIdx(centerIdx, true);
                } else if (isThumbCoasting) {
                    thumbScrollPos = clampBoundedMobileThumbPos(thumbScrollPos + thumbVelocity);
                    thumbTargetPos = thumbScrollPos;
                    thumbVelocity *= 0.90;

                    const centerIdx = findCenterThumbIdx();
                    if (centerIdx !== -1) setActiveThumbByIdx(centerIdx, true);

                    if (Math.abs(thumbVelocity) < 0.8 || !isMobileInfinite) {
                        isThumbCoasting = false;
                        thumbVelocity = 0;
                        if (centerIdx !== -1) {
                            setActiveThumbByIdx(centerIdx, true);
                            thumbTargetPos = getScrollPosForThumbIdx(centerIdx);
                        }
                    }
                } else {
                    thumbScrollPos += (thumbTargetPos - thumbScrollPos) * 0.18;
                }

                if (isMobileInfinite && thumbSingleSetWidth > 0) {
                    const minBound = thumbSingleSetWidth * 2;
                    const maxBound = thumbSingleSetWidth * 5;
                    if (thumbScrollPos > maxBound) {
                        thumbScrollPos -= thumbSingleSetWidth;
                        thumbTargetPos -= thumbSingleSetWidth;
                        const centerIdx = findCenterThumbIdx();
                        if (centerIdx !== -1) setActiveThumbByIdx(centerIdx, false);
                    } else if (thumbScrollPos < minBound) {
                        thumbScrollPos += thumbSingleSetWidth;
                        thumbTargetPos += thumbSingleSetWidth;
                        const centerIdx = findCenterThumbIdx();
                        if (centerIdx !== -1) setActiveThumbByIdx(centerIdx, false);
                    }
                }

                mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
            }

            projectsRafId = requestAnimationFrame(animateGallery);
        };

        // Filter Logic
        const parentFilterBtns = scope.querySelectorAll(".filter-btn");
        const subFilterBtns = scope.querySelectorAll(".sub-btn");
        let activeParent = "all";
        let activeSub = "all";

        const syncSubFilterVisibility = () => {
            if (!subFilterList) return;
            const isParentAll = activeParent === "all";
            subFilterList.classList.toggle("is-visible", !isParentAll);
        };

        const updateAvailableSubFilterButtons = () => {
            if (activeParent === "all") return;
            const availableTags = new Set();
            masterCards.forEach((card) => {
                const type = normalize(card.getAttribute("data-type"));
                if (type === activeParent) {
                    const subs = (card.dataset.normalizedSubs || "").split("|").filter(Boolean);
                    subs.forEach((s) => availableTags.add(s));
                }
            });

            subFilterBtns.forEach((btn) => {
                const rawSub = btn.getAttribute("data-sub") || btn.textContent;
                const normSub = normalize(rawSub);
                if (normSub === "all") {
                    btn.style.display = "";
                    return;
                }
                const itemWrap = btn.closest(".w-dyn-item") || btn;
                const isAvailable = availableTags.has(normSub);
                itemWrap.style.display = isAvailable ? "" : "none";
            });
        };

        const resetSubFilterToAll = () => {
            activeSub = "all";
            subFilterBtns.forEach((b) => {
                const rawSub = b.getAttribute("data-sub") || b.textContent;
                const isAll = normalize(rawSub) === "all";
                b.classList.toggle("is-active", isAll);
            });
        };

        const applyFilters = () => {
            const filteredSeen = new Set();
            const filtered = masterCards.filter((card) => {
                const key = card.dataset.uniqueKey || "";
                if (key && filteredSeen.has(key)) return false;

                const type = normalize(card.getAttribute("data-type"));
                const subs = (card.dataset.normalizedSubs || "").split("|").filter(Boolean);

                const matchParent = activeParent === "all" || type === activeParent;
                const matchSub = activeSub === "all" || subs.includes(activeSub);

                if (matchParent && matchSub) {
                    if (key) filteredSeen.add(key);
                    return true;
                }
                return false;
            });

            activeFilteredCount = filtered.length;
            buildDesktopLoop(filtered);
            buildMobileGallery(filtered);
        };

        parentFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                parentFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawFilter = btn.getAttribute("data-filter") || btn.textContent;
                activeParent = normalize(rawFilter);

                resetSubFilterToAll();
                syncSubFilterVisibility();
                updateAvailableSubFilterButtons();
                applyFilters();
            }, { signal });
        });

        subFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                subFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawSub = btn.getAttribute("data-sub") || btn.textContent;
                activeSub = normalize(rawSub);
                applyFilters();
            }, { signal });
        });

        syncSubFilterVisibility();
        applyFilters();
        projectsRafId = requestAnimationFrame(animateGallery);

        const revealGalleryWhenReady = () => {
            const reveal = () => {
                if (isGalleryRevealed) return;
                trackCards.forEach((card) => {
                    const img = card.querySelector(".project-img");
                    const wrap = card.querySelector(".project-media-wrap");
                    if (img && wrap && img.naturalWidth && img.naturalHeight) {
                        wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    }
                });

                measureDesktopMetrics();
                const initPos = getInitialScrollPos();
                scrollPos = initPos;
                targetPos = initPos;
                rawTargetPos = initPos;

                track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
                checkHeaderCollisions();
                measureMobileThumbMetrics();

                isGalleryRevealed = true;
                section.classList.add("is-ready");
                section.classList.add("is-marquee-active");
            };

            // If section was already prepared by page transition, reveal immediately without Safari decode delay
            if (section.classList.contains("is-ready")) {
                reveal();
                trackCards.forEach((card) => {
                    const img = card.querySelector(".project-img");
                    if (img && !img.complete) {
                        img.addEventListener("load", () => {
                            const wrap = card.querySelector(".project-media-wrap");
                            if (wrap && img.naturalWidth && img.naturalHeight) {
                                wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                            }
                            measureDesktopMetrics();
                            checkHeaderCollisions();
                        }, { once: true });
                    }
                });
                return;
            }

            const initialSetCards = trackCards.filter((c) => c.getAttribute("data-initial-visible") === "true").slice(0, 4);
            const decodeTasks = (initialSetCards.length ? initialSetCards : trackCards.slice(0, 4)).map((card) => {
                const img = card.querySelector(".project-img");
                if (!img) return Promise.resolve();
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                if (typeof img.decode === "function") {
                    return img.decode().catch(() => { });
                }
                return new Promise((res) => {
                    img.addEventListener("load", res, { once: true });
                    img.addEventListener("error", res, { once: true });
                });
            });

            const safetyTimer = setTimeout(reveal, 250);
            Promise.allSettled(decodeTasks).then(() => {
                clearTimeout(safetyTimer);
                reveal();
            });
        };

        revealGalleryWhenReady();

        window.addEventListener("resize", () => {
            measureDesktopMetrics();
            checkHeaderCollisions();
            measureMobileThumbMetrics();
            if (isMobileLayout()) {
                if (activeThumbCloneIdx >= 0 && cachedThumbCenters.length > 0) {
                    thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                    thumbScrollPos = thumbTargetPos;
                }
                syncMobileVideos();
            }
        }, { signal });
    }

    function destroyProjects() {
        if (projectsRafId) {
            cancelAnimationFrame(projectsRafId);
            projectsRafId = null;
        }
        if (projectsAbortController) {
            projectsAbortController.abort();
            projectsAbortController = null;
        }
    }

    window.initProjects = initProjects;
    window.destroyProjects = destroyProjects;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (document.querySelector(".projects-section")) initProjects();
        });
    } else {
        if (document.querySelector(".projects-section")) initProjects();
    }
})();