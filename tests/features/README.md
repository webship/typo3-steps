# Features

Gherkin feature files exercising a locally DDEV-built TYPO3 v13 site running
the official `typo3/cms-introduction` demo content with the
`bk2k/bootstrap_package` frontend theme.

| Feature file | Covers |
| --- | --- |
| `homepage.feature` | Home page loads with its hero heading and the top-level main-menu items are present (desktop + mobile). |
| `main-navigation.feature` | Navigating to the top-level pages (Features, Customize, Pages) and back to the homepage via the main menu (desktop + mobile). |
| `content-examples-mega-menu.feature` | Opening the "Content Examples" mega-menu dropdown and reaching a nested content-example page (Quote, Accordion) through it (desktop + mobile). |
| `accordion.feature` | Expanding the Bootstrap accordion panels on the Accordion content-example page and reading each panel's content (desktop + mobile). |

Scenarios tagged `@mobile` set the `xs` breakpoint (375px) so the navbar
collapses behind the Bootstrap `.navbar-toggler`.

Custom TYPO3 steps live in `../step-definitions/typo3.steps.js`; everything
else uses webship-js's built-in step vocabulary.
