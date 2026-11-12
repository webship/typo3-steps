'use strict';

// Shared helpers for the TYPO3 step files.
//
// Not a step file: it registers no step definitions and no hooks. It holds
// the plumbing the step files share: the wait budget, exact and literal text
// matching, friendly errors around locator actions, presence assertions and
// site-relative navigation.
//
// Everything here builds on webship-js's own helpers (`gotoUrl`,
// `smartSettle`, `friendly`) so the steps behave like the core webship-js
// steps.

const { gotoUrl, smartSettle, friendly } = require('webship-js/tests/step-definitions/webship');

/**
 * Whether an optional step argument was actually supplied.
 *
 * @param {*} value
 * @returns {boolean}
 */
function supplied(value) {
  return value !== undefined && value !== null;
}

/**
 * The per-assertion wait budget: `minWaitTime.page` from cucumber.js, and at
 * least 10 s, kept below webship-js's step timeout so a locator that never
 * settles fails through the authored message.
 *
 * @param {object} world - The cucumber World (`this` inside a step).
 * @returns {number}
 */
function budget(world) {
  return Math.max((world && world.minWaitTime && world.minWaitTime.page) || 0, 10000);
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A case-sensitive "contains" matcher for a literal phrase. */
function literal(text) {
  return new RegExp(escapeRegExp(text));
}

/**
 * A whole-label matcher: the element's text must be the label and nothing
 * else, apart from surrounding white space and the "(current)" note the
 * theme adds for screen readers to the active item. "Home" therefore does
 * not match "Homepage".
 */
function exactLabel(text) {
  return new RegExp('^\\s*' + escapeRegExp(String(text).trim()).replace(/\s+/g, '\\s+') + '(?:\\s*\\(current\\))?\\s*$');
}

/**
 * Run a locator action and rethrow as a friendly error (action, target,
 * cause and a hint) instead of Playwright's raw timeout stack.
 */
async function actOrExplain(label, target, fn, hint) {
  try {
    return await fn();
  } catch (err) {
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/**
 * Wait until `locator` has (or, with `notCase`, has no) visible match, and
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
 * Wait until `locator` (already narrowed to one element) does (or, with
 * `notCase`, does not) contain the phrase, and report what it held otherwise.
 */
async function assertText(locator, phrase, notCase, { label, hint, timeout }) {
  try {
    await locator.filter({ hasText: literal(phrase) }).first().waitFor({ state: notCase ? 'hidden' : 'visible', timeout });
  } catch {
    const text = (await locator.first().innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
    throw friendly({
      message: notCase
        ? `Expected ${label} not to include "${phrase}", but it does.`
        : `Expected ${label} to include "${phrase}", but it was "${text || '(nothing)'}".`,
      hint,
    });
  }
}

/** Join the launch URL and a path with exactly one slash. */
function joinUrl(launchUrl, url) {
  if (!url) return launchUrl;
  if (/^https?:\/\//i.test(url)) return url;
  return String(launchUrl).replace(/\/+$/, '') + '/' + String(url).replace(/^\/+/, '');
}

/** Open a path on the site under test and wait for the page to settle. */
async function navigate(world, url) {
  await gotoUrl(world.page, joinUrl(world.launchUrl, url));
  await smartSettle(world.page, 1000);
}

module.exports = {
  supplied,
  budget,
  escapeRegExp,
  literal,
  exactLabel,
  actOrExplain,
  assertPresence,
  assertText,
  joinUrl,
  navigate,
  smartSettle,
  friendly,
};
