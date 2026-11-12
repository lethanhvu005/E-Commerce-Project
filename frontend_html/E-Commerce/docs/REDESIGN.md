# Current visual direction - 2026-11-04

The latest supplied reference supersedes the earlier navy/violet gaming direction.
The storefront now uses near-black #030407, cobalt #1558C9, locally hosted
Cormorant Garamond for editorial headings (italic first line), and Manrope for UI.
Both font families include their OFL licenses in assets/fonts.

The first campaign uses the exact user-supplied blue-flower/earbuds PNG, saved as
assets/images/campaign/cobalt-sound-reference.png. Keyboard and mouse campaign
images were generated with imagegen. These are labeled concept imagery and link
to categories; catalog product illustrations and specifications remain separate.
The generated cobalt-sound.png is an unused alternative, not the primary banner.

The header is a single compact desktop row. Hero height responds to available
viewport height. Detail purchase controls fit the 1366x620 desktop viewport;
mobile places the purchase block before the gallery. The current theme preference
uses nexa-cobalt-theme so the previous saved lavender light theme does not override
the requested initial dark presentation. The light/dark toggle remains available.

Validation completed:
- Static asset and JavaScript checks: no errors; 31 source and 31 dist HTML files.
- Storefront behavior: 82 assertions (menus, search, categories, demo auth, cart,
  wishlist, theme persistence, mobile focus, routes, and console errors).
- Product details: 61 assertions (views, variants, stock, cart and checkout).
- Carousel: 13 horizontal-motion/no-reload assertions and 14 autoplay assertions.
- Cobalt layout: 38 assertions on source and 38 on dist, covering local fonts,
  image loading, visible CTAs, and widths 320, 390, 768, 1366 and 1440.
- Screenshots: screenshots/cobalt-1366.png, cobalt-390.png, cobalt-detail.png.

The build is local only. User visual approval is pending.

---

## Historical implementation notes (superseded visual styling)

# NEXA storefront revision — 2026-10-29

## Review status

The user selected the original navy/violet direction, a stronger gaming layout,
and product images blended into the dark background. This revision removes the
pale image panels, enlarges the hero artwork, introduces oversized X75 typography
and angled outlines, and carries the dark treatment through cards and editorial.
Screenshots show the implemented revision; visual approval is still with the user.

Navigation follow-up: purple discovery trigger, six distinct category icons,
active-category markers, a category-tile mega menu with actual product counts,
and matching mobile category tiles. Preview: `screenshots/menu-desktop.png`.

Slider follow-up: the supplied reference informed three tilted interface layers,
with the selected product in front and a violet glow underneath. Existing catalog
SVGs remain the image source. Previews: `screenshots/slider-desktop.png` and
`screenshots/slider-mobile.png`. At the user's request, slides now cycle every
five seconds, with a pause/play button, keyboard-focus/hidden-tab suspension and
reduced-motion support. The wide product-name control strip has been replaced by
compact dots and a timed progress indicator. Mouse hover and pointer clicks no
longer suspend autoplay; the earlier hover pause explained the user's apparently
stationary slider. JavaScript Web Animations now move the entire outgoing and
incoming panels together over 950 ms, with a continuous right-to-left transition
for automatic advances. The existing DOM stays mounted in a clipped grid viewport
with stable height; there is no page reload or re-render on slide changes.
Rapid selections cancel superseded transitions safely.

## Implementation

- `assets/js/ui/layout.js`: shared header, expandable category menu, mobile menu,
  demo account state, login/register links, cart count, footer and product cards.
- `assets/js/pages/storefront.js`: product-based homepage carousel, actual catalog
  counts, category tiles, featured products, layout guide and new-product list.
- `assets/js/features/enhancements.js`: automatic slider with manual controls,
  keyboard arrows, horizontal touch gestures, synchronized product image/price/link,
  timer cleanup, and pause/play behavior.
- `assets/js/features/theme-and-layout.js`: menu close/focus behavior and shared
  enhancement lifecycle; removes duplicate menu/footer injection.
- `assets/js/features/forms-and-actions.js`: mobile toggle and close actions.
- `assets/js/app/events.js`: navigation, filter reset, account state and tab focus.
- `assets/js/app/hydrate.js`: shareable category/search links.
- CSS sources: `base/tokens-and-reset.css`, `components/header-buttons.css`,
  `components/interaction-slider.css`, `components/chatbox.css`,
  `pages/home-and-products.css`, `pages/account-and-content.css`, `pages/admin.css`,
  `themes/light.css`.
- `home.html`, `index.html`: static homepage fallback synchronized with render code.
- `tools/build_frontend.py`: supports multiline HTML asset declarations, preserves
  the theme script in built pages, checks output directory before replacing dist.
- `dist/`: rebuilt static delivery, 31 pages.

## Verification completed

- Build: 31 HTML pages, combined stylesheet, app script and theme helper.
- `py -3 tests/check_project.py`: zero errors for local assets, SVG XML and JS syntax.
- `tests/browser_storefront.cjs`: 79 browser assertions passed on source, then 82
  passed on dist after adding chat/mobile menu overlap checks.
- Browser checks include all 31 routes rendering, auth demo state, login/register
  links, search, category/editorial filters, favorites/cart persistence, menu
  keyboard control, slider links/arrows, simulated swipe, reduced motion and
  automatic progression. No console errors recorded.
- After the final dark gaming revision, build and static checks passed, and all
  82 browser assertions passed again on dist with zero console errors.
- Screenshots and overflow/image checks passed at 1440, 768, 390 and 320 pixels.
  Viewport previews are `screenshots/home-desktop-viewport.png` and
  `screenshots/home-mobile-viewport.png`; full-page previews use `home-{width}.png`.
- `tests/browser_autoplay.cjs`: 14 checks passed using Playwright's browser clock,
  covering wraparound, continued playback on hover/click, horizontal panel animation,
  keyboard-focus pause, pause persistence on reinitialization, play/resume,
  manual interval reset, reduced motion and accessible pause state.
- `tests/browser_slide_motion.cjs`: 13 checks passed for simultaneous incoming and
  outgoing motion, no gap, stable height, inactive outgoing controls, cleanup,
  rapid selection, original DOM identity, and zero document navigation/requests
  during slide changes on desktop and mobile layouts.
- Verification uses headless Chromium desktop emulation; a physical mobile device
  and other browser engines have not been checked.

Run a local HTTP server, then use the browser scripts with Playwright installed.
`PLAYWRIGHT_MODULE` can point to an existing Playwright package outside the project.
`TEST_BASE_URL` changes the browser regression target (default http://127.0.0.1:8767/).

## Assets and scope

## Product detail revision

The supplied sports-product reference informed the detail page: a central angled
product image, oversized brand/model lettering, dark background with fine curves,
thumbnail gallery at the left, and price/purchase controls at the right. The NEXA
navy/violet palette and existing SVG product illustrations are retained.

- `detailPage()` in `assets/js/pages/storefront.js` renders catalog-derived content,
  three illustration views, demo color choices, keyboard-only demo switches,
  quantities, favorites, specifications, related products and the existing reviews.
- `initProductDetail()` updates views, colors, quantity, favorites and cart count
  in place. `addCart()` accepts an optional refresh flag; other pages retain their
  previous behavior. Buy now uses the existing checkout route.
- `assets/css/pages/catalog-and-detail.css` contains the responsive composition.
  `prd_detail.html` has a synchronized static fallback; `dist` is rebuilt.
- `tests/browser_detail.cjs`: 61 checks passed on source and dist, including six
  device categories at 320/390/768/1440 pixels, cart quantity, stock gating,
  persistence, checkout navigation, retained DOM and zero console errors.
- Previews: `screenshots/detail-desktop.png`, `screenshots/detail-mobile.png`.

## Asset limitations

Product assets supplied by the project are SVG illustrations, not product photos.
The carousel labels this explicitly. Specifications/prices come from the existing
demo catalog; no new ratings, sales counts or product specifications were added.
No backend/authentication/payment integration or framework conversion was performed.

## Typography and ambient refinement - 2026-11-04

Campaign headings retain the locally hosted high-contrast Cormorant Garamond,
with softer tracking/leading and silver-blue gradient italics. Eyebrows use
small spaced Manrope. Primary CTAs have a blue gradient and subtle glow; the
story link uses a matching illuminated circle. CSS radial gradients create
soft blue/violet atmosphere and sparse static particles, without extra assets
or animation loops. Product images and horizontal carousel behavior remain.
The 38 viewport/font/CTA checks passed after the refinement.

## Seamless campaign edges and cleanup - 2026-11-04

Multi-stop image masks soften horizontal and vertical artwork edges, with radial
shadow and atmospheric layers bridging flowers into the copy background. The
homepage header divider is transparent. Desktop/mobile screenshots were reviewed
and 38 layout checks passed. Removed the requested context strip (selection
advice, demo product count, and its divider) from renderer and static fallbacks.

## Neon navigation reference - 2026-11-04

Rebuilt the shared header around the supplied reference: asymmetric curved blue
outline, luminous N mark, active Home pill, SVG category/collection/info/support
icons, rounded search, moon/sun toggle, account icon and floating cart count.
Desktop height remains 78px; the menu collapses below 1101px. No new dependencies.
Home/index/detail static fallbacks synchronized. Storefront checks: 82 passed;
compact layout checks: 38 passed. Additional widths 1920/1200/1100/1024/390/320
showed no document overflow. Screenshots: menu-neon-desktop.png and
menu-neon-mobile.png under docs/screenshots.

## Flowing ribbon campaign - latest revision

Both themes now share a continuous curved-ribbon composition matching the latest
reference. heroWaves() adds decorative SVG ribbons behind live HTML copy and
existing product photographs. Dark uses cobalt/cyan light; daylight uses pale
blue ribbons. No screenshot is used as a background. The sound slide uses the
existing wide sound/day assets, with matching layout in both themes.
Changed: storefront.js, themes/light.css, home/index static fallbacks, theme test,
and rebuilt dist. Theme suite 64, horizontal slider suite 13, autoplay suite 14
passed; static checks report no errors. Desktop/mobile previews reviewed.
