# Footer editorial check — 10 October 2026

Scope: contact markup in index.html, src/footer-editorial.css, src/footer-reveal.js.

## References
- https://takafumisenda.com/ — inspected live homepage and footer screenshots. Adapted typographic hierarchy, negative space, and ruled alignment. No claim to reproduce its animation timing.
- https://tympanus.net/Development/LineHoverStyles/ — inspected the demo page and its link treatment. Adapted the principle of restrained line feedback with original CSS, including keyboard focus.

## Browser evidence
Tested the existing Vite server at http://localhost:5173/ through the Codex browser.
- 1440 × 900: full footer, zero horizontal overflow, both title lines at transform identity, logo journey docked. Screenshot footer-editorial-desktop.jpg.
- 820 × 1000: larger tablet typography and vertically centered composition, zero overflow. Screenshot footer-editorial-tablet.jpg (email keyboard focus visible).
- 390 × 844: stacked invitation/contact/colophon, all social links visible, zero overflow. Screenshot footer-editorial-mobile.jpg.
- 320 × 700: zero overflow, contact target 48px and social targets 44px tall. Footer grows naturally to about 715px. Screenshot footer-editorial-320.jpg.
- 667 × 375: footer scrolls naturally; email and social targets remain reachable, no horizontal overflow.
- Forward/reverse scroll sampled on tablet: footer top 787 → 467 → 587px; word translations changed continuously and reversed (first word about 76 → 20 → 41px). At the endpoint both word transforms returned to identity. Screenshot footer-editorial-transition.jpg.
- Back to top: scroll returned to zero, logo footer journey inactive. Hero's existing scroll introduction then releases the navigation; TALK was clicked from the restored navbar.
- TALK: #contact, cover removed, footer top zero, both words at identity, logo docked, heading focused.
- Keyboard Tab from headline to email: visible solid outline and animated underline observed.
- Captured browser warning/error logs: empty.

## Checks and limits
- node --check src/footer-reveal.js passed.
- npm run build passed. Existing /border icon.svg unresolved-at-build-time warning remains.
- Reduced-motion fallback is implemented through the existing GSAP matchMedia lifecycle and static readable markup; live reduced-motion emulation was unavailable in this browser tool and was not tested.
- Pointer hover animation is implemented alongside tested keyboard focus; hover timing and physical touch devices were not separately measured.
- External social destinations and mailto hrefs preserved and inspected; no emails were sent and external account actions were not performed.
