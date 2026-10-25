/**
 * Milena Gorum - Global Barba.js & GSAP Transition Engine
 * Hosted on Cloudflare Edge (transitions.js)
 */

(function () {
    console.log("⚡ [Transitions Engine] transitions.js loaded from Cloudflare Edge");

    // 1. Helper to dynamically load external dependencies
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                return resolve();
            }
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // 2. Load Barba Core & GSAP
    Promise.all([
        loadScript("https://unpkg.com/@barba/core"),
        loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js")
    ])
        .then(() => {
            console.log("✅ [Transitions Engine] Barba Core & GSAP loaded successfully");
            initBarba();
        })
        .catch((err) => {
            console.error("❌ [Transitions Engine] Failed to load Barba or GSAP:", err);
        });

    // 3. Initialize Barba Engine
    function initBarba() {
        if (typeof barba === "undefined" || typeof gsap === "undefined") {
            console.error("❌ Barba or GSAP is not available in window scope");
            return;
        }

        // Ensure data-barba="wrapper" exists on body if not set in Designer
        if (!document.body.hasAttribute("data-barba")) {
            document.body.setAttribute("data-barba", "wrapper");
        }

        barba.init({
            debug: true,
            timeout: 7000,
            preventRunning: true,

            // Prevent Barba on external links or anchor jumps
            prevent: ({ el, href }) => {
                if (!href) return true;
                if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return true;
                if (el && el.hasAttribute("data-barba-prevent")) return true;
                return false;
            },

            // Global Transitions
            transitions: [
                {
                    name: "baseline-test-transition",

                    // Initial page load
                    once({ next }) {
                        console.log(`🎬 [Barba Once] Initial page loaded: namespace "${next.namespace}"`);
                        return gsap.from(next.container, {
                            opacity: 0,
                            duration: 0.5,
                            ease: "power2.out"
                        });
                    },

                    // Leaving the current page
                    leave({ current }) {
                        console.log(`🚪 [Barba Leave] Leaving page: namespace "${current.namespace}"`);
                        return gsap.to(current.container, {
                            opacity: 0,
                            duration: 0.4,
                            ease: "power1.inOut"
                        });
                    },

                    // Entering the new page
                    enter({ next }) {
                        console.log(`✨ [Barba Enter] Entering page: namespace "${next.namespace}"`);
                        window.scrollTo(0, 0);
                        return gsap.fromTo(
                            next.container,
                            { opacity: 0 },
                            { opacity: 1, duration: 0.4, ease: "power1.inOut" }
                        );
                    }
                }
            ],

            // Views for Page-Specific Hooks
            views: [
                {
                    namespace: "home",
                    beforeEnter() {
                        console.log("🏠 [View] Home page mounted");
                    },
                    beforeLeave() {
                        console.log("🏠 [View] Home page unmounting");
                    }
                },
                {
                    namespace: "projects",
                    beforeEnter() {
                        console.log("📁 [View] Projects page mounted");
                    },
                    beforeLeave() {
                        console.log("📁 [View] Projects page unmounting");
                    }
                },
                {
                    namespace: "project-detail",
                    beforeEnter() {
                        console.log("🔍 [View] Project Details page mounted");
                    },
                    beforeLeave() {
                        console.log("🔍 [View] Project Details page unmounting");
                    }
                }
            ]
        });

        console.log("🚀 [Transitions Engine] Barba initialized and listening for page changes!");
    }
})();