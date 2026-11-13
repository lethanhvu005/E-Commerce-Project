# React / frontend_html UI parity

Status: not yet measured in the current audit run.

The reference is `frontend_html/E-Commerce`. React already imports/reuses its visual assets and styles in several areas, but parity cannot be claimed until the same fixture data is rendered and screenshots are compared at:

- 1440x900
- 1024x768
- 768x1024
- 390x844

for both dark and light themes.

Current automated React evidence is limited to one shell render test and a successful production build. The build still reports ten `react-hooks/exhaustive-deps` warnings. No screenshot result is fabricated here.

The next UI pass must compare header, hero, product cards, detail, category, cart, checkout, wishlist, auth, profile, community, footer, responsive behavior, animation and theme without changing database data merely to improve screenshots.
