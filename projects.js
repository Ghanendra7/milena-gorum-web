/**
 * Milena Gorum - Projects Overview Engine (Complete Studio Logic)
 * Hosted on Cloudflare Pages (projects.js)
 */

(function () {
    let projectsRafId = null;
    let projectsAbortController = null;
    let projectsResizeObserver = null;
    let projectsScope = null;
    let projectsMarqueeDelayTimer = null;
    let projectsDesktopHoverTimer = null;
    let projectsMobileVideoTimer = null;
    let projectsPreloadTimer = null;
    let aspectPersistTimer = null;
    let mobileMainSwiper = null;
    let activeHeaderMarqueeTimeline = null;
    let activeHeaderMarqueeCard = null;

    const cachedPaginationState = {
        path: "",
        complete: false,
        cards: []
    };

    const ASPECT_STORAGE_KEY = "mg_project_asset_aspects_v1";
    const MAX_CACHED_ASPECTS = 500;

    // Seeded by unique CDN asset filename so CMS image replacements automatically miss old ratios
    const KNOWN_ASSET_ASPECTS = {
        "6ad1b95cabe1fe0fbd4c5d78_03-Image.webp": "1000 / 1000",
        "6ad1bc656f8b3661453239ed_image-1781562919-1.JPG.webp": "960 / 1280",
        "6ad66020e515171b7379418f_Pasted%202026-10-19%20at%207.15.52%20PM.png": "1920 / 1080",
        "6ad88fbd9911fec39e130998_3.webp": "864 / 1080",
        "6ad88cd4bb58c554acbcf3f0_Aldo.jpg": "1422 / 800",
        "6ad894f68cf081d6a0d071c0_David%2BSpector_Milena%2BGorum_2.png.webp": "750 / 951",
        "6ad661c0c1631dbbc2fc0588_thumb1.webp": "1280 / 720",
        "6af61e94ea6afeea97b1d664_AUTRE_FINAL_03%2Bcopy.jpg": "800 / 1000",
        "6ad61c446d50958b7f09f91b_image-1760916323-1.JPG.webp": "750 / 750",
        "6ad87fe158f73cbbb913a1f4_Pasted%202026-10-21%20at%202.33.26%20PM.png": "1280 / 720",
        "6ad87ef199a036eb47184739_Pasted%202026-10-21%20at%202.29.15%20PM.png": "1276 / 720",
        "6af4f9286b3ef6a1b067b3eb_image-1791152804-1.JPG": "1440 / 1800",
        "6af4c613437cbd6daa4f6b22_optimess26_Triptychs_Ocean.jpg": "2540 / 1200",
        "6af4fd9ff3c372ea0b5b04c8_Gorum_Charli_XCX_x_Converse_Sharna_Osborne_Still-2.jpg": "4096 / 2304",
        "6af4ff45a719043f44487615_DSCF2392_WEB_JesseGouveia2023.jpg": "800 / 1000",
        "6af4f751bb01694af09cabed_Hypemaker_GIORGIOARMANI_ARCHIERENAUX_HERO_001_OOH.jpg.webp": "750 / 1108",
        "6af501e934d4dfd10569836a_DENIM%2BTEARS%2BWIDE%2BSELECTS%2B5.22%2B(156%2Bof%2B225).jpg": "760 / 1000",
        "6af61fd4220e2cd5296c71a5_colleenweb5.JPG.webp": "750 / 858",
        "6af505ebd35211cee1934d73_image-1781565497-1.JPG": "1080 / 1440",
        "6af063b821ded2e6f1cc2f81_LEXAGATES_IAM_ERIKALONG_02.webp": "2560 / 1700",
        "6af507c8a8806f8d35f4b07e_image-1779819078-1.JPG.webp": "1080 / 1350",
        "6af50a284fdcbd4ab21ff9a1_images-1.jpeg": "645 / 475",
        "6af512d8a930b27fcff613a3_image-1791153100-1.JPG": "1080 / 756",
        "6af513637e982d811a450c3d_image-1750945102-1.JPG.webp": "750 / 935",
        "6af51427b0124a9fbfa3ab2d_image-1774535735-3.JPG": "1080 / 1440",
        "6af51532d782b866c1e5b08e_01(190).webp": "1280 / 1600",
        "6af51621bb13b5715dc4dc8e_Screen%2BShot%2B2022-02-06%2Bat%2B7.57.23%2BPM.jpg": "988 / 1200",
        "6af52307dfc23de1ad38aadd_SANDY_LIANG_MULES_5.24%2B(5%2Bof%2B13)_.JPG.webp": "750 / 1015",
        "6af5172ca719043f444d0a68_IMG_2487.JPG.webp": "1500 / 994",
        "6af52461a2e644e45274b819_image-1715171381-2.JPG.webp": "750 / 937",
        "6af52647eeead51daee60aa0_image-1791141633-1.JPG": "1440 / 1769",
        "6af527414e557c65053b1d02_image-1777482483-1.JPG.webp": "1000 / 1250",
        "6af528c6fce2d7446fcebae6_image-1791141247-5.JPG": "1440 / 1920",
        "6af5299bfce2d7446fcedf42_UO%2BDIP%2B3a.jpg": "581 / 800",
        "6af52a4fcaca39f8324f34e3_JLE_240701_A1_TheEnthusiast_Lifestyle-4.JPG": "2048 / 1463",
        "6af52b0ce667d7a0d656801d_VK_VUORIXKG_67105-B1-0003%20copy.jpg": "3000 / 2448",
        "6af7cbf6975e915cdc45f8a3_6af7cbc10c8c00732e7fd557_image-1785759290-1.jpeg": "1080 / 1440",
        "6af7cd3e1e4c55d88eaedea7_6af7ccbe8f711d0fd861e80b_ADDISON_RAE_BY_ERIKA_KAMANO_COVER_1-JPEG.jpeg": "750 / 938",
        "6af7cdd55edbd2a541e157f6_6af7cd9c053db8627fa2783a_JULIA_GARNER_BY_ERIKA_KAMANO_IMAGE_7-jpg.jpeg": "1500 / 1125",
        "6af7ceedd9e623b908a538cf_6af7ceaf0c8c00732e80a216_IMG_2885.jpeg": "1206 / 1587",
        "6af7d03dd9e623b908a5cf20_6af7d03468b3c49af2bb8abd_image-1791140347-1.jpeg": "940 / 940",
        "6af7d26f1c56b210b29ecc59_6af7d2030f49cf6d3a58b735_NicOlandria_Resize_01.jpeg": "960 / 1200",
        "6af7d2ec37d7fb834ff0b937_6af7d2e9e239236740666477_IMG_7922.jpeg": "900 / 1200",
        "6af7d45fec36a7205952f306_6af7d41eec36a7205952e1b3_MASTER_RGB_97971_JCA_HardpackMagazine_022_10_F1.jpeg": "2400 / 1947",
        "6af7d512ff7e398c44d629b4_6af7d50f1c56b210b29f8753_image-1725539663-1-JPG.jpeg": "1080 / 1350",
        "6af7d6388f711d0fd864483b_6af7d5b2ff7e398c44d666cc_HIGHSNOBIETY_PJ_NYC_FINALS_2-25-6-of-28-jpg.jpeg": "750 / 1003",
        "6af7d6d60f49cf6d3a5af08e_6af7d6d40f49cf6d3a5aef42_image-1791152274-2.jpeg": "1440 / 1172",
        "6af7d808996b3e1a8d1d940b_6af7d7cb9ce2fabfd4a0abd4_image-1784735072-1.jpeg": "1080 / 1350",
        "6af8ba76c63c73a31077ce9d_6af8b9659dc3e7b432e82e0c_image-1791138434-5.jpeg": "1440 / 1070",
        "6af8cd89e6993037898940f4_6af8ccd1c63c73a3107bffe5_WONDERLAND-BEST_IN_SHOW-ERIKA_LONG_7.jpeg": "766 / 1000",
        "6af93499666951d37d48f274_6af9342d6b8218e9692e573b_image-1781562480-1.jpeg": "1080 / 720",
        "6af93565eff2d3f1f3ef5c88_6af93527b4fe0aaa37d88e3a_Screen-Shot-2023-03-30-at-1-45-24-PM.jpeg": "925 / 1200",
        "6af935e7d2b4ef2414d72adf_6af935bc999d5bac00c9a002_Screen-Shot-2022-02-05-at-4-43-20-PM.webp": "894 / 1200",
        "6af9369c994d262a7120d593_6af9365ee1cb9d5b56311254_image-1791152607-2-2.jpeg": "1440 / 1722",
        "6af937d3aa174c051302f101_6af93796d2b4ef2414d7bd4f_corey-pdf-4-png.jpeg": "1500 / 1875",
        "6af938877991d4c1992b79a5_6af9384b59e280b7dc6fb7fd_Copy-of-Abe-Lange-SS24_Office-Magazine_LOOK-2_SHOT-3_031-JPG.jpeg": "750 / 937",
        "6af939794df09a2e35df7767_6af9395de1cb9d5b56325003_image-1791140833-2.jpeg": "1440 / 1800",
        "6af93aa71b76a529fd6a085a_6af93a693bbcaa9ebfb4d7e5_IMG_9503-JPG.jpeg": "750 / 938",
        "6af93b5da6b599adb883c3e9_6af93b1f1b76a529fd6a20a5_EDIT-PRESENT-SPACE-232_RGB_Priscillia_Final.jpeg": "1840 / 2400",
        "6af93c629d106ee114ba9b25_6af93c21ec3152e79e41db63_image-1788904941-1.jpeg": "2400 / 1576",
        "6af93d36e6993037899cfabf_6af93cfae6993037899cdff2_2024_023_SHADOWPLAY-09_031.jpeg": "1840 / 2400",
        "6af93dede21a48e2930a3fcf_6af93daca198dafeafc57d11_SNUFF_KW14-JPG.jpeg": "750 / 487",
        "6af93e62d970b44e6b5e0163_6af93e49a198dafeafc5c24a_Screen-Shot-2022-04-14-at-1-10-56-PM.jpeg": "750 / 526",
        "6af93efaec3152e79e4214b8_6af93ef99d0970f5444cb264_IMG_0011.jpeg": "806 / 1000",
        "6af93fa1ef621fed0323e7c9_6af93fa066f69f982770c180_image-1724674984-2-JPG.jpeg": "750 / 469",
        "6af9401d994d262a71224a6b_6af9401c36e10c48bd32762a_image-1759314676-1-JPG.jpeg": "1080 / 1350",
        "6af9414b73d2de804cf058be_6af9410c1b76a529fd6b965c_Vogue-PHilippines-Office43734-copy-jpg.jpeg": "750 / 1000",
        "6af9429feff2d3f1f3f38035_6af9426eb4fe0aaa37d93ddd_AMANDLA-STENBURG-TABLE-SHOT-9-21-1-of-1.jpeg": "912 / 1200",
        "6af9431737b7ad5bc82bdab4_6af942fcfecfca9f55af8088_image-1755716929-1-JPG.jpeg": "750 / 933",
        "6afa7194f7547730c34e0377_6afa71669abf58906c1b3220_003_IMG_6535.jpeg": "750 / 500",
        "6afa77b538fcd20700bc4540_6afa77b3baff020924032c47_BLANK-STREET-PHOENIX-JOHNSON-DIGITAL-12-22-367.jpeg": "750 / 500",
        "6afa794238fcd20700bc8291_6afa790f984c942843f5cd64_JessicaMarx_Summer_ColdBrew_Cortado_202304_4x5.jpeg": "640 / 800",
        "6afa7bfcc31f1940f7c7ce05_6afa7bbfafc6999687b4dff1_FAMILLE_DU_VIN_CREATIVE_0153_V1-jpg.jpeg": "750 / 500",
        "6afa7e52ba102881c6576cd7_6afa7d0e393e703fed34ffc9_91_RULES_GRAILED_CAMPAIGN_Sh_08_010-jpeg.jpeg": "750 / 500",
        "6afa7f65a53c57bb0d474272_6afa7f6432070da9ef1e7c3b_IMG_4328-2.jpeg": "1920 / 2400",
        "6afa815a0f66c54db0319565_6afa8156b48fbc1edb85ddbe_IMG_7038.jpeg": "727 / 800",
        "6afa821149c39fc4943f36ac_6afa81d426da89c066fb9f66_FPO_LMG_AIW_2Q26_Potion_Echantee_04_1202.jpeg": "1920 / 2400",
        "6afa8321b8bbfbdd894d7455_6afa82e1ab97e5b5e8e7deb7_image-1779819078-3-JPG.jpeg": "1080 / 1350",
        "6afa836b13534f84b7dfacd3_6afa8369a53c57bb0d48b0a8_2_DC18-700ml-Neat-1.jpeg": "1200 / 800",
        "6afa83dc81f6ae6317878c68_6afa83da13534f84b7dfbd2a_Screen-Shot-2025-07-02-at-1-19-01-PM-png.jpeg": "750 / 1121",
        "6afa85838c12395f26c201f9_6afa85099abf58906c1e9270_OPEN-SPACES-34-jpg.jpeg": "750 / 938",
        "6afa8606d5bc5c6858cad8a8_6afa86052fd1508f977c50ac_Bottle.jpeg": "1920 / 2400",
        "6afa87215e9062adcdb458e4_6afa871f49c39fc494403f3a_SANDY_LIANG_MULES_5-24-13-of-13-1-JPG.jpeg": "750 / 977",
        "6afa882740e96fa4e45a88f5_6afa8805b8bbfbdd894f5b05_image-1791146100-1.jpeg": "1920 / 2400",
        "6afa92baebe4329ee2b006fe_6afa92b7a81625b44916ebef_image-1786166529-1.jpeg": "1080 / 1080",
        "6afb4dc85efba1da2c174ee7_6afb4dc7fb3c21103d92a400_bunny-6111d22f.jpeg": "720 / 404",
        "6afb4e31b896804cb6faa722_6afb4e31ca4ac633ae63d3bb_bunny-1bf90c80.jpeg": "1572 / 1080",
        "6b08c55d7d8da9525b71b8ff_6b08c55b5d9760c720b25971_Screenshot-2026-11-26-at-6-47-57-PM.jpeg": "1218 / 918",
        "6b08d4d1ca776430ef71dd64_6b08d4d006f406db2d3b8b4d_Screenshot-2026-11-26-at-7-54-31-PM.jpeg": "1246 / 934",
        "6b08dd25f5f312ca4e7db6c1_6b08dd24e6a81bbdc44a2456_Screenshot-2026-11-26-at-8-29-40-PM.jpeg": "1238 / 930",
        "6afb58676bd8ab34174d731c_6afb58667e22c85cea528021_bunny-f1b17160.jpeg": "1920 / 1080",
        "6afb5925c3818fe73ae14353_6afb592550c9334413403209_bunny-388f161b.jpeg": "1080 / 1920",
        "6afb7706ce105a0823ea31ea_6afb7705e6d85d952d7b89f3_bunny-20a8fef5.jpeg": "1918 / 1080",
        "6afb81bdd1d91d42a75d5ea6_6afb81bcb804b50df96f29df_bunny-859553c8.jpeg": "1040 / 720",
        "6b08dc89f5f312ca4e7d7975_6b08dc88a3cd4aa5bd264877_S326_Personalization_PreGoingOut_Studio_FullFigure_212143-6UR_211702-2Q9_2617-jpg.jpeg": "1500 / 843",
        "6afb7bdfad208d7688100fa2_6afb7bdf8378b1b0b32346d0_bunny-3fe95573.jpeg": "1280 / 720",
        "6afb7c50bc4823ba89b7cd7b_6afb7c4ebb7ca52fb54ee6b2_bunny-3ac0ff07.jpeg": "1920 / 1080",
        "6afb7e9cd24ff16e06ca7cf2_6afb7e991416a91b29e33dce_bunny-765382b8.jpeg": "1920 / 1080",
        "6b08d0f06dfaaf736dccc8da_6b08d0ef3b21fe0f1abb254d_Screenshot-2026-11-26-at-7-36-31-PM.jpeg": "1220 / 920",
        "6afb7cc8de73620514133805_6afb7cc7905d0b01ff9dfee5_bunny-e8fc4733.jpeg": "1920 / 1080",
        "6afb7d1f2b8e977399f02134_6afb7d1e26cd2a26d0a7b84b_bunny-04db5b43.jpeg": "1920 / 1080",
        "6b08c471680eefb6eaaa8918_6b08c470877f67240d3aebab_images-1.jpeg": "545 / 366",
        "6afb7e6a1c1678714a82c2cf_6afb7e6adc6861236a507dd1_bunny-c737bbc1.jpeg": "1920 / 1080",
        "6afb7f4add52b30be236b744_6afb7f49950a2d0f56102e2e_bunny-b7045296.jpeg": "1280 / 720",
        "6afb7f6fc668815a7a03705c_6afb7f6edd52b30be236c2cb_bunny-0ecfbe41.jpeg": "1916 / 1080",
        "6b08c78501e02c7d757dfccb_6b08c78406b8e94dd7160eef_Screenshot-2026-11-26-at-6-57-14-PM.jpeg": "1216 / 916",
        "6afb804b3f84a28de33d300e_6afb7f96f3de6abfdda6973d_bunny-412db05f.jpeg": "1920 / 1080",
        "6afb80bb95584fa264732f62_6afb80b981ac083717e693cc_bunny-a3d36a96.jpeg": "1920 / 1080",
        "6afb8153c668815a7a042718_6afb815383c5b5005a5d464b_bunny-2705d9f0.jpeg": "1920 / 1080",
        "6afb830306260b2ca1657940_6afb83022cb3563e498f6df7_bunny-ff74804f.jpeg": "4096 / 3072",
        "6afb9e06ca2626c3dc7242ed_6afb9d0872d071936571a167_CONSTANTINE-LONG-ISLAND-10-21-28-of-141.jpeg": "796 / 1200",
        "6afb9f80ed5805a9c105c350_6afb9f40c7e12e589aae8c3d_image-1763673552-3.jpeg": "1080 / 1350",
        "6afba07478db6d7965fad651_6afba03372d07193657259b8_1-del_water_gap_final_selects_3-21_1_of_53.jpeg": "960 / 1200",
        "6afba1160297774b77125874_6afba0ce53cc8401a23c9042_260419158390080004.jpeg": "2400 / 1796",
        "6afba7cba06eb65787cc8a1a_6afba74a13f7b90c27cbe134_63348-D1-51-012A-013-JPEG.jpeg": "1500 / 995",
        "6afbacf4638fd27082b4be06_6afbacf37bfbc355857a14ba_bunny-e5685968.jpeg": "1276 / 718",
        "6afbad5e8a5dd4588cf83ede_6afbad5db6fe9eaa842c589f_bunny-78c99f82.jpeg": "720 / 878",
        "6afbadcf6f94d7a902518784_6afbadcf638fd27082b4de88_bunny-18387976.jpeg": "960 / 720",
        "6b08d3f3113d87102444e13e_6b08d3f2a9449d93861cfddc_Screenshot-2026-11-26-at-7-50-41-PM.jpeg": "1822 / 1008",
        "6b08d23fe6a81bbdc449736f_6b08d23eb580b712572edd66_Screenshot-2026-11-26-at-7-42-30-PM.jpeg": "1224 / 910",
        "6afbaef8f23b974089472082_6afbaef7638fd27082b54b7c_bunny-cf81ae3a.jpeg": "1280 / 720",
        "6b08df10a7af5f0e8fd1f71b_6b08dedfbd6fc488fa616c8f_image-1795743308-1.jpeg": "1080 / 786",
        "6b08e134a7af5f0e8fd20bcb_6b08e0b89a7c646175da4732_MetroPost_01_31_08_14.jpeg": "2400 / 1599",
        "6b09ae216491c819edc4b8a5_6b09ae20f5661195f5c29a4e_bunny-a84a9ccc.jpeg": "3840 / 2160",
        "6b09c396a7091b126d822c1a_6b09c272194c52acdace8311_0bellan_0bellan-R3-E046_v4.jpeg": "2400 / 1809"
    };

    const assetAspectCache = new Map(Object.entries(KNOWN_ASSET_ASPECTS));
    try {
        const storedAspects = JSON.parse(sessionStorage.getItem(ASPECT_STORAGE_KEY) || "null");
        if (storedAspects && typeof storedAspects === "object") {
            for (const [k, v] of Object.entries(storedAspects)) {
                if (typeof v === "string" && /^\d+\s*\/\s*\d+$/.test(v)) {
                    assetAspectCache.set(k, v);
                }
            }
        }
    } catch (_) { }

    const getImageAssetKey = (img) => {
        if (!img) return "";
        let rawUrl = img.getAttribute("src") || img.currentSrc || "";
        if (!rawUrl) {
            const srcset = img.getAttribute("srcset") || "";
            rawUrl = srcset.split(",")[0]?.trim().split(/\s+/)[0] || "";
        }
        if (!rawUrl) return "";
        try {
            const parsed = new URL(rawUrl, window.location.origin);
            const seg = parsed.pathname.split("/").filter(Boolean).pop() || "";
            return seg || parsed.pathname;
        } catch (_) {
            return rawUrl.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || rawUrl;
        }
    };

    const getKnownAssetAspect = (img) => {
        const key = getImageAssetKey(img);
        return key ? (assetAspectCache.get(key) || "") : "";
    };

    const persistAssetAspectsSoon = () => {
        if (aspectPersistTimer) return;
        aspectPersistTimer = setTimeout(() => {
            aspectPersistTimer = null;
            try {
                const entries = Array.from(assetAspectCache.entries());
                const trimmed = entries.length > MAX_CACHED_ASPECTS ? entries.slice(-MAX_CACHED_ASPECTS) : entries;
                sessionStorage.setItem(ASPECT_STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
            } catch (_) { }
        }, 250);
    };

    const recordAssetAspect = (img, aspect) => {
        const key = getImageAssetKey(img);
        if (!key || !aspect) return "";
        if (assetAspectCache.get(key) !== aspect) {
            assetAspectCache.set(key, aspect);
            persistAssetAspectsSoon();
        }
        return key;
    };

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

        const getDesktopImgSizes = () => {
            const maxCardW = Math.max(420, Math.round(window.innerHeight * (MAX_VH / 100) * 1.45));
            return `(max-width: 1024px) 100vw, ${maxCardW}px`;
        };

        let isRestoreFromDetail = false;
        let restoreSlug = "";
        let restoreUrl = "";
        let restoreNum = "";
        let savedScroll = null;
        let restoreAnchorScreenX = null;
        let restoredFilterParent = "";
        let restoredFilterSub = "";
        try {
            isRestoreFromDetail = sessionStorage.getItem("mg_restore_from_detail") === "true";
            if (!isRestoreFromDetail && (scope?._isFromProjectDetail || window.__mgEnteringFromDetail)) {
                isRestoreFromDetail = true;
            }
            if (isRestoreFromDetail) {
                restoreSlug = (sessionStorage.getItem("mg_restore_project_slug") || "").trim().toLowerCase();
                restoreUrl = (sessionStorage.getItem("mg_restore_project_url") || "").trim().toLowerCase();
                restoreNum = (sessionStorage.getItem("mg_restore_project_num") || "").trim();
                savedScroll = sessionStorage.getItem("mg_projects_saved_scroll");
                const rawScreenX = sessionStorage.getItem("mg_restore_anchor_screen_x");
                if (rawScreenX !== null && rawScreenX !== "" && !isNaN(parseFloat(rawScreenX))) {
                    restoreAnchorScreenX = parseFloat(rawScreenX);
                }
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
            restoreAnchorScreenX = null;
            restoredFilterParent = "";
            restoredFilterSub = "";
            try {
                sessionStorage.removeItem("mg_restore_from_detail");
                sessionStorage.removeItem("mg_projects_saved_scroll");
                sessionStorage.removeItem("mg_restore_anchor_screen_x");
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

        const cardsByUniqueKey = new Map();
        const masterCardByUniqueKey = new Map();

        const lockNaturalAspect = (img, wrap, callback) => {
            if (!img || !wrap) return;
            const apply = () => {
                if (img.naturalWidth && img.naturalHeight) {
                    const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                    const changed = wrap.style.aspectRatio !== aspect;
                    if (changed) {
                        wrap.style.aspectRatio = aspect;
                    }
                    recordAssetAspect(img, aspect);
                    if (callback) callback(aspect, changed);
                }
            };
            if (img.complete && img.naturalWidth) {
                apply();
            } else {
                img.addEventListener("load", apply, { once: true, signal });
            }
        };

        const prepareCard = (card) => {
            card.classList.add("project-card");
            card.setAttribute("draggable", "false");
            const initialLink = card.querySelector(".project-link");
            if (initialLink) initialLink.setAttribute("draggable", "false");
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
            if (img) {
                img.classList.add("project-img");
                img.setAttribute("draggable", "false");
                img.setAttribute("decoding", "async");
                if (img.hasAttribute("srcset")) {
                    img.setAttribute("sizes", getDesktopImgSizes());
                }
            }
            if (mediaWrap && img) {
                if (img.complete && img.naturalWidth && img.naturalHeight) {
                    const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                    mediaWrap.style.aspectRatio = aspect;
                    recordAssetAspect(img, aspect);
                } else {
                    const knownAspect = getKnownAssetAspect(img);
                    if (knownAspect) {
                        mediaWrap.style.aspectRatio = knownAspect;
                    }
                }
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
            const linkHref = (el.querySelector(".project-link")?.getAttribute("href") || "").toLowerCase().trim();
            const slug = linkHref.split("/").filter(Boolean).pop() || "";
            if (slug) return slug;
            const clientText = (el.querySelector(".project-client")?.textContent || "").toLowerCase().trim();
            const numText = el.querySelector(".project-number-text, .project-num, .project-number")?.textContent?.trim() || "";
            const parsed = parseInt(numText, 10);
            const numKey = !isNaN(parsed) ? String(parsed) : numText;
            return `${linkHref}|${numKey}|${clientText}`;
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
        const currentPagePath = window.location.pathname;
        if (cachedPaginationState.path === currentPagePath && cachedPaginationState.cards.length > 0) {
            cachedPaginationState.cards.forEach((card) => {
                prepareCard(card);
                const key = getCardKey(card);
                if (key && !seenProjectKeys.has(key)) {
                    seenProjectKeys.add(key);
                    card.dataset.uniqueKey = key;
                    masterCards.push(card.cloneNode(true));
                }
            });
            masterCards.sort((a, b) => getCardSequence(a) - getCardSequence(b));
        } else if (cachedPaginationState.path !== currentPagePath) {
            cachedPaginationState.path = currentPagePath;
            cachedPaginationState.complete = false;
            cachedPaginationState.cards = [];
        }
        masterCards.forEach((card) => {
            if (card.dataset.uniqueKey) {
                masterCardByUniqueKey.set(card.dataset.uniqueKey, card);
            }
        });
        let activeFilteredCount = masterCards.length;
        let isDesktopInfinite = activeFilteredCount > MIN_LOOP_THRESHOLD;
        let isGalleryRevealed = false;
        let userHasInteractedDesktop = false;
        let hasMarqueeMoved = false;

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
                    if (hoveredCardIndex !== -1 && trackCards[hoveredCardIndex]) {
                        startHeaderMarquee(trackCards[hoveredCardIndex]);
                    }
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
        let currentSetCount = 1;
        let trackCards = [];
        let cachedCardMetrics = [];
        let hoveredCardIndex = -1;
        let initialFirstCardIndex = -1;
        let lastFrameTime = performance.now();
        let renderedTrackPos = null;
        let lastPreloadScrollPos = -999999;
        let isCoveringRebuildScheduled = false;

        const preloadedUniqueKeys = new Set();
        const inFlightPreloadKeys = new Set();

        const isInitialScrollLocked = () => {
            return !userHasInteractedDesktop && !hasMarqueeMoved && !isRestoreFromDetail;
        };

        const syncTrackTransform = () => {
            track.style.transform = `translate3d(${(-scrollPos).toFixed(2)}px, 0, 0)`;
            renderedTrackPos = scrollPos;
        };

        const getInitialScrollPos = () => {
            if (isDesktopInfinite) {
                const firstIdx = initialFirstCardIndex >= 0 && initialFirstCardIndex < cachedCardMetrics.length
                    ? initialFirstCardIndex
                    : activeFilteredCount;
                const firstLeft = cachedCardMetrics[firstIdx]?.left;
                const targetLeft = typeof firstLeft === "number" ? firstLeft : singleSetWidth;
                return Math.max(0, targetLeft - getInitialStartOffset());
            }
            return 0;
        };

        const normalizeScrollIntoLoop = (pos) => {
            if (!isDesktopInfinite || singleSetWidth <= 0) {
                return Math.max(minBoundedScroll, Math.min(maxBoundedScroll, pos));
            }
            const loopStart = cachedCardMetrics[0]?.left || 0;
            const maxLoop = loopStart + singleSetWidth * 2;
            let p = pos;
            while (p >= maxLoop) p -= singleSetWidth;
            while (p < loopStart) p += singleSetWidth;
            return p;
        };

        const getRestoredScrollPos = () => {
            if (!isRestoreFromDetail) return null;

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
                    const m = cachedCardMetrics[targetIdx];
                    if (m) {
                        if (restoreAnchorScreenX !== null) {
                            return normalizeScrollIntoLoop(m.left - restoreAnchorScreenX);
                        }
                        return normalizeScrollIntoLoop(m.left + m.width / 2 - window.innerWidth / 2);
                    }
                } else {
                    return null;
                }
            }

            if (savedScroll !== null && !isNaN(parseFloat(savedScroll))) {
                return normalizeScrollIntoLoop(parseFloat(savedScroll));
            }

            return null;
        };

        const getFirstVisibleCardAnchor = () => {
            if (cachedCardMetrics.length !== trackCards.length || trackCards.length === 0) return null;
            let anchorIdx = -1;
            for (let i = 0; i < cachedCardMetrics.length; i++) {
                const m = cachedCardMetrics[i];
                if (m && m.left + m.width > scrollPos + 1) {
                    anchorIdx = i;
                    break;
                }
            }
            if (anchorIdx === -1) anchorIdx = cachedCardMetrics.length - 1;
            const m = cachedCardMetrics[anchorIdx];
            const card = trackCards[anchorIdx];
            if (!m || !card) return null;
            const offsetPx = scrollPos - m.left;
            return {
                card,
                uniqueKey: card.dataset.uniqueKey || "",
                setIndex: Number(card.dataset.setIndex ?? -1),
                offsetPx,
                frac: m.width > 0 ? offsetPx / m.width : 0,
                oldWidth: m.width,
                targetDelta: targetPos - scrollPos,
                rawDelta: rawTargetPos - scrollPos
            };
        };

        const resolveAnchorIndex = (anchor) => {
            if (!anchor) return -1;
            if (anchor.card && anchor.card.isConnected) {
                const trackedIdx = Number(anchor.card.dataset.trackIdx);
                if (!isNaN(trackedIdx) && trackCards[trackedIdx] === anchor.card) {
                    return trackedIdx;
                }
                const directIdx = trackCards.indexOf(anchor.card);
                if (directIdx !== -1) return directIdx;
            }
            if (anchor.uniqueKey) {
                const sameSetIdx = trackCards.findIndex((c) =>
                    c.dataset.uniqueKey === anchor.uniqueKey && Number(c.dataset.setIndex ?? -1) === anchor.setIndex
                );
                if (sameSetIdx !== -1) return sameSetIdx;
                const anyIdx = trackCards.findIndex((c) => c.dataset.uniqueKey === anchor.uniqueKey);
                if (anyIdx !== -1) return anyIdx;
            }
            return -1;
        };

        const measureDesktopMetrics = (options = {}) => {
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

            const {
                preserveAnchor = true,
                forceInitialReset = false,
                customAnchor = null
            } = options;

            const shouldCaptureAnchor = !forceInitialReset &&
                preserveAnchor &&
                !isInitialScrollLocked() &&
                (isGalleryRevealed || userHasInteractedDesktop || hasMarqueeMoved);
            const anchor = shouldCaptureAnchor ? (customAnchor || getFirstVisibleCardAnchor()) : null;

            const prevSetWidth = singleSetWidth;
            cachedCardMetrics = new Array(total);

            for (let i = 0; i < total; i++) {
                const card = trackCards[i];
                card.dataset.trackIdx = String(i);
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

                const textsWrap = card.querySelector(".project-texts-wrap");
                if (textsWrap) {
                    const client = textsWrap.querySelector(".project-client");
                    if (client) {
                        const clientWidth = Math.ceil(client.scrollWidth || client.getBoundingClientRect().width);
                        const containerWidth = textsWrap.clientWidth;
                        if (clientWidth >= containerWidth - 6) {
                            textsWrap.classList.add("is-overflowing");
                        } else {
                            textsWrap.classList.remove("is-overflowing");
                        }
                    }
                }
            }

            initialFirstCardIndex = isDesktopInfinite && total > activeFilteredCount ? activeFilteredCount : 0;
            currentSetCount = isDesktopInfinite && activeFilteredCount > 0
                ? Math.floor(total / activeFilteredCount)
                : 1;

            if (isDesktopInfinite && total > activeFilteredCount) {
                singleSetWidth = cachedCardMetrics[activeFilteredCount].left - cachedCardMetrics[0].left;
                minBoundedScroll = 0;
                maxBoundedScroll = 0;

                if (forceInitialReset || !isGalleryRevealed) {
                    const restored = getRestoredScrollPos();
                    const initPos = restored !== null ? restored : getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                    if (restored !== null) userHasInteractedDesktop = true;
                } else if (isInitialScrollLocked()) {
                    const initPos = getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                } else if (anchor) {
                    const newAnchorIdx = resolveAnchorIndex(anchor);
                    if (newAnchorIdx !== -1 && cachedCardMetrics[newAnchorIdx]) {
                        const m = cachedCardMetrics[newAnchorIdx];
                        const anchorResized = Math.abs(m.width - anchor.oldWidth) > 0.5;
                        const anchoredPos = anchorResized
                            ? (m.left + anchor.frac * m.width)
                            : (m.left + anchor.offsetPx);
                        let nextScroll = anchoredPos;
                        let nextTarget = anchoredPos + anchor.targetDelta;
                        let nextRaw = anchoredPos + anchor.rawDelta;

                        if (singleSetWidth > 0) {
                            const loopStart = cachedCardMetrics[0]?.left || 0;
                            const maxLoop = loopStart + singleSetWidth * 2;
                            while (nextScroll >= maxLoop) {
                                nextScroll -= singleSetWidth;
                                nextTarget -= singleSetWidth;
                                nextRaw -= singleSetWidth;
                            }
                            while (nextScroll <= loopStart) {
                                nextScroll += singleSetWidth;
                                nextTarget += singleSetWidth;
                                nextRaw += singleSetWidth;
                            }
                        }
                        scrollPos = nextScroll;
                        targetPos = nextTarget;
                        rawTargetPos = nextRaw;
                    }
                } else if (prevSetWidth === 0 && singleSetWidth > 0) {
                    const restored = getRestoredScrollPos();
                    const initPos = restored !== null ? restored : getInitialScrollPos();
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                    if (restored !== null) userHasInteractedDesktop = true;
                }

                if (
                    isGalleryRevealed &&
                    singleSetWidth > 0 &&
                    currentSetCount < 16 &&
                    (currentSetCount - 2) * singleSetWidth < window.innerWidth + 120 &&
                    !isCoveringRebuildScheduled
                ) {
                    isCoveringRebuildScheduled = true;
                    requestAnimationFrame(() => {
                        isCoveringRebuildScheduled = false;
                        if (!isMobileLayout() && currentFiltered.length > MIN_LOOP_THRESHOLD) {
                            buildDesktopLoop(currentFiltered, { preserveAnchor: true });
                        }
                    });
                }
            } else {
                singleSetWidth = 0;
                const firstLeft = cachedCardMetrics[0]?.left || 0;
                const lastMetric = cachedCardMetrics[total - 1];
                const totalWidth = lastMetric ? (lastMetric.left + lastMetric.width - firstLeft) : 0;
                minBoundedScroll = firstLeft;
                maxBoundedScroll = totalWidth > window.innerWidth
                    ? Math.max(minBoundedScroll, firstLeft + totalWidth - window.innerWidth + 24)
                    : minBoundedScroll;

                if (forceInitialReset || !isGalleryRevealed) {
                    const restored = getRestoredScrollPos();
                    const initPos = restored !== null ? restored : minBoundedScroll;
                    scrollPos = initPos;
                    targetPos = initPos;
                    rawTargetPos = initPos;
                    if (restored !== null) userHasInteractedDesktop = true;
                } else if (anchor) {
                    const newAnchorIdx = resolveAnchorIndex(anchor);
                    if (newAnchorIdx !== -1 && cachedCardMetrics[newAnchorIdx]) {
                        const m = cachedCardMetrics[newAnchorIdx];
                        const anchorResized = Math.abs(m.width - anchor.oldWidth) > 0.5;
                        const anchoredPos = anchorResized
                            ? (m.left + anchor.frac * m.width)
                            : (m.left + anchor.offsetPx);
                        scrollPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, anchoredPos));
                        targetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, scrollPos + anchor.targetDelta));
                        rawTargetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, scrollPos + anchor.rawDelta));
                    }
                } else {
                    scrollPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, scrollPos));
                    targetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, targetPos));
                    rawTargetPos = Math.max(minBoundedScroll, Math.min(maxBoundedScroll, rawTargetPos));
                }
            }

            if (isInitialScrollLocked() && isDesktopInfinite) {
                track.classList.add("is-at-start");
            }
            syncTrackTransform();
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
                    const currentX = gsap.getProperty(inner, "x") || 0;
                    if (Math.abs(currentX) > 0.5) {
                        gsap.to(inner, {
                            x: 0,
                            duration: 0.35,
                            ease: "power2.out",
                            force3D: true,
                            overwrite: "auto",
                            onComplete: () => {
                                gsap.set(inner, { clearProps: "transform,x" });
                            }
                        });
                    } else {
                        gsap.set(inner, { clearProps: "transform,x" });
                    }
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
            const isMinSize = Boolean(section && section.classList.contains("is-min-size"));
            const client = inner.querySelector(".project-client");
            let textWidth;

            if (isMinSize && client) {
                textWidth = Math.ceil(client.scrollWidth || client.getBoundingClientRect().width);
            } else {
                textWidth = Math.ceil(inner.scrollWidth || inner.getBoundingClientRect().width);
            }

            const overflowDistance = textWidth - containerWidth;

            if (overflowDistance > 1) {
                activeHeaderMarqueeCard = card;

                // Subtle reading speed ~26px/sec, minimum 3.0s duration (matching Index page)
                const duration = Math.max(3.0, overflowDistance / 26);

                activeHeaderMarqueeTimeline = gsap.timeline({
                    repeat: -1
                });

                // Match Index page: 0.6s initial pause (for fade to disappear gracefully),
                // roll to -overflowDistance, pause 1.2s at end, roll back to 0, pause 1.2s at start
                activeHeaderMarqueeTimeline
                    .to(inner, {
                        x: -overflowDistance,
                        duration: duration,
                        ease: "sine.inOut",
                        force3D: true
                    }, "+=0.6")
                    .to(inner, {
                        x: 0,
                        duration: duration,
                        ease: "sine.inOut",
                        force3D: true
                    }, "+=1.2");
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
                measureDesktopMetrics({ preserveAnchor: true });
                checkHeaderCollisions();
                if (hoveredCardIndex !== -1 && trackCards[hoveredCardIndex]) {
                    startHeaderMarquee(trackCards[hoveredCardIndex]);
                }
            });
        };

        const syncAspectAcrossSets = (uniqueKey, aspect, shouldScheduleRecalc = true) => {
            if (!uniqueKey || !aspect) return false;
            const masterTpl = masterCardByUniqueKey.get(uniqueKey);
            if (masterTpl) {
                const masterWrap = masterTpl.querySelector(".project-media-wrap");
                if (masterWrap && masterWrap.style.aspectRatio !== aspect) {
                    masterWrap.style.aspectRatio = aspect;
                }
            }
            const clones = cardsByUniqueKey.get(uniqueKey);
            let didChangeDesktop = false;
            if (clones && clones.length) {
                clones.forEach((clone) => {
                    const wrap = clone.querySelector(".project-media-wrap");
                    if (wrap && wrap.style.aspectRatio !== aspect) {
                        wrap.style.aspectRatio = aspect;
                        didChangeDesktop = true;
                    }
                    const cloneImg = clone.querySelector(".project-img") || clone.querySelector("img");
                    if (cloneImg && cloneImg.getAttribute("loading") !== "eager") {
                        cloneImg.setAttribute("loading", "eager");
                    }
                });
            }
            if (didChangeDesktop && shouldScheduleRecalc) {
                scheduleMetricsRecalc();
            }
            return didChangeDesktop;
        };

        const MAX_CONCURRENT_PRELOADS = 4;
        const scheduleLookaheadPreload = (delayMs = 60) => {
            if (projectsPreloadTimer) return;
            projectsPreloadTimer = setTimeout(() => {
                projectsPreloadTimer = null;
                pumpLookaheadPreload();
            }, delayMs);
        };

        const pumpLookaheadPreload = () => {
            if (isMobileLayout() || !isGalleryRevealed) return;
            if (window.__mgIsTransitioning || window.__mgEnteringFromHome) return;
            if (!trackCards.length || activeFilteredCount === 0) return;

            const activeSetOffset = isDesktopInfinite && trackCards.length > activeFilteredCount ? activeFilteredCount : 0;
            const setCards = trackCards.slice(activeSetOffset, activeSetOffset + activeFilteredCount);
            if (!setCards.length) return;

            const setStartLeft = cachedCardMetrics[activeSetOffset]?.left ?? 0;
            const vpOffsetInSet = singleSetWidth > 0
                ? (((scrollPos - setStartLeft) % singleSetWidth) + singleSetWidth) % singleSetWidth
                : Math.max(0, scrollPos - setStartLeft);

            const candidates = [];
            for (let i = 0; i < setCards.length; i++) {
                const card = setCards[i];
                const key = card.dataset.uniqueKey || "";
                if (!key || preloadedUniqueKeys.has(key) || inFlightPreloadKeys.has(key)) continue;

                const img = card.querySelector(".project-img") || card.querySelector("img");
                if (!img) {
                    preloadedUniqueKeys.add(key);
                    continue;
                }
                if (img.complete && img.naturalWidth > 0) {
                    preloadedUniqueKeys.add(key);
                    const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                    recordAssetAspect(img, aspect);
                    syncAspectAcrossSets(key, aspect, true);
                    continue;
                }

                const m = cachedCardMetrics[activeSetOffset + i];
                const cardLeftInSet = m ? (m.left - setStartLeft) : 0;
                let dist = cardLeftInSet - vpOffsetInSet;
                if (singleSetWidth > 0) {
                    if (dist < -singleSetWidth * 0.25) dist += singleSetWidth;
                    if (dist > singleSetWidth * 0.75) dist -= singleSetWidth;
                }
                // Slightly favor cards ahead of viewport while keeping wrap neighbors close behind high priority
                const priorityDist = dist >= -200 ? Math.max(0, dist) : Math.abs(dist) * 1.25;
                candidates.push({ card, img, key, priorityDist });
            }

            if (!candidates.length || inFlightPreloadKeys.size >= MAX_CONCURRENT_PRELOADS) return;
            candidates.sort((a, b) => a.priorityDist - b.priorityDist);

            const slots = MAX_CONCURRENT_PRELOADS - inFlightPreloadKeys.size;
            for (let i = 0; i < Math.min(slots, candidates.length); i++) {
                const { img, key } = candidates[i];
                inFlightPreloadKeys.add(key);
                img.setAttribute("loading", "eager");

                const finish = () => {
                    inFlightPreloadKeys.delete(key);
                    preloadedUniqueKeys.add(key);
                    if (img.naturalWidth && img.naturalHeight) {
                        const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                        recordAssetAspect(img, aspect);
                        syncAspectAcrossSets(key, aspect, true);
                    }
                    scheduleLookaheadPreload(30);
                };

                if (img.complete) {
                    finish();
                } else {
                    img.addEventListener("load", finish, { once: true, signal });
                    img.addEventListener("error", finish, { once: true, signal });
                }
            }
        };

        const bindDesktopCard = (card) => {
            card.setAttribute("draggable", "false");
            const uniqueKey = card.dataset.uniqueKey || getCardKey(card);
            if (uniqueKey) {
                card.dataset.uniqueKey = uniqueKey;
                let list = cardsByUniqueKey.get(uniqueKey);
                if (!list) {
                    list = [];
                    cardsByUniqueKey.set(uniqueKey, list);
                }
                list.push(card);
            }

            const img = card.querySelector(".project-img") || card.querySelector("img");
            const mediaWrap = card.querySelector(".project-media-wrap");
            const cardLink = card.querySelector(".project-link");
            if (cardLink) cardLink.setAttribute("draggable", "false");

            if (img) {
                img.classList.add("project-img");
                if (img.hasAttribute("srcset")) {
                    img.setAttribute("sizes", getDesktopImgSizes());
                }
            }

            if (mediaWrap && img) {
                const knownAspect = getKnownAssetAspect(img);
                if (knownAspect) {
                    mediaWrap.style.aspectRatio = knownAspect;
                } else if (img.complete && img.naturalWidth && img.naturalHeight) {
                    const aspect = `${img.naturalWidth} / ${img.naturalHeight}`;
                    mediaWrap.style.aspectRatio = aspect;
                    recordAssetAspect(img, aspect);
                }

                lockNaturalAspect(img, mediaWrap, (aspect) => {
                    if (uniqueKey) {
                        preloadedUniqueKeys.add(uniqueKey);
                        syncAspectAcrossSets(uniqueKey, aspect, true);
                    } else {
                        scheduleMetricsRecalc();
                    }
                });
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

            const getLiveCardIdx = () => {
                const rawIdx = Number(card.dataset.trackIdx);
                if (!isNaN(rawIdx) && trackCards[rawIdx] === card) return rawIdx;
                return trackCards.indexOf(card);
            };

            card.addEventListener("mouseenter", () => {
                if (isWheelActive || isDragging) return;
                hoveredCardIndex = getLiveCardIdx();
                track.classList.add("is-hovering-card");
                card.classList.add("is-hovered");
                checkHeaderCollisions();
                startHoverVideo(card);
                startHeaderMarquee(card);
            }, { signal });

            card.addEventListener("mouseleave", () => {
                if (hoveredCardIndex === getLiveCardIdx()) hoveredCardIndex = -1;
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
                    hoveredCardIndex = getLiveCardIdx();
                    track.classList.add("is-hovering-card");
                    card.classList.add("is-hovered");
                    checkHeaderCollisions();
                    startHoverVideo(card);
                    startHeaderMarquee(card);
                }, { signal });

                link.addEventListener("blur", () => {
                    if (hoveredCardIndex === getLiveCardIdx()) hoveredCardIndex = -1;
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
                    const liveIdx = getLiveCardIdx();
                    const metric = liveIdx !== -1 ? cachedCardMetrics[liveIdx] : null;
                    const screenX = metric ? (metric.left - scrollPos) : (card.offsetLeft - scrollPos);
                    try {
                        sessionStorage.setItem("mg_restore_project_url", href);
                        if (slug) sessionStorage.setItem("mg_restore_project_slug", slug);
                        if (num) sessionStorage.setItem("mg_restore_project_num", num);
                        sessionStorage.setItem("mg_projects_saved_scroll", String(scrollPos));
                        if (Number.isFinite(screenX)) {
                            sessionStorage.setItem("mg_restore_anchor_screen_x", String(Math.round(screenX)));
                        }
                        sessionStorage.setItem("mg_restore_from_detail", "true");
                        sessionStorage.setItem("mg_restore_filter_parent", activeParent);
                        sessionStorage.setItem("mg_restore_filter_sub", activeSub);
                    } catch (_) { }
                }, { signal });
            }
        };

        const computeDesktopSetsNeeded = (count) => {
            if (count <= MIN_LOOP_THRESHOLD) return 1;
            const estMinCardW = Math.max(80, window.innerHeight * (currentVh / 100) * 0.5625);
            const estMinSetW = Math.max(1, count * estMinCardW);
            const minSetsForViewport = Math.ceil(window.innerWidth / estMinSetW) + 2;
            return Math.max(3, Math.min(16, Math.max(Math.ceil(30 / count) + 2, minSetsForViewport)));
        };

        const buildDesktopLoop = (filteredTemplates, options = {}) => {
            const { preserveAnchor = false } = options;
            const savedAnchor = preserveAnchor ? getFirstVisibleCardAnchor() : null;

            track.innerHTML = "";
            trackCards = [];
            cardsByUniqueKey.clear();
            cachedCardMetrics = [];
            hoveredCardIndex = -1;
            warmVideoPool.length = 0;
            inFlightPreloadKeys.clear();
            singleSetWidth = 0;
            const wasInteracted = userHasInteractedDesktop;
            if (!preserveAnchor) {
                userHasInteractedDesktop = false;
                hasMarqueeMoved = false;
            }

            const count = filteredTemplates.length;
            if (count === 0) {
                isDesktopInfinite = false;
                currentSetCount = 0;
                track.classList.remove("is-no-loop");
                minBoundedScroll = 0;
                maxBoundedScroll = 0;
                scrollPos = 0;
                targetPos = 0;
                rawTargetPos = 0;
                currentMarqueeSpeed = 0;
                syncTrackTransform();
                return;
            }

            isDesktopInfinite = count > MIN_LOOP_THRESHOLD;
            track.classList.toggle("is-no-loop", !isDesktopInfinite);

            const setsNeeded = computeDesktopSetsNeeded(count);
            currentSetCount = setsNeeded;
            const fragment = document.createDocumentFragment();
            let globalIdx = 0;

            for (let s = 0; s < setsNeeded; s++) {
                filteredTemplates.forEach((tpl, tplIdx) => {
                    const clone = tpl.cloneNode(true);
                    clone.dataset.setIndex = String(s);
                    clone.dataset.trackIdx = String(globalIdx);
                    if (s > 0) clone.setAttribute("aria-hidden", "true");

                    const isInitialActiveSet = isDesktopInfinite ? s === 1 : s === 0;
                    if (isInitialActiveSet && tplIdx === 0) {
                        clone.classList.add("is-initial-first");
                    }
                    if (isInitialActiveSet) {
                        clone.setAttribute("data-initial-visible", "true");
                    }

                    const isEagerInitial =
                        (isInitialActiveSet && tplIdx < 10) ||
                        (isDesktopInfinite && s === 0 && (tplIdx >= count - 4 || tplIdx < 4)) ||
                        (isDesktopInfinite && s === 2 && tplIdx < 6);
                    const isHighPriority = isInitialActiveSet && tplIdx < 6;

                    const img = clone.querySelector(".project-img") || clone.querySelector("img");
                    if (img) {
                        img.setAttribute("loading", isEagerInitial ? "eager" : "lazy");
                        img.setAttribute("decoding", "async");
                        if (isHighPriority) {
                            img.setAttribute("fetchpriority", "high");
                        }
                    }
                    bindDesktopCard(clone);
                    fragment.appendChild(clone);
                    trackCards.push(clone);
                    globalIdx += 1;
                });
            }

            track.appendChild(fragment);
            initialFirstCardIndex = isDesktopInfinite ? activeFilteredCount : 0;

            measureDesktopMetrics({
                preserveAnchor: Boolean(preserveAnchor && savedAnchor),
                customAnchor: savedAnchor,
                forceInitialReset: !preserveAnchor
            });

            if (preserveAnchor && wasInteracted) {
                userHasInteractedDesktop = true;
                track.classList.remove("is-at-start");
            } else if (!preserveAnchor) {
                const restored = getRestoredScrollPos();
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
            syncTrackTransform();

            requestAnimationFrame(() => {
                measureDesktopMetrics({ preserveAnchor: true });
                checkHeaderCollisions();
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

                const isTransitionActive = Boolean(
                    window.__mgIsTransitioning ||
                    window.__mgEnteringFromHome ||
                    (section && section.classList.contains("is-marquee-paused"))
                );
                if (isTransitionActive) return;

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

        trackWrapper.addEventListener("dragstart", (e) => e.preventDefault(), { signal });
        window.addEventListener("dragstart", (e) => {
            if (e.target && e.target.closest && e.target.closest(".projects-section, .projects-track-wrapper, .project-card, .project-link, .desktop-gallery-stage")) {
                e.preventDefault();
            }
        }, { signal });

        trackWrapper.addEventListener("pointerdown", (e) => {
            if (isMobileLayout() || e.button !== 0) return;

            const isTransitionActive = Boolean(
                window.__mgIsTransitioning ||
                window.__mgEnteringFromHome ||
                (section && section.classList.contains("is-marquee-paused"))
            );
            if (isTransitionActive) return;

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
                if (
                    track.classList.contains("is-at-start") &&
                    (userHasInteractedDesktop || hasMarqueeMoved) &&
                    initialFirstCardIndex >= 0 &&
                    cachedCardMetrics[initialFirstCardIndex]
                ) {
                    const metric = cachedCardMetrics[initialFirstCardIndex];
                    const cardLeft = metric.left - scrollPos;
                    const cardRight = cardLeft + metric.width;
                    if (metric.width > 0 && (cardRight <= 0 || cardLeft >= window.innerWidth)) {
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
                    measureDesktopMetrics({ preserveAnchor: true });
                    checkHeaderCollisions();
                    sessionStorage.setItem(STORAGE_KEY, targetVh.toFixed(2));
                }
                else if (isZoomAnimating) {
                    const elapsed = now - zoomStartTime;
                    const progress = Math.min(1, elapsed / ZOOM_DURATION);
                    const eased = ZOOM_EASING(progress);

                    currentVh = zoomStartVh + (targetVh - zoomStartVh) * eased;
                    updateZoomUI(currentVh);
                    measureDesktopMetrics({ preserveAnchor: true });
                    checkHeaderCollisions();

                    if (progress >= 1) {
                        isZoomAnimating = false;
                        currentVh = targetVh;
                        updateZoomUI(currentVh);
                        measureDesktopMetrics({ preserveAnchor: true });
                        checkHeaderCollisions();
                        if (hoveredCardIndex !== -1 && trackCards[hoveredCardIndex]) {
                            startHeaderMarquee(trackCards[hoveredCardIndex]);
                        }
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

                    if (!isPaused && !isMarqueeDelayed && currentMarqueeSpeed > 0.05) {
                        hasMarqueeMoved = true;
                    }

                    rawTargetPos += currentMarqueeSpeed * dtScale;

                    if (isDragging) {
                        targetPos = rawTargetPos;
                        const dragAlpha = 1 - Math.pow(1 - DRAG_LERP_FACTOR, dtScale);
                        scrollPos += (targetPos - scrollPos) * dragAlpha;
                    } else if (isWheelActive) {
                        const stage1Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE1, dtScale);
                        const stage2Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE2, dtScale);
                        targetPos += (rawTargetPos - targetPos) * stage1Alpha;
                        scrollPos += (targetPos - scrollPos) * stage2Alpha;
                    } else {
                        const distToTarget = Math.abs(rawTargetPos - targetPos);
                        const distToScroll = Math.abs(targetPos - scrollPos);
                        if (distToTarget > 0.05 || distToScroll > 0.05) {
                            const stage1Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE1, dtScale);
                            const stage2Alpha = 1 - Math.pow(1 - WHEEL_SMOOTH_STAGE2, dtScale);
                            targetPos += (rawTargetPos - targetPos) * stage1Alpha;
                            scrollPos += (targetPos - scrollPos) * stage2Alpha;
                        } else {
                            targetPos = rawTargetPos;
                            scrollPos = rawTargetPos;
                        }
                    }

                    if (singleSetWidth > 0) {
                        const loopStart = cachedCardMetrics[0]?.left || 0;
                        const maxLoop = loopStart + singleSetWidth * 2;
                        while (scrollPos >= maxLoop) {
                            scrollPos -= singleSetWidth;
                            targetPos -= singleSetWidth;
                            rawTargetPos -= singleSetWidth;
                        }
                        while (scrollPos <= loopStart) {
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
                    syncTrackTransform();
                }

                if (isGalleryRevealed && Math.abs(scrollPos - lastPreloadScrollPos) > 180) {
                    lastPreloadScrollPos = scrollPos;
                    scheduleLookaheadPreload(40);
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
                recordAssetAspect(img, aspect);
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

                    const knownAspect = getKnownAssetAspect(imgEl) ||
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
                if (isRestoreFromDetail && (didFindRestored || !scope.querySelector(".w-pagination-next[href]"))) {
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

        const buildActiveLayout = (filtered, options = {}) => {
            if (isMobileLayout()) {
                buildMobileGallery(filtered);
                isMobileBuilt = true;
                isDesktopBuilt = false;
            } else {
                buildDesktopLoop(filtered, options);
                isDesktopBuilt = true;
                isMobileBuilt = false;
            }
        };

        const applyFilters = (options = {}) => {
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
            buildActiveLayout(filtered, options);
            if (!options.preserveAnchor) {
                startMarqueeDelay();
            }
        };

        parentFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                clearRestorationState();
                userHasInteractedDesktop = false;
                hasMarqueeMoved = false;
                parentFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawFilter = btn.getAttribute("data-filter") || btn.textContent;
                activeParent = canonicalizeType(rawFilter);

                resetSubFilterToAll();
                syncSubFilterVisibility();
                updateAvailableSubFilterButtons();
                applyFilters({ preserveAnchor: false });
            }, { signal });
        });

        subFilterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                clearRestorationState();
                userHasInteractedDesktop = false;
                hasMarqueeMoved = false;
                subFilterBtns.forEach((b) => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                const rawSub = btn.getAttribute("data-sub") || btn.textContent;
                activeSub = normalize(rawSub);
                applyFilters({ preserveAnchor: false });
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
        applyFilters({ preserveAnchor: false });
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

            const nextLink = scope.querySelector(".w-pagination-next[href], a.w-pagination-next[href]");
            if (!nextLink || (cachedPaginationState.complete && cachedPaginationState.path === currentPagePath)) {
                return;
            }

            let nextPageUrl = resolveUrl(nextLink.getAttribute("href") || "");
            const visitedUrls = new Set([window.location.href, window.location.origin + window.location.pathname]);
            let completedCleanly = true;

            const rebuildCardsByKeyMap = () => {
                cardsByUniqueKey.clear();
                trackCards.forEach((card, idx) => {
                    card.dataset.trackIdx = String(idx);
                    const key = card.dataset.uniqueKey || getCardKey(card);
                    if (key) {
                        card.dataset.uniqueKey = key;
                        let list = cardsByUniqueKey.get(key);
                        if (!list) {
                            list = [];
                            cardsByUniqueKey.set(key, list);
                        }
                        list.push(card);
                    }
                });
            };

            while (nextPageUrl && !visitedUrls.has(nextPageUrl)) {
                visitedUrls.add(nextPageUrl);
                try {
                    const resp = await fetch(nextPageUrl, { signal });
                    if (!resp.ok) {
                        completedCleanly = false;
                        break;
                    }
                    const html = await resp.text();
                    const doc = new DOMParser().parseFromString(html, "text/html");
                    const newCandidateCards = Array.from(
                        doc.querySelectorAll(".projects-track > .project-card, .projects-track > .w-dyn-item, .projects-track-wrapper .projects-track > div, .project-card")
                    );
                    const newAddedClones = [];

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
                        const clone = card.cloneNode(true);
                        newAddedClones.push(clone);
                    });

                    if (newAddedClones.length > 0) {
                        const addedCount = newAddedClones.length;

                        const commitPagination = () => {
                            const maxPrevSeq = masterCards.reduce((mx, c) => {
                                const seq = getCardSequence(c);
                                return seq < 999999 ? Math.max(mx, seq) : mx;
                            }, 0);
                            const minNewSeq = newAddedClones.reduce((mn, c) => Math.min(mn, getCardSequence(c)), Infinity);
                            const allNewStrictlyAfter = minNewSeq >= maxPrevSeq;

                            newAddedClones.forEach((clone) => {
                                masterCards.push(clone);
                                const key = clone.dataset.uniqueKey || "";
                                if (key) masterCardByUniqueKey.set(key, clone);
                                if (!cachedPaginationState.cards.some((c) => c.dataset.uniqueKey === key)) {
                                    cachedPaginationState.cards.push(clone.cloneNode(true));
                                }
                            });
                            masterCards.sort((a, b) => getCardSequence(a) - getCardSequence(b));
                            activeFilteredCount = masterCards.length;
                            isDesktopInfinite = activeFilteredCount > MIN_LOOP_THRESHOLD;
                            updateAvailableSubFilterButtons();

                            if (!isMobileLayout()) {
                                const wasLockedAtStart = isInitialScrollLocked();
                                const prevCount = masterCards.length - addedCount;
                                const neededSets = computeDesktopSetsNeeded(activeFilteredCount);
                                const canInsertInPlace =
                                    activeParent === "all" &&
                                    activeSub === "all" &&
                                    isDesktopInfinite &&
                                    allNewStrictlyAfter &&
                                    neededSets === currentSetCount &&
                                    trackCards.length === prevCount * currentSetCount &&
                                    addedCount > 0;

                                if (canInsertInPlace) {
                                    const savedAnchor = !wasLockedAtStart ? getFirstVisibleCardAnchor() : null;
                                    currentFiltered = masterCards.slice();

                                    for (let s = currentSetCount - 1; s >= 0; s--) {
                                        const insertBeforeEl = s < currentSetCount - 1 ? trackCards[(s + 1) * prevCount] : null;
                                        const frag = document.createDocumentFragment();
                                        newAddedClones.forEach((tpl) => {
                                            const clone = tpl.cloneNode(true);
                                            clone.dataset.setIndex = String(s);
                                            if (s > 0) clone.setAttribute("aria-hidden", "true");
                                            if (s === 1) clone.setAttribute("data-initial-visible", "true");
                                            bindDesktopCard(clone);
                                            frag.appendChild(clone);
                                        });
                                        if (insertBeforeEl) {
                                            track.insertBefore(frag, insertBeforeEl);
                                        } else {
                                            track.appendChild(frag);
                                        }
                                    }

                                    trackCards = Array.from(track.children);
                                    rebuildCardsByKeyMap();
                                    initialFirstCardIndex = isDesktopInfinite ? activeFilteredCount : 0;

                                    // Keep the Set 0 tail immediately left of 01 eager so wrap boundary stays ready
                                    for (let k = Math.max(0, activeFilteredCount - 4); k < activeFilteredCount; k++) {
                                        const tailImg = trackCards[k]?.querySelector(".project-img, img");
                                        if (tailImg) tailImg.setAttribute("loading", "eager");
                                    }

                                    measureDesktopMetrics({
                                        preserveAnchor: Boolean(savedAnchor),
                                        customAnchor: savedAnchor,
                                        forceInitialReset: wasLockedAtStart
                                    });

                                    if (isRestoreFromDetail) {
                                        const restored = getRestoredScrollPos();
                                        if (restored !== null) {
                                            scrollPos = restored;
                                            targetPos = restored;
                                            rawTargetPos = restored;
                                            userHasInteractedDesktop = true;
                                            track.classList.remove("is-at-start");
                                            syncTrackTransform();
                                            clearRestorationState();
                                        }
                                    } else if (wasLockedAtStart) {
                                        track.classList.add("is-at-start");
                                    }
                                    checkHeaderCollisions();
                                    scheduleLookaheadPreload(60);
                                    return;
                                }

                                applyFilters({ preserveAnchor: !wasLockedAtStart });
                                if (isRestoreFromDetail) {
                                    const restored = getRestoredScrollPos();
                                    if (restored !== null) {
                                        scrollPos = restored;
                                        targetPos = restored;
                                        rawTargetPos = restored;
                                        userHasInteractedDesktop = true;
                                        track.classList.remove("is-at-start");
                                        syncTrackTransform();
                                        clearRestorationState();
                                    }
                                }
                                checkHeaderCollisions();
                                scheduleLookaheadPreload(60);
                            } else {
                                applyFilters({ preserveAnchor: false });
                            }
                        };

                        const isTransitioning = Boolean(
                            window.__mgIsTransitioning ||
                            window.__mgEnteringFromHome ||
                            (section && section.classList.contains("is-marquee-paused"))
                        );

                        if (isTransitioning) {
                            let committed = false;
                            const doCommit = () => {
                                if (committed) return;
                                committed = true;
                                commitPagination();
                            };
                            window.addEventListener("mg-transition-complete", doCommit, { once: true, signal });
                            setTimeout(() => {
                                if (!committed && !window.__mgIsTransitioning) {
                                    doCommit();
                                }
                            }, 3200);
                        } else {
                            commitPagination();
                        }
                    }

                    const nextInDoc = doc.querySelector(".w-pagination-next[href], a.w-pagination-next[href]");
                    nextPageUrl = nextInDoc ? resolveUrl(nextInDoc.getAttribute("href") || "") : null;
                } catch (err) {
                    completedCleanly = false;
                    if (err?.name === "AbortError") break;
                    console.warn("[Projects] Pagination fetch error:", err);
                    break;
                }
            }

            if (completedCleanly) {
                cachedPaginationState.complete = true;
                if (isRestoreFromDetail && !window.__mgIsTransitioning) {
                    clearRestorationState();
                }
            }
        };

        fetchRemainingPages();

        const revealGalleryWhenReady = () => {
            const hasPendingPagination = !cachedPaginationState.complete && Boolean(scope.querySelector(".w-pagination-next[href]"));

            const reveal = () => {
                if (isGalleryRevealed) return;
                if (!isMobileLayout()) {
                    measureDesktopMetrics({ preserveAnchor: false, forceInitialReset: true });
                    const restored = getRestoredScrollPos();
                    if (restored !== null) {
                        scrollPos = restored;
                        targetPos = restored;
                        rawTargetPos = restored;
                        userHasInteractedDesktop = true;
                        track.classList.remove("is-at-start");
                        syncTrackTransform();
                        clearRestorationState();
                    } else {
                        if (!isRestoreFromDetail || !hasPendingPagination) {
                            clearRestorationState();
                        }
                        if (!userHasInteractedDesktop) {
                            const initPos = getInitialScrollPos();
                            scrollPos = initPos;
                            targetPos = initPos;
                            rawTargetPos = initPos;
                            syncTrackTransform();
                        }
                    }
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
                scheduleLookaheadPreload(120);
            };

            const getInitialDecodeTasks = () => {
                if (isMobileLayout()) return [];
                const activeStart = isDesktopInfinite ? activeFilteredCount : 0;
                const headCards = trackCards.slice(activeStart, activeStart + 6);
                const tailCards = isDesktopInfinite && activeFilteredCount > 2
                    ? trackCards.slice(Math.max(0, activeFilteredCount - 2), activeFilteredCount)
                    : [];
                const targets = [...headCards, ...tailCards];
                return targets.map((card) => {
                    const img = card.querySelector(".project-img") || card.querySelector("img");
                    if (!img) return Promise.resolve();
                    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                    if (typeof img.decode === "function") {
                        const timeoutCap = new Promise((res) => setTimeout(res, 220));
                        return Promise.race([img.decode(), timeoutCap]).catch(() => { });
                    }
                    return new Promise((res) => {
                        const done = () => res();
                        img.addEventListener("load", done, { once: true, signal });
                        img.addEventListener("error", done, { once: true, signal });
                        setTimeout(done, 220);
                    });
                });
            };

            // If section was already prepared by page transition or returning from project detail, keep stage visible immediately
            // while still locking initial card metrics as visible images finish decoding.
            if (isRestoreFromDetail || section.classList.contains("is-ready")) {
                reveal();
                const decodeTasks = getInitialDecodeTasks();
                if (decodeTasks.length) {
                    Promise.allSettled(decodeTasks).then(() => {
                        if (!isMobileLayout() && projectsScope) {
                            measureDesktopMetrics({ preserveAnchor: true });
                            checkHeaderCollisions();
                        }
                    });
                }
                return;
            }

            if (!isMobileLayout()) {
                const decodeTasks = getInitialDecodeTasks();
                const safetyTimer = setTimeout(reveal, 420);
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
                    buildDesktopLoop(filteredToUse, { preserveAnchor: false });
                    isDesktopBuilt = true;
                }
            }

            if (!currentIsMobile) {
                measureDesktopMetrics({ preserveAnchor: true });
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

        if ("ResizeObserver" in window) {
            const stageEl = scope.querySelector(".desktop-gallery-stage") || trackWrapper;
            if (stageEl) {
                projectsResizeObserver = new ResizeObserver(() => {
                    if (!isMobileLayout()) {
                        scheduleMetricsRecalc();
                    }
                });
                projectsResizeObserver.observe(stageEl);
            }
        }

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (!isMobileLayout() && projectsScope) {
                    measureDesktopMetrics({ preserveAnchor: true });
                }
            }).catch(() => { });
        }

        window.addEventListener("mg-transition-complete", () => {
            if (isMobileLayout()) {
                syncMobileVideos();
            } else {
                measureDesktopMetrics({ preserveAnchor: true });
                checkHeaderCollisions();
                scheduleLookaheadPreload(60);
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
        if (projectsResizeObserver) {
            projectsResizeObserver.disconnect();
            projectsResizeObserver = null;
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
        if (projectsPreloadTimer) {
            clearTimeout(projectsPreloadTimer);
            projectsPreloadTimer = null;
        }
        if (aspectPersistTimer) {
            clearTimeout(aspectPersistTimer);
            aspectPersistTimer = null;
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