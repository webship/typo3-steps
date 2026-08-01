'use strict';

// TYPO3-specific step definitions for a locally DDEV-built TYPO3 v13 site
// running the official `typo3/cms-introduction` demo content with the
// `bk2k/bootstrap_package` frontend theme.
//
// Covers: the Bootstrap 5 main navigation (top-level links, the
// "Content Examples" mega-menu dropdown and its nested links, and the
// collapsed mobile navbar), the per-page hero / element heading, and the
// Bootstrap accordion on the "Content Examples > Interactive > Accordion"
// page. Steps already covered by webship-js's generic
// click / fill / see vocabulary are not duplicated here — see README.md.
//
// All locator interactions are wrapped in a friendly try/catch so a missing
// selector reports a clear TYPO3-flavoured hint instead of a raw Playwright
// timeout stack.

const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { smartSettle } = require('webship-js/tests/step-definitions/webship');

/**
 * Run a locator action and rethrow with a short, friendly explanation on
 * failure instead of Playwright's raw timeout stack — keeps failures
 * readable when the site's markup changes.
 */
async function actOrExplain(label, target, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(`Could not ${label} "${target}": ${err.message.split('\n')[0]}`);
  }
}

/**
 * On narrow (mobile) viewports the whole navbar collapses behind the
 * Bootstrap `.navbar-toggler`. Expand it first if the nav is hidden so
 * nav links become clickable — a no-op when the nav is already open (or
 * at desktop widths where the toggler is hidden).
 */
async function ensureNavExpanded(page) {
  const nav = page.locator('#mainnavigation').first();
  if (await nav.isVisible().catch(() => false)) return;
  const toggler = page.locator('.navbar-toggler').first();
  if (await toggler.isVisible().catch(() => false)) {
    await toggler.click({ force: true }).catch(() => {});
    await nav.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await smartSettle(page, 500);
  }
}

// ---------------------------------------------------------------------------
// Main navigation — top-level links
// ---------------------------------------------------------------------------

/**
 * Click a top-level main navigation link (`.nav-link-main`) by its visible
 * text — e.g. Home, Features, Customize, Pages, Content Examples. On a
 * mobile viewport the collapsed navbar is expanded first.
 *
 * Example #1: When I open the "Features" menu item
 * Example #2: When I open the "Customize" menu item
 * Example #3: When we open the "Pages" menu item
 * Example #4: And I open the "Content Examples" menu item
 * Example #5: When I open the "Home" menu item
 *
 */
When(/^(I |we )*open the "([^"]*)?" menu item$/, async function (pronounCase, name) {
  const page = this.page;
  await ensureNavExpanded(page);
  const link = page
    .locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: name })
    .first();
  await actOrExplain('open menu item', name, async () => {
    await link.waitFor({ state: 'visible', timeout: 10000 });
    await link.click();
  });
  await smartSettle(page, 1000);
});

/**
 * Assert a top-level main navigation link with the given text is (or is
 * not) present in the main navigation. On a mobile viewport the collapsed
 * navbar is expanded first so its links are rendered.
 *
 * Example #1: Then I should see the "Features" menu item
 * Example #2: And I should see the "Content Examples" menu item
 * Example #3: Then we should see the "Pages" menu item
 * Example #4: And I should not see the "Checkout" menu item
 * Example #5: Then should see the "Customize" menu item
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" menu item$/, async function (pronounCase, notCase, name) {
  await ensureNavExpanded(this.page);
  const count = await this.page
    .locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: name })
    .count();
  if (notCase) {
    assert.ok(count === 0, `Expected no "${name}" menu item, but found ${count}.`);
  } else {
    assert.ok(count > 0, `Expected a "${name}" menu item, but found none.`);
  }
});

// ---------------------------------------------------------------------------
// Main navigation — "Content Examples" mega-menu dropdown
// ---------------------------------------------------------------------------

/**
 * Open the "Content Examples" mega-menu dropdown by clicking its Bootstrap
 * toggle button (`.nav-link-toggle[data-bs-toggle="dropdown"]`). The
 * dropdown is JS-driven (Bootstrap 5), not hover/CSS-only, so an explicit
 * click is required before its nested links can be reached. On a mobile
 * viewport the collapsed navbar is expanded first.
 *
 * Example #1: When I open the mega menu
 * Example #2: When we open the mega menu
 * Example #3: And I open the mega menu
 * Example #4: When I open the content examples mega menu
 * Example #5: And we open the mega menu
 *
 */
When(/^(I |we )*open the (content examples )*mega menu$/, async function (pronounCase, contentCase) {
  const page = this.page;
  await ensureNavExpanded(page);
  const toggle = page.locator('#mainnavigation .nav-style-mega .nav-link-toggle').first();
  await actOrExplain('open mega menu', 'Content Examples', async () => {
    await toggle.waitFor({ state: 'visible', timeout: 10000 });
    await toggle.click();
  });
  await smartSettle(page, 500);
});

/**
 * Click a nested link inside the open "Content Examples" mega-menu dropdown
 * (`.dropdown-menu-mega a.nav-link-dropdown`) by its visible text — e.g.
 * Quote, Accordion, Gallery, Table. Open the mega menu first with
 * "I open the mega menu".
 *
 * Example #1: When I open the "Accordion" dropdown link
 * Example #2: When I open the "Quote" dropdown link
 * Example #3: When we open the "Gallery" dropdown link
 * Example #4: And I open the "Table" dropdown link
 * Example #5: When I open the "Carousel" dropdown link
 *
 */
When(/^(I |we )*open the "([^"]*)?" dropdown link$/, async function (pronounCase, name) {
  const page = this.page;
  const link = page
    .locator('.dropdown-menu-mega a.nav-link-dropdown', { hasText: name })
    .first();
  await actOrExplain('open dropdown link', name, async () => {
    await link.waitFor({ state: 'visible', timeout: 10000 });
    await link.click();
  });
  await smartSettle(page, 1000);
});

/**
 * Assert a nested link with the given text is (or is not) present in the
 * open "Content Examples" mega-menu dropdown. Open the mega menu first.
 *
 * Example #1: Then I should see the "Accordion" dropdown link
 * Example #2: And I should see the "Quote" dropdown link
 * Example #3: Then we should see the "Gallery" dropdown link
 * Example #4: And I should not see the "Recipes" dropdown link
 * Example #5: Then should see the "Table" dropdown link
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" dropdown link$/, async function (pronounCase, notCase, name) {
  const count = await this.page
    .locator('.dropdown-menu-mega a.nav-link-dropdown', { hasText: name })
    .count();
  if (notCase) {
    assert.ok(count === 0, `Expected no "${name}" dropdown link, but found ${count}.`);
  } else {
    assert.ok(count > 0, `Expected a "${name}" dropdown link, but found none.`);
  }
});

// ---------------------------------------------------------------------------
// Page heading
// ---------------------------------------------------------------------------

/**
 * Assert the current page's main heading equals or includes the given
 * title. Landing-style pages render their heading in the `h1.carousel-header`
 * hero; content-example detail pages (e.g. Accordion, Quote) render it in
 * `h1.element-header`. Whichever is present first is read.
 *
 * Example #1: Then I should be viewing the "Accordions" page
 * Example #2: And I should be viewing the "Quote" page
 * Example #3: Then we should be viewing the "Page Layouts" page
 * Example #4: Then I should be viewing the "Incredible flexible" page
 * Example #5: And should be viewing the "Content Management Made Easy" page
 *
 */
Then(/^(I |we )*should be viewing the "([^"]*)?" page$/, async function (pronounCase, title) {
  const heading = this.page.locator('h1.carousel-header, h1.element-header, main h1, h1').first();
  const text = (await actOrExplain('read the page heading for', title, () => heading.innerText())).trim();
  assert.ok(text.includes(title), `Expected the page heading to include "${title}", but it was "${text}".`);
});

// ---------------------------------------------------------------------------
// Bootstrap accordion (Content Examples > Interactive > Accordion)
// ---------------------------------------------------------------------------

/**
 * Expand a Bootstrap accordion panel (`.accordion-item`) by clicking its
 * header button (`.accordion-button`) matching the given label. The button
 * toggles the associated `.accordion-collapse`, revealing its body.
 *
 * Example #1: When I open the "Media Left" accordion panel
 * Example #2: When I open the "Media Right" accordion panel
 * Example #3: When we open the "Media Top" accordion panel
 * Example #4: And I open the "No Media" accordion panel
 * Example #5: When I open the "Media Bottom" accordion panel
 *
 */
When(/^(I |we )*open the "([^"]*)?" accordion panel$/, async function (pronounCase, label) {
  const button = this.page
    .locator('.accordion-item .accordion-button', { hasText: label })
    .first();
  await actOrExplain('open accordion panel', label, async () => {
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
  });
  await smartSettle(this.page, 1000);
});

/**
 * Assert the body of the accordion panel with the given label is visible
 * and contains the given phrase. Locates the panel via its header button,
 * then reads the `.accordion-body` inside its `.accordion-item`. Open the
 * panel first with "I open the ... accordion panel".
 *
 * Example #1: Then I should see "short video" in the "Media Left" accordion panel
 * Example #2: And I should see "meanest place" in the "Media Right" accordion panel
 * Example #3: Then we should see "Lorem ipsum" in the "No Media" accordion panel
 * Example #4: Then I should see "larger version" in the "Media Top" accordion panel
 * Example #5: And should see "TYPO3" in the "Media Left" accordion panel
 *
 */
Then(/^(I |we )*should see "([^"]*)?" in the "([^"]*)?" accordion panel$/, async function (pronounCase, phrase, label) {
  const item = this.page
    .locator('.accordion-item', { has: this.page.locator('.accordion-button', { hasText: label }) })
    .first();
  const body = item.locator('.accordion-body').first();
  await actOrExplain('read the accordion panel', label, () =>
    body.waitFor({ state: 'visible', timeout: 10000 })
  );
  const text = (await body.innerText()).trim();
  assert.ok(
    text.includes(phrase),
    `Expected the "${label}" accordion panel to include "${phrase}", but it was "${text}".`
  );
});
