# typo3-steps

Cucumber step definitions for testing TYPO3 sites with
[webship-js](https://webship.co/docs/webship-js/2.0.x) — a BDD browser
automation harness built on Playwright + Cucumber-js.

`@webship/typo3-steps` adds a `typo3.steps.js` step file plus `.feature` files that
cover the main navigation (including the Bootstrap 5 "Content Examples"
mega-menu dropdown and the collapsed mobile navbar), page headings, and the
Bootstrap accordion content element of a TYPO3 install running the official
[`typo3/cms-introduction`](https://packagist.org/packages/typo3/cms-introduction)
demo content on the `bk2k/bootstrap_package` frontend theme.

> Published to [npmjs.com](https://www.npmjs.com/package/@webship/typo3-steps)
> as `@webship/typo3-steps`.

## Requirements

- Node.js >= 20
- A webship-js 2.0 test project

## Install

```bash
npm install --save-dev @webship/typo3-steps
```

## Quick start

1. Add `@webship/typo3-steps`'s step file to your webship-js `cucumber.js`
   `require` array:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship/typo3-steps/tests/step-definitions/typo3.steps.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at your TYPO3 site:

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://your-typo3-site.example',
   },
   ```

3. Copy a feature file from [`tests/features/`](tests/features/) into your
   project's `tests/features/` directory and adjust the menu items / page
   titles to match your site's content.

4. Run the suite:

   ```bash
   npx cucumber-js
   ```

## What's included

| Path | Purpose |
| --- | --- |
| `tests/step-definitions/typo3.steps.js` | TYPO3-specific Cucumber steps (main-menu navigation, mobile navbar, mega-menu dropdown, page-heading assertion, accordion content element). |
| `tests/features/*.feature` | Feature files exercising the steps against a locally DDEV-built `typo3/cms-introduction` site, desktop + mobile — see [`tests/features/README.md`](tests/features/README.md). |
| `.github/workflows/test.yml` | CI: builds a default TYPO3 site with [DDEV](https://ddev.com/), then runs the dry-run + full suite against it on every push/PR. |

## Step catalogue (summary)

| Step | Type |
| --- | --- |
| `I open the "<name>" menu item` | When |
| `I should see the "<name>" menu item` | Then |
| `I open the (content examples )mega menu` | When |
| `I open the "<name>" dropdown link` | When |
| `I should see the "<name>" dropdown link` | Then |
| `I should be viewing the "<title>" page` | Then |
| `I open the "<label>" accordion panel` | When |
| `I should see "<phrase>" in the "<label>" accordion panel` | Then |

Full details and Gherkin examples for every step are documented inline in
[`tests/step-definitions/typo3.steps.js`](tests/step-definitions/typo3.steps.js)
and summarized in [`tests/step-definitions/README.md`](tests/step-definitions/README.md).

## Running the tests in this repo

The CI workflow builds its own TYPO3 site with DDEV on every run (see
[`.github/workflows/test.yml`](.github/workflows/test.yml)). To run the same
suite locally:

```bash
npm install

# Build a TYPO3 v13 site with the introduction package via DDEV
mkdir .typo3-site && cd .typo3-site
ddev config --project-type=typo3 --docroot=public --php-version=8.3 --project-name=typo3-intro --auto
ddev start
ddev composer create-project "typo3/cms-base-distribution:^13" . --no-interaction
ddev typo3 setup --server-type=other --driver=mysqli --host=db --port=3306 \
  --dbname=db --username=db --password=db \
  --admin-username=admin --admin-user-password='Introduction!23' \
  --project-name="TYPO3 Introduction" --no-interaction --force
ddev composer require typo3/cms-introduction --no-interaction
# extension:setup activates the introduction package and auto-imports its
# demo content + site config — no separate import step needed.
ddev exec vendor/bin/typo3 extension:setup
ddev exec vendor/bin/typo3 cache:flush
cd ..

# Run the suite against the local DDEV site
LAUNCH_URL=https://typo3-intro.ddev.site npx cucumber-js
```

## License

MIT — see [LICENSE](LICENSE).
