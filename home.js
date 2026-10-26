/**
 * Milena Gorum - Homepage Infinite Horizontal Gallery Engine
 * Hosted on Cloudflare Pages (home.js)
 */

(function () {
  let homeRafId = null;
  let homeAbortController = null;
  let homeResizeObserver = null;

  function initHome(container) {
    const scope = container || document.querySelector(".home-section") || document;
    const BUNNY_CDN_HOST = "vz-cc78103f-0dc.b-cdn.net";
    const MAX_VIDEO_SECONDS = 30;

    const MINIMUM_LOADER_TIME = 350;
    const MAX_SAFETY_TIME = 1500;
    const MAX_ACTIVE_DECODERS = 2;

    const WHEEL_MULTIPLIER = 1.15;
    const WHEEL_SMOOTH_STAGE1 = 0.22;
    const WHEEL_SMOOTH_STAGE2 = 0.14;
    const DRAG_MULTIPLIER = 1.25;
    const DRAG_LERP_FACTOR = 0.14;
    const DRAG_MOMENTUM = 4.5;
    const MOBILE_SNAP_LERP = 0.15;

    const curtain = scope.querySelector(".home-curtain") || document.querySelector(".home-curtain");
    const wrapper = scope.querySelector(".home-track-wrapper") || scope.querySelector(".home-gallery-stage .w-dyn-list");
    const track = scope.querySelector(".home-track") || (wrapper ? wrapper.querySelector(".w-dyn-items") : null);
    const infoBox = scope.querySelector(".home-project-info") || document.querySelector(".home-project-info");
    const clientEl = scope.querySelector(".home-client-name") || document.querySelector(".home-client-name");
    const subtitleEl = scope.querySelector(".home-project-subtitle") || document.querySelector(".home-project-subtitle");

    if (!wrapper || !track) {
      if (curtain) curtain.classList.add("is-revealed");
      return;
    }

    destroyHome();
    homeAbortController = new AbortController();
    const { signal } = homeAbortController;

    const rawSlides = Array.from(track.children).filter(
      (el) => el.classList.contains("home-slide") || el.classList.contains("w-dyn-item")
    );
    if (!rawSlides.length) {
      if (curtain) curtain.classList.add("is-revealed");
      return;
    }

    const TOTAL_SETS = 3;
    const CENTER_SET = 1;
    const origCount = rawSlides.length;
    const centerStartIndex = CENTER_SET * origCount;
    const allSlides = [];
    const activeVideoPool = [];

    let isMobile = checkIsMobile();
    let viewportW = window.innerWidth;
    let singleSetWidth = 0;
    let slideMetrics = [];
    let userInteracted = false;

    let currentX = 0;
    let targetX = 0;
    let rawTargetX = 0;
    let lastFrameTime = performance.now();
    let mobileIndex = centerStartIndex;
    let activeCenterSlide = null;
    let activeOrigIndex = -1;

    let isDragging = false;
    let dragDistance = 0;
    let fadeTimer = null;
    let curtainRevealed = false;
    const startTime = performance.now();

    function checkIsMobile() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return w <= 767 || (w <= 1024 && window.innerHeight > w);
    }

    function getBunnyUrl(rawVal) {
      if (!rawVal) return "";
      const val = rawVal.trim();
      if (!val) return "";
      if (val.startsWith("http")) return val;
      const match = val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const cleanId = match ? match[0] : val;
      return "https://" + BUNNY_CDN_HOST + "/" + cleanId + "/play_720p.mp4";
    }

    function lockNaturalAspect(img, mediaWrap) {
      if (!img || !mediaWrap || mediaWrap.classList.contains("is-fill") || (mediaWrap.closest && mediaWrap.closest(".is-fill"))) return;
      if (img.naturalWidth && img.naturalHeight) {
        mediaWrap.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
      }
    }

    function revealCurtain() {
      if (!curtain || curtainRevealed) return;
      measureGeometry();
      curtainRevealed = true;
      curtain.classList.add("is-revealed");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!userInteracted) {
            measureGeometry();
          }
        });
      });
    }

    if (curtain) {
      setTimeout(revealCurtain, MAX_SAFETY_TIME);
    }

    rawSlides.forEach((slide, idx) => {
      slide.classList.add("home-slide");
      slide.setAttribute("data-orig-index", String(idx));

      const fillFlag = slide.querySelector(".fill-screen-flag");
      const isFill = Boolean(fillFlag && !fillFlag.classList.contains("w-condition-invisible"));
      slide.classList.toggle("is-fill", isFill);

      const rawMediaWrap = slide.querySelector(".home-media-wrap");
      if (rawMediaWrap) {
        rawMediaWrap.classList.toggle("is-fill", isFill);
        if (isFill) {
          rawMediaWrap.style.aspectRatio = "";
        }
      }

      const fxRaw = slide.getAttribute("data-focus-x");
      const fyRaw = slide.getAttribute("data-focus-y");
      const fx = fxRaw !== null && fxRaw.trim() !== "" && !isNaN(fxRaw) ? parseFloat(fxRaw) + "%" : "50%";
      const fy = fyRaw !== null && fyRaw.trim() !== "" && !isNaN(fyRaw) ? parseFloat(fyRaw) + "%" : "50%";
      const objPos = fx + " " + fy;

      const link = slide.querySelector(".home-slide-link") || slide.querySelector("a");
      const slug = slide.getAttribute("data-slug");
      let projectUrl = slide.getAttribute("data-url") || "";

      if (link) {
        link.classList.add("home-slide-link");
        link.setAttribute("draggable", "false");
        if (link.getAttribute("href")) {
          projectUrl = link.getAttribute("href");
          link.removeAttribute("href");
        }
      }

      if (!projectUrl && slug) {
        projectUrl = "/projects/" + slug.trim();
      }

      if (projectUrl) {
        slide.setAttribute("data-project-url", projectUrl);
      }

      const mediaWrap = slide.querySelector(".home-media-wrap");
      const img = slide.querySelector(".home-media-img") || slide.querySelector("img");
      if (img) {
        img.classList.add("home-media-img");
        img.setAttribute("decoding", "async");
        img.setAttribute("draggable", "false");
        img.style.objectPosition = objPos;

        if (img.complete) {
          lockNaturalAspect(img, mediaWrap);
        } else {
          img.addEventListener("load", () => lockNaturalAspect(img, mediaWrap), { once: true });
        }
      }

      const embedWrap = slide.querySelector(".home-video-embed");
      const hasValidEmbed = !embedWrap || !embedWrap.classList.contains("w-condition-invisible");
      const video = slide.querySelector(".home-slide-video") || slide.querySelector("video");

      if (video && hasValidEmbed) {
        video.classList.add("home-slide-video");
        video.style.objectPosition = objPos;
        video.removeAttribute("poster");
        video.setAttribute("preload", "none");

        const rawId = video.getAttribute("data-video-id") || video.getAttribute("data-video-src");
        const resolvedUrl = getBunnyUrl(rawId);
        if (resolvedUrl) {
          video.setAttribute("data-resolved-src", resolvedUrl);
        }
      }
    });

    track.innerHTML = "";

    for (let s = 0; s < TOTAL_SETS; s++) {
      rawSlides.forEach((origSlide, idx) => {
        const clone = origSlide.cloneNode(true);
        if (s !== CENTER_SET) clone.setAttribute("aria-hidden", "true");

        // Eager-load the first image (active center slide), offscreen slides lazy load
        const isInitialVisible = (s === CENTER_SET && idx === 0);
        const img = clone.querySelector(".home-media-img") || clone.querySelector("img");
        if (img) {
          img.setAttribute("loading", isInitialVisible ? "eager" : "lazy");
          img.setAttribute("decoding", "async");
        }

        track.appendChild(clone);
        allSlides.push(clone);
      });
    }

    activeCenterSlide = allSlides[centerStartIndex] || allSlides[0];

    allSlides.forEach((slide) => {
      const mediaWrap = slide.querySelector(".home-media-wrap");
      const isFill = slide.classList.contains("is-fill");
      if (mediaWrap) {
        mediaWrap.classList.toggle("is-fill", isFill);
        if (isFill) {
          mediaWrap.style.aspectRatio = "";
        }
      }

      const img = slide.querySelector("img");
      if (img && mediaWrap && !isFill) {
        const applyAspect = () => {
          if (img.naturalWidth && img.naturalHeight) {
            mediaWrap.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
            if (!userInteracted) {
              measureGeometry();
            }
          }
        };

        if (img.complete && img.naturalWidth) {
          applyAspect();
        } else {
          img.addEventListener("load", applyAspect, { once: true });
        }
      }

      const video = slide.querySelector(".home-slide-video") || slide.querySelector("video");
      if (!video) return;

      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("muted", "");
      video.setAttribute("loop", "");

      video.addEventListener("playing", () => {
        slide.classList.add("is-video-playing");
      });

      video.addEventListener("timeupdate", () => {
        if (video.currentTime >= MAX_VIDEO_SECONDS) {
          video.currentTime = 0.05;
        }
      });
    });

    function measureGeometry() {
      const wasMobile = isMobile;
      isMobile = checkIsMobile();
      viewportW = window.innerWidth;

      if (isMobile) {
        singleSetWidth = origCount * viewportW;
        slideMetrics = allSlides.map((el, idx) => {
          const video = el.querySelector(".home-slide-video") || el.querySelector("video");
          const videoSrc = video ? video.getAttribute("data-resolved-src") || "" : "";
          return {
            el: el,
            left: idx * viewportW,
            width: viewportW,
            center: idx * viewportW + viewportW * 0.5,
            origIndex: parseInt(el.getAttribute("data-orig-index") || "0", 10),
            video: videoSrc ? video : null,
            videoSrc: videoSrc
          };
        });

        if (!userInteracted) {
          mobileIndex = centerStartIndex;
          activeCenterSlide = allSlides[mobileIndex];
          targetX = -mobileIndex * viewportW;
          rawTargetX = targetX;
          currentX = targetX;
          track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";
          updateActiveProject(true);
          manageVideoPlayback();
        } else if (wasMobile !== isMobile) {
          const currentActiveIdx = allSlides.indexOf(activeCenterSlide);
          mobileIndex = currentActiveIdx !== -1 ? currentActiveIdx : centerStartIndex;
          targetX = -mobileIndex * viewportW;
          rawTargetX = targetX;
          currentX = targetX;
          track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";
        } else {
          targetX = -mobileIndex * viewportW;
          rawTargetX = targetX;
        }
      } else {
        const computedGap = parseFloat(window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap);
        const gap = !isNaN(computedGap) ? computedGap : 5;
        let runningLeft = 0;

        const prevMetric = slideMetrics.find((m) => m.el === activeCenterSlide);
        const prevCurrOffset = prevMetric ? viewportW * 0.5 - currentX - prevMetric.center : 0;
        const prevTargOffset = prevMetric ? viewportW * 0.5 - targetX - prevMetric.center : 0;

        slideMetrics = allSlides.map((el) => {
          const isFillSlide = el.classList.contains("is-fill");
          let w = isFillSlide ? Math.round(viewportW * 1.02) : el.getBoundingClientRect().width;
          if (!isFillSlide && w < 40) {
            w = Math.round(viewportW * 0.55);
          }
          const video = el.querySelector(".home-slide-video") || el.querySelector("video");
          const videoSrc = video ? video.getAttribute("data-resolved-src") || "" : "";

          const metric = {
            el: el,
            left: runningLeft,
            width: w,
            center: runningLeft + w * 0.5,
            origIndex: parseInt(el.getAttribute("data-orig-index") || "0", 10),
            video: videoSrc ? video : null,
            videoSrc: videoSrc
          };
          runningLeft += w + gap;
          return metric;
        });

        const set1Start = slideMetrics[origCount];
        const set0Start = slideMetrics[0];
        singleSetWidth = set1Start ? set1Start.left - set0Start.left : runningLeft / TOTAL_SETS;

        if (singleSetWidth <= 0) return;

        if (!userInteracted) {
          const targetMetric =
            slideMetrics.find((m) => m.el === activeCenterSlide) ||
            slideMetrics[centerStartIndex] ||
            slideMetrics[0];

          if (targetMetric) {
            activeCenterSlide = targetMetric.el;
            currentX = viewportW * 0.5 - targetMetric.center;
            targetX = currentX;
            rawTargetX = currentX;
            track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";
            updateActiveProject(true);
            manageVideoPlayback();
          }
        } else {
          const newMetric = slideMetrics.find((m) => m.el === activeCenterSlide);
          if (newMetric) {
            currentX = viewportW * 0.5 - (newMetric.center + prevCurrOffset);
            targetX = viewportW * 0.5 - (newMetric.center + prevTargOffset);
            rawTargetX = targetX;
            track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";
          }
        }
      }
    }

    if ("ResizeObserver" in window) {
      homeResizeObserver = new ResizeObserver(measureGeometry);
      allSlides.slice(0, centerStartIndex + origCount).forEach((slide) => homeResizeObserver.observe(slide));
    }

    measureGeometry();
    requestAnimationFrame(measureGeometry);
    window.addEventListener("resize", measureGeometry, { passive: true, signal });

    const initialSlideIndices = [centerStartIndex];
    if (centerStartIndex + 1 < allSlides.length) initialSlideIndices.push(centerStartIndex + 1);
    if (centerStartIndex - 1 >= 0) initialSlideIndices.push(centerStartIndex - 1);

    const decodePromises = initialSlideIndices.map((idx) => {
      const slide = allSlides[idx];
      if (!slide) return Promise.resolve();
      const img = slide.querySelector("img");
      if (img) {
        if (img.complete && img.naturalWidth > 0) {
          const mediaWrap = slide.querySelector(".home-media-wrap");
          lockNaturalAspect(img, mediaWrap);
          return Promise.resolve();
        }
        if (typeof img.decode === "function") {
          return img.decode().then(() => {
            const mediaWrap = slide.querySelector(".home-media-wrap");
            lockNaturalAspect(img, mediaWrap);
          }).catch(() => { });
        }
      }
      return Promise.resolve();
    });

    const curtainSafetyTimer = setTimeout(revealCurtain, MAX_SAFETY_TIME);
    Promise.allSettled(decodePromises).then(() => {
      clearTimeout(curtainSafetyTimer);
      measureGeometry();
      const elapsed = performance.now() - startTime;
      const remainingHold = Math.max(0, MINIMUM_LOADER_TIME - elapsed);
      setTimeout(() => {
        measureGeometry();
        revealCurtain();
      }, remainingHold);
    });

    function wrapTrack() {
      if (singleSetWidth <= 0) return;

      if (isMobile) {
        if (mobileIndex >= (CENTER_SET + 1) * origCount) {
          mobileIndex -= origCount;
          const shift = origCount * viewportW;
          currentX += shift;
          targetX += shift;
          rawTargetX += shift;
        } else if (mobileIndex < (CENTER_SET - 1) * origCount) {
          mobileIndex += origCount;
          const shift = origCount * viewportW;
          currentX -= shift;
          targetX -= shift;
          rawTargetX -= shift;
        }
      } else {
        const centerSetFirst = slideMetrics[centerStartIndex];
        const centerRef = centerSetFirst ? viewportW * 0.5 - centerSetFirst.center : -singleSetWidth * CENTER_SET;

        const diff = currentX - centerRef;
        if (diff > singleSetWidth * 0.5) {
          currentX -= singleSetWidth;
          targetX -= singleSetWidth;
          rawTargetX -= singleSetWidth;
        } else if (diff < -singleSetWidth * 0.5) {
          currentX += singleSetWidth;
          targetX += singleSetWidth;
          rawTargetX += singleSetWidth;
        }
      }
    }

    function getClosestSlide(refX) {
      if (!slideMetrics.length) return null;
      const screenMidInTrack = viewportW * 0.5 - refX;
      let best = slideMetrics[0];
      let minDist = Infinity;

      for (let i = 0; i < slideMetrics.length; i++) {
        const d = Math.abs(slideMetrics[i].center - screenMidInTrack);
        if (d < minDist) {
          minDist = d;
          best = slideMetrics[i];
        }
      }
      return best;
    }

    function updateActiveProject(instant) {
      let closest = null;
      if (isMobile) {
        closest = slideMetrics[mobileIndex] || slideMetrics[0];
      } else {
        closest = getClosestSlide(currentX);
      }
      if (!closest) return;

      activeCenterSlide = closest.el;

      if (activeOrigIndex !== closest.origIndex) {
        activeOrigIndex = closest.origIndex;
        const slideEl = closest.el;
        const clientName = slideEl.getAttribute("data-client") || "";
        const subtitle = slideEl.getAttribute("data-subtitle") || "";
        const targetHref = slideEl.getAttribute("data-project-url") || "";

        if (infoBox && targetHref) {
          infoBox.setAttribute("href", targetHref);
        }

        if (instant || !infoBox) {
          if (clientEl) clientEl.textContent = clientName;
          if (subtitleEl) subtitleEl.textContent = subtitle;
        } else {
          infoBox.classList.add("is-switching");
          clearTimeout(fadeTimer);
          fadeTimer = setTimeout(() => {
            if (clientEl) clientEl.textContent = clientName;
            if (subtitleEl) subtitleEl.textContent = subtitle;
            infoBox.classList.remove("is-switching");
          }, 140);
        }
      }
    }

    function manageVideoPlayback() {
      if (!slideMetrics.length) return;

      const closest = isMobile ? slideMetrics[mobileIndex] : getClosestSlide(currentX);
      if (!closest) return;

      const curIdx = slideMetrics.indexOf(closest);
      const allowedIndices = [curIdx];
      if (curIdx > 0) allowedIndices.push(curIdx - 1);
      if (curIdx < slideMetrics.length - 1) allowedIndices.push(curIdx + 1);

      for (let i = activeVideoPool.length - 1; i >= 0; i--) {
        const item = activeVideoPool[i];
        if (!allowedIndices.includes(item.index)) {
          if (item.video) {
            item.video.pause();
            item.video.removeAttribute("src");
            item.video.load();
            item.el.classList.remove("is-video-playing");
          }
          activeVideoPool.splice(i, 1);
        }
      }

      allowedIndices.forEach((idx) => {
        const m = slideMetrics[idx];
        if (!m || !m.video) return;

        const isMounted = activeVideoPool.some((p) => p.index === idx);

        if (!isMounted) {
          if (activeVideoPool.length >= MAX_ACTIVE_DECODERS + 1) {
            const oldest = activeVideoPool.shift();
            if (oldest && oldest.video) {
              oldest.video.pause();
              oldest.video.removeAttribute("src");
              oldest.video.load();
              oldest.el.classList.remove("is-video-playing");
            }
          }

          if (m.video.getAttribute("src") !== m.videoSrc) {
            m.video.src = m.videoSrc;
            m.video.load();
          }

          activeVideoPool.push({ index: idx, video: m.video, el: m.el });
        }

        if (idx === curIdx) {
          if (m.video.paused) {
            m.video.muted = true;
            m.video.play().catch(() => { });
          }
        } else {
          if (!m.video.paused) {
            m.video.pause();
          }
        }
      });
    }

    function stepSlide(dir) {
      userInteracted = true;
      if (isMobile) {
        mobileIndex = Math.max(0, Math.min(allSlides.length - 1, mobileIndex + dir));
        targetX = -mobileIndex * viewportW;
        rawTargetX = targetX;
      } else {
        const closest = getClosestSlide(targetX);
        if (!closest) return;
        const curIdx = slideMetrics.indexOf(closest);
        const nextIdx = Math.max(0, Math.min(slideMetrics.length - 1, curIdx + dir));
        const nextMetric = slideMetrics[nextIdx];
        if (nextMetric) {
          rawTargetX = viewportW * 0.5 - nextMetric.center;
          targetX = rawTargetX;
        }
      }
    }

    window.addEventListener(
      "wheel",
      (e) => {
        if (isMobile) return;
        if (e.ctrlKey || e.metaKey) return;

        userInteracted = true;
        e.preventDefault();

        let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (e.deltaMode === 1) delta *= 32;
        else if (e.deltaMode === 2) delta *= window.innerHeight;
        if (Math.abs(delta) < 0.2) return;

        const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta), 120);
        rawTargetX -= clampedDelta * WHEEL_MULTIPLIER;
      },
      { passive: false, signal }
    );

    let startX = 0;
    let lastX = 0;
    let velocityX = 0;

    function isInteractiveUI(target) {
      if (!target || !target.closest) return false;
      return Boolean(
        target.closest(
          ".navbar-home a, .navbar-home button, .home-logo a, .home-nav-links a, .home-project-info"
        )
      );
    }

    window.addEventListener("dragstart", (e) => e.preventDefault(), { signal });

    window.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (isInteractiveUI(e.target)) return;

      userInteracted = true;
      isDragging = true;
      dragDistance = 0;
      startX = e.clientX;
      lastX = e.clientX;
      velocityX = 0;
      rawTargetX = targetX;
      wrapper.classList.add("is-dragging");
    }, { signal });

    window.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      dragDistance += Math.abs(dx);
      lastX = e.clientX;
      velocityX = dx;

      if (isMobile) {
        rawTargetX += dx;
        targetX = rawTargetX;
      } else {
        rawTargetX += dx * DRAG_MULTIPLIER;
        targetX = rawTargetX;
      }
    }, { passive: true, signal });

    function onPointerEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      wrapper.classList.remove("is-dragging");

      const endX = typeof e.clientX === "number" && e.clientX !== 0 ? e.clientX : lastX;

      if (isMobile) {
        const swipeDelta = endX - startX;
        if (dragDistance > 14) {
          if (swipeDelta < -35 || velocityX < -2.5) {
            stepSlide(1);
          } else if (swipeDelta > 35 || velocityX > 2.5) {
            stepSlide(-1);
          } else {
            stepSlide(0);
          }
        } else {
          if (startX < viewportW * 0.5) {
            stepSlide(-1);
          } else {
            stepSlide(1);
          }
        }
      } else {
        if (dragDistance > 8 && Math.abs(velocityX) > 1.2) {
          rawTargetX += velocityX * DRAG_MOMENTUM;
        }
      }
    }

    window.addEventListener("pointerup", onPointerEnd, { passive: true, signal });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true, signal });

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") stepSlide(1);
      else if (e.key === "ArrowLeft") stepSlide(-1);
    }, { signal });

    let lastActiveCheck = 0;

    function rafLoop(now) {
      const dt = Math.min(34, Math.max(4, now - lastFrameTime));
      lastFrameTime = now;
      const dtScale = dt / 16.667;

      if (singleSetWidth > 0) {
        wrapTrack();

        if (!isMobile) {
          if (isDragging) {
            targetX = rawTargetX;
            const dragAlpha = 1 - Math.pow(1 - DRAG_LERP_FACTOR, dtScale);
            currentX += (targetX - currentX) * dragAlpha;
          } else {
            const stage1Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE1, dtScale);
            const stage2Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE2, dtScale);
            targetX += (rawTargetX - targetX) * stage1Alpha;
            currentX += (targetX - currentX) * stage2Alpha;
          }
        } else {
          const lerpFactor = isDragging ? 0.35 : MOBILE_SNAP_LERP;
          const mobileAlpha = 1 - Math.pow(1 - lerpFactor, dtScale);
          currentX += (targetX - currentX) * mobileAlpha;
        }

        track.style.transform = "translate3d(" + currentX.toFixed(2) + "px, 0, 0)";

        if (isDragging || (userInteracted && now - lastActiveCheck > 100)) {
          lastActiveCheck = now;
          updateActiveProject(false);
          manageVideoPlayback();
        }
      }

      homeRafId = requestAnimationFrame(rafLoop);
    }

    homeRafId = requestAnimationFrame(rafLoop);
  }

  function destroyHome() {
    if (homeRafId) {
      cancelAnimationFrame(homeRafId);
      homeRafId = null;
    }
    if (homeAbortController) {
      homeAbortController.abort();
      homeAbortController = null;
    }
    if (homeResizeObserver) {
      homeResizeObserver.disconnect();
      homeResizeObserver = null;
    }
  }

  window.initHome = initHome;
  window.destroyHome = destroyHome;

  // Auto-boot if page loaded directly
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.querySelector(".home-section")) initHome();
    });
  } else {
    if (document.querySelector(".home-section")) initHome();
  }
})();