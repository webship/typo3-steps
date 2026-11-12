# typo3-steps

Cucumber step definitions for testing TYPO3 sites with
[webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD browser
automation harness built on Playwright and Cucumber-js.

> Published on [npmjs.com](https://www.npmjs.com/package/@webship-js/typo3-steps)
> as `@webship-js/typo3-steps`.

The pack adds the steps a TYPO3 tester needs on top of webship-js's own
vocabulary (click, fill in, see, the accessibility audit), and the feature
files that prove every step against a real site.

- **Front end**: the main navigation with its dropdowns, mega menu and
  mobile navbar, the subnavigation, the breadcrumb, the language menu, page
  headings, content elements by type and by header, the accordion, the
  Indexed Search form and its results, forms of the form framework with
  their validation messages, the "page not found" answer and the generator.

Every step is proven on **TYPO3 13 LTS with the official Introduction
package** (`typo3/cms-introduction` 4.7 on the Bootstrap Package theme,
`bk2k/bootstrap-package` 15), built from scratch with DDEV on every CI run.

## What the steps rely on

| Area | Markup |
| --- | --- |
| Main navigation | `#mainnavigation a.nav-link-main`, `.nav-link-toggle`, `.dropdown-menu a.nav-link-dropdown`, `.nav-style-mega`, `.navbar-toggler` (Bootstrap Package) |
| Subnavigation, breadcrumb | `.subnav-nav a.subnav-link`, `ol.breadcrumb .breadcrumb-item` (Bootstrap Package) |
| Language menu | `#language_menu` / `ul.language-menu` (Bootstrap Package) |
| Content elements | `div.frame.frame-type-<CType>`, `.element-header` (TYPO3 Fluid Styled Content) |
| Accordion | `.accordion-item`, `.accordion-button`, `.accordion-body` (Bootstrap 5) |
| Search | `#tx-indexedsearch-searchbox-sword`, `.tx-indexedsearch-res`, `.tx-indexedsearch-info-noresult` (Indexed Search) |
| Forms | `form[id^="<identifier>"]`, `.form-navigation`, `.is-invalid` / `.has-error`, `.invalid-feedback` (form framework) |

The content element, search and form steps follow markup TYPO3 itself
renders, so they work on any theme that keeps it. The navigation,
subnavigation, breadcrumb and language steps follow the Bootstrap Package
theme; a site on another theme needs its own steps for those.

The feature files assert the paths, labels and copy of the Introduction demo
content (`/content-examples/interactive/accordion`, "Media Left", ...). The
steps carry no site data: every label, title and phrase is an argument, so
replace those values with your own content when you copy a feature.

## Requirements

- Node.js 20 or later
- A webship-js 2.0 test project

## Install

```bash
npm install --save-dev @webship-js/typo3-steps
```

## Quick start

1. Add the step files of the pack to the `require` array of your
   `cucumber.js`:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship-js/typo3-steps/tests/step-definitions/*.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at your TYPO3 site:

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://your-typo3-site.example',
   },
   ```

3. Copy a feature file from [`tests/features/`](tests/features/) into the
   `tests/features/` directory of your project and replace the menu labels,
   paths and phrases with those of your site.

4. Run the suite:

   ```bash
   npx cucumber-js
   ```

## What is included

| Path | Purpose |
| --- | --- |
| `tests/step-definitions/typo3.steps.js` | The front-end steps. |
| `tests/step-definitions/typo3-helpers.js` | Shared helpers (no steps): the wait budget, whole-label matching, friendly errors. |
| `tests/features/*.feature` | The features that prove the steps against the Introduction site; see [`tests/features/README.md`](tests/features/README.md). |
| `scripts/build-site.sh` | Builds the TYPO3 Introduction site with [DDEV](https://ddev.com/). |
| `.github/workflows/test.yml` | CI: builds the site, checks the examples, runs the dry run and the full suite on every push and pull request. |

## Step catalogue

### Front end

| Step | Type |
| --- | --- |
| `I open the "<label>" menu item` | When |
| `I should( not) see the "<label>" menu item` | Then |
| `the "<label>" menu item should( not) be (current\|active)` | Then |
| `I open the dropdown of the "<label>" menu item` | When |
| `I open the (content examples )mega menu` | When |
| `I open the "<label>" dropdown link` | When |
| `I should( not) see the "<label>" dropdown link` | Then |
| `I open the "<label>" subnavigation item` | When |
| `I should( not) see the "<label>" subnavigation item` | Then |
| `I should( not) see the breadcrumb` | Then |
| `the breadcrumb should( not) contain "<label>"` / `"<label>" should( not) be in the breadcrumb` | Then |
| `I switch to the "<language>" language` | When |
| `the "<language>" language should( not) be available` | Then |
| `I should( not) be viewing the "<title>" page` | Then |
| `I should( not) see a "<type>" content element` | Then |
| `I should see <count> "<type>" content elements` | Then |
| `I should( not) see "<phrase>" in the "<header>" content element` | Then |
| `I (open\|close) the "<label>" accordion panel` | When |
| `the "<label>" accordion panel should( not) be open` | Then |
| `I should( not) see "<phrase>" in the "<label>" accordion panel` | Then |
| `I search the site for "<words>"` | When |
| `I should( not) see search results` / `I should see no search results` | Then |
| `I should( not) see "<title>" in the search results` | Then |
| `I submit the "<identifier>" form` | When |
| `the "<label>" field should( not) be marked as invalid` | Then |
| `I should( not) see the error "<message>" for the "<label>" field` | Then |
| `I should( not) be on the 404 page` | Then |
| `the site should( not) be running TYPO3` | Then |

A language is named by its label in the menu ("Deutsch"), its title
("German") or its code ("de-DE"). The language a page declares is checked
with webship-js's own `the page language should be "de-DE"`.

### Conventions

- Every Then step takes `should` or `should not`, and every step that names
  an actor takes `I`, `we` or no pronoun.
- Labels of menu items, links, panels and headers are matched as a whole:
  "Page" does not match "Pages". Phrases inside a content element, a panel
  or an error message are matched as a case-sensitive part of the text.
- Every failure is a friendly message with a hint, not a Playwright stack.
- Assertions wait on their locator for the `minWaitTime.page` budget (at
  least 10 seconds); no step reads the page once or sleeps.
- `npm run test:examples` checks that every `Example #n:` line of a step
  docblock matches its own step and no webship-js core step, and that every
  feature step is defined exactly once. CI runs it before the dry run.

The Gherkin examples of every step are in its docblock in
[`tests/step-definitions/`](tests/step-definitions/).

## Running the tests of this repository

The CI workflow builds its own TYPO3 site with DDEV on every run. To run the
same suite on your machine:

```bash
npm install

# Build TYPO3 13 LTS with the Introduction package as a DDEV project.
mkdir .typo3-site && cd .typo3-site
bash ../scripts/build-site.sh
cd ..

# Run the suite against it.
LAUNCH_URL=https://typo3-intro.ddev.site npx cucumber-js
```

`scripts/build-site.sh` installs TYPO3 with `typo3 setup`, adds
`typo3/cms-introduction`, and applies two corrections the demo content needs
on TYPO3 13.4: it runs the upgrade wizard that turns the search plugin into
a content element, and it makes Indexed Search use its own result templates
(those of Bootstrap Package 15 call a ViewHelper that TYPO3 13.4 no longer
ships).

### Lanes, subsets and the settings webship-js reads

- `FEATURES=tests/features/a.feature,tests/features/b.feature npm test` runs a subset of the feature files; `CUCUMBER_TAGS=@critical npm test` runs a tag lane (the default run leaves `@wip` out).
- `cucumber.js` carries the `video` block (`WEBSHIP_VIDEO=on-failure` records the browser) and the `javascript` block (`WEBSHIP_JS_ERROR_MODE=fail` fails a scenario on a JavaScript error; `@js-off` silences one scenario) that webship-js reads.
- The step timeout is webship-js's own (45 seconds, set when it loads); `WEBSHIP_STEP_TIMEOUT=<milliseconds>` changes it, a `timeout` key in `cucumber.js` does not.

## License

MIT. See [LICENSE](LICENSE).
