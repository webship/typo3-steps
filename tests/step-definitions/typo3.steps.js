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
// The selectors are the theme's: `#mainnavigation`, `.nav-link-main`,
// `.nav-style-mega` / `.dropdown-menu-mega`, `h1.carousel-header` /
// `h1.element-header` and the Bootstrap `.accordion-item` markup. A site on
// another theme needs its own selectors (see README.md).
//
// Every assertion waits on its locator (the assertion is the wait), and
// every failure is a friendly error with a hint instead of a raw Playwright
// timeout stack.

const { When, Then } = require('@cucumber/cucumber');
const { smartSettle, friendly } = require('webship-js/tests/step-definitions/webship');

const NAV_HINT = 'The steps expect the bootstrap_package main navigation (`#mainnavigation a.nav-link-main`); check the visible text, or the theme markup if the site uses another theme.';
const MEGA_HINT = 'The mega-menu links (`.dropdown-menu-mega a.nav-link-dropdown`) only render after "I open the mega menu"; check that step ran and the link text.';
const ACCORDION_HINT = 'The accordion is the Bootstrap `.accordion-item` / `.accordion-button` markup of the bootstrap_package theme; check the panel label and that the page has an accordion element.';

/** The per-assertion wait budget: `minWaitTime.page` from cucumber.js, else 10 s. */
function budget(world) {
  return Math.max((world.minWaitTime && world.minWaitTime.page) || 0, 10000);
}

/** Escape a literal string for use inside a RegExp (case-sensitive text match). */
function literal(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/**
 * Run a locator action and rethrow as a friendly error (action, target,
 * cause and a hint) instead of Playwright's raw timeout stack — keeps
 * failures readable when the site's markup changes.
 */
async function actOrExplain(label, target, fn, hint = NAV_HINT) {
  try {
    return await fn();
  } catch (err) {
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/**
 * Wait until `locator` has (or, with `notCase`, has no) visible match, then
 * throw a friendly error otherwise: the wait and the assertion are one call.
 */
async function assertPresence(locator, notCase, { label, hint, timeout }) {
  try {
    await locator.first().waitFor({ state: notCase ? 'hidden' : 'visible', timeout });
  } catch {
    throw friendly({
      message: notCase ? `Expected no ${label}, but one is still on the page.` : `Expected ${label}, but none appeared within ${timeout} ms.`,
      hint,
    });
  }
}

/**
 * On narrow (mobile) viewports the whole navbar collapses behind the
 * Bootstrap `.navbar-toggler`. Expand it first if the nav is hidden so
 * nav links become clickable — a no-op when the nav is already open (or
 * at desktop widths where the toggler is hidden).
 */
async function ensureNavExpanded(world) {
  const page = world.page;
  const nav = page.locator('#mainnavigation').first();
  if (await nav.isVisible().catch(() => false)) return;
  const toggler = page.locator('.navbar-toggler').first();
  if (!(await toggler.isVisible().catch(() => false))) return;
  await actOrExplain('expand', 'the collapsed main navigation', async () => {
    await toggler.click();
    await nav.waitFor({ state: 'visible', timeout: budget(world) });
  }, 'The `.navbar-toggler` was visible but clicking it did not reveal `#mainnavigation`; an overlay may cover it, or the theme markup changed.');
  await smartSettle(page, 500);
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
 * Example #5: When open the "Home" menu item
 *
 */
When(/^(I |we )*open the "([^"]*)?" menu item$/, async function (pronounCase, name) {
  const page = this.page;
  await ensureNavExpanded(this);
  const link = page
    .locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: name })
    .first();
  await actOrExplain('open menu item', name, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
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
  await ensureNavExpanded(this);
  await assertPresence(this.page.locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: name }), notCase, {
    label: `a "${name}" menu item`,
    hint: NAV_HINT,
    timeout: budget(this),
  });
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
  await ensureNavExpanded(this);
  const toggle = page.locator('#mainnavigation .nav-style-mega .nav-link-toggle').first();
  await actOrExplain('open mega menu', 'Content Examples', async () => {
    await toggle.waitFor({ state: 'visible', timeout: budget(this) });
    await toggle.click();
  }, 'The mega menu is the `.nav-style-mega` item of the bootstrap_package navigation with a `.nav-link-toggle` button; the site needs a page with a mega-menu dropdown in its main navigation.');
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
 * Example #5: When open the "Carousel" dropdown link
 *
 */
When(/^(I |we )*open the "([^"]*)?" dropdown link$/, async function (pronounCase, name) {
  const page = this.page;
  const link = page
    .locator('.dropdown-menu-mega a.nav-link-dropdown', { hasText: name })
    .first();
  await actOrExplain('open dropdown link', name, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
    await link.click();
  }, MEGA_HINT);
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
  await assertPresence(this.page.locator('.dropdown-menu-mega a.nav-link-dropdown', { hasText: name }), notCase, {
    label: `a "${name}" dropdown link`,
    hint: MEGA_HINT,
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Page heading
// ---------------------------------------------------------------------------

/**
 * Assert the current page's main heading does (or does not) include the
 * given title. Landing-style pages render their heading in the
 * `h1.carousel-header` hero; content-example detail pages (e.g. Accordion,
 * Quote) render it in `h1.element-header`. Whichever is present first is
 * the heading that is checked.
 *
 * Example #1: Then I should be viewing the "Accordions" page
 * Example #2: And I should be viewing the "Quote" page
 * Example #3: Then we should be viewing the "Page Layouts" page
 * Example #4: Then I should not be viewing the "Checkout" page
 * Example #5: And should be viewing the "Content Management Made Easy" page
 *
 */
Then(/^(I |we )*should( not)* be viewing the "([^"]*)?" page$/, async function (pronounCase, notCase, title) {
  const headings = this.page.locator('h1.carousel-header, h1.element-header, main h1, h1');
  const timeout = budget(this);
  try {
    await headings.first().filter({ hasText: literal(title) }).waitFor({ state: notCase ? 'hidden' : 'visible', timeout });
  } catch {
    const text = (await headings.first().innerText().catch(() => '')).trim();
    throw friendly({
      message: notCase
        ? `Expected the page heading not to include "${title}", but it does ("${text}").`
        : `Expected the page heading to include "${title}", but it was "${text || '(no h1 found)'}".`,
      hint: 'The heading is the page `h1` (`h1.carousel-header` on a landing page, `h1.element-header` on a content-example page); the match is case-sensitive.',
    });
  }
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
 * Example #5: When open the "Media Bottom" accordion panel
 *
 */
When(/^(I |we )*open the "([^"]*)?" accordion panel$/, async function (pronounCase, label) {
  const button = this.page
    .locator('.accordion-item .accordion-button', { hasText: label })
    .first();
  await actOrExplain('open accordion panel', label, async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click();
  }, ACCORDION_HINT);
  await smartSettle(this.page, 1000);
});

/**
 * Assert the body of the accordion panel with the given label is visible
 * and does (or does not) contain the given phrase. Locates the panel via
 * its header button, then waits on the `.accordion-body` inside its
 * `.accordion-item`. Open the panel first with "I open the ... accordion
 * panel".
 *
 * Example #1: Then I should see "short video" in the "Media Left" accordion panel
 * Example #2: And I should see "meanest place" in the "Media Right" accordion panel
 * Example #3: Then we should see "Lorem ipsum" in the "No Media" accordion panel
 * Example #4: Then I should not see "larger version" in the "Media Top" accordion panel
 * Example #5: And should see "TYPO3" in the "Media Left" accordion panel
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" in the "([^"]*)?" accordion panel$/, async function (pronounCase, notCase, phrase, label) {
  const item = this.page
    .locator('.accordion-item', { has: this.page.locator('.accordion-button', { hasText: label }) })
    .first();
  const body = item.locator('.accordion-body').first();
  const timeout = budget(this);
  await actOrExplain('find the accordion panel', label, () => body.waitFor({ state: 'visible', timeout }), ACCORDION_HINT + ' Open the panel first with "I open the ... accordion panel".');
  try {
    await body.filter({ hasText: literal(phrase) }).waitFor({ state: notCase ? 'hidden' : 'visible', timeout });
  } catch {
    const text = (await body.innerText().catch(() => '')).trim();
    throw friendly({
      message: notCase
        ? `Expected the "${label}" accordion panel not to include "${phrase}", but it does.`
        : `Expected the "${label}" accordion panel to include "${phrase}", but it was "${text}".`,
      hint: 'The phrase is matched case-sensitively against the panel body (`.accordion-body`); check the wording on the page.',
    });
  }
});
