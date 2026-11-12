# Step definitions

TYPO3 step definitions on top of webship-js's own vocabulary, proven against
TYPO3 13 LTS with the official Introduction package on the Bootstrap Package
theme.

| File | Holds |
| --- | --- |
| `typo3.steps.js` | The front-end steps: main navigation, subnavigation, breadcrumb, language menu, page heading, content elements, accordion, search, forms, the 404 page and the generator. |
| `typo3-backend.steps.js` | The backend steps: the session, the module menu, the content frame, the page tree, notifications, messages and caches. |
| `typo3-helpers.js`, `typo3-backend-helpers.js` | Shared helpers. They register no steps and no hooks. |

The step catalogue is in the [README](../../README.md#step-catalogue) of the
repository, and every step carries a docblock with five Gherkin examples.

Every step takes `I`, `we` or no pronoun, every assertion takes `should` or
`should not`, and a failed step reports a friendly message with a hint, not
a Playwright timeout. Waits use webship-js's `smartSettle`; no step sleeps.
