/**
 * Milena Gorum - Project Details Template Page Engine
 * Hosted on Cloudflare Pages (project-detail.js)
 */

(function () {
    let detailAbortController = null;
    let detailScope = null;
    let mainSwiperInstance = null;
    let thumbSwiperInstance = null;
    let drawerMatchMedia = null;
    let drawerTimeline = null;

    function initProjectDetails(container) {
        const scope = container || document.querySelector(".gallery-section") || document;
        const gallerySection = scope.classList?.contains("gallery-section") ? scope : scope.querySelector(".gallery-section");
        const mainEl = scope.querySelector(".main-swiper");
        const thumbEl = scope.querySelector(".thumb-swiper");
        const topSeqContainer = scope.querySelector(".top-sequence-list");
        const backLink = scope.querySelector(".back-link");

        if (!mainEl || !thumbEl) return;
        if (scope && scope._isDetailsMounted) return;
        if (scope) scope._isDetailsMounted = true;
        detailScope = scope;

        destroyProjectDetails();
        detailAbortController = new AbortController();
        const { signal } = detailAbortController;

        const DESKTOP_SWIPE_SPEED = 750;
        const MOBILE_SWIPE_SPEED = 400;
        const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";

        const padTwoDigits = (val) => {
            if (val === undefined || val === null) return "";
            const str = String(val).trim();
            if (!str) return "";
            return /^\d+$/.test(str) ? str.padStart(2, "0") : str;
        };

        const goBack = (e) => {
            if (e) e.preventDefault();
            if (typeof barba !== "undefined" && barba.history && barba.history.previous) {
                barba.go(barba.history.previous.url.href);
                return;
            }
            const hasInternalReferrer =
                document.referrer &&
                document.referrer.indexOf(window.location.host) !== -1 &&
                window.history.length > 1;

            if (hasInternalReferrer) {
                window.history.back();
            } else {
                const fallbackHref = backLink?.getAttribute("href");
                const targetUrl = fallbackHref && fallbackHref !== "#" ? fallbackHref : "/projects";
                if (typeof barba !== "undefined") {
                    barba.go(targetUrl);
                } else {
                    window.location.href = targetUrl;
                }
            }
        };

        if (backLink) {
            backLink.addEventListener("click", goBack, { signal });
        }

        const extractVideoId = (input) => {
            if (!input) return "";
            const trimmed = input.trim();
            const idMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            return idMatch ? idMatch[0] : trimmed;
        };

        const ensureVideoReady = (videoEl) => {
            if (!videoEl || videoEl._isPrepared) return;
            const rawInput =
                videoEl.getAttribute("data-video-id") ||
                videoEl.getAttribute("data-src") ||
                videoEl.querySelector("source")?.getAttribute("src") ||
                "";
            if (!rawInput.trim()) return;

            const videoId = extractVideoId(rawInput);
            videoEl.playsInline = true;
            videoEl.setAttribute("playsinline", "");
            videoEl.setAttribute("webkit-playsinline", "true");

            if (rawInput.trim().startsWith("http") && videoId === rawInput.trim()) {
                videoEl.src = rawInput.trim();
                videoEl.preload = "metadata";
                videoEl._isPrepared = true;
                return;
            }

            const fallbackUrls = [
                `${BUNNY_STREAM_BASE}/${videoId}/play_1080p.mp4`,
                `${BUNNY_STREAM_BASE}/${videoId}/play_720p.mp4`,
                `${BUNNY_STREAM_BASE}/${videoId}/play_480p.mp4`,
                `${BUNNY_STREAM_BASE}/${videoId}/play_360p.mp4`,
                `${BUNNY_STREAM_BASE}/${videoId}/playlist.m3u8`
            ];

            let attemptIndex = 0;
            if (!videoEl.getAttribute("poster")) {
                videoEl.setAttribute("poster", `${BUNNY_STREAM_BASE}/${videoId}/thumbnail.jpg`);
            }

            videoEl.addEventListener("error", () => {
                attemptIndex += 1;
                if (attemptIndex < fallbackUrls.length) {
                    const shouldAutoplay = !videoEl.paused || videoEl.closest(".swiper-slide-active");
                    videoEl.src = fallbackUrls[attemptIndex];
                    videoEl.load();
                    if (shouldAutoplay) videoEl.play().catch(() => { });
                }
            });

            videoEl.preload = "metadata";
            videoEl.src = fallbackUrls[0];
            videoEl._isPrepared = true;
        };

        const rawProjectNumber = gallerySection?.getAttribute("data-project-number")?.trim() || "";
        const formattedProjectNumber = padTwoDigits(rawProjectNumber);

        scope.querySelectorAll(".project-number-text, .project-num, [data-project-num]").forEach((el) => {
            const txt = el.textContent.trim();
            if (/^\d+$/.test(txt)) {
                el.textContent = padTwoDigits(txt);
            } else if (formattedProjectNumber) {
                el.textContent = formattedProjectNumber;
            }
        });

        const mainSlides = mainEl.querySelectorAll(".swiper-slide");
        const thumbSlides = thumbEl.querySelectorAll(".swiper-slide");
        const totalSlides = thumbSlides.length;
        const topSeqButtons = [];

        const templateSeqItem = topSeqContainer?.querySelector(".top-seq-item");
        if (topSeqContainer) topSeqContainer.innerHTML = "";

        const makeAccessibleButton = (el, label, onActivate) => {
            if (!el) return;
            el.setAttribute("role", "button");
            el.setAttribute("tabindex", "0");
            if (label) el.setAttribute("aria-label", label);
            el.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onActivate(e);
                }
            }, { signal });
        };

        const parseCoordinate = (slide, attrName) => {
            let raw = slide.getAttribute(attrName);
            if (raw === null || raw.trim() === "") {
                const childWithAttr = slide.querySelector(`[${attrName}]`);
                if (childWithAttr) raw = childWithAttr.getAttribute(attrName);
            }
            if (raw === null || raw.trim() === "") return "50%";
            const cleaned = parseFloat(raw.replace("%", "").trim());
            return !isNaN(cleaned) ? `${cleaned}%` : "50%";
        };

        mainSlides.forEach((slide, index) => {
            slide.setAttribute("aria-label", `Slide ${padTwoDigits(index + 1)} of ${padTwoDigits(totalSlides)}`);

            const focusX = parseCoordinate(slide, "data-focus-x");
            const focusY = parseCoordinate(slide, "data-focus-y");

            const fillFlag = slide.querySelector(".fill-screen-flag");
            const isFill = fillFlag && !fillFlag.classList.contains("w-condition-invisible");

            if (isFill) {
                slide.classList.add("is-fill-slide");
                slide.querySelectorAll(".image-parallax-container, .image-wrapper, .video-parallax-container, .video-wrapper, .video-embed")
                    .forEach((el) => el.classList.add("is-fill"));
            }

            slide.querySelectorAll(".main-media-img, .slide-video").forEach((media) => {
                if (isFill) media.classList.add("is-fill");
                media.style.setProperty("object-position", `${focusX} ${focusY}`, "important");
            });

            const video = slide.querySelector(".slide-video") || slide.querySelector("video");
            if (video) {
                const rawVal = video.getAttribute("data-video-id") || video.querySelector("source")?.getAttribute("src") || video.getAttribute("src") || "";
                if (rawVal.trim()) video.setAttribute("data-video-id", rawVal.trim());
                const sourceTag = video.querySelector("source");
                if (sourceTag) sourceTag.remove();
            }
        });

        thumbSlides.forEach((slide, index) => {
            const formattedMediaIndex = padTwoDigits(index + 1);
            const seqText = formattedProjectNumber ? `${formattedProjectNumber}-${formattedMediaIndex}` : formattedMediaIndex;
            const thumbLabel = slide.querySelector(".thumb-seq-label");
            if (thumbLabel) thumbLabel.textContent = seqText;

            const thumbImg = slide.querySelector(".thumb-img") || slide.querySelector("img");
            if (thumbImg && !thumbImg.getAttribute("sizes")) {
                thumbImg.setAttribute("sizes", "160px");
            }

            if (topSeqContainer) {
                const btn = templateSeqItem ? templateSeqItem.cloneNode(true) : document.createElement("span");
                if (!templateSeqItem) btn.className = "top-seq-item";
                btn.classList.remove("is-active");
                btn.textContent = seqText;
                btn.dataset.index = index;
                topSeqContainer.appendChild(btn);
                topSeqButtons.push(btn);
            }
        });

        const thumbGap = thumbSlides[0] ? parseFloat(window.getComputedStyle(thumbSlides[0]).marginRight) || 6 : 6;

        if (typeof Swiper !== "undefined") {
            thumbSwiperInstance = new Swiper(thumbEl, {
                slidesPerView: "auto",
                spaceBetween: thumbGap,
                freeMode: { enabled: true, momentum: true, momentumRatio: 0.8 },
                mousewheel: { enabled: true, forceToAxis: false, sensitivity: 1, releaseOnEdges: true },
                watchSlidesProgress: true,
                grabCursor: true,
                a11y: { enabled: true },
                observer: true,
                observeParents: true
            });

            mainSwiperInstance = new Swiper(mainEl, {
                loop: totalSlides > 1,
                speed: DESKTOP_SWIPE_SPEED,
                slidesPerView: 1,
                spaceBetween: 0,
                grabCursor: true,
                keyboard: { enabled: true },
                a11y: { enabled: true },
                noSwiping: true,
                noSwipingSelector: ".swiper-no-swiping",
                breakpoints: {
                    0: { speed: MOBILE_SWIPE_SPEED },
                    768: { speed: DESKTOP_SWIPE_SPEED }
                }
            });
        }

        const syncActiveSequence = (activeIndex) => {
            topSeqButtons.forEach((btn, idx) => {
                const isCurrent = idx === activeIndex;
                btn.classList.toggle("is-active", isCurrent);
                if (isCurrent) btn.setAttribute("aria-current", "true");
                else btn.removeAttribute("aria-current");
            });

            thumbSlides.forEach((slide, idx) => {
                const isCurrent = idx === activeIndex;
                slide.classList.toggle("is-active", isCurrent);
                slide.classList.toggle("swiper-slide-thumb-active", isCurrent);
                if (isCurrent) slide.setAttribute("aria-current", "true");
                else slide.removeAttribute("aria-current");

                const label = slide.querySelector(".thumb-seq-label");
                if (label) label.classList.toggle("is-active", isCurrent);
            });

            if (thumbSwiperInstance && !thumbSwiperInstance.destroyed) {
                thumbSwiperInstance.slideTo(activeIndex, 300);
            }
        };

        const handleSlideMedia = () => {
            if (!mainSwiperInstance) return;
            const activeRealIndex = mainSwiperInstance.realIndex;
            const activeDomIndex = mainSwiperInstance.activeIndex;

            syncActiveSequence(activeRealIndex);

            mainSwiperInstance.slides.forEach((slide, idx) => {
                const isNearby = Math.abs(idx - activeDomIndex) <= 1;
                if (isNearby) {
                    const img = slide.querySelector(".main-media-img");
                    if (img && img.getAttribute("loading") === "lazy") img.setAttribute("loading", "eager");
                }

                const videoContainer = slide.querySelector(".video-container") || slide.querySelector(".video-wrapper");
                if (!videoContainer || videoContainer.classList.contains("w-condition-invisible")) return;

                const video = videoContainer.querySelector(".slide-video") || videoContainer.querySelector("video");
                if (!video) return;

                if (isNearby) ensureVideoReady(video);

                if (idx === activeDomIndex) {
                    ensureVideoReady(video);
                    video.muted = true;
                    const playPromise = video.play();
                    if (playPromise !== undefined) playPromise.catch(() => { });
                } else {
                    if (!video.paused) video.pause();
                    video.currentTime = 0;
                }
            });
        };

        const jumpToSlideInstant = (index) => {
            if (!mainSwiperInstance) return;
            if (mainSwiperInstance.params.loop) {
                mainSwiperInstance.slideToLoop(index, 0);
            } else {
                mainSwiperInstance.slideTo(index, 0);
            }
            handleSlideMedia();
        };

        topSeqButtons.forEach((btn, index) => {
            const label = `View slide ${btn.textContent} (${padTwoDigits(index + 1)} of ${padTwoDigits(totalSlides)})`;
            btn.addEventListener("click", () => jumpToSlideInstant(index), { signal });
            makeAccessibleButton(btn, label, () => jumpToSlideInstant(index));
        });

        thumbSlides.forEach((slide, index) => {
            const formattedMediaIndex = padTwoDigits(index + 1);
            const seqText = formattedProjectNumber ? `${formattedProjectNumber}-${formattedMediaIndex}` : formattedMediaIndex;
            const label = `Thumbnail ${seqText} (${formattedMediaIndex} of ${padTwoDigits(totalSlides)})`;
            slide.addEventListener("click", () => jumpToSlideInstant(index), { signal });
            makeAccessibleButton(slide, label, () => jumpToSlideInstant(index));
        });

        if (mainSwiperInstance) {
            mainSwiperInstance.on("slideChange", handleSlideMedia);
        }

        const processedVideos = new Set();
        const allVideoElements = Array.from(mainEl.querySelectorAll("video.slide-video, video"));

        allVideoElements.forEach((video) => {
            if (processedVideos.has(video)) return;
            processedVideos.add(video);

            const slide = video.closest(".swiper-slide");
            const wrapper = video.closest(".video-wrapper") || video.closest(".video-container") || video.parentElement;
            if (!slide && !wrapper) return;

            const playBtn = (slide || wrapper).querySelector(".btn-play");
            const soundBtn = (slide || wrapper).querySelector(".btn-sound");
            const fullscreenBtn = (slide || wrapper).querySelector(".btn-fullscreen");
            const seekContainer = (slide || wrapper).querySelector(".seek-container");
            const seekFill = (slide || wrapper).querySelector(".seek-fill");

            ensureVideoReady(video);

            let isDragging = false;
            let seekRafId = null;
            let lastTapTime = 0;

            const isFullscreenActive = () => {
                return Boolean(
                    document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    video.webkitDisplayingFullscreen
                );
            };

            const updateFullscreenButton = () => {
                if (!fullscreenBtn) return;
                const isFs = isFullscreenActive();
                const label = fullscreenBtn.querySelector("div") || fullscreenBtn;
                label.textContent = isFs ? "Exit fullscreen" : "Fullscreen";
                fullscreenBtn.setAttribute("aria-label", isFs ? "Exit Fullscreen" : "Fullscreen");
                fullscreenBtn.setAttribute("aria-pressed", String(isFs));
            };

            const updatePlayButton = () => {
                if (!playBtn) return;
                const label = playBtn.querySelector("div") || playBtn;
                label.textContent = video.paused ? "Play" : "Pause";
                playBtn.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
                playBtn.setAttribute("aria-pressed", String(!video.paused));
            };

            const updateSoundButton = () => {
                if (!soundBtn) return;
                const label = soundBtn.querySelector("div") || soundBtn;
                label.textContent = video.muted ? "Sound on" : "Sound off";
                soundBtn.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
                soundBtn.setAttribute("aria-pressed", String(!video.muted));
            };

            const togglePlay = () => {
                ensureVideoReady(video);
                if (video.paused) {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(() => { });
                    }
                } else {
                    video.pause();
                }
                updatePlayButton();
            };

            const toggleSound = () => {
                if (video.muted) {
                    video.muted = false;
                    if (video.volume === 0) video.volume = 1;
                } else {
                    video.muted = true;
                }
                updateSoundButton();
            };

            const toggleFullscreen = () => {
                const isFs = isFullscreenActive();

                if (isFs) {
                    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    else if (video.webkitExitFullscreen) video.webkitExitFullscreen();
                    return;
                }

                const isMobile = window.matchMedia("(max-width: 767px)").matches;
                if (isMobile && video.webkitEnterFullscreen) {
                    ensureVideoReady(video);
                    try { video.webkitEnterFullscreen(); return; } catch (_) { }
                }

                const target = isMobile ? video : wrapper || video;
                if (target.requestFullscreen) {
                    target.requestFullscreen().catch(() => {
                        if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
                    });
                } else if (target.webkitRequestFullscreen) {
                    target.webkitRequestFullscreen();
                } else if (video.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                }
            };

            const updateSeekProgress = () => {
                if (!isDragging && video.duration && seekFill) {
                    const progress = Math.max(0, Math.min(video.currentTime / video.duration, 1));
                    seekFill.style.transform = `scaleX(${progress})`;
                }
                if (!video.paused) {
                    seekRafId = requestAnimationFrame(updateSeekProgress);
                }
            };

            video.addEventListener("play", () => {
                updatePlayButton();
                cancelAnimationFrame(seekRafId);
                seekRafId = requestAnimationFrame(updateSeekProgress);
            }, { signal });

            video.addEventListener("pause", () => {
                updatePlayButton();
                cancelAnimationFrame(seekRafId);
            }, { signal });

            video.addEventListener("volumechange", () => {
                updateSoundButton();
            }, { signal });

            document.addEventListener("fullscreenchange", updateFullscreenButton, { signal });
            document.addEventListener("webkitfullscreenchange", updateFullscreenButton, { signal });
            video.addEventListener("webkitbeginfullscreen", updateFullscreenButton, { signal });
            video.addEventListener("webkitendfullscreen", updateFullscreenButton, { signal });

            // Initialize button states immediately
            updatePlayButton();
            updateSoundButton();
            updateFullscreenButton();

            // Button Click / Tap Listeners with synthetic click debouncing
            if (playBtn) {
                const handlePlayClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (performance.now() - lastTapTime < 400) return;
                    lastTapTime = performance.now();
                    togglePlay();
                };
                playBtn.addEventListener("click", handlePlayClick, { signal });
                playBtn.addEventListener("touchend", handlePlayClick, { signal });
            }

            if (soundBtn) {
                const handleSoundClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (performance.now() - lastTapTime < 400) return;
                    lastTapTime = performance.now();
                    toggleSound();
                };
                soundBtn.addEventListener("click", handleSoundClick, { signal });
                soundBtn.addEventListener("touchend", handleSoundClick, { signal });
            }

            if (fullscreenBtn) {
                const handleFsClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (performance.now() - lastTapTime < 400) return;
                    lastTapTime = performance.now();
                    toggleFullscreen();
                };
                fullscreenBtn.addEventListener("click", handleFsClick, { signal });
                fullscreenBtn.addEventListener("touchend", handleFsClick, { signal });
            }

            // Seek Bar Drag and Touch Scrub
            if (seekContainer) {
                const getEventClientX = (e) => {
                    if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
                    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
                    return e.clientX;
                };

                const scrub = (event) => {
                    const rect = seekContainer.getBoundingClientRect();
                    const clientX = getEventClientX(event);
                    if (clientX === undefined) return;
                    const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
                    const scrubRatio = rect.width > 0 ? pos / rect.width : 0;
                    if (video.duration) video.currentTime = scrubRatio * video.duration;
                    if (seekFill) seekFill.style.transform = `scaleX(${scrubRatio})`;
                };

                // Mouse Drag / Seek
                seekContainer.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                    isDragging = true;
                    scrub(e);
                }, { signal });

                window.addEventListener("mousemove", (e) => {
                    if (isDragging) scrub(e);
                }, { signal });

                window.addEventListener("mouseup", () => {
                    isDragging = false;
                }, { signal });

                // Touch Drag / Seek
                seekContainer.addEventListener("touchstart", (e) => {
                    e.stopPropagation();
                    isDragging = true;
                    scrub(e);
                }, { signal, passive: true });

                window.addEventListener("touchmove", (e) => {
                    if (isDragging) {
                        scrub(e);
                    }
                }, { signal, passive: true });

                window.addEventListener("touchend", () => {
                    isDragging = false;
                }, { signal, passive: true });

                window.addEventListener("touchcancel", () => {
                    isDragging = false;
                }, { signal, passive: true });
            }

            // Video Direct Click / Tap to Pause/Play
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;

            const handleVideoWrapperTap = (e) => {
                if (e.target.closest(".controls-container") || e.target.closest(".seek-container")) return;
                if (performance.now() - lastTapTime < 400) return;
                lastTapTime = performance.now();
                togglePlay();
            };

            // Desktop / Mouse Click
            wrapper.addEventListener("click", handleVideoWrapperTap, { signal });

            // Mobile Touch: detect clean tap (<12px movement, <350ms) so swipes don't trigger play/pause
            wrapper.addEventListener("touchstart", (e) => {
                if (e.target.closest(".controls-container") || e.target.closest(".seek-container")) return;
                const t = e.touches[0];
                if (!t) return;
                touchStartX = t.clientX;
                touchStartY = t.clientY;
                touchStartTime = performance.now();
            }, { signal, passive: true });

            wrapper.addEventListener("touchend", (e) => {
                if (e.target.closest(".controls-container") || e.target.closest(".seek-container")) return;
                const t = e.changedTouches[0];
                if (!t) return;
                const distX = Math.abs(t.clientX - touchStartX);
                const distY = Math.abs(t.clientY - touchStartY);
                const elapsed = performance.now() - touchStartTime;

                if (distX < 12 && distY < 12 && elapsed < 350) {
                    handleVideoWrapperTap(e);
                }
            }, { signal });
        });

        handleSlideMedia();

        // ----------------------------------------------------
        // BOTTOM STAGE DRAWER INTERACTION (.bottom-stage)
        // ----------------------------------------------------
        const drawer = scope.querySelector(".bottom-stage");
        const trigger = scope.querySelector(".btn-project-details");
        const icon = trigger ? trigger.querySelector(".plus-x") : null;
        const detailsContainer = scope.querySelector(".project-details-container");

        if (trigger && drawer && typeof gsap !== "undefined") {
            // Webflow DOM Safety: If trigger was nested inside .bottom-stage in Webflow navigator,
            // move it outside as an immediate sibling so drawer height:0 / overflow:hidden never clips the button.
            if (drawer.contains(trigger) && drawer.parentNode) {
                drawer.parentNode.insertBefore(trigger, drawer.nextSibling);
            }

            if (icon) {
                gsap.set(icon, {
                    transformOrigin: "50% 50%",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center"
                });
            }

            gsap.set(drawer, { height: 0, overflow: "hidden" });
            if (detailsContainer) gsap.set(detailsContainer, { autoAlpha: 0 });
            if (thumbSlides.length) gsap.set(thumbSlides, { autoAlpha: 0 });

            const mm = gsap.matchMedia();
            drawerMatchMedia = mm;

            mm.add({
                isDesktop: "(min-width: 768px)",
                isMobile: "(max-width: 767px)"
            }, (context) => {
                const { isDesktop } = context.conditions;
                const targetHeight = isDesktop ? 220 : 180;

                let isOpen = false;
                let activeCloseTween = null;

                const openDrawer = () => {
                    if (activeCloseTween) {
                        activeCloseTween.kill();
                        activeCloseTween = null;
                    }
                    isOpen = true;
                    trigger.setAttribute("aria-expanded", "true");

                    // 1. Drawer height expansion (power2.inOut, 1.1s)
                    gsap.to(drawer, {
                        height: targetHeight,
                        duration: 1.1,
                        ease: "power2.inOut",
                        overwrite: "auto",
                        onStart: () => {
                            if (thumbSwiperInstance && !thumbSwiperInstance.destroyed) {
                                thumbSwiperInstance.update();
                            }
                        },
                        onComplete: () => {
                            if (thumbSwiperInstance && !thumbSwiperInstance.destroyed) {
                                thumbSwiperInstance.update();
                            }
                        }
                    });

                    // 2. Plus icon rotation to 'x' (faster rotation)
                    if (icon) {
                        gsap.to(icon, {
                            rotation: 45,
                            duration: 0.5,
                            ease: "power2.out",
                            overwrite: "auto"
                        });
                    }

                    // 3. Project details container (credits text) fades in
                    if (detailsContainer) {
                        gsap.fromTo(detailsContainer,
                            { autoAlpha: 0 },
                            {
                                autoAlpha: 1,
                                duration: 0.6,
                                delay: 0.6,
                                ease: "power1.in",
                                overwrite: "auto"
                            }
                        );
                    }

                    // 4. Thumbnail strip slides fade in with slower, dreamy stagger and gradual fade
                    if (thumbSlides.length) {
                        gsap.fromTo(thumbSlides,
                            { autoAlpha: 0 },
                            {
                                autoAlpha: 1,
                                duration: 0.6,
                                stagger: 0.2,
                                delay: 0.6,
                                ease: "power1.in",
                                overwrite: "auto"
                            }
                        );
                    }
                };

                const closeDrawer = () => {
                    isOpen = false;
                    trigger.setAttribute("aria-expanded", "false");

                    // Keep thumbnails and credits visible as drawer slides down (no fade-out effect)
                    // 1. Plus icon rotates back quickly
                    if (icon) {
                        gsap.to(icon, {
                            rotation: 0,
                            duration: 0.5,
                            ease: "power2.out",
                            overwrite: "auto"
                        });
                    }

                    // 2. Drawer smoothly collapses down with power2.inOut
                    activeCloseTween = gsap.to(drawer, {
                        height: 0,
                        duration: 0.9,
                        ease: "power2.inOut",
                        overwrite: "auto",
                        onComplete: () => {
                            gsap.set(drawer, { height: 0, overflow: "hidden" });
                            if (detailsContainer) gsap.set(detailsContainer, { autoAlpha: 0 });
                            if (thumbSlides.length) gsap.set(thumbSlides, { autoAlpha: 0 });
                            activeCloseTween = null;
                        }
                    });
                };

                drawerTimeline = {
                    isOpen: () => isOpen,
                    close: closeDrawer,
                    open: openDrawer
                };

                const handleToggle = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    if (isOpen) {
                        closeDrawer();
                    } else {
                        openDrawer();
                    }
                };

                trigger.addEventListener("click", handleToggle, { signal });
                trigger.setAttribute("role", "button");
                trigger.setAttribute("tabindex", "0");
                trigger.setAttribute("aria-expanded", "false");
                trigger.setAttribute("aria-controls", "bottom-stage");

                trigger.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle(e);
                    }
                }, { signal });

                return () => {
                    trigger.removeEventListener("click", handleToggle);
                    if (activeCloseTween) activeCloseTween.kill();
                    gsap.killTweensOf([drawer, icon, detailsContainer, thumbSlides]);
                    gsap.set(drawer, { height: 0 });
                    if (icon) gsap.set(icon, { rotation: 0 });
                    if (detailsContainer) gsap.set(detailsContainer, { autoAlpha: 1 });
                    if (thumbSlides.length) gsap.set(thumbSlides, { autoAlpha: 1 });
                };
            });
        }

        window.addEventListener("keydown", (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
            if (activeTag === "input" || activeTag === "textarea") return;

            if (e.code === "Space" && !document.activeElement?.getAttribute("role")) {
                const activeSlide = mainSwiperInstance?.slides[mainSwiperInstance.activeIndex];
                const activeVideo = activeSlide ? activeSlide.querySelector(".slide-video") : null;
                if (activeVideo) {
                    e.preventDefault();
                    if (activeVideo.paused) activeVideo.play().catch(() => { });
                    else activeVideo.pause();
                }
            } else if (e.key === "Escape" && !document.fullscreenElement && !document.webkitFullscreenElement) {
                if (drawerTimeline && drawerTimeline.isOpen()) {
                    drawerTimeline.close();
                } else {
                    goBack();
                }
            }
        }, { signal });
    }

    function destroyProjectDetails() {
        if (drawerMatchMedia) {
            try { drawerMatchMedia.revert(); } catch (e) { }
            drawerMatchMedia = null;
        }
        drawerTimeline = null;
        if (detailScope) {
            detailScope._isDetailsMounted = false;
            detailScope = null;
        }
        if (detailAbortController) {
            detailAbortController.abort();
            detailAbortController = null;
        }
        if (mainSwiperInstance) {
            try { mainSwiperInstance.destroy(true, false); } catch (e) { }
            mainSwiperInstance = null;
        }
        if (thumbSwiperInstance) {
            try { thumbSwiperInstance.destroy(true, false); } catch (e) { }
            thumbSwiperInstance = null;
        }
    }

    window.initProjectDetails = initProjectDetails;
    window.destroyProjectDetails = destroyProjectDetails;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (document.querySelector(".gallery-section")) initProjectDetails();
        });
    } else {
        if (document.querySelector(".gallery-section")) initProjectDetails();
    }
})();