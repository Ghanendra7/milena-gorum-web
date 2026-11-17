/**
 * Milena Gorum - Projects Overview Engine (Complete Studio Logic)
 * Hosted on Cloudflare Pages (projects.js)
 */

(function () {
    let projectsRafId = null;
    let projectsAbortController = null;
    let projectsScope = null;
    let projectsMarqueeDelayTimer = null;
    let projectsDesktopHoverTimer = null;
    let projectsMobileVideoTimer = null;
    let mobileMainSwiper = null;
    let activeHeaderMarqueeTimeline = null;
    let activeHeaderMarqueeCard = null;

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
        if (scope && scope._isProjectsMounted) return;
        if (section && section._isProjectsMounted) return;

        destroyProjects();

        if (scope) {
            scope._isProjectsMounted = true;
            scope._isMounted = true;
        }
        if (section) {
            section._isProjectsMounted = true;
            section._isMounted = true;
        }
        projectsScope = section || scope;

        projectsAbortController = new AbortController();
        const { signal } = projectsAbortController;

        const BUNNY_STREAM_BASE = "https://vz-ada4eb16-135.b-cdn.net";
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
        const MARQUEE_START_DELAY = 1500;
        let isMarqueeDelayed = true;

        const KNOWN_PROJECT_ASPECTS = {
            "adela": "1080 / 1080",
            "adidas-training": "2540 / 1200",
            "adidas-x-thug-club": "1920 / 1080",
            "aldo-x-hype-beast": "1422 / 800",
            "angel-du-t": "1276 / 720",
            "armani": "1280 / 720",
            "armani-2": "750 / 1000",
            "autre-magazine": "750 / 1000",
            "away": "750 / 500",
            "away-luggage": "1920 / 1080",
            "bella-hadid": "1280 / 720",
            "benito-skinner": "1080 / 1920",
            "blanc": "874 / 1080",
            "blank-st-coffee": "750 / 497",
            "blank-street": "1440 / 1800",
            "blank-street-coffee": "750 / 500",
            "blank-street-coffee-af6f6": "640 / 800",
            "blonder-promo": "796 / 1200",
            "cero-magazine": "750 / 912",
            "charli-xcx": "1000 / 750",
            "charli-xcx-0f8d4": "1918 / 1080",
            "charli-xcx-x-converse": "4096 / 2304",
            "chubb": "1040 / 720",
            "conan-gray": "720 / 404",
            "conan-gray-disaster": "720 / 404",
            "cosmopolitan-magazine": "1800 / 2400",
            "cr-fashion-book": "750 / 938",
            "cr-fashion-book-d897c": "1500 / 1875",
            "crocs": "2560 / 1440",
            "danile-guizio": "800 / 1000",
            "del-water-gap-promo": "960 / 1200",
            "demi-lovato": "1572 / 1080",
            "demi-lovato-7ca5f": "1572 / 1080",
            "demi-lovato-d997d": "1080 / 1350",
            "denim-tears": "760 / 1000",
            "domina-journal": "1206 / 1781",
            "elle-usa": "940 / 940",
            "emcee-studios": "750 / 951",
            "emcee-studios-ottolinger": "750 / 951",
            "eqt": "1280 / 720",
            "famille-du-vin": "750 / 500",
            "fry-powers": "1010 / 1200",
            "gant": "1920 / 1080",
            "glamour-magazine": "960 / 1200",
            "grailed": "750 / 500",
            "grazia-china": "900 / 1200",
            "hardpack-magazine": "2400 / 1947",
            "highsnobiety": "1080 / 1350",
            "highsnobiety-6ee11": "750 / 1004",
            "hube-magazine": "1440 / 1172",
            "hydro-flask-x-role-model": "1920 / 1080",
            "id-magazine": "1080 / 1350",
            "invasive-modification": "1920 / 2400",
            "jins": "727 / 800",
            "katseye": "1650 / 1254",
            "khloe-xo": "1280 / 720",
            "king-kong-magazine": "1440 / 1070",
            "kith-winter-25": "1080 / 1440",
            "l-officiel": "766 / 1000",
            "last-american-pastoral-photography-by-chris-glickman-published-by-friend-editions": "1080 / 720",
            "le-monde-gourmet": "1920 / 2400",
            "lexa-gates": "2560 / 1700",
            "louis-vuitton": "1080 / 1350",
            "louis-vuitton-cruise-27": "1080 / 1350",
            "macallan": "1200 / 800",
            "mother-denim": "1920 / 1080",
            "netflix-earle-meets-world": "645 / 475",
            "new-balance": "1080 / 756",
            "nike-us-national-team": "750 / 935",
            "nike-us-national-team-5333c": "750 / 1121",
            "numero-netherlands": "925 / 1200",
            "numero-netherlands-6ac8d": "920 / 1200",
            "numero-russia": "761 / 1000",
            "ocean-drive-magazine": "1440 / 1722",
            "odda-magazine": "1500 / 1875",
            "office-magazine": "750 / 937",
            "olivia-rodrigo": "1496 / 1000",
            "olivia-rodrigo-d3c4e": "1080 / 608",
            "open-spaces": "750 / 904",
            "open-spaces-magazine-1ee2f": "750 / 938",
            "paper-magazine-jt": "1440 / 1800",
            "paper-magazine-rose": "750 / 938",
            "present-space-magazine": "1840 / 2400",
            "present-space-x-tiffany-co": "1276 / 718",
            "prototype-magazine": "2400 / 1576",
            "reale-actives": "1080 / 1440",
            "reale-actives-a9646": "1920 / 1080",
            "redone-denim": "1276 / 720",
            "regime-des-fleurs": "1920 / 2400",
            "revolve": "1280 / 1600",
            "role-model": "2400 / 1783",
            "role-model-e1bd4": "2400 / 1769",
            "ros": "2880 / 2160",
            "rowing-blazers-x-fila": "975 / 1200",
            "royel-otis-aa5b9": "1500 / 995",
            "salt-stone": "1920 / 1080",
            "sandy-liang": "750 / 497",
            "sandy-liang-5c590": "1280 / 720",
            "sandy-liang-a9cc0": "1920 / 2400",
            "sandy-liang-c8bd2": "750 / 977",
            "sandy-liang-holiday": "1500 / 1115",
            "shadowplay-magazine": "1840 / 2400",
            "snuff-magazine": "750 / 487",
            "tame-impala": "750 / 538",
            "tame-impala-4175d": "750 / 750",
            "thom-browne": "1916 / 1080",
            "thom-browne-76cb8": "960 / 540",
            "thom-browne-met-gala-24": "750 / 938",
            "tropic-of-c-x-victorias-secret-havana-drop": "1440 / 1769",
            "tropic-of-c-x-victorias-secret-malibu": "1000 / 1250",
            "tropic-of-c-x-victorias-secret-swim-drop": "1440 / 1920",
            "twin-magazine": "750 / 526",
            "unove": "1920 / 1080",
            "urban-outfitters-nye": "1208 / 800",
            "vanity-fair": "804 / 1000",
            "velveeta-liquid-gold": "2048 / 1463",
            "velvet": "1920 / 1080",
            "vogue-china": "750 / 935",
            "vogue-china-58890": "720 / 878",
            "vogue-japan": "1080 / 1350",
            "vogue-phillipines": "750 / 1000",
            "vogue-x-google": "960 / 720",
            "vogue-x-meta": "1276 / 718",
            "vogue-x-sabrina-carpenter": "1920 / 1080",
            "vuori": "3000 / 3677",
            "vuori-aabca": "1920 / 1080",
            "what-goes-around-comes-around": "4096 / 3072",
            "who-what-wear": "912 / 1200",
            "wsj": "750 / 930",
            "wsj-0b9ca": "1280 / 720",
            "wsj-sydney-sweeney": "750 / 930",
        };

        const startMarqueeDelay = () => {
            if (projectsMarqueeDelayTimer) clearTimeout(projectsMarqueeDelayTimer);
            isMarqueeDelayed = true;
            projectsMarqueeDelayTimer = setTimeout(() => {
                isMarqueeDelayed = false;
                projectsMarqueeDelayTimer = null;
            }, MARQUEE_START_DELAY);
        };
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

        let isRestoreFromDetail = false;
        let restoreSlug = "";
        let restoreUrl = "";
        let restoreNum = "";
        let savedScroll = null;
        let restoredFilterParent = "";
        let restoredFilterSub = "";
        try {
            isRestoreFromDetail = sessionStorage.getItem("mg_restore_from_detail") === "true";
            if (isRestoreFromDetail) {
                restoreSlug = (sessionStorage.getItem("mg_restore_project_slug") || "").trim().toLowerCase();
                restoreUrl = (sessionStorage.getItem("mg_restore_project_url") || "").trim().toLowerCase();
                restoreNum = (sessionStorage.getItem("mg_restore_project_num") || "").trim();
                savedScroll = sessionStorage.getItem("mg_projects_saved_scroll");
                restoredFilterParent = sessionStorage.getItem("mg_restore_filter_parent") || "";
                restoredFilterSub = sessionStorage.getItem("mg_restore_filter_sub") || "";
            }
        } catch (_) { }

        const clearRestorationState = () => {
            isRestoreFromDetail = false;
            restoreSlug = "";
            restoreUrl = "";
            restoreNum = "";
            savedScroll = null;
            restoredFilterParent = "";
            restoredFilterSub = "";
            try {
                sessionStorage.removeItem("mg_restore_from_detail");
                sessionStorage.removeItem("mg_projects_saved_scroll");
                sessionStorage.removeItem("mg_restore_project_slug");
                sessionStorage.removeItem("mg_restore_project_url");
                sessionStorage.removeItem("mg_restore_project_num");
                sessionStorage.removeItem("mg_restore_filter_parent");
                sessionStorage.removeItem("mg_restore_filter_sub");
            } catch (_) { }
        };

        const formatNum = (str) => {
            const clean = (str || "").trim();
            if (!clean) return "";
            const num = parseInt(clean, 10);
            return !isNaN(num) ? String(num).padStart(2, "0") : clean;
        };

        const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const TYPE_ALIASES = {
            image: "still",
            images: "still",
            still: "still",
            stills: "still",
            motion: "motion",
            all: "all"
        };

        const canonicalizeType = (token) => {
            const norm = normalize(token);
            return TYPE_ALIASES[norm] || norm;
        };

        const parseCardTypes = (rawType) => {
            const normFull = normalize(rawType);
            if (!normFull) return [];
            if (normFull === "both" || normFull === "all") {
                return ["motion", "still"];
            }

            const types = new Set();
            String(rawType || "")
                .split(/[,&+/|]+|\band\b/i)
                .map(canonicalizeType)
                .filter(Boolean)
                .forEach((t) => types.add(t));

            if (normFull.includes("motion")) types.add("motion");
            if (normFull.includes("still") || normFull.includes("image")) types.add("still");

            return Array.from(types);
        };

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

        const prepareCard = (card) => {
            card.classList.add("project-card");
            const numEl = card.querySelector(".project-number-text, .project-num, .project-number");
            if (numEl) numEl.textContent = formatNum(numEl.textContent);

            // Ensure project-texts-wrap & project-texts-inner exist for marquee
            let textsWrap = card.querySelector(".project-texts-wrap");
            if (!textsWrap) {
                const clientEl = card.querySelector(".project-client");
                const subtitleEl = card.querySelector(".project-subtitle");
                if (clientEl) {
                    textsWrap = document.createElement("div");
                    textsWrap.className = "project-texts-wrap";
                    clientEl.parentNode.insertBefore(textsWrap, clientEl);
                    textsWrap.appendChild(clientEl);
                    if (subtitleEl) textsWrap.appendChild(subtitleEl);
                }
            }
            if (textsWrap && !textsWrap.querySelector(".project-texts-inner")) {
                const inner = document.createElement("span");
                inner.className = "project-texts-inner";
                while (textsWrap.firstChild) {
                    inner.appendChild(textsWrap.firstChild);
                }
                textsWrap.appendChild(inner);
            }

            const nestedTags = Array.from(card.querySelectorAll(".card-sub-tag")).map((el) => el.textContent);
            const attrTags = (card.getAttribute("data-subcategories") || "").split(",");
            const combinedTags = [...nestedTags, ...attrTags];

            card.dataset.normalizedSubs = combinedTags
                .map(normalize)
                .filter(Boolean)
                .join("|");

            card.dataset.normalizedTypes = parseCardTypes(card.getAttribute("data-type")).join("|");

            // Strip nested raw CMS subcategory list so it never renders or leaks into layout
            card.querySelectorAll(".card-sub-list, .card-sub-tag").forEach((el) => el.remove());

            const img = card.querySelector(".project-img") || card.querySelector("img");
            const mediaWrap = card.querySelector(".project-media-wrap");
            const link = (card.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase();
            const slug = link.split("/").filter(Boolean).pop() || "";
            if (mediaWrap && KNOWN_PROJECT_ASPECTS[slug]) {
                mediaWrap.style.aspectRatio = KNOWN_PROJECT_ASPECTS[slug];
            }
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
        };

        const getCardKey = (el) => {
            const linkHref = el.querySelector(".project-link")?.getAttribute("href") || "";
            const numText = el.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
            const clientText = el.querySelector(".project-client")?.textContent?.trim() || "";
            return `${linkHref}|${numText}|${clientText}`;
        };

        const getCardSequence = (el) => {
            const numText = el.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
            const parsed = parseInt(numText, 10);
            return !isNaN(parsed) && parsed > 0 ? parsed : 999999;
        };

        const seenProjectKeys = new Set();

        // Multi-Collection-List support: check if designer added multiple .projects-track-wrapper elements
        const allTrackWrappers = Array.from(scope.querySelectorAll(".projects-track-wrapper"));
        if (allTrackWrappers.length > 1) {
            allTrackWrappers.slice(1).forEach((w) => {
                w.style.display = "none";
            });
        }

        const candidateCards = allTrackWrappers.length > 0
            ? allTrackWrappers.flatMap((w) => {
                const subTrack = w.querySelector(".projects-track, .w-dyn-items") || w;
                return Array.from(subTrack.children);
            })
            : Array.from(track.children);

        const rawCards = candidateCards.filter((el) => {
            if (!el.classList.contains("project-card") && !el.classList.contains("w-dyn-item")) return false;
            if (el.getAttribute("aria-hidden") === "true") return false;
            if (!el.querySelector(".project-link") && !el.querySelector(".project-media-wrap") && !el.querySelector("img")) return false;

            const key = getCardKey(el);
            if (!key || key === "||") return false;
            if (seenProjectKeys.has(key)) return false;
            seenProjectKeys.add(key);
            el.dataset.uniqueKey = key;
            return true;
        });

        rawCards.forEach(prepareCard);

        rawCards.sort((a, b) => getCardSequence(a) - getCardSequence(b));

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
        let initialFirstCardIndex = -1;
        let lastFrameTime = performance.now();
        let renderedTrackPos = null;

        const getInitialScrollPos = () => {
            if (isDesktopInfinite) {
                return Math.max(0, singleSetWidth - getInitialStartOffset());
            }
            return 0;
        };

        const getRestoredScrollPos = () => {
            if (!isRestoreFromDetail) return null;

            if (savedScroll !== null && !isNaN(parseFloat(savedScroll))) {
                return parseFloat(savedScroll);
            }

            if (restoreSlug || restoreUrl || restoreNum) {
                const matchIdx = trackCards.findIndex((card) => {
                    const link = (card.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase();
                    const cardSlug = link.split("/").filter(Boolean).pop() || "";
                    const numText = card.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
                    return (
                        (restoreSlug && (cardSlug === restoreSlug || link.includes(restoreSlug))) ||
                        (restoreUrl && (link.includes(restoreUrl) || restoreUrl.includes(link))) ||
                        (restoreNum && parseInt(numText, 10) === parseInt(restoreNum, 10))
                    );
                });
                if (matchIdx !== -1) {
                    const targetIdx = isDesktopInfinite && activeFilteredCount > 0
                        ? activeFilteredCount + (matchIdx % activeFilteredCount)
                        : matchIdx;
                    if (cachedCardMetrics[targetIdx]) {
                        const m = cachedCardMetrics[targetIdx];
                        return Math.max(0, m.left + m.width / 2 - window.innerWidth / 2);
                    }
                }
            }
            return null;
        };

        const measureDesktopMetrics = () => {
            if (isMobileLayout()) {
                singleSetWidth = 0;
                cachedCardMetrics = [];
                return;
            }
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

                const fullHeaderWidth = header ? Math.min(header.offsetWidth, width) : 0;
                const baseHeaderWidth = clientEl ? Math.min(clientEl.offsetLeft + clientEl.offsetWidth, width) : fullHeaderWidth;

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
                    const restored = getRestoredScrollPos();
                    const initPos = restored !== null ? restored : getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                    if (restored !== null) userHasInteractedDesktop = true;
                } else if (prevSetWidth > 0 && singleSetWidth > 0 && Math.abs(singleSetWidth - prevSetWidth) > 0.5) {
                    const ratio = singleSetWidth / prevSetWidth;
                    scrollPos *= ratio;
                    targetPos *= ratio;
                    rawTargetPos *= ratio;
                } else if (prevSetWidth === 0 && singleSetWidth > 0) {
                    const restored = getRestoredScrollPos();
                    const initPos = restored !== null ? restored : getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                    if (restored !== null) userHasInteractedDesktop = true;
                }
            } else {
                singleSetWidth = 0;
                const lastMetric = cachedCardMetrics[total - 1];
                const totalWidth = lastMetric ? lastMetric.left + lastMetric.width : 0;
                minBoundedScroll = 0;
                maxBoundedScroll = totalWidth > window.innerWidth ? Math.max(0, totalWidth - window.innerWidth + 24) : 0;
            }
        };

        // Collision occlusion is deprecated since headers now ping-pong marquee within card width
        const checkHeaderCollisions = () => { };

        const VIDEO_AUTOPLAY_DELAY_MS = 750;

        const startHoverVideo = (card) => {
            if (projectsDesktopHoverTimer) {
                clearTimeout(projectsDesktopHoverTimer);
                projectsDesktopHoverTimer = null;
            }

            if (isWheelActive || isDragging || window.__mgIsTransitioning) return;
            const video = getValidVideo(card);
            if (!video) return;

            const rawVal = video.getAttribute("data-video-id");
            const previewSrc = getBunnyPreviewUrl(rawVal);
            if (!previewSrc) return;

            projectsDesktopHoverTimer = setTimeout(() => {
                projectsDesktopHoverTimer = null;
                if (!card || !card.classList.contains("is-hovered")) return;
                if (isWheelActive || isDragging || window.__mgIsTransitioning) return;

                registerWarmVideo(video);

                video.playsInline = true;
                video.setAttribute("playsinline", "");
                video.setAttribute("webkit-playsinline", "true");
                video.muted = true;
                video.defaultMuted = true;
                video.setAttribute("muted", "");
                video.loop = true;
                video.setAttribute("loop", "");
                video.setAttribute("controlsList", "nodownload");
                video.setAttribute("disablePictureInPicture", "true");
                video.setAttribute("oncontextmenu", "return false;");
                video.setAttribute("draggable", "false");

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
            }, VIDEO_AUTOPLAY_DELAY_MS);
        };

        const stopHoverVideo = (card) => {
            if (projectsDesktopHoverTimer) {
                clearTimeout(projectsDesktopHoverTimer);
                projectsDesktopHoverTimer = null;
            }
            if (!card) return;
            card.classList.remove("is-video-playing");
            const video = getValidVideo(card);
            if (!video) return;
            if (!video.paused) video.pause();
            video.currentTime = 0;
        };

        const stopHeaderMarquee = (card) => {
            if (activeHeaderMarqueeTimeline) {
                try { activeHeaderMarqueeTimeline.kill(); } catch (_) { }
                activeHeaderMarqueeTimeline = null;
            }
            const targetCard = card || activeHeaderMarqueeCard;
            if (targetCard) {
                const inner = targetCard.querySelector(".project-texts-inner");
                if (inner) {
                    gsap.killTweensOf(inner);
                    gsap.to(inner, {
                        x: 0,
                        duration: 0.35,
                        ease: "power2.out",
                        overwrite: "auto",
                        onComplete: () => {
                            gsap.set(inner, { clearProps: "transform,x" });
                        }
                    });
                }
            }
            activeHeaderMarqueeCard = null;
        };

        const startHeaderMarquee = (card) => {
            if (!card) return;
            const textsWrap = card.querySelector(".project-texts-wrap");
            const inner = textsWrap ? textsWrap.querySelector(".project-texts-inner") : null;
            if (!textsWrap || !inner) return;

            if (activeHeaderMarqueeCard === card && activeHeaderMarqueeTimeline) {
                return;
            }

            stopHeaderMarquee();

            gsap.killTweensOf(inner);
            gsap.set(inner, { x: 0 });

            const containerWidth = textsWrap.clientWidth;
            const textWidth = Math.ceil(inner.scrollWidth || inner.getBoundingClientRect().width);
            const overflowDistance = textWidth - containerWidth;

            if (overflowDistance > 4) {
                activeHeaderMarqueeCard = card;

                // Subtle reading speed ~28px/sec, minimum 3.0s duration
                const duration = Math.max(3.0, overflowDistance / 28);

                activeHeaderMarqueeTimeline = gsap.timeline({
                    repeat: -1
                });

                activeHeaderMarqueeTimeline
                    .to(inner, {
                        x: -overflowDistance,
                        duration: duration,
                        ease: "sine.inOut",
                        force3D: true
                    }, "+=0.8")
                    .to(inner, {
                        x: 0,
                        duration: duration,
                        ease: "sine.inOut",
                        force3D: true
                    }, "+=0.8");
            } else {
                gsap.set(inner, { x: 0 });
            }
        };

        let metricRecalcScheduled = false;
        const scheduleMetricsRecalc = () => {
            if (metricRecalcScheduled) return;
            metricRecalcScheduled = true;
            requestAnimationFrame(() => {
                metricRecalcScheduled = false;
                measureDesktopMetrics();
                checkHeaderCollisions();
                if (hoveredCardIndex !== -1 && trackCards[hoveredCardIndex]) {
                    startHeaderMarquee(trackCards[hoveredCardIndex]);
                }
                track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
            });
        };

        const bindDesktopCard = (card, cardIdx) => {
            const img = card.querySelector(".project-img");
            const mediaWrap = card.querySelector(".project-media-wrap");
            const linkHref = (card.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase();
            const slug = linkHref.split("/").filter(Boolean).pop() || "";
            if (mediaWrap && KNOWN_PROJECT_ASPECTS[slug]) {
                mediaWrap.style.aspectRatio = KNOWN_PROJECT_ASPECTS[slug];
            }
            if (img && mediaWrap) {
                lockNaturalAspect(img, mediaWrap, scheduleMetricsRecalc);
            }

            // Ensure project-texts-wrap and project-texts-inner exist defensively
            let textsWrap = card.querySelector(".project-texts-wrap");
            if (!textsWrap) {
                const clientEl = card.querySelector(".project-client");
                const subtitleEl = card.querySelector(".project-subtitle");
                if (clientEl) {
                    textsWrap = document.createElement("div");
                    textsWrap.className = "project-texts-wrap";
                    clientEl.parentNode.insertBefore(textsWrap, clientEl);
                    textsWrap.appendChild(clientEl);
                    if (subtitleEl) textsWrap.appendChild(subtitleEl);
                }
            }
            if (textsWrap && !textsWrap.querySelector(".project-texts-inner")) {
                const inner = document.createElement("span");
                inner.className = "project-texts-inner";
                while (textsWrap.firstChild) {
                    inner.appendChild(textsWrap.firstChild);
                }
                textsWrap.appendChild(inner);
            }

            card.addEventListener("mouseenter", () => {
                if (isWheelActive || isDragging) return;
                hoveredCardIndex = cardIdx;
                track.classList.add("is-hovering-card");
                card.classList.add("is-hovered");
                checkHeaderCollisions();
                startHoverVideo(card);
                startHeaderMarquee(card);
            }, { signal });

            card.addEventListener("mouseleave", () => {
                if (hoveredCardIndex === cardIdx) hoveredCardIndex = -1;
                card.classList.remove("is-hovered");
                stopHoverVideo(card);
                stopHeaderMarquee(card);
                if (hoveredCardIndex === -1) {
                    track.classList.remove("is-hovering-card");
                }
                checkHeaderCollisions();
            }, { signal });

            const link = card.querySelector(".project-link");
            if (link) {
                link.addEventListener("focus", () => {
                    if (isWheelActive || isDragging) return;
                    hoveredCardIndex = cardIdx;
                    track.classList.add("is-hovering-card");
                    card.classList.add("is-hovered");
                    checkHeaderCollisions();
                    startHoverVideo(card);
                    startHeaderMarquee(card);
                }, { signal });

                link.addEventListener("blur", () => {
                    if (hoveredCardIndex === cardIdx) hoveredCardIndex = -1;
                    card.classList.remove("is-hovered");
                    stopHoverVideo(card);
                    stopHeaderMarquee(card);
                    if (hoveredCardIndex === -1) {
                        track.classList.remove("is-hovering-card");
                    }
                    checkHeaderCollisions();
                }, { signal });

                link.addEventListener("click", (e) => {
                    if (dragMovedDist > 6) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    const href = link.getAttribute("href") || "";
                    const slug = href.split("/").filter(Boolean).pop() || "";
                    const num = card.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
                    try {
                        sessionStorage.setItem("mg_restore_project_url", href);
                        if (slug) sessionStorage.setItem("mg_restore_project_slug", slug);
                        if (num) sessionStorage.setItem("mg_restore_project_num", num);
                        sessionStorage.setItem("mg_projects_saved_scroll", String(scrollPos));
                        sessionStorage.setItem("mg_restore_from_detail", "true");
                        sessionStorage.setItem("mg_restore_filter_parent", activeParent);
                        sessionStorage.setItem("mg_restore_filter_sub", activeSub);
                    } catch (_) { }
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
            const wasInteracted = userHasInteractedDesktop;
            const prevScroll = scrollPos;
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

            const setsNeeded = isDesktopInfinite ? Math.max(3, Math.min(5, Math.ceil(30 / count) + 2)) : 1;
            const fragment = document.createDocumentFragment();
            let globalIdx = 0;

            for (let s = 0; s < setsNeeded; s++) {
                filteredTemplates.forEach((tpl, tplIdx) => {
                    const clone = tpl.cloneNode(true);
                    if (s > 0) clone.setAttribute("aria-hidden", "true");
                    if (((s === 1 && isDesktopInfinite) || (!isDesktopInfinite && s === 0)) && tplIdx === 0) {
                        clone.classList.add("is-initial-first");
                    }
                    const isVisibleInitial = (s === 1 || (!isDesktopInfinite && s === 0)) && tplIdx < 4;
                    if (s === 1 || (!isDesktopInfinite && s === 0)) {
                        clone.setAttribute("data-initial-visible", "true");
                    }
                    const img = clone.querySelector(".project-img") || clone.querySelector("img");
                    if (img) {
                        img.setAttribute("loading", isVisibleInitial ? "eager" : "lazy");
                        img.setAttribute("decoding", "async");
                        if (isVisibleInitial) {
                            img.setAttribute("fetchpriority", "high");
                        }
                    }
                    bindDesktopCard(clone, globalIdx);
                    fragment.appendChild(clone);
                    trackCards.push(clone);
                    globalIdx += 1;
                });
            }

            track.appendChild(fragment);
            measureDesktopMetrics();
            initialFirstCardIndex = isDesktopInfinite ? activeFilteredCount : 0;

            if (wasInteracted) {
                userHasInteractedDesktop = true;
                scrollPos = prevScroll;
                targetPos = prevScroll;
                rawTargetPos = prevScroll;
                track.classList.remove("is-at-start");
            } else {
                const restored = getRestoredScrollPos();
                const initPos = restored !== null ? restored : getInitialScrollPos();
                scrollPos = initPos;
                targetPos = initPos;
                rawTargetPos = initPos;
                if (restored !== null) {
                    userHasInteractedDesktop = true;
                    track.classList.remove("is-at-start");
                } else {
                    track.classList.add("is-at-start");
                }
            }
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
                if (isMarqueeDelayed) {
                    isMarqueeDelayed = false;
                    if (projectsMarqueeDelayTimer) {
                        clearTimeout(projectsMarqueeDelayTimer);
                        projectsMarqueeDelayTimer = null;
                    }
                }

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
                            stopHeaderMarquee(prevCard);
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
            if (isMarqueeDelayed) {
                isMarqueeDelayed = false;
                if (projectsMarqueeDelayTimer) {
                    clearTimeout(projectsMarqueeDelayTimer);
                    projectsMarqueeDelayTimer = null;
                }
            }
            isDragging = true;
            isWheelActive = false;
            track.classList.remove("is-wheel-scrolling");
            if (projectsDesktopHoverTimer) {
                clearTimeout(projectsDesktopHoverTimer);
                projectsDesktopHoverTimer = null;
            }
            if (hoveredCardIndex !== -1) {
                const prevCard = trackCards[hoveredCardIndex];
                if (prevCard) {
                    prevCard.classList.remove("is-hovered");
                    stopHoverVideo(prevCard);
                    stopHeaderMarquee(prevCard);
                }
                hoveredCardIndex = -1;
                track.classList.remove("is-hovering-card");
                checkHeaderCollisions();
            }
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
                if (track.classList.contains("is-at-start") && initialFirstCardIndex >= 0 && cachedCardMetrics[initialFirstCardIndex]) {
                    const metric = cachedCardMetrics[initialFirstCardIndex];
                    const cardLeft = metric.left - scrollPos;
                    const cardRight = cardLeft + metric.width;
                    if (cardRight <= 0 || cardLeft >= window.innerWidth) {
                        track.classList.remove("is-at-start");
                    }
                }

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
                    const isPaused = !isGalleryRevealed || isMarqueeDelayed || isTrackHovered || isDragging || isWheelActive || section.classList.contains("is-marquee-paused");
                    if (section.classList.contains("is-marquee-paused")) {
                        currentMarqueeSpeed = 0;
                        rawTargetPos = scrollPos;
                        targetPos = scrollPos;
                    } else if (isMarqueeDelayed) {
                        currentMarqueeSpeed = 0;
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
                        while (scrollPos >= singleSetWidth * 2) {
                            scrollPos -= singleSetWidth;
                            targetPos -= singleSetWidth;
                            rawTargetPos -= singleSetWidth;
                        }
                        while (scrollPos <= 0) {
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
        const mobileMetaBar = scope.querySelector(".mobile-meta-bar");

        mobileMainSwiper = null;
        let isNavigatingToDetail = false;
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

        const navigateToProject = (projectIdx) => {
            if (isNavigatingToDetail) return;
            const tpl = mobileFilteredTemplates[projectIdx];
            if (!tpl) return;
            const linkHref = tpl.querySelector(".project-link")?.getAttribute("href") || "";
            if (!linkHref || linkHref === "#") return;

            isNavigatingToDetail = true;
            const slug = linkHref.split("/").filter(Boolean).pop() || "";
            const num = tpl.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
            try {
                sessionStorage.setItem("mg_restore_project_url", linkHref);
                if (slug) sessionStorage.setItem("mg_restore_project_slug", slug);
                if (num) sessionStorage.setItem("mg_restore_project_num", num);
                sessionStorage.setItem("mg_restore_from_detail", "true");
                sessionStorage.setItem("mg_restore_filter_parent", activeParent);
                sessionStorage.setItem("mg_restore_filter_sub", activeSub);
            } catch (_) { }

            if (typeof barba !== "undefined" && typeof barba.go === "function") {
                barba.go(linkHref);
            } else {
                window.location.href = linkHref;
            }
        };

        if (mobileMetaBar) {
            mobileMetaBar.addEventListener("click", () => {
                if (!isMobileLayout()) return;
                navigateToProject(activeMobileProjectIdx);
            }, { signal });
        }

        const syncMobileVideos = () => {
            if (!mobileMainSwiper || !mobileMainSwiper.slides) return;
            if (window.__mgIsTransitioning) return;

            if (projectsMobileVideoTimer) {
                clearTimeout(projectsMobileVideoTimer);
                projectsMobileVideoTimer = null;
            }

            const activeSlideEl = mobileMainSwiper.slides[mobileMainSwiper.activeIndex];

            for (let i = 0; i < mobileMainSwiper.slides.length; i++) {
                const slide = mobileMainSwiper.slides[i];
                const video = slide.querySelector(".mobile-main-video");
                if (!video) continue;

                if (slide !== activeSlideEl) {
                    slide.classList.remove("is-video-playing");
                    if (!video.paused) video.pause();
                    video.currentTime = 0;
                }
            }

            if (isThumbTouching || isThumbCoasting) return;
            if (!activeSlideEl) return;

            const video = activeSlideEl.querySelector(".mobile-main-video");
            if (!video) return;

            const previewSrc = video.getAttribute("data-preview-src");
            if (!previewSrc) return;

            if (activeSlideEl.classList.contains("is-video-playing") && !video.paused) {
                return;
            }

            projectsMobileVideoTimer = setTimeout(() => {
                projectsMobileVideoTimer = null;
                if (!mobileMainSwiper || !mobileMainSwiper.slides) return;
                if (window.__mgIsTransitioning || isThumbTouching || isThumbCoasting) return;

                const currentActive = mobileMainSwiper.slides[mobileMainSwiper.activeIndex];
                if (currentActive !== activeSlideEl) return;

                registerWarmVideo(video);
                if (video.getAttribute("src") !== previewSrc) {
                    video.setAttribute("src", previewSrc);
                    video.load();
                }

                if (video.readyState >= 2) {
                    activeSlideEl.classList.add("is-video-playing");
                } else {
                    const onPlaying = () => {
                        if (mobileMainSwiper && mobileMainSwiper.slides && mobileMainSwiper.slides[mobileMainSwiper.activeIndex] === activeSlideEl) {
                            activeSlideEl.classList.add("is-video-playing");
                        }
                    };
                    video.addEventListener("playing", onPlaying, { once: true });
                }

                video.muted = true;
                video.defaultMuted = true;
                video.loop = true;
                video.playsInline = true;
                const p = video.play();
                if (p !== undefined) p.catch(() => { });
            }, VIDEO_AUTOPLAY_DELAY_MS);
        };

        const measureMobileThumbMetrics = () => {
            if (!isMobileLayout()) {
                thumbSingleSetWidth = 0;
                cachedThumbCenters = [];
                return;
            }
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
                const numSets = Math.floor(total / count);
                const centerSet = Math.floor(numSets / 2);
                if (centerSet + 1 < numSets && mobileThumbItems[(centerSet + 1) * count] && mobileThumbItems[centerSet * count]) {
                    thumbSingleSetWidth = mobileThumbItems[(centerSet + 1) * count].offsetLeft - mobileThumbItems[centerSet * count].offsetLeft;
                } else {
                    thumbSingleSetWidth = mobileThumbItems[count].offsetLeft - mobileThumbItems[0].offsetLeft;
                }
            } else {
                thumbSingleSetWidth = 0;
            }
        };

        const getScrollPosForThumbIdx = (idx) => {
            if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();
            const containerW = mobileThumbEl?.clientWidth || window.innerWidth;
            if (idx >= 0 && idx < cachedThumbCenters.length && cachedThumbCenters[idx] !== undefined) {
                return cachedThumbCenters[idx] - containerW / 2;
            }
            const item = mobileThumbItems[idx];
            if (item) {
                const center = item.offsetLeft + item.offsetWidth / 2;
                return center - containerW / 2;
            }
            return 0;
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
            const containerW = mobileThumbEl?.clientWidth || window.innerWidth;
            const currentCenterInTrack = thumbScrollPos + containerW / 2;
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

            const containerW = mobileThumbEl?.clientWidth || window.innerWidth;
            if (!isMobileInfinite) {
                setActiveThumbByIdx(targetProjIdx, false);
                thumbTargetPos = getScrollPosForThumbIdx(targetProjIdx);
                if (immediate) thumbScrollPos = thumbTargetPos;
                return;
            }

            const currentCenterInTrack = thumbScrollPos + containerW / 2;
            let bestCloneIdx = -1;
            let minDiff = Infinity;

            for (let i = 0; i < total; i++) {
                const item = mobileThumbItems[i];
                if (parseInt(item.dataset.projectIdx || "-1", 10) === targetProjIdx) {
                    const centerVal = (cachedThumbCenters && cachedThumbCenters[i] !== undefined)
                        ? cachedThumbCenters[i]
                        : (item.offsetLeft + item.offsetWidth / 2);
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
                if (immediate) {
                    thumbScrollPos = thumbTargetPos;
                    if (mobileThumbTrack) {
                        mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
                    }
                }
            }
        };

        const buildMobileGallery = (filteredTemplates) => {
            if (!mobileMainEl || !mobileThumbEl || !mobileThumbTrack) return;

            isThumbTouching = false;
            isThumbCoasting = false;
            thumbVelocity = 0;

            mobileFilteredTemplates = filteredTemplates;
            mobileThumbItems = [];
            cachedThumbCenters = [];

            if (mobileMainSwiper) {
                try {
                    mobileMainSwiper.destroy(true, false);
                } catch (_) { }
                mobileMainSwiper = null;
            }
            if (mobileMainEl.swiper) {
                try {
                    mobileMainEl.swiper.destroy(true, false);
                } catch (_) { }
            }

            const mainWrapper = mobileMainEl.querySelector(".swiper-wrapper");
            if (!mainWrapper) return;

            mainWrapper.innerHTML = "";
            mobileThumbTrack.innerHTML = "";

            const count = filteredTemplates.length;
            if (count === 0) return;

            // 1. Determine targetProjIdx BEFORE building slides & Swiper so it starts immediately on the target project!
            let targetProjIdx = 0;
            let didFindRestored = false;
            if (activeMobileProjectIdx > 0 && activeMobileProjectIdx < count) {
                targetProjIdx = activeMobileProjectIdx;
            } else if (isRestoreFromDetail && (restoreSlug || restoreUrl || restoreNum)) {
                const foundIdx = filteredTemplates.findIndex((tpl) => {
                    const link = (tpl.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase();
                    const tplSlug = link.split("/").filter(Boolean).pop() || "";
                    const numText = tpl.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
                    return (
                        (restoreSlug && (tplSlug === restoreSlug || link.includes(restoreSlug))) ||
                        (restoreUrl && (link.includes(restoreUrl) || restoreUrl.includes(link))) ||
                        (restoreNum && parseInt(numText, 10) === parseInt(restoreNum, 10))
                    );
                });
                if (foundIdx !== -1) {
                    targetProjIdx = foundIdx;
                    didFindRestored = true;
                }
            }

            activeMobileProjectIdx = targetProjIdx;
            updateMobileMeta(targetProjIdx);

            isMobileInfinite = count > MIN_LOOP_THRESHOLD;
            const mainRepeats = isMobileInfinite && count < 6 ? Math.ceil(6 / count) : 1;

            const mainFragment = document.createDocumentFragment();
            for (let r = 0; r < mainRepeats; r++) {
                filteredTemplates.forEach((tpl, idx) => {
                    const linkHref = tpl.querySelector(".project-link")?.getAttribute("href") || "#";
                    const imgEl = tpl.querySelector(".project-img") || tpl.querySelector("img");
                    const imgSrc = imgEl?.getAttribute("src") || "";
                    const imgSrcset = imgEl?.getAttribute("srcset") || "";

                    const validVid = getValidVideo(tpl);
                    const rawVidId = validVid?.getAttribute("data-video-id") || "";
                    const previewSrc = rawVidId ? getBunnyPreviewUrl(rawVidId) : "";

                    const isTargetSlide = idx === targetProjIdx ||
                        idx === (targetProjIdx + 1) % count ||
                        idx === (targetProjIdx - 1 + count) % count;
                    const mainSlide = document.createElement("div");
                    mainSlide.className = "swiper-slide";
                    mainSlide.setAttribute("data-project-idx", String(idx));
                    mainSlide.innerHTML = `
            <a href="${linkHref}" class="mobile-main-link">
              <div class="mobile-media-box">
                <img src="${imgSrc}" ${imgSrcset ? `srcset="${imgSrcset}"` : ""} loading="${isTargetSlide ? "eager" : "lazy"}" decoding="async" alt="" draggable="false" />
                ${previewSrc
                            ? `<video class="mobile-main-video" playsinline webkit-playsinline="true" muted loop preload="none" controlslist="nodownload" disablepictureinpicture oncontextmenu="return false;" draggable="false" data-preview-src="${previewSrc}"></video>`
                            : ""
                        }
              </div>
            </a>
          `;

                    // Bind click on mobile main link to preserve restoration data
                    const mainLink = mainSlide.querySelector(".mobile-main-link");
                    if (mainLink) {
                        mainLink.addEventListener("click", () => {
                            const href = mainLink.getAttribute("href") || "";
                            const slug = href.split("/").filter(Boolean).pop() || "";
                            const num = tpl.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
                            try {
                                sessionStorage.setItem("mg_restore_project_url", href);
                                if (slug) sessionStorage.setItem("mg_restore_project_slug", slug);
                                if (num) sessionStorage.setItem("mg_restore_project_num", num);
                                sessionStorage.setItem("mg_restore_from_detail", "true");
                                sessionStorage.setItem("mg_restore_filter_parent", activeParent);
                                sessionStorage.setItem("mg_restore_filter_sub", activeSub);
                            } catch (_) { }
                        }, { signal });
                    }

                    const slideImg = mainSlide.querySelector("img");
                    const mediaBox = mainSlide.querySelector(".mobile-media-box");
                    lockNaturalAspect(slideImg, mediaBox);
                    mainFragment.appendChild(mainSlide);
                });
            }
            mainWrapper.appendChild(mainFragment);

            // 2. Initialize Swiper directly with targetProjIdx
            if (typeof Swiper !== "undefined") {
                mobileMainSwiper = new Swiper(mobileMainEl, {
                    initialSlide: targetProjIdx,
                    loop: isMobileInfinite,
                    slidesPerView: 1,
                    spaceBetween: 0,
                    speed: 350,
                    grabCursor: true,
                    roundLengths: true,
                    observer: false,
                    observeParents: false
                });

                if (targetProjIdx > 0 && isMobileInfinite) {
                    try {
                        mobileMainSwiper.slideToLoop(targetProjIdx, 0, false);
                    } catch (_) { }
                }

                const handleMainSwipeChange = () => {
                    if (!section.classList.contains("is-marquee-paused")) {
                        syncMobileVideos();
                    }
                    if (isThumbTouching || isThumbCoasting) return;

                    let newProjIdx = typeof mobileMainSwiper.realIndex === "number" ? (mobileMainSwiper.realIndex % count) : -1;
                    if (newProjIdx < 0 || isNaN(newProjIdx)) {
                        const activeSlide = mobileMainSwiper.slides[mobileMainSwiper.activeIndex];
                        newProjIdx = activeSlide ? parseInt(activeSlide.getAttribute("data-project-idx") || "-1", 10) : -1;
                    }
                    if (newProjIdx < 0 || isNaN(newProjIdx)) newProjIdx = 0;

                    activeMobileProjectIdx = newProjIdx;
                    updateMobileMeta(newProjIdx);
                    snapThumbStripToProjectIdx(newProjIdx, false);
                };

                mobileMainSwiper.on("slideChange", handleMainSwipeChange);
                mobileMainSwiper.on("transitionStart", handleMainSwipeChange);
                mobileMainSwiper.on("transitionEnd", handleMainSwipeChange);
                mobileMainSwiper.on("slideChangeTransitionEnd", handleMainSwipeChange);
                mobileMainSwiper.on("touchStart", () => {
                    isThumbTouching = false;
                    isThumbCoasting = false;
                    thumbVelocity = 0;
                    if (isMarqueeDelayed) {
                        isMarqueeDelayed = false;
                        if (projectsMarqueeDelayTimer) {
                            clearTimeout(projectsMarqueeDelayTimer);
                            projectsMarqueeDelayTimer = null;
                        }
                    }
                    if (projectsMobileVideoTimer) {
                        clearTimeout(projectsMobileVideoTimer);
                        projectsMobileVideoTimer = null;
                    }
                });
            }

            // 3. Build scrubber strip thumbnails
            let thumbSetsNeeded = isMobileInfinite ? (count >= 25 ? 3 : Math.max(5, Math.ceil(36 / count) + 2)) : 1;
            if (isMobileInfinite && thumbSetsNeeded % 2 === 0) thumbSetsNeeded += 1;
            const thumbFragment = document.createDocumentFragment();
            let cloneIdxCounter = 0;
            const targetSet = Math.floor(thumbSetsNeeded / 2);

            let debouncedThumbTimer = null;
            const onThumbAspectReady = () => {
                if (debouncedThumbTimer) return;
                debouncedThumbTimer = setTimeout(() => {
                    debouncedThumbTimer = null;
                    measureMobileThumbMetrics();
                    if (!isThumbTouching && !isThumbCoasting && activeThumbCloneIdx >= 0) {
                        thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                    }
                }, 100);
            };

            const syncProjectAspectRatio = (projIdx, slug, img) => {
                if (!img || !img.naturalWidth || !img.naturalHeight) return;
                const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                if (slug) KNOWN_PROJECT_ASPECTS[slug] = aspect;
                let changed = false;
                for (let c = 0; c < thumbSetsNeeded; c++) {
                    const cloneItem = mobileThumbItems[c * count + projIdx];
                    if (cloneItem) {
                        const wrap = cloneItem.querySelector(".mobile-thumb-img-wrap");
                        if (wrap && wrap.style.aspectRatio !== aspect) {
                            wrap.style.aspectRatio = aspect;
                            changed = true;
                        }
                    }
                }
                if (changed) {
                    onThumbAspectReady();
                }
            };

            for (let s = 0; s < thumbSetsNeeded; s++) {
                filteredTemplates.forEach((tpl, idx) => {
                    const link = (tpl.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase();
                    const tplSlug = link.split("/").filter(Boolean).pop() || "";
                    const imgEl = tpl.querySelector(".project-img") || tpl.querySelector("img");
                    const imgSrc = imgEl?.getAttribute("src") || "";
                    const imgSrcset = imgEl?.getAttribute("srcset") || "";
                    const numText = formatNum(tpl.querySelector(".project-number-text, .project-num, .project-number")?.textContent || "");

                    const knownAspect = KNOWN_PROJECT_ASPECTS[tplSlug] ||
                        (imgEl && imgEl.naturalWidth && imgEl.naturalHeight ? `${imgEl.naturalWidth} / ${imgEl.naturalHeight}` : null);

                    const isNearTarget = (s === targetSet && Math.abs(idx - targetProjIdx) <= 6) ||
                        (targetProjIdx <= 3 && s === targetSet - 1 && idx >= count - 6) ||
                        (targetProjIdx >= count - 4 && s === targetSet + 1 && idx <= 5);
                    const item = document.createElement("div");
                    item.className = "mobile-thumb-item";
                    item.dataset.projectIdx = String(idx);
                    item.dataset.cloneIdx = String(cloneIdxCounter);
                    item.innerHTML = `
            <div class="mobile-thumb-num">${numText}</div>
            <div class="mobile-thumb-img-wrap"${knownAspect ? ` style="aspect-ratio: ${knownAspect};"` : ""}>
              <img src="${imgSrc}" ${imgSrcset ? `srcset="${imgSrcset}" sizes="160px"` : ""} loading="${isNearTarget ? "eager" : "lazy"}" decoding="async" alt="" draggable="false" />
            </div>
          `;

                    const thumbImg = item.querySelector("img");
                    const thumbWrap = item.querySelector(".mobile-thumb-img-wrap");
                    if (knownAspect) {
                        thumbWrap.style.aspectRatio = knownAspect;
                    } else if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
                        thumbWrap.style.aspectRatio = `${imgEl.naturalWidth} / ${imgEl.naturalHeight}`;
                    } else {
                        lockNaturalAspect(thumbImg, thumbWrap, () => syncProjectAspectRatio(idx, tplSlug, thumbImg));
                    }

                    thumbFragment.appendChild(item);
                    mobileThumbItems.push(item);
                    cloneIdxCounter += 1;
                });
            }

            mobileThumbTrack.appendChild(thumbFragment);

            // 4. Synchronously position the active thumbnail
            const initialCloneIdx = isMobileInfinite
                ? Math.floor(thumbSetsNeeded / 2) * count + targetProjIdx
                : targetProjIdx;

            activeThumbCloneIdx = initialCloneIdx;
            if (mobileThumbItems[initialCloneIdx]) {
                mobileThumbItems[initialCloneIdx].classList.add("is-active");
            }

            measureMobileThumbMetrics();
            if (cachedThumbCenters.length > 0) {
                thumbTargetPos = getScrollPosForThumbIdx(initialCloneIdx);
                thumbScrollPos = thumbTargetPos;
                mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
            }

            // 5. Post-layout sync verification
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
                if (mobileMainSwiper && !mobileMainSwiper.destroyed) {
                    if (targetProjIdx > 0 && isMobileInfinite && mobileMainSwiper.realIndex !== targetProjIdx) {
                        try {
                            mobileMainSwiper.slideToLoop(targetProjIdx, 0, false);
                        } catch (_) { }
                    }
                    mobileMainSwiper.update();
                }
                if (isRestoreFromDetail && (didFindRestored || !scope.querySelector(".w-pagination-next, a[href*='_page=']"))) {
                    clearRestorationState();
                }
                if (isMobileLayout() && !section.classList.contains("is-marquee-paused")) {
                    syncMobileVideos();
                }
            });
        };

        if (mobileThumbEl) {
            let touchedThumbItem = null;
            let touchedThumbWasActive = false;

            mobileThumbEl.addEventListener("pointerdown", (e) => {
                if (!isMobileLayout()) return;
                if (isMarqueeDelayed) {
                    isMarqueeDelayed = false;
                    if (projectsMarqueeDelayTimer) {
                        clearTimeout(projectsMarqueeDelayTimer);
                        projectsMarqueeDelayTimer = null;
                    }
                }
                if (projectsMobileVideoTimer) {
                    clearTimeout(projectsMobileVideoTimer);
                    projectsMobileVideoTimer = null;
                }
                if (cachedThumbCenters.length === 0) measureMobileThumbMetrics();
                isThumbTouching = true;
                isThumbCoasting = false;
                thumbVelocity = 0;
                thumbTouchStartX = e.clientX;
                thumbLastTouchX = e.clientX;
                thumbLastTouchTime = performance.now();
                thumbDragTotalDist = 0;
                thumbTargetPos = thumbScrollPos;

                touchedThumbItem = e.target.closest(".mobile-thumb-item") || document.elementFromPoint(e.clientX, e.clientY)?.closest(".mobile-thumb-item");
                touchedThumbWasActive = Boolean(
                    touchedThumbItem && touchedThumbItem.classList.contains("is-active")
                );

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
                try {
                    if (mobileThumbEl.hasPointerCapture?.(e.pointerId)) {
                        mobileThumbEl.releasePointerCapture(e.pointerId);
                    }
                } catch (_) { }

                const wasActive = touchedThumbWasActive;
                const touchedItem = touchedThumbItem;
                touchedThumbWasActive = false;
                touchedThumbItem = null;

                if (e.type !== "pointercancel" && thumbDragTotalDist < 6) {
                    const tappedItem = document.elementFromPoint(e.clientX, e.clientY)?.closest(".mobile-thumb-item") || touchedItem;
                    if (tappedItem && tappedItem.dataset.cloneIdx !== undefined) {
                        const tappedIdx = parseInt(tappedItem.dataset.cloneIdx, 10);

                        // ONLY navigate if this thumbnail was ALREADY active when the tap started
                        if (wasActive && (tappedItem === touchedItem || tappedItem.classList.contains("is-active"))) {
                            navigateToProject(activeMobileProjectIdx);
                            return;
                        }

                        // Inactive item tapped: activate and center it. NEVER navigate to project page!
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

            mobileThumbEl.addEventListener("click", (e) => {
                e.preventDefault();
            }, { signal });
        }

        let wasTransitioning = false;
        let wasMarqueePaused = false;

        const animateGallery = (now) => {
            if (window.__mgIsTransitioning) {
                wasTransitioning = true;
                lastFrameTime = now;
                projectsRafId = requestAnimationFrame(animateGallery);
                return;
            }

            if (wasTransitioning) {
                wasTransitioning = false;
                startMarqueeDelay();
            }

            const isMarqueePausedClass = section.classList.contains("is-marquee-paused");
            if (isMarqueePausedClass) {
                wasMarqueePaused = true;
            } else if (wasMarqueePaused) {
                wasMarqueePaused = false;
                startMarqueeDelay();
            }

            animateDesktop(now);

            if (isMobileLayout() && mobileThumbTrack && mobileThumbItems.length > 0) {
                // When section is paused during page transition, freeze thumb strip to eliminate stutter & frame drops
                if (section.classList.contains("is-marquee-paused")) {
                    mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
                    projectsRafId = requestAnimationFrame(animateGallery);
                    return;
                }

                if (cachedThumbCenters.length === 0) {
                    measureMobileThumbMetrics();
                    if (cachedThumbCenters.length > 0 && activeThumbCloneIdx >= 0) {
                        thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                        thumbScrollPos = thumbTargetPos;
                        mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
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
                    const count = mobileFilteredTemplates.length;
                    const numSets = count > 0 ? Math.floor(mobileThumbItems.length / count) : 0;
                    if (numSets >= 3) {
                        const centerSet = Math.floor(numSets / 2);
                        const containerW = mobileThumbEl?.clientWidth || window.innerWidth;
                        const setCenterStart = mobileThumbItems[centerSet * count]?.offsetLeft || (centerSet * thumbSingleSetWidth);
                        const minBound = setCenterStart - thumbSingleSetWidth * 0.5 - containerW / 2;
                        const maxBound = setCenterStart + thumbSingleSetWidth * 1.5 - containerW / 2;
                        let wrapped = false;
                        if (thumbScrollPos > maxBound) {
                            const setsToShift = Math.ceil((thumbScrollPos - maxBound) / thumbSingleSetWidth);
                            thumbScrollPos -= setsToShift * thumbSingleSetWidth;
                            thumbTargetPos -= setsToShift * thumbSingleSetWidth;
                            wrapped = true;
                        } else if (thumbScrollPos < minBound) {
                            const setsToShift = Math.ceil((minBound - thumbScrollPos) / thumbSingleSetWidth);
                            thumbScrollPos += setsToShift * thumbSingleSetWidth;
                            thumbTargetPos += setsToShift * thumbSingleSetWidth;
                            wrapped = true;
                        }
                        if (wrapped) {
                            const centerIdx = findCenterThumbIdx();
                            if (centerIdx !== -1) setActiveThumbByIdx(centerIdx, false);
                        }
                    }
                }

                mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
            }

            projectsRafId = requestAnimationFrame(animateGallery);
        };

        // Filter Logic
        const parentFilterBtns = scope.querySelectorAll(".filter-btn");
        const subFilterBtns = scope.querySelectorAll(".sub-btn");
        let activeParent = restoredFilterParent ? canonicalizeType(restoredFilterParent) : "all";
        let activeSub = restoredFilterSub ? normalize(restoredFilterSub) : "all";

        const syncSubFilterVisibility = () => {
            if (!subFilterList) return;
            const isParentAll = activeParent === "all";
            subFilterList.classList.toggle("is-visible", !isParentAll);
        };

        const cardMatchesParent = (card, parentType) => {
            if (parentType === "all") return true;
            const types = (card.dataset.normalizedTypes || "").split("|").filter(Boolean);
            return types.includes(parentType);
        };

        const updateAvailableSubFilterButtons = () => {
            if (activeParent === "all") return;
            const availableTags = new Set();
            masterCards.forEach((card) => {
                if (cardMatchesParent(card, activeParent)) {
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

        let currentFiltered = [];
        let isDesktopBuilt = false;
        let isMobileBuilt = false;

        const buildActiveLayout = (filtered) => {
            if (isMobileLayout()) {
                buildMobileGallery(filtered);
                isMobileBuilt = true;
                isDesktopBuilt = false;
            } else {
                buildDesktopLoop(filtered);
                isDesktopBuilt = true;
                isMobileBuilt = false;
            }
        };

        const applyFilters = () => {
            const filteredSeen = new Set();
            const filtered = masterCards.filter((card) => {
                const key = card.dataset.uniqueKey || "";
                if (key && filteredSeen.has(key)) return false;

                const subs = (card.dataset.normalizedSubs || "").split("|").filter(Boolean);

                const matchParent = cardMatchesParent(card, activeParent);
                const matchSub = activeSub === "all" || subs.includes(activeSub);

                if (matchParent && matchSub) {
                    if (key) filteredSeen.add(key);
                    return true;
                }
                return false;
            });

            currentFiltered = filtered;
            activeFilteredCount = filtered.length;
            buildActiveLayout(filtered);
            startMarqueeDelay();
        };

        parentFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                clearRestorationState();
                userHasInteractedDesktop = false;
                parentFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawFilter = btn.getAttribute("data-filter") || btn.textContent;
                activeParent = canonicalizeType(rawFilter);

                resetSubFilterToAll();
                syncSubFilterVisibility();
                updateAvailableSubFilterButtons();
                applyFilters();
            }, { signal });
        });

        subFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                clearRestorationState();
                userHasInteractedDesktop = false;
                subFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawSub = btn.getAttribute("data-sub") || btn.textContent;
                activeSub = normalize(rawSub);
                applyFilters();
            }, { signal });
        });

        if (activeParent !== "all" || activeSub !== "all") {
            parentFilterBtns.forEach((b) => {
                const rawFilter = b.getAttribute("data-filter") || b.textContent;
                b.classList.toggle("is-active", canonicalizeType(rawFilter) === activeParent);
            });
            subFilterBtns.forEach((b) => {
                const rawSub = b.getAttribute("data-sub") || b.textContent;
                b.classList.toggle("is-active", normalize(rawSub) === activeSub);
            });
        }

        syncSubFilterVisibility();
        updateAvailableSubFilterButtons();
        applyFilters();
        projectsRafId = requestAnimationFrame(animateGallery);

        const fetchRemainingPages = async () => {
            scope.querySelectorAll(".w-pagination-wrapper").forEach((p) => {
                p.style.display = "none";
            });

            const resolveUrl = (urlStr) => {
                try {
                    return new URL(urlStr, window.location.href).href;
                } catch (_) {
                    return urlStr;
                }
            };

            let nextLink = scope.querySelector(".w-pagination-next, a[href*='_page='], a.w-pagination-next");
            if (!nextLink) return;

            let nextPageUrl = resolveUrl(nextLink.getAttribute("href") || "");
            const visitedUrls = new Set([window.location.href, window.location.origin + window.location.pathname]);

            while (nextPageUrl && !visitedUrls.has(nextPageUrl)) {
                visitedUrls.add(nextPageUrl);
                try {
                    const resp = await fetch(nextPageUrl, { signal });
                    if (!resp.ok) break;
                    const html = await resp.text();
                    const doc = new DOMParser().parseFromString(html, "text/html");
                    const newCandidateCards = Array.from(
                        doc.querySelectorAll(".projects-track > .project-card, .projects-track > .w-dyn-item, .projects-track-wrapper .projects-track > div, .project-card")
                    );
                    let addedCount = 0;

                    newCandidateCards.forEach((card) => {
                        if (!card.classList.contains("project-card") && !card.classList.contains("w-dyn-item")) return;
                        if (card.getAttribute("aria-hidden") === "true") return;
                        if (!card.querySelector(".project-link") && !card.querySelector(".project-media-wrap") && !card.querySelector("img")) return;

                        const key = getCardKey(card);
                        if (!key || key === "||") return;
                        if (seenProjectKeys.has(key)) return;
                        seenProjectKeys.add(key);
                        card.dataset.uniqueKey = key;

                        prepareCard(card);
                        masterCards.push(card.cloneNode(true));
                        addedCount++;
                    });

                    if (addedCount > 0) {
                        masterCards.sort((a, b) => getCardSequence(a) - getCardSequence(b));
                        activeFilteredCount = masterCards.length;
                        isDesktopInfinite = activeFilteredCount > MIN_LOOP_THRESHOLD;

                        updateAvailableSubFilterButtons();

                        const wasInteracted = userHasInteractedDesktop;
                        const prevScroll = scrollPos;
                        applyFilters();

                        if (wasInteracted) {
                            userHasInteractedDesktop = true;
                            scrollPos = prevScroll;
                            targetPos = prevScroll;
                            rawTargetPos = prevScroll;
                        }
                    }

                    const nextInDoc = doc.querySelector(".w-pagination-next, a[href*='_page='], a.w-pagination-next");
                    nextPageUrl = nextInDoc ? resolveUrl(nextInDoc.getAttribute("href") || "") : null;
                } catch (err) {
                    if (err?.name === "AbortError") break;
                    console.warn("[Projects] Pagination fetch error:", err);
                    break;
                }
            }
        };

        fetchRemainingPages();

        const revealGalleryWhenReady = () => {
            const reveal = () => {
                if (isGalleryRevealed) return;
                if (!isMobileLayout()) {
                    trackCards.forEach((card) => {
                        const img = card.querySelector(".project-img");
                        const wrap = card.querySelector(".project-media-wrap");
                        if (img && wrap && img.naturalWidth && img.naturalHeight) {
                            wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                        }
                    });

                    measureDesktopMetrics();
                    const restored = getRestoredScrollPos();
                    if (restored !== null) {
                        scrollPos = restored;
                        targetPos = restored;
                        rawTargetPos = restored;
                        userHasInteractedDesktop = true;
                    } else if (!userHasInteractedDesktop) {
                        const initPos = getInitialScrollPos();
                        scrollPos = initPos;
                        targetPos = initPos;
                        rawTargetPos = initPos;
                    }
                    clearRestorationState();

                    track.style.transform = `translate3d(${-scrollPos}px, 0, 0)`;
                    checkHeaderCollisions();
                } else {
                    measureMobileThumbMetrics();
                    if (mobileMainSwiper && !mobileMainSwiper.destroyed) {
                        mobileMainSwiper.update();
                    }
                }

                isGalleryRevealed = true;
                section.classList.add("is-ready");
                section.classList.add("is-marquee-active");
                startMarqueeDelay();
            };

            // If section was already prepared by page transition, reveal immediately without Safari decode delay
            if (section.classList.contains("is-ready")) {
                reveal();
                if (!isMobileLayout()) {
                    let desktopMeasureTimer = null;
                    const triggerDebouncedDesktopMeasure = () => {
                        if (desktopMeasureTimer) return;
                        desktopMeasureTimer = setTimeout(() => {
                            desktopMeasureTimer = null;
                            measureDesktopMetrics();
                            checkHeaderCollisions();
                        }, 50);
                    };

                    trackCards.forEach((card) => {
                        const img = card.querySelector(".project-img");
                        if (img && !img.complete) {
                            img.addEventListener("load", () => {
                                const wrap = card.querySelector(".project-media-wrap");
                                if (wrap && img.naturalWidth && img.naturalHeight) {
                                    wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                                }
                                triggerDebouncedDesktopMeasure();
                            }, { once: true });
                        }
                    });
                }
                return;
            }

            if (!isMobileLayout()) {
                const initialSetCards = trackCards.filter((c) => c.getAttribute("data-initial-visible") === "true").slice(0, 4);
                const decodeTasks = (initialSetCards.length ? initialSetCards : trackCards.slice(0, 4)).map((card) => {
                    const img = card.querySelector(".project-img");
                    if (!img) return Promise.resolve();
                    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                    if (typeof img.decode === "function") {
                        const timeoutCap = new Promise((res) => setTimeout(res, 200));
                        return Promise.race([img.decode(), timeoutCap]).catch(() => { });
                    }
                    return new Promise((res) => {
                        const done = () => res();
                        img.addEventListener("load", done, { once: true });
                        img.addEventListener("error", done, { once: true });
                        setTimeout(done, 200);
                    });
                });

                const safetyTimer = setTimeout(reveal, 400);
                Promise.allSettled(decodeTasks).then(() => {
                    clearTimeout(safetyTimer);
                    reveal();
                });
            } else {
                reveal();
            }
        };

        revealGalleryWhenReady();

        let lastLayoutIsMobile = isMobileLayout();
        window.addEventListener("resize", () => {
            const currentIsMobile = isMobileLayout();
            if (currentIsMobile !== lastLayoutIsMobile) {
                lastLayoutIsMobile = currentIsMobile;
                const filteredToUse = currentFiltered.length ? currentFiltered : masterCards;
                if (currentIsMobile && !isMobileBuilt) {
                    buildMobileGallery(filteredToUse);
                    isMobileBuilt = true;
                } else if (!currentIsMobile && !isDesktopBuilt) {
                    buildDesktopLoop(filteredToUse);
                    isDesktopBuilt = true;
                }
            }

            if (!currentIsMobile) {
                measureDesktopMetrics();
                checkHeaderCollisions();
                if (hoveredCardIndex !== -1 && trackCards[hoveredCardIndex]) {
                    startHeaderMarquee(trackCards[hoveredCardIndex]);
                }
            } else {
                measureMobileThumbMetrics();
                if (mobileMainSwiper && !mobileMainSwiper.destroyed) {
                    mobileMainSwiper.update();
                }
                if (activeThumbCloneIdx >= 0 && cachedThumbCenters.length > 0) {
                    thumbTargetPos = getScrollPosForThumbIdx(activeThumbCloneIdx);
                    thumbScrollPos = thumbTargetPos;
                    if (mobileThumbTrack) {
                        mobileThumbTrack.style.transform = `translate3d(${-thumbScrollPos}px, 0, 0)`;
                    }
                }
                if (!section.classList.contains("is-marquee-paused")) {
                    syncMobileVideos();
                }
            }
        }, { signal });

        window.addEventListener("mg-transition-complete", () => {
            if (isMobileLayout()) {
                syncMobileVideos();
            }
        }, { signal });
    }

    function destroyProjects() {
        if (activeHeaderMarqueeTimeline) {
            try { activeHeaderMarqueeTimeline.kill(); } catch (_) { }
            activeHeaderMarqueeTimeline = null;
        }
        activeHeaderMarqueeCard = null;
        if (mobileMainSwiper) {
            try {
                mobileMainSwiper.destroy(true, false);
            } catch (_) { }
            mobileMainSwiper = null;
        }
        const oldMainEl = projectsScope?.querySelector(".mobile-main-swiper") || document.querySelector(".mobile-main-swiper");
        if (oldMainEl && oldMainEl.swiper) {
            try {
                oldMainEl.swiper.destroy(true, false);
            } catch (_) { }
        }
        if (projectsScope) {
            projectsScope._isProjectsMounted = false;
            projectsScope = null;
        }
        if (projectsRafId) {
            cancelAnimationFrame(projectsRafId);
            projectsRafId = null;
        }
        if (projectsAbortController) {
            projectsAbortController.abort();
            projectsAbortController = null;
        }
        if (projectsMarqueeDelayTimer) {
            clearTimeout(projectsMarqueeDelayTimer);
            projectsMarqueeDelayTimer = null;
        }
        if (projectsDesktopHoverTimer) {
            clearTimeout(projectsDesktopHoverTimer);
            projectsDesktopHoverTimer = null;
        }
        if (projectsMobileVideoTimer) {
            clearTimeout(projectsMobileVideoTimer);
            projectsMobileVideoTimer = null;
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