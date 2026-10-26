Project Master Briefing: Milena Gorum Webflow Portfolio
1. Hosting Architecture & Development Pipeline
Frontend Platform: Webflow (serves the semantic DOM, CMS collections, and visual styles).

Live Staging URL: [https://milena-gorum.webflow.io/](https://milena-gorum.webflow.io/)

Local Workspace: Google Antigravity repository (milena-gorum-web) on branch main.

Edge CDN: Cloudflare Pages ([https://milena-gorum-assets.pages.dev/](https://milena-gorum-assets.pages.dev/)), auto-deploying in ~10s on git push.

Video Pull Zone: Bunny Stream CDN ([https://vz-cc78103f-0dc.b-cdn.net/](https://vz-cc78103f-0dc.b-cdn.net/)).

Webflow Site Settings Integration:

<head>: Preconnects to Bunny CDN, Swiper v11 bundle CSS, and loads [https://milena-gorum-assets.pages.dev/global.css](https://milena-gorum-assets.pages.dev/global.css).

Footer (Before </body>): Swiper v11 bundle JS, followed by deferred scripts: home.js, projects.js, project-detail.js, and transitions.js.

Individual Page Settings: All custom code blocks inside Webflow's individual Page Settings have been removed. All runtime logic is driven exclusively by the repository files.

2. Global Routing & Transition Rules (Barba.js + GSAP)
Single Page Application (SPA): Managed via Barba.js v2 (sync: true) and GSAP CustomEase ("smooth", "osmo").

DOM Wrapper: document.body is automatically stamped with data-barba="wrapper".

Container Lifecycle:

Each Webflow page has one top-level section with data-barba="container" and a unique data-barba-namespace.

During page changes (sync: true), both the outgoing and incoming containers exist simultaneously in the DOM.

transitions.js mounts the incoming view via mountPage(next.container) on afterEnter and tears down the outgoing view via unmountPage(current.container) on beforeLeave.

Strict Rule on DOM Queries:

Never use bare document.querySelector(...) inside page engines.

Always scope queries to the passed container: scope.querySelector(...) to prevent querying elements from the outgoing page.

3. Webflow Hierarchy, CMS Bindings & Custom Attributes
A. Homepage (/)
Barba Attributes: data-barba="container" | data-barba-namespace="home" (placed on .home-section).

Navigator Tree:

Plaintext
home-section                            [100vw, 100dvh, Relative, Overflow: Hidden]
├── navbar-home                         [Fixed Center-Left: Top 50%, Y -50%]
│     ├── home-logo > logo-txt-home
│     └── home-nav-links > "Projects", "Index", "Information"
├── home-project-info                   [Link Block: Fixed Center-Right Desktop, Fixed Bottom Mobile]
│     ├── home-client-name              [Text Block: Bound to Client Name]
│     └── home-project-subtitle         [Text Block: Bound to Subtitle]
├── home-gallery-stage                  [100vw, 100dvh, Overflow: Hidden]
│     └── home-track-wrapper            [Collection List Wrapper — Filter: Featured = ON, Sort: Sequence Asc]
│           └── home-track              [Collection List — Horizontal Flex, Gap: 5px]
│                 └── home-slide        [Collection Item — Cloned into 5-set infinite loop]
│                       └── home-slide-link [Link Block]
│                             ├── fill-screen-flag   [Div Block — Conditional: Fill Screen is ON]
│                             └── home-media-wrap    [Div Block — Hosts image/video]
│                                   ├── home-media-img   [Image: Bound to Cover Image]
│                                   └── home-video-embed [HTML Embed — Conditional: Video ID is Set]
└── home-curtain                        [Fixed Overlay — Editorial pre-decode curtain reveal]
CMS & Custom Attributes on .home-slide:

data-client: Bound to CMS Client Name.

data-subtitle: Bound to CMS Subtitle.

data-slug: Bound to CMS Slug (fallback destination URL).

data-focus-x / data-focus-y: Bound to focal coordinate fields (0–100%).

.fill-screen-flag: An empty div set to display: none. If present and not .w-condition-invisible, the engine expands the slide to 102vw full-bleed width.

Special Logic:

.home-slide-link has its href stripped on load so only .home-project-info navigates. The centered slide's URL is dynamically applied to .home-project-info.

B. Projects Overview (/projects)
Barba Attributes: data-barba="container" | data-barba-namespace="projects" (placed on .projects-section).

Navigator Tree:

Plaintext
projects-section                        [100%, 100dvh, Relative, Overflow: Hidden]
├── navbar                              [Top navigation bar placed inside projects-section]
│     ├── nav-top                       [Top Row]
│     │     ├── left-box > text-link    ["Milena Gorum" brand logo link]
│     │     └── nav-links               ["Projects" (.nav-reset-scale), "Index", "Info"]
│     └── nav-projects                  [Controls Row]
│           ├── left-box > zoom-controls [Hidden on Mobile]
│           │     ├── btn-zoom-in       [Text/Button: "+"]
│           │     └── btn-zoom-out      [Text/Button: "–"]
│           └── filters-wrapper
│                 ├── primary-filter-list [Flex Vertical]
│                 │     └── filter-btn  [Custom Attr: data-filter="all" | "motion" | "image"]
│                 └── sub-filter-list   [Flex Vertical — Toggled when primary != "all"]
│                       ├── sub-btn     [Static: data-sub="all"]
│                       └── sub-categories-wrapper [Nested Collection List]
│                             └── sub-category-item > sub-btn [Bound to Subcategory Name]
├── desktop-gallery-stage               [Visible > 1024px, Display: None on Mobile]
│     └── projects-track-wrapper        [Collection List Wrapper — Sort: Sequence Asc]
│           └── projects-track          [Collection List]
│                 └── project-card      [Collection Item with 6 custom attributes]
│                       ├── project-link [Link Block to Detail Page]
│                       │     ├── project-header [project-num, project-client, project-subtitle]
│                       │     └── project-media-wrap [project-img + project-video-embed]
│                       └── card-sub-list [Nested Collection List — Display: None, reads tags]
└── mobile-gallery-stage                [Display: None > 1024px, Flex on Mobile <= 1024px]
      ├── mobile-main-stage             [mobile-main-swiper for center project]
      ├── mobile-meta-bar               [mobile-client-title, mobile-project-title]
      └── mobile-thumb-stage            [mobile-thumb-swiper iOS-style scrubber strip]
CMS Custom Attributes on .project-card:

data-type: Bound to CMS Project Type (motion or image).

data-subcategories: Bound to CMS Subcategories list.

data-client: Bound to CMS Client Name.

data-title: Bound to CMS Subtitle.

data-focus-x / data-focus-y: CMS Focal point percentages.

Special Logic:

Permanent 2-digit sequence formatting (01, 02, ...).

Right-to-left marquee automatically switches to a static bounded layout with 16px header indent when CMS items 
≤3.

Adjacent title collision masking (.is-label-occluded).

Video decoder pool capped at 3 active videos to preserve Safari memory.

C. Project Details Template (/detail_projects)
Barba Attributes: data-barba="container" | data-barba-namespace="project-detail" (placed on .gallery-section).

Navigator Tree:

Plaintext
gallery-section                         [data-project-number bound to CMS Sequence]
├── top-bar                             [Flex Row]
│     ├── back-link                     [Smart Back Button — returns to previous page]
│     └── top-sequence-list             [Empty Div — JS clones template top-seq-item: 01-01, 01-02]
├── main-stage                          [Holds main full-bleed Swiper]
│     └── main-swiper                   [Collection List Wrapper — Filter: Parent = Current, Sort: Order Asc]
│           └── swiper-wrapper > swiper-slide
│                 ├── fill-screen-flag  [Div Block — Conditional: Fill Screen ON]
│                 ├── image-container   [Conditional: Video URL/ID Not Set] > main-media-img
│                 └── video-wrapper     [Conditional: Video ID Is Set]
│                       ├── video-embed [HTML Embed: <video class="slide-video" data-video-id="...">]
│                       ├── seek-container.swiper-no-swiping [seek-track > seek-fill]
│                       └── controls-container.swiper-no-swiping [btn-fullscreen, btn-play, btn-sound]
└── bottom-stage                        [GSAP-toggled drawer]
      ├── thumb-swiper                  [Same Collection List filter — horizontal thumb carousel]
      │     └── swiper-wrapper > swiper-slide [thumb-seq-label, thumb-img with sizes="160px"]
      └── project-footer                [footer-label, footer-credits bound to CMS Project Details]
CMS Custom Attributes on swiper-slide:

data-focus-x / data-focus-y: Coordinate offsets applied to object-position.

Special Logic:

Video playback supports native iOS Safari fullscreen (webkitEnterFullscreen) and standard HTML5 fullscreen.

Spacebar toggles active slide video playback; Escape key navigates back.

4. Separation of Responsibilities: Webflow vs. global.css
To allow visual design adjustments in Webflow Designer without code conflicts, styles are strictly separated:

Setting / Property	Where It Is Managed	Notes
Typography (Fonts, sizes, line heights, letter spacing, colors)	Webflow Style Panel	Direct visual control for client branding.
UI Spacing & Margins (Navbars, padding, gaps)	Webflow Style Panel	Managed directly on classes like .top-bar, .navbar-home.
Responsive Display Toggles (display: none / flex)	Webflow Style Panel	Breakpoint visibility (e.g. desktop vs. mobile stages).
Global Resets (Box sizing, scrollbar hiding, text selection)	global.css	Uniform behavior across WebKit, Gecko, and Blink.
Hardware GPU Compositing (will-change, backface-visibility)	global.css	Ensures 60/120fps GPU rasterization.
Interactive States (.is-fill, .is-video-playing, .is-switching, .is-ready, .is-hovered, .is-label-occluded, .is-no-loop)	global.css	Handled via CSS class selectors triggered by JS.
Full-Bleed Desktop Overrides (102vw)	global.css	Prevents subpixel seam gaps during horizontal slide translation.
5. Antigravity Operational Directives (Strict Rules)
Always clean up listeners & loops: Every window/document listener must use an AbortController signal and be aborted in destroy...(). Every requestAnimationFrame must be canceled.

Reclaim Safari Video Decoders: In unmountPage() and destroy...(), all <video> elements must be paused, have their src removed, and execute .load() to prevent iOS WebKit decoder exhaustion.

Keep Animations Compositor-Only: Use transform (translate3d, scaleX) and opacity with force3D: true. Never animate layout properties (top, left, width, margin) with GSAP.

Git Workflow: Commits pushed to main deploy to Cloudflare Pages globally in ~10 seconds. Webflow does not need to be republished for JavaScript or CSS changes.