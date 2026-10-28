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

    if (typeof window.gsap !== "undefined" && typeof window.CustomEase !== "undefined" && typeof window.barba !== "undefined") {
        initOsmoBoilerplate();
    } else {
        loadDependencies()
            .then(initOsmoBoilerplate)
            .catch((err) => console.error("❌ [Osmo Transitions] Dependency load error:", err));
    }
})();


function initOsmoBoilerplate() {
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

    let staggerDefault = 0.12;
    let durationDefault = 0.8;
    let slideDuration = 1.35;

    CustomEase.create("smooth", "M0,0 C0.38,0.005 0.215,1 1,1");
    CustomEase.create("osmo", "0.625, 0.05, 0, 1");
    gsap.defaults({ ease: "power2.out", duration: durationDefault });

    if (!document.body.hasAttribute("data-barba")) {
        document.body.setAttribute("data-barba", "wrapper");
    }

    function isLenisPage(container) {
        const ns = container?.getAttribute("data-barba-namespace") || "";
        return ns === "index" || ns === "information" || ns === "info";
    }

    // -----------------------------------------
    // PAGE INITIALIZATION CONDUCTOR
    // -----------------------------------------
    function mountPage(container) {
        if (!container || container._isMounted) return;
        container._isMounted = true;
        const ns = container.getAttribute("data-barba-namespace") || "";

        if (ns === "home") {
            if (typeof window.initHome === "function") window.initHome(container);
        } else if (ns === "projects") {
            if (typeof window.initProjects === "function") window.initProjects(container);
        } else if (ns === "project-detail") {
            if (typeof window.initProjectDetails === "function") window.initProjectDetails(container);
        }
    }

    function unmountPage(container) {
        if (!container) return;
        container._isMounted = false;
        const ns = container.getAttribute("data-barba-namespace") || "";

        if (ns === "home") {
            if (typeof window.destroyHome === "function") window.destroyHome();
        } else if (ns === "projects") {
            if (typeof window.destroyProjects === "function") window.destroyProjects();
        } else if (ns === "project-detail") {
            if (typeof window.destroyProjectDetails === "function") window.destroyProjectDetails();
        }
    }

    function initOnceFunctions() {
        if (onceFunctionsInitialized) return;
        onceFunctionsInitialized = true;
    }

    function initBeforeEnterFunctions(next) {
        nextPage = next || document;
    }

    function initAfterEnterFunctions(next) {
        nextPage = next || document;
        mountPage(nextPage);

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
    // TRANSITIONS
    // -----------------------------------------
    function runPageOnceAnimation(next) {
        return new Promise((resolve) => {
            resetPage(next);
            resolve();
        });
    }

    function runPageLeaveAnimation(current, next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                unmountPage(current);
                cleanupMediaInContainer(current);
                current.remove();
                resolve();
            };

            if (reducedMotion) {
                gsap.set(current, { autoAlpha: 0 });
                done();
                return;
            }

            const tl = gsap.timeline({ onComplete: done });
            tl.to(current, { autoAlpha: 0, duration: 0.4, ease: "power2.out" });

            setTimeout(done, 700);
        });
    }

    function runPageEnterAnimation(next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                resetPage(next);
                resolve();
            };

            if (reducedMotion) {
                gsap.set(next, { autoAlpha: 1 });
                done();
                return;
            }

            const tl = gsap.timeline({ onComplete: done });
            tl.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, 0.15);

            setTimeout(done, 1000);
        });
    }

    // -----------------------------------------
    // HOME -> PROJECTS TRANSITION
    // -----------------------------------------
    function runHomeToProjectsLeave(current, next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                unmountPage(current);
                cleanupMediaInContainer(current);
                current.remove();
                resolve();
            };

            if (reducedMotion) {
                gsap.set(current, { autoAlpha: 0 });
                done();
                return;
            }

            gsap.set(current, {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                zIndex: 1,
            });

            const navHome = current.querySelector(".navbar-home");
            const projectInfo = current.querySelector(".home-project-info");
            const galleryStage = current.querySelector(".home-gallery-stage");

            const tl = gsap.timeline({ onComplete: done });

            if (navHome) {
                const navRect = navHome.getBoundingClientRect();
                const targetY = 16 - navRect.top;
                tl.to(navHome, { y: targetY, duration: slideDuration, ease: "power2.inOut", force3D: true }, 0);
            }

            if (projectInfo) {
                const infoRect = projectInfo.getBoundingClientRect();
                const targetY = 16 - infoRect.top;
                tl.to(projectInfo, { y: targetY, duration: slideDuration, ease: "power2.inOut", force3D: true }, 0);
            }

            if (galleryStage) {
                tl.to(galleryStage, { yPercent: -80, duration: slideDuration, ease: "power2.inOut", force3D: true }, 0);
            } else {
                tl.to(current, { yPercent: -80, duration: slideDuration, ease: "power2.inOut", force3D: true }, 0);
            }

            setTimeout(done, (slideDuration + 0.3) * 1000);
        });
    }

    function runHomeToProjectsEnter(next) {
        return new Promise((resolve) => {
            const isDesktop = window.innerWidth > 1024;
            const section = next.classList?.contains("projects-section") ? next : next.querySelector(".projects-section");


            // 1. Immediately position next offscreen so no initial state flashes
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

            // 2. Pause marquee and make stage visible
            if (section) {
                section.classList.add("is-marquee-paused");
                section.classList.add("is-ready");
                const stage = section.querySelector(".desktop-gallery-stage");
                if (stage) {
                    stage.style.opacity = "1";
                    stage.style.visibility = "visible";
                    stage.style.transition = "none";
                }
            }

            // 3. Mount projects engine so infinite track is built and positioned
            mountPage(next);

            const navbar = next.querySelector(".navbar");
            const navTop = navbar ? navbar.querySelector(".nav-top") : next.querySelector(".nav-top");

            const primaryFilters = Array.from(next.querySelectorAll(".primary-filter-list .filter-btn"));
            const subFilterList = next.querySelector(".sub-filter-list");
            const subFilters =
                subFilterList && subFilterList.classList.contains("is-visible")
                    ? Array.from(subFilterList.querySelectorAll(".sub-btn"))
                    : [];
            const filterItems = [...primaryFilters, ...subFilters];

            const zoomBtns = Array.from(next.querySelectorAll(".zoom-controls .btn-zoom-in, .zoom-controls .btn-zoom-out"));
            const allNavTargets = [navTop, ...filterItems, ...zoomBtns].filter(Boolean);

            // 4. Select the tagged Set 1 visible cards for staggered floating entrance
            let visibleCards = [];
            if (isDesktop && section) {
                const taggedCards = Array.from(section.querySelectorAll('.desktop-gallery-stage .project-card[data-initial-visible="true"]'));
                if (taggedCards.length) {
                    const viewportWidth = window.innerWidth;
                    const onScreen = taggedCards.filter((card) => {
                        const cardLeft = card.offsetLeft - (taggedCards[0]?.offsetLeft || 0);
                        return cardLeft < viewportWidth + 120;
                    });
                    visibleCards = onScreen.length ? onScreen : taggedCards.slice(0, 5);
                } else {
                    const allCards = Array.from(section.querySelectorAll(".desktop-gallery-stage .project-card"));
                    const setSize = Math.floor(allCards.length / 3);
                    visibleCards = setSize >= 1 ? allCards.slice(setSize, setSize + 5) : allCards.slice(0, 5);
                }
            }

            const mobileStage = !isDesktop && section ? section.querySelector(".mobile-gallery-stage") : null;

            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                if (section) {
                    section.classList.remove("is-marquee-paused");
                    section.classList.add("is-marquee-active");
                }
                if (allNavTargets.length) {
                    gsap.set(allNavTargets, { clearProps: "opacity,transition,transform,y" });
                }
                if (visibleCards.length) {
                    gsap.set(visibleCards, { clearProps: "opacity,transform,y,yPercent" });
                }
                if (mobileStage) {
                    gsap.set(mobileStage, { clearProps: "opacity,transform,y,yPercent" });
                }
                resetPage(next);
                resolve();
            };

            if (reducedMotion) {
                if (section) {
                    section.classList.remove("is-marquee-paused");
                    section.classList.add("is-marquee-active");
                }
                gsap.set(next, { autoAlpha: 1, yPercent: 0 });
                done();
                return;
            }

            if (allNavTargets.length) {
                gsap.set(allNavTargets, { opacity: 0, transition: "none" });
            }
            if (filterItems.length) gsap.set(filterItems, { y: 14 });
            if (zoomBtns.length) gsap.set(zoomBtns, { y: 14 });

            if (visibleCards.length) {
                gsap.set(visibleCards, { opacity: 0, yPercent: 60, force3D: true });
            }
            if (mobileStage) {
                gsap.set(mobileStage, { opacity: 0, yPercent: 20, force3D: true });
            }

            const tl = gsap.timeline({ onComplete: done });

            tl.to(next, { yPercent: 0, duration: slideDuration, ease: "power2.inOut", force3D: true }, 0);

            // Stagger entrance plays as the page rises into the viewport
            const cardsStart = 0.85;
            if (visibleCards.length) {
                tl.to(visibleCards, {
                    opacity: 1,
                    yPercent: 0,
                    duration: 0.85,
                    stagger: 0.10,
                    ease: "power2.out",
                    force3D: true,
                    onComplete: () => {
                        gsap.set(visibleCards, { clearProps: "opacity,transform,y,yPercent" });
                    },
                }, cardsStart);
            } else if (mobileStage) {
                tl.to(mobileStage, {
                    opacity: 1,
                    yPercent: 0,
                    duration: 0.6,
                    ease: "power2.out",
                    force3D: true,
                    onComplete: () => {
                        gsap.set(mobileStage, { clearProps: "opacity,transform,y,yPercent" });
                    },
                }, cardsStart + 0.08); // delays mobile float-in
            }

            // Release marquee movement right as cards arrive into place (no awkward static pause)
            const marqueeReleaseTime = 1.60;
            tl.add("releaseMarquee", marqueeReleaseTime);
            tl.call(() => {
                if (section) {
                    section.classList.remove("is-marquee-paused");
                    section.classList.add("is-marquee-active");
                }
            }, null, "releaseMarquee");

            const hitTopLead = 0.35;
            const hitTopTime = Math.max(0, slideDuration - hitTopLead);

            if (navTop) {
                tl.to(navTop, { opacity: 1, duration: 0.4, ease: "power2.out" }, hitTopTime);
            }

            if (filterItems.length) {
                tl.to(filterItems, { opacity: 1, y: 0, duration: 0.85, stagger: staggerDefault, ease: "power2.out", force3D: true }, hitTopTime);
            }

            if (zoomBtns.length) {
                const validZoomBtns = zoomBtns.filter((btn) => window.getComputedStyle(btn).display !== "none");
                if (validZoomBtns.length) {
                    tl.to(validZoomBtns, {
                        opacity: (i, el) => (el.classList.contains("is-disabled") ? 0.3 : 1),
                        y: 0,
                        duration: 0.85,
                        stagger: staggerDefault,
                        ease: "power2.out",
                        force3D: true,
                    }, hitTopTime + 0.20);
                }
            }

            // Guaranteed resolution fallback for Safari
            setTimeout(done, (slideDuration + 0.9) * 1000);
        });
    }

    // -----------------------------------------
    // PROJECTS -> HOME TRANSITION (REVERSE)
    // -----------------------------------------
    function runProjectsToHomeLeave(current, next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                unmountPage(current);
                cleanupMediaInContainer(current);
                current.remove();
                resolve();
            };

            if (reducedMotion) {
                gsap.set(current, { autoAlpha: 0 });
                done();
                return;
            }

            // Projects stays on top (zIndex: 2) as it slides down out of view
            gsap.set(current, {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                backgroundColor: "#ffffff",
                zIndex: 2,
                force3D: true,
            });

            const section = current.classList?.contains("projects-section") ? current : current.querySelector(".projects-section");
            if (section) {
                section.classList.add("is-marquee-paused");
            }

            const navbar = current.querySelector(".navbar");
            const navTop = navbar ? navbar.querySelector(".nav-top") : current.querySelector(".nav-top");
            const filterList = current.querySelector(".primary-filter-list");
            const subFilterList = current.querySelector(".sub-filter-list");
            const zoomControls = current.querySelector(".zoom-controls");

            const desktopStage = current.querySelector(".desktop-gallery-stage");
            const mobileStage = current.querySelector(".mobile-gallery-stage");
            const galleryStage = desktopStage || mobileStage;

            const tl = gsap.timeline({ onComplete: done });

            // 1. Projects container slides downward off-screen
            tl.to(current, {
                yPercent: 100,
                duration: slideDuration,
                ease: "power2.inOut",
                force3D: true,
            }, 0);

            // 2. Subtle internal parallax: gallery stage drifts downward slightly for momentum
            if (galleryStage) {
                tl.to(galleryStage, {
                    yPercent: 15,
                    duration: slideDuration,
                    ease: "power2.inOut",
                    force3D: true,
                }, 0);
            }

            // 3. Gracefully fade out nav & filter controls as page descends
            const navElements = [navTop, filterList, subFilterList, zoomControls].filter(Boolean);
            if (navElements.length) {
                tl.to(navElements, {
                    opacity: 0,
                    y: 12,
                    duration: 0.45,
                    ease: "power2.out",
                }, 0.05);
            }

            // Guaranteed resolution fallback for Safari
            setTimeout(done, (slideDuration + 0.3) * 1000);
        });
    }

    function runProjectsToHomeEnter(next) {
        return new Promise((resolve) => {
            // Neutralize any editorial curtain overlay on the incoming home page so it appears immediately
            const curtain = next.querySelector(".home-curtain");
            if (curtain) {
                curtain.classList.add("is-revealed");
                curtain.style.display = "none";
            }

            // Position Home underneath (zIndex: 1)
            gsap.set(next, {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                width: "100vw",
                height: "100dvh",
                zIndex: 1,
                autoAlpha: 1,
                force3D: true,
            });

            // Mount home engine so infinite track is laid out & center slide is calibrated
            mountPage(next);

            const galleryStage = next.querySelector(".home-gallery-stage");
            const navHome = next.querySelector(".navbar-home");
            const projectInfo = next.querySelector(".home-project-info");

            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                if (galleryStage) {
                    gsap.set(galleryStage, { clearProps: "transform,y,yPercent" });
                }
                if (navHome) {
                    gsap.set(navHome, { clearProps: "transform,y,opacity" });
                }
                if (projectInfo) {
                    gsap.set(projectInfo, { clearProps: "transform,y,opacity" });
                }
                resetPage(next);
                resolve();
            };

            if (reducedMotion) {
                gsap.set(next, { autoAlpha: 1, yPercent: 0 });
                done();
                return;
            }

            // Homepage slides back down into view from above (-40% -> 0%)
            if (galleryStage) {
                gsap.set(galleryStage, { yPercent: -40, force3D: true });
            } else {
                gsap.set(next, { yPercent: -40, force3D: true });
            }

            let navStartY = 0;
            let infoStartY = 0;

            if (navHome) {
                const navRect = navHome.getBoundingClientRect();
                navStartY = 16 - navRect.top;
                gsap.set(navHome, { y: navStartY, opacity: 1, force3D: true });
            }
            if (projectInfo) {
                const infoRect = projectInfo.getBoundingClientRect();
                infoStartY = 16 - infoRect.top;
                gsap.set(projectInfo, { y: infoStartY, opacity: 1, force3D: true });
            }

            const tl = gsap.timeline({ onComplete: done });

            if (galleryStage) {
                tl.to(galleryStage, {
                    yPercent: 0,
                    duration: slideDuration,
                    ease: "power2.inOut",
                    force3D: true,
                }, 0);
            } else {
                tl.to(next, {
                    yPercent: 0,
                    duration: slideDuration,
                    ease: "power2.inOut",
                    force3D: true,
                }, 0);
            }

            if (navHome) {
                tl.to(navHome, {
                    y: 0,
                    duration: slideDuration,
                    ease: "power2.inOut",
                    force3D: true,
                }, 0);
            }

            if (projectInfo) {
                tl.to(projectInfo, {
                    y: 0,
                    duration: slideDuration,
                    ease: "power2.inOut",
                    force3D: true,
                }, 0);
            }

            // Guaranteed resolution fallback for Safari
            setTimeout(done, (slideDuration + 0.6) * 1000);
        });
    }

    // -----------------------------------------
    // HOME/PROJECTS -> PROJECT DETAILS TRANSITION
    // -----------------------------------------
    let pushDuration = 1.2;

    function runToProjectDetailLeave(current, next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                unmountPage(current);
                cleanupMediaInContainer(current);
                current.remove();
                resolve();
            };

            if (reducedMotion) {
                gsap.set(current, { autoAlpha: 0 });
                done();
                return;
            }

            gsap.set(current, {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                zIndex: 1,
                overflow: "hidden",
                force3D: true,
            });

            // Pause marquee if leaving projects overview
            const section = current.classList?.contains("projects-section")
                ? current
                : current.querySelector(".projects-section");
            if (section) {
                section.classList.add("is-marquee-paused");
            }

            const tl = gsap.timeline({ onComplete: done });

            // Push current page smoothly towards left with parallax (-80%)
            tl.to(current, {
                xPercent: -80,
                duration: pushDuration,
                ease: "power2.inOut",
                force3D: true,
            }, 0);

            setTimeout(done, (pushDuration + 0.5) * 1000);
        });
    }

    function runToProjectDetailEnter(next) {
        return new Promise((resolve) => {
            // Position project details off-screen to the right
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
                xPercent: 100,
                overflow: "hidden",
                force3D: true,
            });

            // Mount project details engine so Swiper and media are initialized
            mountPage(next);

            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                resetPage(next);

                // Calibrate Swiper dimensions after container resets to normal layout
                const mainEl = next.querySelector(".main-swiper");
                if (mainEl && mainEl.swiper) {
                    try { mainEl.swiper.update(); } catch (e) { }
                }
                const thumbEl = next.querySelector(".thumb-swiper");
                if (thumbEl && thumbEl.swiper) {
                    try { thumbEl.swiper.update(); } catch (e) { }
                }
                window.dispatchEvent(new Event("resize"));

                resolve();
            };

            if (reducedMotion) {
                gsap.set(next, { autoAlpha: 1, xPercent: 0 });
                done();
                return;
            }

            const tl = gsap.timeline({ onComplete: done });

            // Smooth appear from right to left
            tl.to(next, {
                xPercent: 0,
                duration: pushDuration,
                ease: "power2.inOut",
                force3D: true,
            }, 0);

            setTimeout(done, (pushDuration + 0.5) * 1000);
        });
    }

    // -----------------------------------------
    // PROJECT DETAILS -> HOME/PROJECTS (REVERSE PUSH)
    // -----------------------------------------
    function runFromProjectDetailLeave(current, next) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                unmountPage(current);
                cleanupMediaInContainer(current);
                current.remove();
                resolve();
            };

            if (reducedMotion) {
                gsap.set(current, { autoAlpha: 0 });
                done();
                return;
            }

            gsap.set(current, {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                backgroundColor: "#ffffff",
                zIndex: 2,
                overflow: "hidden",
                force3D: true,
            });

            const tl = gsap.timeline({ onComplete: done });

            // Slide project details out towards right
            tl.to(current, {
                xPercent: 100,
                duration: pushDuration,
                ease: "power2.inOut",
                force3D: true,
            }, 0);

            setTimeout(done, (pushDuration + 0.5) * 1000);
        });
    }

    function runFromProjectDetailEnter(next) {
        return new Promise((resolve) => {
            const nextNs = next.getAttribute("data-barba-namespace") || "";
            const isProjects = nextNs === "projects";
            const isHome = nextNs === "home";

            // If entering home, remove editorial curtain overlay
            if (isHome) {
                const curtain = next.querySelector(".home-curtain");
                if (curtain) {
                    curtain.classList.add("is-revealed");
                    curtain.style.display = "none";
                }
            }

            const projectsSection = isProjects
                ? (next.classList?.contains("projects-section") ? next : next.querySelector(".projects-section"))
                : null;

            if (projectsSection) {
                projectsSection.classList.add("is-marquee-paused");
                projectsSection.classList.add("is-ready");
                const stage = projectsSection.querySelector(".desktop-gallery-stage");
                if (stage) {
                    stage.style.opacity = "1";
                    stage.style.visibility = "visible";
                    stage.style.transition = "none";
                }
            }

            // Position next container off-screen to the left with parallax (-80%)
            gsap.set(next, {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                width: "100vw",
                height: "100dvh",
                backgroundColor: "#ffffff",
                zIndex: 1,
                autoAlpha: 1,
                xPercent: -80,
                overflow: "hidden",
                force3D: true,
            });

            mountPage(next);

            let resolved = false;
            const done = () => {
                if (resolved) return;
                resolved = true;
                if (projectsSection) {
                    projectsSection.classList.remove("is-marquee-paused");
                    projectsSection.classList.add("is-marquee-active");
                }
                resetPage(next);
                window.dispatchEvent(new Event("resize"));
                resolve();
            };

            if (reducedMotion) {
                if (projectsSection) {
                    projectsSection.classList.remove("is-marquee-paused");
                    projectsSection.classList.add("is-marquee-active");
                }
                gsap.set(next, { autoAlpha: 1, xPercent: 0 });
                done();
                return;
            }

            const tl = gsap.timeline({ onComplete: done });

            // Slide previous page back into view from left to center
            tl.to(next, {
                xPercent: 0,
                duration: pushDuration,
                ease: "power2.inOut",
                force3D: true,
            }, 0);

            setTimeout(done, (pushDuration + 0.5) * 1000);
        });
    }

    // -----------------------------------------
    // BARBA HOOKS & INIT
    // -----------------------------------------
    barba.hooks.beforeEnter(async (data) => {
        const nextNs = data.next.container?.getAttribute("data-barba-namespace") || "";
        const currentNs = data.current.container?.getAttribute("data-barba-namespace") || "";

        // Synchronize body classes (e.g. .homepage has black background in Webflow)
        if (nextNs === "home") {
            document.body.classList.add("homepage");
        } else {
            document.body.classList.remove("homepage");
        }

        const initialProps = {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "100svh",
            overflow: "clip",
        };

        if (nextNs === "project-detail") {
            initialProps.xPercent = 100;
        } else if (nextNs === "projects" && currentNs === "home") {
            initialProps.yPercent = 100;
        } else if (currentNs === "project-detail" && (nextNs === "projects" || nextNs === "home")) {
            initialProps.xPercent = -80;
        }

        gsap.set(data.next.container, initialProps);

        if (lenis && typeof lenis.stop === "function") {
            lenis.stop();
        }

        initBeforeEnterFunctions(data.next.container);
        applyThemeFrom(data.next.container);
    });

    barba.hooks.beforeLeave((data) => {
        unmountPage(data.current.container);
    });

    barba.hooks.afterLeave((data) => {
        if (hasScrollTrigger) {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        }
    });

    barba.hooks.enter((data) => {
        initBarbaNavUpdate(data);
    });

    barba.hooks.afterEnter((data) => {
        initAfterEnterFunctions(data.next.container);
    });

    if (typeof window.barbaPrefetch !== "undefined") {
        try {
            barba.use(window.barbaPrefetch);
        } catch (e) { }
    }

    barba.init({
        debug: false,
        timeout: 7000,
        preventRunning: true,
        transitions: [
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
            {
                name: "projects-to-home",
                sync: true,
                from: { namespace: ["projects"] },
                to: { namespace: ["home"] },
                async leave(data) {
                    return runProjectsToHomeLeave(data.current.container, data.next.container);
                },
                async enter(data) {
                    return runProjectsToHomeEnter(data.next.container);
                },
            },
            {
                name: "to-project-detail",
                sync: true,
                from: { namespace: ["home", "projects"] },
                to: { namespace: ["project-detail"] },
                async leave(data) {
                    return runToProjectDetailLeave(data.current.container, data.next.container);
                },
                async enter(data) {
                    return runToProjectDetailEnter(data.next.container);
                },
            },
            {
                name: "from-project-detail",
                sync: true,
                from: { namespace: ["project-detail"] },
                to: { namespace: ["home", "projects"] },
                async leave(data) {
                    return runFromProjectDetailLeave(data.current.container, data.next.container);
                },
                async enter(data) {
                    return runFromProjectDetailEnter(data.next.container);
                },
            },
            {
                name: "default",
                sync: true,
                async once(data) {
                    initOnceFunctions();
                    mountPage(data.next.container);
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

    // Safari back-forward cache (bfcache) restore handler
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            history.scrollRestoration = "manual";
            const container = document.querySelector('[data-barba="container"]');
            if (container) {
                container._isMounted = false;
                mountPage(container);
            }
        }
    });

    const themeConfig = {
        light: { nav: "dark", transition: "light" },
        dark: { nav: "light", transition: "dark" },
    };

    function applyThemeFrom(container) {
        const pageTheme = container?.dataset?.pageTheme || "light";
        const config = themeConfig[pageTheme] || themeConfig.light;
        document.body.dataset.pageTheme = pageTheme;
    }

    function resetPage(container) {
        window.scrollTo(0, 0);
        gsap.set(container, {
            clearProps: "position,top,left,right,width,height,zIndex,yPercent,xPercent,transform,overflow,backgroundColor",
        });
    }

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

    function initBarbaNavUpdate(data) {
        const tpl = document.createElement("template");
        tpl.innerHTML = data.next.html.trim();
        const nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
        const currentNodes = document.querySelectorAll("nav [data-barba-update]");

        currentNodes.forEach(function (curr, index) {
            const next = nextNodes[index];
            if (!next) return;
            const newStatus = next.getAttribute("aria-current");
            if (newStatus !== null) curr.setAttribute("aria-current", newStatus);
            else curr.removeAttribute("aria-current");
            const newClassList = next.getAttribute("class") || "";
            curr.setAttribute("class", newClassList);
        });
    }
}