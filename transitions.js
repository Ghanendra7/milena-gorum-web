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

    let staggerDefault = 0.05;
    let durationDefault = 0.6;

    CustomEase.create("osmo", "0.625, 0.05, 0, 1");
    gsap.defaults({ ease: "osmo", duration: durationDefault });

    // Ensure body has data-barba="wrapper" if not set in Webflow Designer
    if (!document.body.hasAttribute("data-barba")) {
        document.body.setAttribute("data-barba", "wrapper");
    }

    // Only run Lenis on vertical-scroll pages (Index & Information), keep stopped on 100dvh canvas pages
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

        // Runs once on first load
        // if (has('[data-something]')) initSomething();
    }

    function initBeforeEnterFunctions(next) {
        nextPage = next || document;

        // Runs before the enter animation
        // if (has('[data-something]')) initSomething();
    }

    function initAfterEnterFunctions(next) {
        nextPage = next || document;

        // Runs after enter animation completes
        // if (has('[data-something]')) initSomething();

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
    // PAGE TRANSITIONS
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
                current.remove();
            },
        });

        if (reducedMotion) {
            // Immediate swap behavior if user prefers reduced motion
            return tl.set(current, { autoAlpha: 0 });
        }

        tl.to(current, { autoAlpha: 0, duration: 0.4 });

        return tl;
    }

    function runPageEnterAnimation(next) {
        const tl = gsap.timeline();

        if (reducedMotion) {
            // Immediate swap behavior if user prefers reduced motion
            tl.set(next, { autoAlpha: 1 });
            tl.add("pageReady");
            tl.call(resetPage, [next], "pageReady");
            return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
        }

        tl.add("startEnter", 0.6);

        tl.fromTo(
            next,
            {
                autoAlpha: 0,
            },
            {
                autoAlpha: 1,
            },
            "startEnter"
        );

        tl.add("pageReady");
        tl.call(resetPage, [next], "pageReady");

        return new Promise((resolve) => {
            tl.call(resolve, null, "pageReady");
        });
    }

    // -----------------------------------------
    // BARBA HOOKS + INIT
    // -----------------------------------------

    barba.hooks.beforeEnter((data) => {
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
        // Run page functions
        initAfterEnterFunctions(data.next.container);

        // Settle
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
            {
                name: "default",
                sync: true,

                // First load
                async once(data) {
                    initOnceFunctions();

                    return runPageOnceAnimation(data.next.container);
                },

                // Current page leaves
                async leave(data) {
                    return runPageLeaveAnimation(data.current.container, data.next.container);
                },

                // New page enters
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
        if (lenis) return; // already created
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
        gsap.set(container, { clearProps: "position,top,left,right" });

        if (lenis) {
            if (isLenisPage(container)) {
                lenis.resize();
                lenis.start();
            } else {
                lenis.stop();
            }
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

            // Aria-current sync
            var newStatus = next.getAttribute("aria-current");
            if (newStatus !== null) {
                curr.setAttribute("aria-current", newStatus);
            } else {
                curr.removeAttribute("aria-current");
            }

            // Class list sync
            var newClassList = next.getAttribute("class") || "";
            curr.setAttribute("class", newClassList);
        });
    }

}