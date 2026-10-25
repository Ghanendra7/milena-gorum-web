/**
 * Milena Gorum - Projects Overview Engine (Marquee, Filters, Zoom, Mobile Scrubber)
 * Hosted on Cloudflare Pages (projects.js)
 */

(function () {
    const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";
    const ZOOM_LEVELS = [15, 26.67, 38.33, 50, 62.5, 75]; // Card heights in vh
    const DEFAULT_ZOOM_INDEX = 3; // 50vh default
    const MARQUEE_BASE_SPEED = -0.55;
    const MIN_LOOP_THRESHOLD = 3;
    const MAX_WARM_VIDEOS = 3;

    let projectsAbort = null;
    let marqueeRafId = null;
    let mobileSwiper = null;

    function initProjects(container) {
        const scope = container || document.querySelector(".projects-section") || document;
        const track = scope.querySelector(".projects-track");
        const trackWrapper = scope.querySelector(".projects-track-wrapper");
        const section = scope.classList?.contains("projects-section") ? scope : scope.querySelector(".projects-section");
        if (!track || !trackWrapper) return;

        destroyProjects();
        projectsAbort = new AbortController();
        const { signal } = projectsAbort;

        // 1. Zoom Controller
        let currentZoomIndex = DEFAULT_ZOOM_INDEX;
        const savedZoom = sessionStorage.getItem("mg_zoom_idx");
        if (savedZoom !== null) {
            currentZoomIndex = parseInt(savedZoom, 10);
        }

        function applyZoom(idx) {
            currentZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, idx));
            document.documentElement.style.setProperty("--card-height", `${ZOOM_LEVELS[currentZoomIndex]}vh`);
            try { sessionStorage.setItem("mg_zoom_idx", currentZoomIndex); } catch (e) { }

            const btnZoomIn = scope.querySelector(".btn-zoom-in") || document.querySelector(".btn-zoom-in");
            const btnZoomOut = scope.querySelector(".btn-zoom-out") || document.querySelector(".btn-zoom-out");
            if (btnZoomIn) btnZoomIn.classList.toggle("is-disabled", currentZoomIndex === ZOOM_LEVELS.length - 1);
            if (btnZoomOut) btnZoomOut.classList.toggle("is-disabled", currentZoomIndex === 0);
        }
        applyZoom(currentZoomIndex);

        // Zoom Button Listeners
        const btnIn = scope.querySelector(".btn-zoom-in") || document.querySelector(".btn-zoom-in");
        const btnOut = scope.querySelector(".btn-zoom-out") || document.querySelector(".btn-zoom-out");
        if (btnIn) btnIn.addEventListener("click", () => applyZoom(currentZoomIndex + 1), { signal });
        if (btnOut) btnOut.addEventListener("click", () => applyZoom(currentZoomIndex - 1), { signal });

        // 2. Templates & 2-Digit Numbering
        const originalCards = Array.from(track.querySelectorAll(".project-card"));
        if (!originalCards.length) return;

        originalCards.forEach((card, i) => {
            const numEl = card.querySelector(".project-num, .project-number, .project-number-text");
            if (numEl) {
                const raw = numEl.textContent.trim().replace(/^#/, "");
                const n = parseInt(raw, 10) || i + 1;
                numEl.textContent = n < 10 ? `0${n}` : `${n}`;
            }
        });

        const cardTemplates = originalCards.map((c) => c.cloneNode(true));

        // 3. Desktop Loop Builder
        let isDesktopInfinite = false;
        let singleSetWidth = 0;
        let scrollPos = 0;
        let targetPos = 0;
        let currentSpeed = MARQUEE_BASE_SPEED;
        let isHovering = false;

        function buildDesktopLoop(cards) {
            track.innerHTML = "";
            const count = cards.length;
            if (count === 0) return;

            isDesktopInfinite = count > MIN_LOOP_THRESHOLD;
            track.classList.toggle("is-no-loop", !isDesktopInfinite);

            const setsNeeded = isDesktopInfinite ? Math.max(4, Math.ceil(36 / count) + 2) : 1;
            for (let s = 0; s < setsNeeded; s++) {
                cards.forEach((t) => {
                    const clone = t.cloneNode(true);
                    track.appendChild(clone);
                });
            }

            // Initial 8vw offset for infinite mode
            if (isDesktopInfinite) {
                scrollPos = window.innerWidth * 0.08;
                targetPos = scrollPos;
            } else {
                scrollPos = 0;
                targetPos = 0;
            }

            measureLoop();
        }

        function measureLoop() {
            const cards = Array.from(track.querySelectorAll(".project-card"));
            if (!cards.length) return;
            const count = cardTemplates.length;
            let w = 0;
            for (let i = 0; i < count; i++) {
                w += cards[i]?.offsetWidth || 0;
            }
            singleSetWidth = w;
        }

        buildDesktopLoop(cardTemplates);

        // 4. Marquee RAF Loop (Safely starts after incoming transition settles)
        function startMarquee() {
            measureLoop();
            function tick() {
                if (isDesktopInfinite && singleSetWidth > 0) {
                    if (!isHovering) {
                        targetPos += currentSpeed;
                    }
                    scrollPos += (targetPos - scrollPos) * 0.12;

                    if (scrollPos <= -singleSetWidth) {
                        scrollPos += singleSetWidth;
                        targetPos += singleSetWidth;
                    } else if (scrollPos >= 0) {
                        scrollPos -= singleSetWidth;
                        targetPos -= singleSetWidth;
                    }
                    track.style.transform = `translate3d(${scrollPos.toFixed(2)}px, 0, 0)`;
                }
                marqueeRafId = requestAnimationFrame(tick);
            }
            marqueeRafId = requestAnimationFrame(tick);
        }

        // Delay marquee startup slightly so GSAP slide transition has 100% CPU priority
        setTimeout(startMarquee, 120);

        // Track Hover Slowdown
        trackWrapper.addEventListener("pointerenter", () => { isHovering = true; }, { signal });
        trackWrapper.addEventListener("pointerleave", () => { isHovering = false; }, { signal });

        // Wheel Interaction
        window.addEventListener("wheel", (e) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            targetPos -= delta * 0.85;
        }, { passive: true, signal });

        // Mark ready for CSS visibility
        if (section) section.classList.add("is-ready");
    }

    function destroyProjects() {
        if (marqueeRafId) {
            cancelAnimationFrame(marqueeRafId);
            marqueeRafId = null;
        }
        if (projectsAbort) {
            projectsAbort.abort();
            projectsAbort = null;
        }
        if (mobileSwiper) {
            try { mobileSwiper.destroy(true, true); } catch (e) { }
            mobileSwiper = null;
        }
    }

    window.initProjects = initProjects;
    window.destroyProjects = destroyProjects;

    if (document.querySelector(".projects-section")) {
        initProjects();
    }
})();