// -----------------------------------------
// DEPENDENCY BOOTSTRAPPER (Barba, GSAP, CustomEase)
// -----------------------------------------
(function bootstrapOsmoTransitions() {
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement("script");
            s.src = src;
            s.async = false;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function loadDependencies() {
        if (typeof window.gsap === "undefined") {
            await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
        }
        if (typeof window.CustomEase === "undefined") {
            await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/CustomEase.min.js");
        }
        if (typeof window.barba === "undefined") {
            await loadScript("https://unpkg.com/@barba/core@2.10.3/dist/barba.umd.js");
        }
    }

    loadDependencies()
        .then(initOsmoBoilerplate)
        .catch((err) => console.error("❌ [Osmo Transitions] Dependency load error:", err));
})();


function initOsmoBoilerplate() {
    // -----------------------------------------
    // OSMO PAGE TRANSITION BOILERPLATE
    // -----------------------------------------

    gsap.registerPlugin(CustomEase);

    history.scrollRestoration = "manual";

    let lenis = null;
    let nextPage = document;
    let onceFunctionsInitialized = false;

    const hasLenis = typeof window.Lenis !== "undefined";
    const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

    const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = rmMQ.matches;
    rmMQ.addEventListener?.("change", (e) => (reducedMotion = e.matches));
    rmMQ.addListener?.((e) => (reducedMotion = e.matches));

    const has = (s) => !!nextPage.querySelector(s);

    let staggerDefault = 0.12;
    let durationDefault = 0.8;
    let slideDuration = 1.6; // Duration for Home -> Projects push/slide

    CustomEase.create("smooth", "M0,0 C0.38,0.005 0.215,1 1,1");
    CustomEase.create("osmo", "0.625, 0.05, 0, 1");
    gsap.defaults({ ease: "power2.out", duration: durationDefault });

    // Ensure body has data-barba="wrapper"
    if (!document.body.hasAttribute("data-barba")) {
        document.body.setAttribute("data-barba", "wrapper");
    }

    function isLenisPage(container) {
        const ns = container?.getAttribute("data-barba-namespace") || "";
        return ns === "index" || ns === "information" || ns === "info";
    }

    // -----------------------------------------
    // FUNCTION REGISTRY
    // -----------------------------------------

    function initOnceFunctions() {
        initLenis();
        if (onceFunctionsInitialized) return;
        onceFunctionsInitialized = true;
    }

    function initBeforeEnterFunctions(next) {
        nextPage = next || document;

        // Ensure Projects section is visible while sliding in from bottom
        if (nextPage.classList?.contains("projects-section")) {
            nextPage.classList.add("is-ready");
        } else {
            const projSec = nextPage.querySelector?.(".projects-section");
            if (projSec) projSec.classList.add("is-ready");
        }
    }

    function initAfterEnterFunctions(next) {
        nextPage = next || document;

        if (lenis) {
            if (isLenisPage(nextPage)) {
                lenis.resize();
                lenis.start();
            } else {
                lenis.stop();
            }
        }

        if (hasScrollTrigger) {
            ScrollTrigger.refresh();
        }
    }

    // -----------------------------------------
    // PAGE TRANSITIONS: DEFAULT
    // -----------------------------------------

    function runPageOnceAnimation(next) {
        const tl = gsap.timeline();

        tl.call(() => {
            resetPage(next);
        }, null, 0);

        return tl;
    }

    function runPageLeaveAnimation(current, next) {
        const tl = gsap.timeline({
            onComplete: () => {
                cleanupMediaInContainer(current);
                current.remove();
            },
        });

        if (reducedMotion) {
            return tl.set(current, { autoAlpha: 0 });
        }

        tl.to(current, { autoAlpha: 0, duration: 0.4 });

        return tl;
    }

    function runPageEnterAnimation(next) {
        const tl = gsap.timeline();

        if (reducedMotion) {
            tl.set(next, { autoAlpha: 1 });
            tl.add("pageReady");
            tl.call(resetPage, [next], "pageReady");
            return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
        }

        tl.add("startEnter", 0.6);

        tl.fromTo(
            next,
            { autoAlpha: 0 },
            { autoAlpha: 1 },
            "startEnter"
        );

        tl.add("pageReady");
        tl.call(resetPage, [next], "pageReady");

        return new Promise((resolve) => {
            tl.call(resolve, null, "pageReady");
        });
    }

    // -----------------------------------------
    // PAGE TRANSITIONS: HOME -> PROJECTS
    // -----------------------------------------

    function runHomeToProjectsLeave(current, next) {
        const navHome = current.querySelector(".navbar-home");
        const projectInfo = current.querySelector(".home-project-info");
        const galleryStage = current.querySelector(".home-gallery-stage");

        const tl = gsap.timeline({
            onComplete: () => {
                cleanupMediaInContainer(current);
                current.remove();
            },
        });

        if (reducedMotion) {
            return tl.set(current, { autoAlpha: 0 });
        }

        // Keep current container fixed in viewport so children can move independently
        gsap.set(current, {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100dvh",
            zIndex: 1,
        });

        // 1. Move .navbar-home from center to 16px offset from top
        if (navHome) {
            const navRect = navHome.getBoundingClientRect();
            const targetY = 16 - navRect.top;
            tl.to(
                navHome,
                {
                    y: targetY,
                    duration: slideDuration,
                    ease: "smooth",
                    force3D: true,
                },
                0
            );
        }

        // 2. Move .home-project-info from center to 16px offset from top
        if (projectInfo) {
            const infoRect = projectInfo.getBoundingClientRect();
            const targetY = 16 - infoRect.top;
            tl.to(
                projectInfo,
                {
                    y: targetY,
                    duration: slideDuration,
                    ease: "smooth",
                    force3D: true,
                },
                0
            );
        }

        // 3. Push Homepage gallery up as Projects page slides in from bottom
        if (galleryStage) {
            tl.to(
                galleryStage,
                {
                    yPercent: -80,
                    duration: slideDuration,
                    ease: "smooth",
                    force3D: true,
                },
                0
            );
        } else {
            tl.to(
                current,
                {
                    yPercent: -80,
                    duration: slideDuration,
                    ease: "smooth",
                    force3D: true,
                },
                0
            );
        }

        return tl;
    }

    function runHomeToProjectsEnter(next) {
        const navbar = next.querySelector(".navbar");
        const navTop = navbar ? navbar.querySelector(".nav-top") : next.querySelector(".nav-top");

        // Collect primary filters (and secondary filters if visible)
        const primaryFilters = Array.from(next.querySelectorAll(".primary-filter-list .filter-btn"));
        const subFilterList = next.querySelector(".sub-filter-list");
        const subFilters =
            subFilterList && subFilterList.classList.contains("is-visible")
                ? Array.from(subFilterList.querySelectorAll(".sub-btn"))
                : [];
        const filterItems = [...primaryFilters, ...subFilters];

        // Collect + and - zoom buttons
        const zoomBtns = Array.from(next.querySelectorAll(".zoom-controls .btn-zoom-in, .zoom-controls .btn-zoom-out"));

        const allNavTargets = [navTop, ...filterItems, ...zoomBtns].filter(Boolean);

        const tl = gsap.timeline();

        if (reducedMotion) {
            tl.set(next, { autoAlpha: 1, yPercent: 0 });
            tl.add("pageReady");
            tl.call(resetPage, [next], "pageReady");
            return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
        }

        // Prepare incoming Projects container at bottom of viewport (100%)
        gsap.set(next, {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            width: "100vw",
            height: "100dvh",
            backgroundColor: "#ffffff",
            zIndex: 2,
            autoAlpha: 1,
            yPercent: 100,
            force3D: true,
        });

        // While sliding in, all elements inside .navbar have 0 opacity
        // Suppress CSS transitions temporarily so CSS doesn't fight GSAP opacity tweens
        if (allNavTargets.length) {
            gsap.set(allNavTargets, {
                opacity: 0,
                transition: "none",
            });
        }
        if (filterItems.length) {
            gsap.set(filterItems, { y: 14 });
        }
        if (zoomBtns.length) {
            gsap.set(zoomBtns, { y: 14 });
        }

        // 1. Slide Projects Page in from bottom (at t = 0, matching Homepage push up)
        tl.to(
            next,
            {
                yPercent: 0,
                duration: slideDuration,
                ease: "smooth",
                force3D: true,
            },
            0
        );

        // 2. Start navbar, filters, and zoom animations right before the page hits the top
        const hitTopLead = 0.35; // lead time in seconds before slide completes
        tl.add("hitTop", Math.max(0, slideDuration - hitTopLead));

        if (navTop) {
            tl.to(
                navTop,
                {
                    opacity: 1,
                    duration: 0.4,
                    ease: "power2.out",
                },
                "hitTop"
            );
        }

        // 3. Filters float in (y: 14 -> 0, opacity: 0 -> 1) in a staggered manner
        if (filterItems.length) {
            tl.to(
                filterItems,
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.85,
                    stagger: staggerDefault,
                    ease: "power2.out",
                    force3D: true,
                },
                "hitTop"
            );
        }

        // 4. Zoom (+ and -) buttons float in slightly after filters start floating in
        if (zoomBtns.length) {
            const validZoomBtns = zoomBtns.filter(
                (btn) => window.getComputedStyle(btn).display !== "none"
            );
            if (validZoomBtns.length) {
                tl.to(
                    validZoomBtns,
                    {
                        opacity: (i, el) => (el.classList.contains("is-disabled") ? 0.3 : 1),
                        y: 0,
                        duration: 0.85,
                        stagger: staggerDefault,
                        ease: "power2.out",
                        force3D: true,
                    },
                    "hitTop+=0.35"
                );
            }
        }

        tl.add("pageReady");
        tl.call(
            () => {
                if (allNavTargets.length) {
                    gsap.set(allNavTargets, { clearProps: "opacity,transition,transform,y" });
                }
                resetPage(next);
            },
            null,
            "pageReady"
        );

        return new Promise((resolve) => {
            tl.call(resolve, null, "pageReady");
        });
    }

    // -----------------------------------------
    // BARBA HOOKS + INIT
    // -----------------------------------------

    barba.hooks.beforeEnter(async (data) => {
        // Position new container on top
        gsap.set(data.next.container, {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
        });

        if (lenis && typeof lenis.stop === "function") {
            lenis.stop();
        }

        // Sync Webflow <head> styles and execute incoming page's Before </body> script
        if (data.next.html) {
            await syncNextPageAssets(data.next.html, data.next.container);
        }

        initBeforeEnterFunctions(data.next.container);
        applyThemeFrom(data.next.container);
    });

    barba.hooks.afterLeave(() => {
        if (hasScrollTrigger) {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        }
    });

    barba.hooks.enter((data) => {
        initBarbaNavUpdate(data);
    });

    barba.hooks.afterEnter((data) => {
        initAfterEnterFunctions(data.next.container);

        if (lenis) {
            if (isLenisPage(data.next.container)) {
                lenis.resize();
                lenis.start();
            } else {
                lenis.stop();
            }
        }

        if (hasScrollTrigger) {
            ScrollTrigger.refresh();
        }
    });

    barba.init({
        debug: true, // Set to 'false' in production
        timeout: 7000,
        preventRunning: true,
        transitions: [
            // Specific Transition: Homepage -> Projects Page
            {
                name: "home-to-projects",
                sync: true,
                from: { namespace: ["home"] },
                to: { namespace: ["projects"] },

                async leave(data) {
                    return runHomeToProjectsLeave(data.current.container, data.next.container);
                },

                async enter(data) {
                    return runHomeToProjectsEnter(data.next.container);
                },
            },

            // Default Fallback Transition
            {
                name: "default",
                sync: true,

                async once(data) {
                    initOnceFunctions();
                    return runPageOnceAnimation(data.next.container);
                },

                async leave(data) {
                    return runPageLeaveAnimation(data.current.container, data.next.container);
                },

                async enter(data) {
                    return runPageEnterAnimation(data.next.container);
                },
            },
        ],
    });

    // -----------------------------------------
    // GENERIC + HELPERS
    // -----------------------------------------

    const themeConfig = {
        light: {
            nav: "dark",
            transition: "light",
        },
        dark: {
            nav: "light",
            transition: "dark",
        },
    };

    function applyThemeFrom(container) {
        const pageTheme = container?.dataset?.pageTheme || "light";
        const config = themeConfig[pageTheme] || themeConfig.light;

        document.body.dataset.pageTheme = pageTheme;
        const transitionEl = document.querySelector("[data-theme-transition]");
        if (transitionEl) {
            transitionEl.dataset.themeTransition = config.transition;
        }

        const nav = document.querySelector("[data-theme-nav]");
        if (nav) {
            nav.dataset.themeNav = config.nav;
        }
    }

    function initLenis() {
        if (lenis) return;
        if (!hasLenis) return;

        lenis = new Lenis({
            lerp: 0.165,
            wheelMultiplier: 1.25,
        });

        if (hasScrollTrigger) {
            lenis.on("scroll", ScrollTrigger.update);
        }

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    function resetPage(container) {
        window.scrollTo(0, 0);
        gsap.set(container, {
            clearProps: "position,top,left,right,width,height,zIndex,yPercent,transform",
        });

        if (lenis) {
            if (isLenisPage(container)) {
                lenis.resize();
                lenis.start();
            } else {
                lenis.stop();
            }
        }
    }

    // Releases Safari hardware video decoders when leaving a page
    function cleanupMediaInContainer(container) {
        if (!container) return;
        const videos = container.querySelectorAll("video");
        videos.forEach((v) => {
            try {
                v.pause();
                v.removeAttribute("src");
                v.load();
            } catch (e) { }
        });
    }

    // Automatically syncs Webflow page-specific <head> styles and executes page scripts
    async function syncNextPageAssets(nextHtml, nextContainer) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(nextHtml, "text/html");

            // 1. Sync <link rel="stylesheet">
            const links = doc.head.querySelectorAll('link[rel="stylesheet"]');
            links.forEach((link) => {
                const href = link.getAttribute("href");
                if (href && !document.head.querySelector(`link[href="${href}"]`)) {
                    document.head.appendChild(link.cloneNode(true));
                }
            });

            // 2. Sync inline <style> blocks from <head>
            const styles = doc.head.querySelectorAll("style");
            styles.forEach((style) => {
                const content = style.textContent.trim();
                if (!content) return;
                const exists = Array.from(document.head.querySelectorAll("style")).some(
                    (s) => s.textContent.trim() === content
                );
                if (!exists) {
                    const newStyle = document.createElement("style");
                    newStyle.textContent = content;
                    document.head.appendChild(newStyle);
                }
            });

            // 3. Load any external <script src="..."> in body (e.g. Swiper CDN) except transitions.js & Webflow core
            const externalScripts = Array.from(doc.body.querySelectorAll("script[src]"));
            for (const scr of externalScripts) {
                const src = scr.getAttribute("src") || "";
                if (
                    src.includes("transitions.js") ||
                    src.includes("webflow.") ||
                    src.includes("jquery")
                ) {
                    continue;
                }
                if (!document.querySelector(`script[src="${src}"]`)) {
                    await new Promise((resolve) => {
                        const s = document.createElement("script");
                        s.src = src;
                        s.onload = resolve;
                        s.onerror = resolve;
                        document.head.appendChild(s);
                    });
                }
            }

            // 4. Execute inline Before </body> page scripts (unwrap DOMContentLoaded so they run immediately)
            const inlineScripts = Array.from(doc.body.querySelectorAll("script:not([src])"));
            inlineScripts.forEach((scr) => {
                let code = scr.textContent || "";
                if (!code.trim()) return;

                // Replace document.addEventListener("DOMContentLoaded", fn) so fn executes immediately
                code = code.replace(
                    /document\.addEventListener\(\s*["']DOMContentLoaded["']\s*,\s*/g,
                    "((cb) => cb())("
                );

                try {
                    const runFn = new Function(code);
                    runFn();
                } catch (err) {
                    console.warn("⚠️ [Barba Page Script] Error running inline script:", err);
                }
            });
        } catch (err) {
            console.warn("⚠️ [Barba Asset Sync] Error syncing next page assets:", err);
        }
    }

    function debounceOnWidthChange(fn, ms) {
        let last = innerWidth,
            timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (innerWidth !== last) {
                    last = innerWidth;
                    fn.apply(this, args);
                }
            }, ms);
        };
    }

    function initBarbaNavUpdate(data) {
        var tpl = document.createElement("template");
        tpl.innerHTML = data.next.html.trim();
        var nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
        var currentNodes = document.querySelectorAll("nav [data-barba-update]");

        currentNodes.forEach(function (curr, index) {
            var next = nextNodes[index];
            if (!next) return;

            var newStatus = next.getAttribute("aria-current");
            if (newStatus !== null) {
                curr.setAttribute("aria-current", newStatus);
            } else {
                curr.removeAttribute("aria-current");
            }

            var newClassList = next.getAttribute("class") || "";
            curr.setAttribute("class", newClassList);
        });
    }

    // -----------------------------------------
    // YOUR FUNCTIONS GO BELOW HERE
    // -----------------------------------------
}