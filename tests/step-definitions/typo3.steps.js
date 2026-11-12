'use strict';

// Front-end step definitions for a TYPO3 site on the Bootstrap Package theme
// (`bk2k/bootstrap-package`), proven against TYPO3 13 LTS with the official
// Introduction package (`typo3/cms-introduction`).
//
// Covers: the main navigation (top-level links, simple dropdowns, the mega
// menu, the collapsed mobile navbar, the current and active items), the
// subnavigation, the breadcrumb, the language menu, the page heading,
// content elements by type and by header, the accordion, the Indexed Search
// form and its results, forms of the form framework with their validation,
// the "page not found" answer and the generator. Steps that webship-js
// already has (click, fill in, see, the page language, the accessibility
// audit) are not repeated here; see README.md.
//
// The selectors are the theme's and TYPO3's own: `#mainnavigation`,
// `.nav-link-main`, `.dropdown-menu`, `.subnav-nav`, `ol.breadcrumb`,
// `#language_menu`, `.frame.frame-type-<CType>`, `.element-header`,
// `.accordion-item`, `.tx-indexedsearch-*`, `form[id^="<identifier>"]` and
// `.invalid-feedback`. A site on another theme needs its own selectors for
// the navigation steps; the content element, search and form steps follow
// markup TYPO3 itself renders.
//
// Every assertion waits on its locator (the assertion is the wait), and
// every failure is a friendly error with a hint, not a raw Playwright
// timeout stack.

const { When, Then } = require('@cucumber/cucumber');
const {
  supplied,
  budget,
  literal,
  exactLabel,
  actOrExplain,
  assertPresence,
  assertText,
  smartSettle,
  friendly,
} = require('./typo3-helpers');

const NAV_HINT = 'The steps expect the Bootstrap Package main navigation (`#mainnavigation a.nav-link-main`); the label is matched as a whole, so check the visible text, or the theme markup if the site uses another theme.';
const MEGA_HINT = 'The dropdown links (`#mainnavigation .dropdown-menu a.nav-link-dropdown`) are only visible after "I open the mega menu" or "I open the dropdown of the ... menu item"; check that step ran and the link text.';
const ACCORDION_HINT = 'The accordion is the Bootstrap `.accordion-item` / `.accordion-button` markup of the Bootstrap Package theme; check the panel label and that the page has an accordion element.';
const SUBNAV_HINT = 'The subnavigation is the `.subnav-nav a.subnav-link` list a page with a subnavigation layout renders beside its content; check the label and the page layout.';
const BREADCRUMB_HINT = 'The breadcrumb is the `ol.breadcrumb` of the Bootstrap Package theme; the start page does not render one.';
const LANGUAGE_HINT = 'The language menu is `#language_menu` (`ul.language-menu`) in the footer; a language is only a link when the current page is translated into it, otherwise it is plain text.';
const FRAME_HINT = 'Every content element is wrapped in `div.frame.frame-type-<CType>` (for example `frame-type-text`, `frame-type-textpic`, `frame-type-form_formframework`); the type is the value of the "Type" field (CType) of the element.';
const SEARCH_HINT = 'The search is the Indexed Search content element (`.tx-indexedsearch-searchbox`); a page is added to the index the first time it is rendered for a visitor, so open the pages a scenario searches for first.';
const FORM_HINT = 'A form of the form framework is `form[id^="<identifier>"]` (the identifier of the form definition plus the content element id); a failed field carries `.is-invalid` or `.has-error` and its message is `.invalid-feedback` (`.help-block` / `.error` on older themes).';

/**
 * On a narrow (mobile) viewport the whole navbar collapses behind the
 * Bootstrap `.navbar-toggler`. Expand it first when the navigation is
 * hidden, so its links can be clicked. Does nothing when the navigation is
 * already open, or at desktop widths where the toggler is hidden.
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
// Main navigation: top-level links
// ---------------------------------------------------------------------------

/**
 * Click a top-level main navigation link (`.nav-link-main`) by its visible
 * text, for example Home, Features, Customize, Pages or Content Examples.
 * The label is matched as a whole. On a mobile viewport the collapsed
 * navbar is expanded first.
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
    .locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: exactLabel(name) })
    .first();
  await actOrExplain('open menu item', name, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
    await link.click();
  }, NAV_HINT);
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
  await assertPresence(this.page.locator('#mainnavigation a.nav-link-main .nav-link-text', { hasText: exactLabel(name) }), notCase, {
    label: `a "${name}" menu item`,
    hint: NAV_HINT,
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Main navigation: the mega menu
// ---------------------------------------------------------------------------

/**
 * Open the mega menu of the main navigation ("Content Examples" on the
 * Introduction site) by clicking its toggle button (`.nav-style-mega
 * .nav-link-toggle`). Bootstrap opens the dropdown on a click, not on
 * hover, so the click is needed before the nested links can be reached. On
 * a mobile viewport the collapsed navbar is expanded first.
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
  }, 'The mega menu is the `.nav-style-mega` item of the Bootstrap Package navigation with a `.nav-link-toggle` button; the site needs a page with a mega menu in its main navigation.');
  await smartSettle(page, 500);
});

/**
 * Click a nested link inside an open dropdown of the main navigation
 * (`#mainnavigation .dropdown-menu a.nav-link-dropdown`) by its visible
 * text, for example Quote, Accordion, Gallery or Table. Open the dropdown
 * first with "I open the mega menu" or "I open the dropdown of the ... menu
 * item".
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
    .locator('#mainnavigation .dropdown-menu a.nav-link-dropdown .nav-link-text', { hasText: exactLabel(name) })
    .first();
  await actOrExplain('open dropdown link', name, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
    await link.click();
  }, MEGA_HINT);
  await smartSettle(page, 1000);
});

/**
 * Assert a nested link with the given text is (or is not) visible in an
 * open dropdown of the main navigation. Open the dropdown first.
 *
 * Example #1: Then I should see the "Accordion" dropdown link
 * Example #2: And I should see the "Quote" dropdown link
 * Example #3: Then we should see the "Gallery" dropdown link
 * Example #4: And I should not see the "Recipes" dropdown link
 * Example #5: Then should see the "Table" dropdown link
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" dropdown link$/, async function (pronounCase, notCase, name) {
  await assertPresence(this.page.locator('#mainnavigation .dropdown-menu a.nav-link-dropdown .nav-link-text', { hasText: exactLabel(name) }), notCase, {
    label: `a "${name}" dropdown link`,
    hint: MEGA_HINT,
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Page heading
// ---------------------------------------------------------------------------

/**
 * Assert the page being viewed is (or is not) the one with the given
 * title. A landing page renders its heading in the `h1.carousel-header`
 * hero (one per slide) and a content page in `h1.element-header`; any `h1`
 * of the page may carry the title. A page whose content starts at `h2` has
 * no `h1`, and the document title is read instead.
 *
 * Example #1: Then I should be viewing the "Accordions" page
 * Example #2: And I should be viewing the "Quote" page
 * Example #3: Then we should be viewing the "Page Layouts" page
 * Example #4: Then I should not be viewing the "Checkout" page
 * Example #5: And should be viewing the "Content Management Made Easy" page
 *
 */
Then(/^(I |we )*should( not)* be viewing the "([^"]*)?" page$/, async function (pronounCase, notCase, title) {
  const page = this.page;
  const headings = page.locator('h1');
  const deadline = Date.now() + budget(this);
  const read = async () => {
    const h1 = (await headings.allInnerTexts().catch(() => [])).map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const pageTitle = await page.title().catch(() => '');
    // A page whose content starts at h2 has no h1: its name is the first part of the document title.
    const texts = h1.length ? h1 : [pageTitle];
    return { h1, pageTitle, match: texts.some((t) => t.includes(title)) };
  };
  let state = await read();
  while ((notCase ? state.match : !state.match) && Date.now() < deadline) {
    await smartSettle(page, 250);
    state = await read();
  }
  if (notCase ? state.match : !state.match) {
    const seen = state.h1.length ? `the heading was "${state.h1.join('" / "')}"` : `the page has no h1 and its title was "${state.pageTitle}"`;
    throw friendly({
      message: notCase
        ? `Expected not to be viewing the "${title}" page, but ${seen}.`
        : `Expected to be viewing the "${title}" page, but ${seen}.`,
      hint: 'The step reads the page `h1` (`h1.carousel-header` on a landing page, `h1.element-header` on a content page) and, on a page without an h1, the document title; the match is case-sensitive.',
    });
  }
});

// ---------------------------------------------------------------------------
// Bootstrap accordion (Content Examples > Interactive > Accordion)
// ---------------------------------------------------------------------------

/** The header button of the accordion panel with the given label. */
function accordionButton(page, label) {
  return page.locator('.accordion-item .accordion-button', { hasText: exactLabel(label) }).first();
}

/**
 * Open or close an accordion panel (`.accordion-item`) through its header
 * button (`.accordion-button`). The button is a toggle, so it is clicked
 * only when the panel is not yet in the wanted state (`aria-expanded`), and
 * the step waits until Bootstrap has finished the transition.
 *
 * Example #1: When I open the "Media Left" accordion panel
 * Example #2: When I open the "Media Right" accordion panel
 * Example #3: When we open the "Media Top" accordion panel
 * Example #4: And I close the "No Media" accordion panel
 * Example #5: When close the "Media Bottom" accordion panel
 *
 */
When(/^(I |we )*(open|close) the "([^"]*)?" accordion panel$/, async function (pronounCase, action, label) {
  const button = accordionButton(this.page, label);
  const wanted = action === 'open' ? 'true' : 'false';
  await actOrExplain(`${action} accordion panel`, label, async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    if ((await button.getAttribute('aria-expanded')) !== wanted) await button.click();
    const item = this.page.locator('.accordion-item', { has: this.page.locator('.accordion-button', { hasText: exactLabel(label) }) }).first();
    await item.locator(`.accordion-button[aria-expanded="${wanted}"]`).first().waitFor({ state: 'visible', timeout: budget(this) });
    await item.locator('.accordion-collapse.collapsing').first().waitFor({ state: 'detached', timeout: budget(this) }).catch(() => {});
  }, ACCORDION_HINT);
  await smartSettle(this.page, 500);
});

/**
 * Assert an accordion panel is (or is not) open: its header button carries
 * `aria-expanded="true"` and its body is visible.
 *
 * Example #1: Then the "Media Left" accordion panel should be open
 * Example #2: And the "Media Right" accordion panel should not be open
 * Example #3: Then the "No Media" accordion panel should be open
 * Example #4: And the "Media Top" accordion panel should not be open
 * Example #5: Then the "Media Bottom" accordion panel should not be open
 *
 */
Then(/^the "([^"]*)?" accordion panel should( not)* be open$/, async function (label, notCase) {
  const button = accordionButton(this.page, label);
  await assertPresence(button, undefined, { label: `an accordion panel labelled "${label}"`, hint: ACCORDION_HINT, timeout: budget(this) });
  const wanted = notCase ? 'false' : 'true';
  const deadline = Date.now() + budget(this);
  let state = await button.getAttribute('aria-expanded');
  while (state !== wanted && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    state = await button.getAttribute('aria-expanded');
  }
  if (state !== wanted) {
    throw friendly({
      message: notCase ? `Expected the "${label}" accordion panel to be closed, but it is open.` : `Expected the "${label}" accordion panel to be open, but it is closed.`,
      hint: ACCORDION_HINT,
    });
  }
});

/**
 * Assert the body of the accordion panel with the given label is visible
 * and does (or does not) contain the given phrase. The panel is found by
 * its header button and the phrase is read from the `.accordion-body` of
 * its `.accordion-item`. Open the panel first with "I open the ...
 * accordion panel".
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
    .locator('.accordion-item', { has: this.page.locator('.accordion-button', { hasText: exactLabel(label) }) })
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

// ---------------------------------------------------------------------------
// Main navigation: dropdowns and the current item
// ---------------------------------------------------------------------------

/**
 * Open the dropdown of a top-level main navigation item by clicking its
 * toggle button (`.nav-link-toggle`), whether the item is a simple dropdown
 * (`.nav-style-simple`, "Pages" on the Introduction site) or a mega menu
 * (`.nav-style-mega`, "Content Examples"). On a mobile viewport the
 * collapsed navbar is expanded first.
 *
 * Example #1: When I open the dropdown of the "Pages" menu item
 * Example #2: When I open the dropdown of the "Content Examples" menu item
 * Example #3: When we open the dropdown of the "Pages" menu item
 * Example #4: And I open the dropdown of the "Products" menu item
 * Example #5: When open the dropdown of the "Pages" menu item
 *
 */
When(/^(I |we )*open the dropdown of the "([^"]*)?" menu item$/, async function (pronounCase, name) {
  const page = this.page;
  await ensureNavExpanded(this);
  const item = page
    .locator('#mainnavigation .nav-item', { has: page.locator('a.nav-link-main .nav-link-text', { hasText: exactLabel(name) }) })
    .first();
  const toggle = item.locator('.nav-link-toggle').first();
  await actOrExplain('open the dropdown of menu item', name, async () => {
    await toggle.waitFor({ state: 'visible', timeout: budget(this) });
    await toggle.click();
    await item.locator('.dropdown-menu').first().waitFor({ state: 'visible', timeout: budget(this) });
  }, 'Only a main navigation item with subpages has a dropdown (`.nav-item` with a `.nav-link-toggle` button and a `.dropdown-menu`); check the label and that the page has subpages shown in menus.');
  await smartSettle(page, 500);
});

/**
 * Assert the state of a top-level main navigation item. "current" is the
 * link of the page being viewed, which the theme marks with
 * `aria-current="true"`. "active" is every link on the path to that page,
 * which carries the `active` class: the page itself, its top-level ancestor
 * and the start page.
 *
 * Example #1: Then the "Features" menu item should be current
 * Example #2: And the "Customize" menu item should not be current
 * Example #3: Then the "Pages" menu item should be active
 * Example #4: And the "Customize" menu item should not be active
 * Example #5: Then the "Content Examples" menu item should be active
 *
 */
Then(/^the "([^"]*)?" menu item should( not)* be (current|active)$/, async function (name, notCase, state) {
  await ensureNavExpanded(this);
  const link = this.page
    .locator('#mainnavigation a.nav-link-main', { has: this.page.locator('.nav-link-text', { hasText: exactLabel(name) }) })
    .first();
  await assertPresence(link, undefined, { label: `a "${name}" menu item`, hint: NAV_HINT, timeout: budget(this) });
  const is = state === 'current'
    ? (await link.getAttribute('aria-current')) === 'true'
    : await link.evaluate((el) => el.classList.contains('active'));
  if (notCase ? is : !is) {
    throw friendly({
      message: notCase
        ? `Expected the "${name}" menu item not to be ${state}, but it is.`
        : `Expected the "${name}" menu item to be ${state}, but it is not.`,
      hint: 'A "current" item has `aria-current="true"` (the page being viewed); an "active" item has the `active` class (every item on the path to the page, the start page included).',
    });
  }
});

// ---------------------------------------------------------------------------
// Subnavigation
// ---------------------------------------------------------------------------

/**
 * Click a link of the subnavigation (`.subnav-nav a.subnav-link`) a page
 * with a subnavigation layout renders beside its content.
 *
 * Example #1: When I open the "Login" subnavigation item
 * Example #2: When I open the "Search" subnavigation item
 * Example #3: When we open the "Forms" subnavigation item
 * Example #4: And I open the "Media" subnavigation item
 * Example #5: When open the "Text" subnavigation item
 *
 */
When(/^(I |we )*open the "([^"]*)?" subnavigation item$/, async function (pronounCase, name) {
  const link = this.page.locator('.subnav-nav a.subnav-link', { has: this.page.locator('.subnav-link-text', { hasText: exactLabel(name) }) }).first();
  await actOrExplain('open subnavigation item', name, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
    await link.click();
  }, SUBNAV_HINT);
  await smartSettle(this.page, 1000);
});

/**
 * Assert a subnavigation link with the given label is (or is not) shown.
 *
 * Example #1: Then I should see the "Forms" subnavigation item
 * Example #2: And I should see the "Search" subnavigation item
 * Example #3: Then we should see the "Login" subnavigation item
 * Example #4: And I should not see the "Checkout" subnavigation item
 * Example #5: Then should see the "Media" subnavigation item
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" subnavigation item$/, async function (pronounCase, notCase, name) {
  await assertPresence(this.page.locator('.subnav-nav a.subnav-link .subnav-link-text', { hasText: exactLabel(name) }), notCase, {
    label: `a "${name}" subnavigation item`,
    hint: SUBNAV_HINT,
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/**
 * Assert the breadcrumb (`ol.breadcrumb`) is (or is not) shown. The start
 * page of the Introduction site does not render one.
 *
 * Example #1: Then I should see the breadcrumb
 * Example #2: Then I should not see the breadcrumb
 * Example #3: And we should see the breadcrumb
 * Example #4: Then I should see the breadcrumb trail
 * Example #5: And I should not see the breadcrumbs
 *
 */
Then(/^(I |we )*should( not)* see the breadcrumbs?(?: trail)?$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('ol.breadcrumb, .breadcrumb'), notCase, {
    label: 'a breadcrumb',
    hint: BREADCRUMB_HINT,
    timeout: budget(this),
  });
});

/**
 * Assert the breadcrumb does (or does not) contain an item with the given
 * label. Each item is a `.breadcrumb-item`; the label is matched as a whole.
 *
 * Example #1: Then the breadcrumb should contain "Content Examples"
 * Example #2: And the breadcrumb should not contain "Checkout"
 * Example #3: Then "Congratulations" should be in the breadcrumb
 * Example #4: And "Checkout" should not be in the breadcrumb
 * Example #5: Then the breadcrumbs should contain "Languages and characters"
 *
 */
Then(/^(?:"([^"]*)" should( not)* be in the breadcrumbs?|(?:the )?breadcrumbs? should( not)* contain "([^"]*)")$/, async function (textA, notA, notB, textB) {
  const label = supplied(textA) ? textA : textB;
  const notCase = notA || notB;
  await assertPresence(this.page.locator('.breadcrumb .breadcrumb-item', { hasText: exactLabel(label) }), notCase, {
    label: `a "${label}" breadcrumb item`,
    hint: BREADCRUMB_HINT,
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

/**
 * The entry of the language menu for a language, by its label ("Deutsch"),
 * its title ("German") or its hreflang ("de-DE").
 */
function languageItem(page, language) {
  const byLabel = page.locator('#language_menu li, ul.language-menu li', { hasText: exactLabel(language) });
  const byLink = page.locator('#language_menu li, ul.language-menu li', {
    has: page.locator(`a[hreflang="${language}" i], a[title="${language}" i]`),
  });
  return byLabel.or(byLink).first();
}

/**
 * Switch the page to another language through the language menu
 * (`#language_menu`). The language is named by its label in the menu
 * ("Deutsch"), its title ("German") or its hreflang ("de-DE"). A language
 * the current page is not translated into is plain text, not a link, and
 * the step says so.
 *
 * Example #1: When I switch to the "Deutsch" language
 * Example #2: When I switch to the "Dansk" language
 * Example #3: When we switch to the "English" language
 * Example #4: And I switch to the "de-DE" language
 * Example #5: When switch to the "German" language
 *
 */
When(/^(I |we )*switch to the "([^"]*)?" language$/, async function (pronounCase, language) {
  const item = languageItem(this.page, language);
  await assertPresence(item, undefined, { label: `a "${language}" entry in the language menu`, hint: LANGUAGE_HINT, timeout: budget(this) });
  const link = item.locator('a').first();
  if (!(await link.count())) {
    throw friendly({
      message: `The "${language}" language is listed but is not a link on this page.`,
      hint: 'The current page has no translation in that language (the entry carries the `inactive` class). Open a translated page first, or translate the page.',
    });
  }
  await actOrExplain('switch to the language', language, () => link.click(), LANGUAGE_HINT);
  await smartSettle(this.page, 1000);
});

/**
 * Assert a language of the language menu is (or is not) available for the
 * current page: available means its entry is a link to the translation.
 *
 * Example #1: Then the "Deutsch" language should be available
 * Example #2: And the "Dansk" language should be available
 * Example #3: Then the "Deutsch" language should not be available
 * Example #4: And the "de-DE" language should be available
 * Example #5: Then the "English" language should be available
 *
 */
Then(/^the "([^"]*)?" language should( not)* be available$/, async function (language, notCase) {
  const item = languageItem(this.page, language);
  await assertPresence(item, undefined, { label: `a "${language}" entry in the language menu`, hint: LANGUAGE_HINT, timeout: budget(this) });
  const available = (await item.locator('a').count()) > 0;
  if (notCase ? available : !available) {
    throw friendly({
      message: notCase
        ? `Expected the "${language}" language not to be available on this page, but its entry links to a translation.`
        : `Expected the "${language}" language to be available on this page, but its entry is not a link.`,
      hint: LANGUAGE_HINT,
    });
  }
});

// ---------------------------------------------------------------------------
// Content elements
// ---------------------------------------------------------------------------

/**
 * Assert the page shows (or does not show) a content element of a type.
 * The type is the CType of the element, which the theme prints as
 * `frame-type-<CType>`: text, textpic, textmedia, image, bullets, table,
 * uploads, accordion, carousel, tab, form_formframework, felogin_login,
 * indexedsearch_pi2, ...
 *
 * Example #1: Then I should see a "text" content element
 * Example #2: And I should see a "form_formframework" content element
 * Example #3: Then we should see an "accordion" content element
 * Example #4: And I should not see a "felogin_login" content element
 * Example #5: Then should see a "textpic" content element
 *
 */
Then(/^(I |we )*should( not)* see an? "([^"]*)?" content element$/, async function (pronounCase, notCase, type) {
  await assertPresence(this.page.locator(`.frame.frame-type-${type}`), notCase, {
    label: `a "${type}" content element`,
    hint: FRAME_HINT,
    timeout: budget(this),
  });
});

/**
 * Assert how many content elements of a type the page shows.
 *
 * Example #1: Then I should see 3 "texticon" content elements
 * Example #2: And I should see 1 "form_formframework" content element
 * Example #3: Then we should see 2 "text" content elements
 * Example #4: And I should see 0 "felogin_login" content elements
 * Example #5: Then should see 1 "accordion" content element
 *
 */
Then(/^(I |we )*should see (\d+) "([^"]*)?" content elements?$/, async function (pronounCase, count, type) {
  const expected = parseInt(count, 10);
  const frames = this.page.locator(`.frame.frame-type-${type}`);
  const deadline = Date.now() + budget(this);
  let actual = await frames.count();
  while (actual !== expected && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    actual = await frames.count();
  }
  if (actual !== expected) {
    throw friendly({
      message: `Expected ${expected} "${type}" content element(s), but the page has ${actual}.`,
      hint: FRAME_HINT,
    });
  }
});

/**
 * Assert the content element with the given header does (or does not)
 * contain a phrase. The element is the `.frame` whose header
 * (`.element-header`) is the given text; the phrase is matched
 * case-sensitively against the whole element.
 *
 * Example #1: Then I should see "ready to use search" in the "Indexed Search" content element
 * Example #2: And I should see "Mandatory fields" in the "Contactform" content element
 * Example #3: Then we should see "contact or mail form" in the "Powerful Form Handling" content element
 * Example #4: Then I should not see "Lorem ipsum" in the "Indexed Search" content element
 * Example #5: And should see "TYPO3" in the "Indexed Search" content element
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" in the "([^"]*)?" content element$/, async function (pronounCase, notCase, phrase, header) {
  const frame = this.page.locator('.frame', { has: this.page.locator('.element-header', { hasText: exactLabel(header) }) }).first();
  await assertPresence(frame, undefined, {
    label: `a content element with the header "${header}"`,
    hint: FRAME_HINT + ' The header is matched as a whole against `.element-header`; an element with a hidden header cannot be found this way.',
    timeout: budget(this),
  });
  await assertText(frame, phrase, notCase, {
    label: `the "${header}" content element`,
    hint: 'The phrase is matched case-sensitively against the text of the content element.',
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Search (Indexed Search)
// ---------------------------------------------------------------------------

const SEARCH_RESULT = '.tx-indexedsearch-res, .frame-type-indexedsearch_pi2 article.card';
const SEARCH_EMPTY = '.tx-indexedsearch-info-noresult, .frame-type-indexedsearch_pi2 .alert-info';

/**
 * Search the site with the Indexed Search form on the current page: type
 * the words into the search field (`#tx-indexedsearch-searchbox-sword`) and
 * submit. Open the page that carries the search form first.
 *
 * Example #1: When I search the site for "TYPO3"
 * Example #2: When I search the site for "multisite"
 * Example #3: When we search the site for "content management"
 * Example #4: And I search the site for "no such word"
 * Example #5: When search the site for "TYPO3"
 *
 */
When(/^(I |we )*search the site for "([^"]*)?"$/, async function (pronounCase, words) {
  const page = this.page;
  const field = page.locator('#tx-indexedsearch-searchbox-sword, input[name="tx_indexedsearch_pi2[search][sword]"]').first();
  await actOrExplain('search the site for', words, async () => {
    await field.waitFor({ state: 'visible', timeout: budget(this) });
    await field.fill(words);
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.locator('#tx-indexedsearch-searchbox-button-submit, input[name="tx_indexedsearch_pi2[search][submitButton]"]').first().click(),
    ]);
  }, 'This page has no Indexed Search form (`#tx-indexedsearch-searchbox-sword`); open the page with the search content element first.');
  await smartSettle(page, 1000);
  await page.locator(`${SEARCH_RESULT}, ${SEARCH_EMPTY}`).first().waitFor({ state: 'visible', timeout: budget(this) }).catch(() => {});
});

/**
 * Assert the search returned results (or returned none). A result is a
 * `.tx-indexedsearch-res` block; an empty search shows
 * `.tx-indexedsearch-info-noresult` ("No results found.").
 *
 * Example #1: Then I should see search results
 * Example #2: Then I should not see search results
 * Example #3: And we should see search results
 * Example #4: Then I should see no search results
 * Example #5: And should see search results
 *
 */
Then(/^(I |we )*should( not)* see( no)* search results$/, async function (pronounCase, notCase, noCase) {
  const none = notCase || noCase;
  const results = this.page.locator(SEARCH_RESULT);
  if (none) {
    await assertPresence(this.page.locator(SEARCH_EMPTY), undefined, {
      label: 'the "no results" message of the search',
      hint: SEARCH_HINT,
      timeout: budget(this),
    });
    const count = await results.count();
    if (count) throw friendly({ message: `Expected no search results, but the search returned ${count}.`, hint: SEARCH_HINT });
    return;
  }
  await assertPresence(results, undefined, { label: 'at least one search result', hint: SEARCH_HINT, timeout: budget(this) });
});

/**
 * Assert a search result with the given title is (or is not) listed. The
 * title is the linked page title of a result (`.tx-indexedsearch-title`),
 * matched as a whole.
 *
 * Example #1: Then I should see "Features" in the search results
 * Example #2: And I should see "Customize" in the search results
 * Example #3: Then we should see "Quote" in the search results
 * Example #4: And I should not see "Checkout" in the search results
 * Example #5: Then should see "Features" in the search results
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" in the search results$/, async function (pronounCase, notCase, title) {
  const hit = this.page.locator('.tx-indexedsearch-res .tx-indexedsearch-title, .frame-type-indexedsearch_pi2 article.card h4 a', { hasText: exactLabel(title) });
  await assertPresence(hit, notCase, { label: `a search result titled "${title}"`, hint: SEARCH_HINT, timeout: budget(this) });
});

// ---------------------------------------------------------------------------
// Forms (form framework)
// ---------------------------------------------------------------------------

/** The form of the form framework whose id starts with the identifier. */
function frameworkForm(page, identifier) {
  return page.locator(`form[id^="${identifier}"]`).first();
}

/** The wrapper (`.form-element` / `.form-group`) of the field with a label. */
function frameworkField(page, label) {
  const lbl = page.locator('label, legend', { hasText: new RegExp('^\\s*' + String(label).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\*?\\s*$') });
  return page.locator('.form-element, .form-group', { has: lbl }).last();
}

/**
 * Submit a form of the form framework by its identifier: the form is
 * `form[id^="<identifier>"]` and its submit button sits in the form
 * navigation (`.form-navigation`). On a multi-step form this is the "next
 * step" button until the last step.
 *
 * Example #1: When I submit the "introductionContactForm" form
 * Example #2: When we submit the "introductionContactForm" form
 * Example #3: And I submit the "contact" form
 * Example #4: When I submit the "newsletter" form
 * Example #5: When submit the "introductionContactForm" form
 *
 */
When(/^(I |we )*submit the "([^"]*)?" form$/, async function (pronounCase, identifier) {
  const page = this.page;
  const form = frameworkForm(page, identifier);
  await actOrExplain('submit the form', identifier, async () => {
    await form.waitFor({ state: 'visible', timeout: budget(this) });
    const button = form.locator('.form-navigation button[type="submit"]:not([formnovalidate]), .form-navigation [type="submit"], [type="submit"]').last();
    await Promise.all([page.waitForLoadState('domcontentloaded'), button.click()]);
  }, FORM_HINT);
  await smartSettle(page, 1000);
});

/**
 * Assert a field of a form is (or is not) marked as invalid after a failed
 * submission. The field is found by its label; the form framework marks its
 * wrapper with `.is-invalid` (Bootstrap 5 themes) or `.has-error`, and the
 * input with `aria-invalid="true"`.
 *
 * Example #1: Then the "Email" field should be marked as invalid
 * Example #2: And the "Full name and surname" field should be marked as invalid
 * Example #3: Then the "Company" field should not be marked as invalid
 * Example #4: And the "Message" field should be marked as invalid
 * Example #5: Then the "Subject" field should not be marked as invalid
 *
 */
Then(/^the "([^"]*)?" field should( not)* be marked as invalid$/, async function (label, notCase) {
  const field = frameworkField(this.page, label);
  await assertPresence(field, undefined, { label: `a form field labelled "${label}"`, hint: FORM_HINT, timeout: budget(this) });
  const invalid = await field.evaluate((el) => el.matches('.is-invalid, .has-error, .error') || !!el.querySelector('.is-invalid, .has-error, [aria-invalid="true"]'));
  if (notCase ? invalid : !invalid) {
    throw friendly({
      message: notCase
        ? `Expected the "${label}" field not to be marked as invalid, but it is.`
        : `Expected the "${label}" field to be marked as invalid, but it is not.`,
      hint: FORM_HINT,
    });
  }
});

/**
 * Assert the validation message shown (or not shown) for a field of a
 * form. The message is the `.invalid-feedback` of the field (`.help-block`
 * or `.error` on older themes), matched case-sensitively as a phrase.
 *
 * Example #1: Then I should see the error "This field is mandatory." for the "Email" field
 * Example #2: And I should see the error "You must enter a valid email address." for the "Email" field
 * Example #3: Then we should see the error "This field is mandatory." for the "Message" field
 * Example #4: And I should not see the error "This field is mandatory." for the "Company" field
 * Example #5: Then should see the error "This field is mandatory." for the "Subject" field
 *
 */
Then(/^(I |we )*should( not)* see the error "([^"]*)?" for the "([^"]*)?" field$/, async function (pronounCase, notCase, message, label) {
  const field = frameworkField(this.page, label);
  await assertPresence(field, undefined, { label: `a form field labelled "${label}"`, hint: FORM_HINT, timeout: budget(this) });
  const feedback = field.locator('.invalid-feedback, .help-block, .error, [role="alert"]', { hasText: literal(message) });
  await assertPresence(feedback, notCase, { label: `the error "${message}" for the "${label}" field`, hint: FORM_HINT, timeout: budget(this) });
});

// ---------------------------------------------------------------------------
// Error pages and the generator
// ---------------------------------------------------------------------------

/**
 * Assert the current page is (or is not) the "page not found" answer of the
 * site: the URL is requested again with the cookies of the session and must
 * answer with HTTP status 404. This holds for the built-in error page and
 * for an error page configured in the site configuration alike.
 *
 * Example #1: Then I should be on the 404 page
 * Example #2: Then I should not be on the 404 page
 * Example #3: And we should be on the 404 page
 * Example #4: Then I should be on the page not found page
 * Example #5: And I should not be on the page not found page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:404|page not found) page$/, async function (pronounCase, notCase) {
  const url = this.page.url();
  const response = await this.page.context().request.get(url, { failOnStatusCode: false });
  const status = response.status();
  const is404 = status === 404;
  if (notCase ? is404 : !is404) {
    throw friendly({
      message: notCase
        ? `Expected "${url}" not to be a "page not found" answer, but it answered with status 404.`
        : `Expected "${url}" to be a "page not found" answer, but it answered with status ${status}.`,
      hint: 'TYPO3 answers an unknown URL with status 404 through the error handling of the site configuration (Site Management > Sites > Error Handling) or its built-in error page. A status of 200 usually means an error handler that shows a page without sending the 404 status.',
    });
  }
});

/**
 * Assert the page declares (or does not declare) TYPO3 as its generator:
 * `<meta name="generator" content="TYPO3 CMS">`, which every TYPO3 front-end
 * page carries unless the site removes it.
 *
 * Example #1: Then the site should be running TYPO3
 * Example #2: And the site should be running TYPO3
 * Example #3: Then the site should not be running TYPO3
 * Example #4: But the site should not be running TYPO3
 * Example #5: Then the site should be running TYPO3 CMS
 *
 */
Then(/^the site should( not)* be running TYPO3(?: CMS)?$/, async function (notCase) {
  const content = (await this.page.locator('meta[name="generator"]').first().getAttribute('content', { timeout: 3000 }).catch(() => null)) || '';
  const is = /typo3/i.test(content);
  if (notCase ? is : !is) {
    throw friendly({
      message: notCase
        ? `Expected the page not to name TYPO3 as its generator, but the generator is "${content}".`
        : `Expected the page to name TYPO3 as its generator, but the generator was "${content || '(none)'}".`,
      hint: 'The step reads `<meta name="generator">`. A site can remove the tag, and backend pages do not carry it.',
    });
  }
});
