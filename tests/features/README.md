# Features

Gherkin feature files that run against TYPO3 13 LTS with the official
Introduction package (`typo3/cms-introduction` on the Bootstrap Package
theme), built with DDEV by `scripts/build-site.sh`.

| Feature file | Covers |
| --- | --- |
| `homepage.feature` | The home page loads with its hero heading and the top-level menu items (desktop and mobile). |
| `main-navigation.feature` | Opening the top-level pages from the main menu, the current and active items, whole-label matching and a simple dropdown (desktop and mobile). |
| `content-examples-mega-menu.feature` | Opening the "Content Examples" mega menu and reaching a nested page through it (desktop and mobile). |
| `subnavigation-and-breadcrumb.feature` | The subnavigation beside a content page and the breadcrumb above it. |
| `languages.feature` | The language menu: which translations a page offers, switching to German and Danish and back. |
| `content-elements.feature` | Content elements by type (`frame-type-<CType>`) and by header, and the generator. |
| `accordion.feature` | Opening and closing the panels of the accordion content element and reading their content (desktop and mobile). |
| `search.feature` | The Indexed Search form, a search with results and a search without. |
| `contact-form.feature` | The contact form of the form framework: mandatory fields, an invalid email address and the confirmation page. |
| `error-404.feature` | The "page not found" answer for an unknown address. |
| `backend-login.feature` | The backend login form, logging in by a handle of the users registry, a refused password and logging out. |
| `backend-modules.feature` | Opening modules from the module menu, two modules with one label, the modules an administrator and an editor have, the Log module and the Forms module. |
| `backend-page-tree.feature` | Selecting a page, reaching a deep page by its path, expanding, collapsing and filtering the page tree. |
| `backend-caches.feature` | Flushing the frontend caches and all caches, and clearing the cache of one page. |
| `backend-content-lifecycle.feature` | A page and a content element from start to end: validation, create, enable, add content, what visitors see, edit, hide, show, the List module, rename, disable and delete. |
| `accessibility-audit.feature` | The accessibility audit of webship-js on the front page, content pages, pages with a form, a translated page, the backend login page and the backend shell. |

Scenarios tagged `@mobile` set the `xs` breakpoint (375 px) so the navbar
collapses behind the Bootstrap `.navbar-toggler`.

The backend features log in with the accounts of the users registry in
`cucumber.js` (`admin` and `editor`), which `scripts/build-site.sh` creates.

The TYPO3 steps are in `../step-definitions/`; every other step is part of
webship-js.
