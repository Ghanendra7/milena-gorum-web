/**
 * Milena Gorum - Homepage Infinite Horizontal Gallery Engine
 * Hosted on Cloudflare Pages (home.js)
 */

(function () {
  const BUNNY_STREAM_BASE = "https://vz-cc78103f-0dc.b-cdn.net";
  const TOTAL_SETS = 5;
  const CENTER_SET = 2;

  // Physics multipliers
  const WHEEL_SMOOTH_STAGE1 = 0.22;
  const WHEEL_SMOOTH_STAGE2 = 0.14;
  const DRAG_MOMENTUM_MULTIPLIER = 4.5;
  const DRAG_SMOOTHING = 0.18;

  let homeAbortController = null;
  let homeRafId = null;
  let ro = null;

  function initHome(container) {
    const scope = container || document.querySelector('.home-section') || document;
    const track = scope.querySelector(".home-track");
    const trackWrapper = scope.querySelector(".home-track-wrapper");
    const curtain = scope.querySelector(".home-curtain");
    const infoBox = scope.querySelector(".home-project-info");
    const clientEl = scope.querySelector(".home-client-name");
    const subtitleEl = scope.querySelector(".home-project-subtitle");

    if (!track || !trackWrapper) return;

    // Clean up any previous running instances
    destroyHome();
    homeAbortController = new AbortController();
    const { signal } = homeAbortController;

    const originalSlides = Array.from(track.querySelectorAll(".home-slide"));
    const origCount = originalSlides.length;
    if (origCount === 0) return;

    let singleSetWidth = 0;
    let allSlides = [];
    let slideMetrics = [];
    let activeCenterSlide = null;
    let activeOrigIndex = -1;

    // Physics positions
    let currentX = 0;
    let targetX = 0;
    let isDragging = false;
    let startPointerX = 0;
    let lastPointerX = 0;
    let dragVelocity = 0;
    let dragDistance = 0;

    // 1. Lock Natural Aspect Ratios & Extract Links
    function lockNaturalAspect(slide) {
      const img = slide.querySelector(".home-media-img");
      const wrap = slide.querySelector(".home-media-wrap");
      const link = slide.querySelector(".home-slide-link") || slide.querySelector("a");

      if (link && !slide.hasAttribute("data-project-url")) {
        const href = link.getAttribute("href");
        if (href && href !== "#") {
          slide.setAttribute("data-project-url", href);
        }
        link.removeAttribute("href");
      }

      if (slide.classList.contains("is-fill") || wrap?.classList.contains("is-fill")) {
        return;
      }

      if (img && wrap) {
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        if (natW && natH && !wrap.style.aspectRatio) {
          wrap.style.aspectRatio = `${natW} / ${natH}`;
        }
      }
    }

    originalSlides.forEach(lockNaturalAspect);

    // 2. Build 5-Set Loop Clones
    track.innerHTML = "";
    for (let setIdx = 0; setIdx < TOTAL_SETS; setIdx++) {
      originalSlides.forEach((origSlide, origIdx) => {
        const clone = origSlide.cloneNode(true);
        clone.setAttribute("data-set", setIdx);
        clone.setAttribute("data-orig-index", origIdx);
        track.appendChild(clone);
      });
    }

    allSlides = Array.from(track.querySelectorAll(".home-slide"));

    // 3. Measure Geometry & Recalculate Metrics
    function measureGeometry() {
      singleSetWidth = 0;
      for (let i = 0; i < origCount; i++) {
        singleSetWidth += allSlides[i].offsetWidth;
      }
      const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
      singleSetWidth += gap * origCount;

      slideMetrics = allSlides.map((slide) => {
        const wrap = slide.querySelector(".home-media-wrap");
        return {
          el: slide,
          wrapEl: wrap,
          origIndex: parseInt(slide.getAttribute("data-orig-index"), 10),
          width: slide.offsetWidth,
          offsetLeft: slide.offsetLeft,
        };
      });
    }

    measureGeometry();

    // 4. Exact Center Positioning (Fixes the offset to the left)
    const centerStartIndex = CENTER_SET * origCount;
    const centerSlide = allSlides[centerStartIndex];
    if (centerSlide) {
      const centerSlideWidth = centerSlide.offsetWidth;
      const initialOffset = (window.innerWidth - centerSlideWidth) / 2;
      targetX = -centerSlide.offsetLeft + initialOffset;
      currentX = targetX;
      track.style.transform = `translate3d(${currentX}px, 0, 0)`;
    }

    // 5. Video Autoplay Manager
    function manageVideoPlayback() {
      const vpW = window.innerWidth;
      const buffer = vpW * 0.4;

      allSlides.forEach((slide) => {
        const rect = slide.getBoundingClientRect();
        const inPreloadZone = rect.right >= -buffer && rect.left <= vpW + buffer;
        const video = slide.querySelector(".home-slide-video");

        if (inPreloadZone) {
          if (!video) {
            const embed = slide.querySelector(".home-video-embed");
            const videoId = embed?.getAttribute("data-video-id") || slide.getAttribute("data-video-id");
            if (embed && videoId) {
              const v = document.createElement("video");
              v.className = "home-slide-video";
              v.playsInline = true;
              v.muted = true;
              v.loop = true;
              v.preload = "auto";
              v.src = `${BUNNY_STREAM_BASE}/${videoId}/play_720p.mp4`;
              embed.appendChild(v);
              v.play().then(() => slide.classList.add("is-video-playing")).catch(() => {});
            }
          } else if (video.paused) {
            video.play().then(() => slide.classList.add("is-video-playing")).catch(() => {});
          }
        } else if (video && !video.paused) {
          video.pause();
          slide.classList.remove("is-video-playing");
        }
      });
    }

    // 6. Project Info & URL Sync
    let fadeTimer = null;
    function updateActiveProject() {
      const screenMid = window.innerWidth / 2;
      let closest = null;
      let minDistance = Infinity;

      for (let i = 0; i < slideMetrics.length; i++) {
        const m = slideMetrics[i];
        const center = currentX + m.offsetLeft + m.width / 2;
        const dist = Math.abs(center - screenMid);
        if (dist < minDistance) {
          minDistance = dist;
          closest = m;
        }
      }

      if (!closest) return;

      if (activeCenterSlide !== closest.el) {
        activeCenterSlide = closest.el;
      }

      if (activeOrigIndex !== closest.origIndex) {
        activeOrigIndex = closest.origIndex;
        const slideEl = closest.el;
        const clientName = slideEl.getAttribute("data-client") || "";
        const subtitle = slideEl.getAttribute("data-subtitle") || "";
        const targetHref = slideEl.getAttribute("data-project-url") || "";

        if (infoBox && targetHref) {
          infoBox.setAttribute("href", targetHref);
        }

        if (!infoBox) {
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

    // 7. Smooth 60fps Physics RAF Loop
    function rafLoop() {
      const diff = targetX - currentX;
      currentX += diff * (isDragging ? DRAG_SMOOTHING : WHEEL_SMOOTH_STAGE1);

      // Infinite Loop Wrap-around
      if (singleSetWidth > 0) {
        const minBound = -(singleSetWidth * (CENTER_SET + 1));
        const maxBound = -(singleSetWidth * (CENTER_SET - 1));
        if (currentX < minBound) {
          currentX += singleSetWidth;
          targetX += singleSetWidth;
        } else if (currentX > maxBound) {
          currentX -= singleSetWidth;
          targetX -= singleSetWidth;
        }
      }

      track.style.transform = `translate3d(${currentX}px, 0, 0)`;
      updateActiveProject();
      manageVideoPlayback();

      homeRafId = requestAnimationFrame(rafLoop);
    }
    homeRafId = requestAnimationFrame(rafLoop);

    // 8. Event Listeners with Signal Cleanup
    const onWheel = (e) => {
      let delta = e.deltaY;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) delta = e.deltaX;
      targetX -= delta * 1.25;
    };

    const onPointerDown = (e) => {
      isDragging = true;
      startPointerX = e.clientX;
      lastPointerX = e.clientX;
      dragVelocity = 0;
      dragDistance = 0;
      trackWrapper.classList.add("is-dragging");
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const delta = e.clientX - lastPointerX;
      dragVelocity = delta;
      dragDistance += Math.abs(delta);
      targetX += delta;
      currentX += delta;
      lastPointerX = e.clientX;
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      trackWrapper.classList.remove("is-dragging");
      targetX += dragVelocity * DRAG_MOMENTUM_MULTIPLIER;
    };

    window.addEventListener("wheel", onWheel, { passive: true, signal });
    trackWrapper.addEventListener("pointerdown", onPointerDown, { signal });
    window.addEventListener("pointermove", onPointerMove, { signal });
    window.addEventListener("pointerup", onPointerUp, { signal });
    window.addEventListener("pointercancel", onPointerUp, { signal });

    // 9. Resize Observer
    ro = new ResizeObserver(() => {
      measureGeometry();
    });
    allSlides.slice(centerStartIndex, centerStartIndex + origCount).forEach((s) => ro.observe(s));

    // 10. Curtain Reveal Fix (Waits for center slide image decode)
    const centerImg = centerSlide?.querySelector(".home-media-img");
    if (centerImg && centerImg.decode) {
      centerImg.decode().then(revealCurtain).catch(revealCurtain);
    } else {
      setTimeout(revealCurtain, 100);
    }

    function revealCurtain() {
      if (curtain) curtain.classList.add("is-revealed");
    }
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
    if (ro) {
      ro.disconnect();
      ro = null;
    }
  }

  // Expose globally so transitions.js can call them
  window.initHome = initHome;
  window.destroyHome = destroyHome;

  // Auto-init on cold load if on Homepage
  if (document.querySelector(".home-section")) {
    initHome();
  }
})();
