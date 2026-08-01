# Step Definitions

Custom TYPO3 step definitions layered on top of webship-js's built-in
vocabulary. They target a locally DDEV-built TYPO3 v13 site running the
official `typo3/cms-introduction` demo content with the
`bk2k/bootstrap_package` frontend theme.

`typo3.steps.js` adds the steps that webship-js's generic
click / fill / see vocabulary does not cover:

| Step | Purpose |
| --- | --- |
| `When I open the "<name>" menu item` | Click a top-level main-navigation link (Home, Features, Customize, Pages, Content Examples). Expands the collapsed navbar first on mobile. |
| `Then I should (not )see the "<name>" menu item` | Assert a top-level main-navigation link is / is not present. |
| `When I open the (content examples )mega menu` | Open the "Content Examples" Bootstrap 5 mega-menu dropdown via its toggle button. |
| `When I open the "<name>" dropdown link` | Click a nested link inside the open mega-menu dropdown (Quote, Accordion, Gallery, …). |
| `Then I should (not )see the "<name>" dropdown link` | Assert a nested mega-menu link is / is not present. |
| `Then I should be viewing the "<title>" page` | Assert the current page's hero (`h1.carousel-header`) or content heading (`h1.element-header`) includes the given text. |
| `When I open the "<label>" accordion panel` | Expand a Bootstrap accordion panel by its header-button label. |
| `Then I should see "<phrase>" in the "<label>" accordion panel` | Assert the expanded accordion panel's body is visible and contains the phrase. |

Every step supports the `(I |we )*` pronoun prefix, carries a JSDoc block
with Gherkin examples, and wraps risky locator actions in a friendly
try/catch so a missing selector reports a clear hint instead of a raw
Playwright timeout. Waits use webship-js's `smartSettle` — no static sleeps.
