'use strict';

// Backend step definitions for TYPO3, proven against the backend of TYPO3 13
// LTS with the official Introduction package.
//
// Covers: logging in by a handle from the users registry and logging out,
// the login error, the module menu, the page tree (select, expand, collapse,
// search, context menu, hidden pages), reading and clicking inside the
// module, notifications, messages and the cache actions.
//
// The backend is a shell (`.scaffold`) around an iframe: the module menu
// (`.scaffold-modulemenu`), the toolbar (`.scaffold-toolbar`), the page tree
// (`#typo3-pagetree-tree`) and the notifications (`#alert-container`) are in
// the top document, and the module itself is rendered inside the content
// frame (`iframe[name="list_frame"]`). Every step below looks in the right
// document on its own, so a feature never has to switch frames.

const { Given, When, Then } = require('@cucumber/cucumber');
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
const {
  resolveUser,
  backendLogin,
  openLoginForm,
  contentFrame,
  waitForModule,
  treeNode,
  revealTreePath,
  BACKEND_HINT,
  TREE_HINT,
} = require('./typo3-backend-helpers');

const MODULE_HINT = 'Modules are the links of the module menu (`.scaffold-modulemenu a.modulemenu-action`). Name one by its label ("Page", "List"), by "Group > Label" when two modules share a label ("Admin Tools > Settings"), or by its identifier ("web_layout"). A module the account may not use is not in the menu.';
const NOTIFICATION_HINT = 'Notifications are the `typo3-notification-message` elements of `#alert-container` in the top right corner. The steps log them from the login step on, so log in with "I am a logged in user with ..." before asserting one; the text is matched case-sensitively against the title and the message.';
const CACHE_HINT = 'The cache actions are in the "Clear cache" item of the toolbar (`#typo3-cms-backend-backend-toolbaritems-clearcachetoolbaritem`). An editor only has it when the user TSconfig grants `options.clearCache.pages` or `options.clearCache.all`.';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Log in to the backend as a user from the `worldParameters.users` registry
 * in cucumber.js, by its handle, so no feature file carries credentials:
 *
 *   users: {
 *     admin:  { username: 'admin',  password: process.env.TYPO3_ADMIN_PASS },
 *     editor: { username: 'editor', password: process.env.TYPO3_EDITOR_PASS },
 *   }
 *
 * Opens `/typo3/login`, fills `#t3-username` and `#t3-password`, submits
 * with `#t3-login-submit` and waits for the backend shell (`.scaffold`). A
 * refused login fails the step with the message of the login form.
 *
 * Accounts are configuration: create them once when the site is built
 * (`vendor/bin/typo3 backend:user:create`), never from a feature.
 *
 * Example #1: Given I am a logged in user with the "admin" user
 * Example #2: Given I am a logged in user with the username "editor"
 * Example #3: Given we are a logged in user with "admin"
 * Example #4: Given a logged in backend user with the "editor" user
 * Example #5: And I am a logged in backend user with the "admin" user
 *
 */
Given(/^(I am |we are )*a logged in( backend)* user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, backendCase, theCase, usernameCase, handle, userCase) {
  const user = resolveUser(this, handle);
  if (!supplied(user.password) || user.password === '') {
    throw friendly({
      message: `User "${handle}" has no password configured.`,
      hint: 'Set users.<handle>.password in the worldParameters of cucumber.js (an environment variable is the usual source).',
    });
  }
  await backendLogin(this, user.username, user.password, { mustSucceed: true });
});

/**
 * Submit the backend login form with explicit credentials. Unlike the
 * registry step above, this one does not fail when the login is refused, so
 * it is the step for a scenario about a wrong password. Use the registry
 * step for every other scenario.
 *
 * Example #1: When I log in to the backend as "admin" with password "wrong"
 * Example #2: When we log in to the backend as "nobody" with password "secret"
 * Example #3: And I log in to the backend as "editor" with password "wrong"
 * Example #4: When I sign in to the backend as "admin" with password "wrong"
 * Example #5: When log in to the backend as "admin" with password "wrong"
 *
 */
When(/^(I |we )*(?:log in|sign in) to the backend as "([^"]*)?" with password "([^"]*)?"$/, async function (pronounCase, username, password) {
  await backendLogin(this, username, password, { mustSucceed: false });
});

/**
 * Log out of the backend through the user menu of the toolbar
 * (`.toolbar-item-user`, the "Logout" button) and wait for the login form.
 *
 * Example #1: When I log out
 * Example #2: When we log out
 * Example #3: And I log out of the backend
 * Example #4: When I sign out
 * Example #5: When log out of the backend
 *
 */
When(/^(I |we )*(?:log ?out|sign out)(?: of the backend)?$/, async function (pronounCase) {
  const page = this.page;
  const item = page.locator('#typo3-cms-backend-backend-toolbaritems-usertoolbaritem, .toolbar-item-user').first();
  await actOrExplain('log out of', 'the backend', async () => {
    await item.waitFor({ state: 'visible', timeout: budget(this) });
    const logout = item.locator('a[href*="/logout"]').first();
    if (!(await logout.isVisible().catch(() => false))) await item.locator('button.toolbar-item-link, button').first().click();
    await logout.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([page.waitForURL(/\/typo3\/login/, { timeout: budget(this) * 2 }), logout.click()]);
    await page.locator('#t3-username').waitFor({ state: 'visible', timeout: budget(this) });
  }, BACKEND_HINT + ' The step needs a logged in session: the user menu is the last item of the toolbar.');
});

/**
 * Make sure the session is anonymous: drop the cookies of the browser, open
 * `/typo3/` and confirm the login form is shown.
 *
 * Example #1: Given I am not logged in
 * Example #2: Given we are not logged in
 * Example #3: Given not logged in
 * Example #4: And I am not logged in
 * Example #5: But I am not logged in
 *
 */
Given(/^(I am |we are )*not logged in$/, async function (pronounCase) {
  await this.context.clearCookies();
  await openLoginForm(this);
});

/**
 * Assert the session is (or is not) logged in to the backend, optionally as
 * a given user. Logged in means the backend shell (`.scaffold`) is shown;
 * the user is read from the user menu of the toolbar
 * (`.toolbar-item-user .toolbar-item-name`) and may be named by its handle
 * in the users registry or by its username.
 *
 * Example #1: Then I should be logged in
 * Example #2: Then I should not be logged in
 * Example #3: And I should be logged in as "editor"
 * Example #4: Then we should be logged in as "admin"
 * Example #5: And I should not be logged in as "admin"
 *
 */
Then(/^(I |we )*should( not)* be (?:logged in|signed in)(?: as "([^"]*)")?$/, async function (pronounCase, notCase, handle) {
  const page = this.page;
  const shell = page.locator('.scaffold .scaffold-modulemenu').first();
  const timeout = budget(this);
  if (!supplied(handle)) {
    await assertPresence(shell, notCase, {
      label: 'the backend shell (a logged in session)',
      hint: BACKEND_HINT,
      timeout,
    });
    return;
  }
  const users = (this.parameters && this.parameters.users) || {};
  const username = users[handle] && users[handle].username ? users[handle].username : handle;
  const name = page.locator('.toolbar-item-user .toolbar-item-name', { hasText: exactLabel(username) });
  if (notCase) {
    const shown = await name.first().isVisible().catch(() => false);
    if (shown) throw friendly({ message: `Expected not to be logged in as "${username}", but the toolbar shows that user.`, hint: BACKEND_HINT });
    return;
  }
  await assertPresence(shell, undefined, { label: 'the backend shell (a logged in session)', hint: BACKEND_HINT, timeout });
  try {
    await name.first().waitFor({ state: 'attached', timeout });
  } catch {
    const actual = (await page.locator('.toolbar-item-user .toolbar-item-name').first().textContent().catch(() => '') || '').trim();
    throw friendly({
      message: `Expected to be logged in as "${username}", but the toolbar shows "${actual || '(no user)'}".`,
      hint: 'The user menu shows the real name of the account when it has one, otherwise its username.',
    });
  }
});

/**
 * Assert the login form shows (or does not show) its error, optionally
 * with a given text. The error is `#t3-login-error` ("Your login attempt
 * did not succeed").
 *
 * Example #1: Then I should see a login error
 * Example #2: Then I should not see a login error
 * Example #3: And I should see the login error "Your login attempt did not succeed"
 * Example #4: Then we should see a login error
 * Example #5: And I should not see the login error "Your login attempt did not succeed"
 *
 */
Then(/^(I |we )*should( not)* see (?:a|the) login error(?: "([^"]*)")?$/, async function (pronounCase, notCase, text) {
  let error = this.page.locator('#t3-login-error, .t3js-login-error');
  if (supplied(text)) error = error.filter({ hasText: literal(text) });
  await assertPresence(error, notCase, {
    label: supplied(text) ? `the login error "${text}"` : 'a login error',
    hint: 'The error is `#t3-login-error` on `/typo3/login`; it is shown after a refused login. After several failed attempts TYPO3 also slows the form down (rate limiting).',
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Module menu
// ---------------------------------------------------------------------------

/**
 * The link of a module in the module menu: by "Group > Label", by label or
 * by identifier (`data-modulemenu-identifier`).
 */
function moduleLink(page, name) {
  const menu = page.locator('.scaffold-modulemenu');
  const parts = String(name).split('>').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const group = menu.locator('li', { has: page.locator('button.modulemenu-action', { hasText: exactLabel(parts[0]) }) });
    return group.locator('a.modulemenu-action', { hasText: exactLabel(parts[1]) }).first();
  }
  const byLabel = menu.locator('a.modulemenu-action', { hasText: exactLabel(name) });
  const byId = menu.locator(`a.modulemenu-action[data-modulemenu-identifier="${String(name).replace(/"/g, '\\"')}"]`);
  return byLabel.or(byId).first();
}

/**
 * Open a module from the module menu and wait until it is loaded in the
 * content frame. Name the module by its label ("Page", "List", "Forms"),
 * by "Group > Label" when two modules share a label ("Admin Tools >
 * Settings"), or by its identifier ("web_layout"). A collapsed group is
 * expanded first.
 *
 * Example #1: When I open the "Page" module
 * Example #2: When I open the "List" module
 * Example #3: When we open the "Admin Tools > Settings" module
 * Example #4: And I open the "web_layout" module
 * Example #5: When open the "Forms" module
 *
 */
When(/^(I |we )*open the "([^"]*)?" module$/, async function (pronounCase, name) {
  const page = this.page;
  const link = moduleLink(page, name);
  await actOrExplain('open the module', name, async () => {
    await link.waitFor({ state: 'attached', timeout: budget(this) });
    if (!(await link.isVisible().catch(() => false))) {
      const group = page.locator('.scaffold-modulemenu li', { has: link }).locator('button.modulemenu-action[aria-expanded="false"]').first();
      if (await group.count()) await group.click();
    }
    await link.click();
    const identifier = await link.getAttribute('data-modulemenu-identifier');
    await page.locator(`.scaffold-modulemenu a.modulemenu-action-active[data-modulemenu-identifier="${identifier}"]`).waitFor({ state: 'visible', timeout: budget(this) });
  }, MODULE_HINT);
  await waitForModule(this);
});

/**
 * Assert the module menu lists (or does not list) a module: the proof that
 * an account may or may not use it.
 *
 * Example #1: Then I should see the "Page" module
 * Example #2: And I should see the "List" module
 * Example #3: Then I should not see the "Extensions" module
 * Example #4: And we should not see the "Backend Users" module
 * Example #5: Then I should see the "Admin Tools > Settings" module
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" module$/, async function (pronounCase, notCase, name) {
  await assertPresence(this.page.locator('.scaffold-modulemenu').first(), undefined, { label: 'the module menu', hint: BACKEND_HINT, timeout: budget(this) });
  const link = moduleLink(this.page, name);
  const timeout = budget(this);
  try {
    await link.waitFor({ state: notCase ? 'detached' : 'attached', timeout });
  } catch {
    throw friendly({
      message: notCase ? `Expected the "${name}" module not to be in the module menu, but it is listed.` : `Expected the "${name}" module in the module menu, but it is not listed.`,
      hint: MODULE_HINT,
    });
  }
});

/**
 * Assert a module is (or is not) the active one: its link in the module
 * menu carries `modulemenu-action-active`.
 *
 * Example #1: Then the "Page" module should be active
 * Example #2: And the "List" module should not be active
 * Example #3: Then the "List" module should be active
 * Example #4: And the "Dashboard" module should not be active
 * Example #5: Then the "web_layout" module should be active
 *
 */
Then(/^the "([^"]*)?" module should( not)* be active$/, async function (name, notCase) {
  const link = moduleLink(this.page, name);
  await actOrExplain('find the module', name, () => link.waitFor({ state: 'attached', timeout: budget(this) }), MODULE_HINT);
  const deadline = Date.now() + budget(this);
  const read = () => link.evaluate((el) => el.classList.contains('modulemenu-action-active'));
  let active = await read();
  while ((notCase ? active : !active) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    active = await read();
  }
  if (notCase ? active : !active) {
    throw friendly({
      message: notCase ? `Expected the "${name}" module not to be active, but it is.` : `Expected the "${name}" module to be active, but it is not.`,
      hint: MODULE_HINT,
    });
  }
});

// ---------------------------------------------------------------------------
// Inside the module (the content frame)
// ---------------------------------------------------------------------------

/**
 * Assert the module shows (or does not show) a phrase. The module is the
 * document of the content frame (`iframe[name="list_frame"]`), which the
 * step enters on its own; webship-js's "I should see" only reads the top
 * document, that is the module menu, the toolbar and the page tree.
 *
 * Example #1: Then I should see "Please select a page" in the module
 * Example #2: And I should see "Congratulations" in the module
 * Example #3: Then we should see "Create new content" in the module
 * Example #4: And I should not see "Access denied" in the module
 * Example #5: Then should see "Page Content" in the module
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)?" in the module$/, async function (pronounCase, notCase, phrase) {
  await waitForModule(this);
  await assertText(contentFrame(this).locator('body'), phrase, notCase, {
    label: 'the module',
    hint: 'The phrase is matched case-sensitively against the text of the content frame (`iframe[name="list_frame"]`).',
    timeout: budget(this),
  });
});

/**
 * Assert the heading of the module does (or does not) include a text. The
 * heading is the `h1` of the content frame, or the editable page title
 * (`typo3-backend-editable-page-title`) the Page and List modules show for
 * a selected page.
 *
 * Example #1: Then the module heading should be "Congratulations"
 * Example #2: And the module heading should be "Edit Page"
 * Example #3: Then the module heading should not be "Features"
 * Example #4: And the module heading should be "TYPO3 Introduction"
 * Example #5: Then the module heading should not be "Access denied"
 *
 */
Then(/^the module heading should( not)* be "([^"]*)?"$/, async function (notCase, title) {
  await waitForModule(this);
  await assertText(contentFrame(this).locator('h1, typo3-backend-editable-page-title'), title, notCase, {
    label: 'the module heading',
    hint: 'The heading is the `h1` of the content frame, or `typo3-backend-editable-page-title` in the Page and List modules; the text is matched case-sensitively as a part of it.',
    timeout: budget(this),
  });
});

/**
 * Click a link or a button inside the module by its visible text, or by
 * its title when it only shows an icon ("Edit page properties", "Clear
 * cache for this page", "Reload"). The label is matched as a whole.
 *
 * Example #1: When I click "Edit page properties" in the module
 * Example #2: When I click "Reload" in the module
 * Example #3: When we click "Create new content" in the module
 * Example #4: And I click "Clear cache for this page" in the module
 * Example #5: When click "View webpage" in the module
 *
 */
When(/^(I |we )*click "([^"]*)?" in the module$/, async function (pronounCase, label) {
  await waitForModule(this);
  const frame = contentFrame(this);
  const quoted = String(label).replace(/"/g, '\\"');
  const byText = frame.locator('a, button, [role="button"]', { hasText: exactLabel(label) });
  const byTitle = frame.locator(`a[title="${quoted}"], button[title="${quoted}"], [role="button"][title="${quoted}"], a[aria-label="${quoted}"], button[aria-label="${quoted}"]`);
  const target = byText.or(byTitle).locator('visible=true').first();
  await actOrExplain('click in the module', label, async () => {
    await target.waitFor({ state: 'visible', timeout: budget(this) });
    await target.click();
  }, 'The step looks inside the content frame for a link or a button with exactly this text, title or aria-label. A control of the module menu, the toolbar or the page tree is outside the module.');
  await waitForModule(this);
});

// ---------------------------------------------------------------------------
// Page tree
// ---------------------------------------------------------------------------

/**
 * Select a page in the page tree and wait for the module to show it. Name
 * the page by its title, or by its path from a page that is already shown
 * ("Content Examples > Text > Rich Text"): every page on the path is
 * expanded on the way. The title is matched as a whole.
 *
 * Example #1: When I select the "Congratulations" page in the page tree
 * Example #2: When I select the "Congratulations > Features" page in the page tree
 * Example #3: When we select the "Congratulations > Content Examples > Text > Rich Text" page in the page tree
 * Example #4: And I select the "Features" page in the page tree
 * Example #5: When select the "Congratulations > Pages" page in the page tree
 *
 */
When(/^(I |we )*select the "([^"]*)?" page in the page tree$/, async function (pronounCase, path) {
  const page = this.page;
  const node = await revealTreePath(this, path);
  await actOrExplain('select in the page tree', path, async () => {
    const id = await node.getAttribute('data-id');
    const shown = () => {
      const frame = page.frame({ name: 'list_frame' });
      return !!frame && new RegExp(`[?&]id=${id}(&|$)`).test(frame.url());
    };
    // The tree redraws its rows while it loads subpages, and a click that
    // lands during a redraw is lost: click until the module shows the page.
    const deadline = Date.now() + budget(this);
    for (;;) {
      await node.locator('.node-contentlabel').first().click();
      const until = Math.min(Date.now() + 3000, deadline);
      while (!shown() && Date.now() < until) await smartSettle(page, 200);
      if (shown()) return;
      if (Date.now() >= deadline) throw new Error(`the module did not open the page with id ${id}`);
    }
  }, TREE_HINT);
  await waitForModule(this);
});

/**
 * Expand or collapse a page in the page tree through its toggle
 * (`.node-toggle`). Does nothing when the page is already in the wanted
 * state. A path expands the pages before it first.
 *
 * Example #1: When I expand the "Congratulations" page in the page tree
 * Example #2: When I collapse the "Congratulations" page in the page tree
 * Example #3: When we expand the "Congratulations > Content Examples" page in the page tree
 * Example #4: And I collapse the "Congratulations > Pages" page in the page tree
 * Example #5: When expand the "Congratulations > Pages" page in the page tree
 *
 */
When(/^(I |we )*(expand|collapse) the "([^"]*)?" page in the page tree$/, async function (pronounCase, action, path) {
  const node = await revealTreePath(this, path);
  const wanted = action === 'expand' ? 'true' : 'false';
  await actOrExplain(`${action} in the page tree`, path, async () => {
    const state = await node.getAttribute('aria-expanded');
    if (state === null) {
      if (action === 'collapse') return;
      throw new Error('the page has no subpages to show');
    }
    if (state !== wanted) await node.locator('.node-toggle').first().click();
    await node.and(this.page.locator(`[aria-expanded="${wanted}"]`)).waitFor({ state: 'visible', timeout: budget(this) });
  }, TREE_HINT);
  await smartSettle(this.page, 500);
});

/**
 * Assert the page tree shows (or does not show) a page. A path expands the
 * pages before the last one first, so "Congratulations > Features" proves
 * that Features is a subpage of Congratulations. The tree only renders the
 * rows in view, so the step scrolls the tree while it looks.
 *
 * Example #1: Then I should see the "Congratulations" page in the page tree
 * Example #2: And I should see the "Congratulations > Features" page in the page tree
 * Example #3: Then I should not see the "Congratulations > Checkout" page in the page tree
 * Example #4: And we should see the "Congratulations > Content Examples" page in the page tree
 * Example #5: Then should not see the "Checkout" page in the page tree
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" page in the page tree$/, async function (pronounCase, notCase, path) {
  if (notCase) {
    const found = await revealTreePath(this, path, { optional: true });
    if (found) throw friendly({ message: `Expected no "${path}" page in the page tree, but it is shown.`, hint: TREE_HINT });
    return;
  }
  await revealTreePath(this, path);
});

/**
 * Assert a page is (or is not) hidden in the page tree: a hidden (disabled)
 * page carries the `overlay-hidden` overlay on its icon. A new page is
 * hidden until it is enabled.
 *
 * Example #1: Then the "Congratulations > Features" page should not be hidden in the page tree
 * Example #2: And the "Congratulations > 404 > Draft" page should be hidden in the page tree
 * Example #3: Then the "Draft" page should be hidden in the page tree
 * Example #4: And the "Features" page should not be hidden in the page tree
 * Example #5: Then the "Congratulations > Pages" page should not be hidden in the page tree
 *
 */
Then(/^the "([^"]*)?" page should( not)* be hidden in the page tree$/, async function (path, notCase) {
  const node = await revealTreePath(this, path);
  const hiddenIcon = node.locator('typo3-backend-icon[overlay="overlay-hidden"], .icon-overlay-hidden');
  const deadline = Date.now() + budget(this);
  let hidden = (await hiddenIcon.count()) > 0;
  while ((notCase ? hidden : !hidden) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    hidden = (await hiddenIcon.count()) > 0;
  }
  if (notCase ? hidden : !hidden) {
    throw friendly({
      message: notCase ? `Expected the "${path}" page not to be hidden, but its icon carries the hidden overlay.` : `Expected the "${path}" page to be hidden, but its icon carries no hidden overlay.`,
      hint: 'A hidden page is one with "Enable" in its context menu (the `hidden` field is set). ' + TREE_HINT,
    });
  }
});

/**
 * Filter the page tree with its search field (`#typo3-pagetree-toolbar
 * input[type="search"]`), or clear the filter with an empty text. The tree
 * then shows the matching pages with the pages above them.
 *
 * Example #1: When I search the page tree for "Rich Text"
 * Example #2: When I search the page tree for "Accordion"
 * Example #3: When we search the page tree for "Features"
 * Example #4: And I search the page tree for ""
 * Example #5: When search the page tree for "Quote"
 *
 */
When(/^(I |we )*search the page tree for "([^"]*)?"$/, async function (pronounCase, words) {
  const field = this.page.locator('#typo3-pagetree-toolbar input[type="search"], typo3-backend-navigation-component-pagetree-toolbar input[type="search"]').first();
  await actOrExplain('search the page tree for', words, async () => {
    await field.waitFor({ state: 'visible', timeout: budget(this) });
    await field.fill(words || '');
  }, TREE_HINT);
  await smartSettle(this.page, 1500);
});

/**
 * Choose an action from the context menu of a page in the page tree: the
 * step right-clicks the page and clicks the menu item with the given label
 * ("New subpage", "Edit", "Enable", "Disable", "Delete", "Show", "Info",
 * "Copy", "Cut", "History/Undo", "Clear cache for this page"). An action
 * that asks for confirmation ("Delete") opens a dialog.
 *
 * Example #1: When I choose "New subpage" from the context menu of the "Congratulations > 404" page
 * Example #2: When I choose "Enable" from the context menu of the "Congratulations > 404 > Draft" page
 * Example #3: When we choose "Disable" from the context menu of the "Draft" page
 * Example #4: And I choose "Delete" from the context menu of the "Draft" page
 * Example #5: When choose "Edit" from the context menu of the "Congratulations > Features" page
 *
 */
When(/^(I |we )*choose "([^"]*)?" from the context menu of the "([^"]*)?" page$/, async function (pronounCase, action, path) {
  const page = this.page;
  const node = await revealTreePath(this, path);
  const menu = page.locator('typo3-backend-context-menu .context-menu');
  await actOrExplain(`choose "${action}" from the context menu of`, path, async () => {
    await node.locator('.node-contentlabel').first().click({ button: 'right' });
    await menu.first().waitFor({ state: 'visible', timeout: budget(this) });
    const item = menu.locator('[role="menuitem"]', { hasText: exactLabel(action) }).first();
    if (!(await item.count())) {
      const labels = (await menu.locator('[role="menuitem"]').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
      await page.keyboard.press('Escape').catch(() => {});
      throw new Error(`the context menu offers: ${labels.join(', ')}`);
    }
    await item.click();
  }, 'The context menu of a page only offers what the account may do and what fits the state of the page: a hidden page offers "Enable", a visible one "Disable".');
  await smartSettle(page, 1000);
  await waitForModule(this);
});

// ---------------------------------------------------------------------------
// Notifications and messages
// ---------------------------------------------------------------------------

/**
 * Assert the backend raised (or did not raise) a notification with the
 * given text in its title or its message, for example "Record saved" or
 * "Successfully cleared page cache". Notifications leave the screen after
 * one to five seconds, so the steps keep a log of every notification of
 * the session since the login: a notification counts even when it is gone
 * by the time the step runs. An assertion uses a notification up, so a
 * second "I should see the notification" needs a second notification.
 *
 * Example #1: Then I should see the notification "Record saved"
 * Example #2: And I should see the notification "has been successfully saved"
 * Example #3: Then we should see the notification "Successfully cleared page cache"
 * Example #4: And I should not see the notification "Error"
 * Example #5: Then should see the notification "Record saved"
 *
 */
Then(/^(I |we )*should( not)* see the notification "([^"]*)?"$/, async function (pronounCase, notCase, text) {
  const page = this.page;
  const visible = page.locator('#alert-container typo3-notification-message, #alert-container .alert', { hasText: literal(text) });
  // Some notifications stay for one second only ("Successfully cleared page
  // cache"), so the session keeps a log of every notification it raised.
  const logged = (consume) => page.evaluate(({ needle, take }) => {
    const log = window.__typo3Notifications || [];
    const index = log.findIndex((n) => `${n.title} ${n.message}`.includes(needle));
    if (index === -1) return null;
    const hit = log[index];
    if (take) log.splice(index, 1);
    return hit;
  }, { needle: text, take: consume }).catch(() => null);
  if (notCase) {
    const shown = (await visible.first().isVisible().catch(() => false)) || (await logged(false));
    if (shown) throw friendly({ message: `Expected no notification with "${text}", but the backend raised one.`, hint: NOTIFICATION_HINT });
    return;
  }
  const deadline = Date.now() + budget(this);
  for (;;) {
    if (await logged(true)) return;
    if (await visible.first().isVisible().catch(() => false)) return;
    if (Date.now() >= deadline) break;
    await smartSettle(page, 250);
  }
  const seen = await page.evaluate(() => (window.__typo3Notifications || []).map((n) => `${n.title}: ${n.message}`)).catch(() => []);
  throw friendly({
    message: `Expected a notification with "${text}", but ${seen.length ? `the notifications not yet asserted were: "${seen.join('" / "')}"` : 'the backend raised none'}.`,
    hint: NOTIFICATION_HINT,
  });
});

/**
 * Assert the module shows (or does not show) a message of a kind with the
 * given text: the callouts and alerts a module prints in the content frame
 * (`.callout-info`, `.alert-danger`, ...), such as "Please select a page in
 * the page tree".
 *
 * Example #1: Then I should see the info message "Please select a page" in the module
 * Example #2: And I should not see the error message "Access denied" in the module
 * Example #3: Then we should see the warning message "No records" in the module
 * Example #4: And I should see the success message "saved" in the module
 * Example #5: Then I should not see the notice message "outdated" in the module
 *
 */
Then(/^(I |we )*should( not)* see the (success|info|notice|warning|error) message "([^"]*)?" in the module$/, async function (pronounCase, notCase, kind, text) {
  await waitForModule(this);
  const cls = { success: 'success', info: 'info', notice: 'notice', warning: 'warning', error: 'danger' }[kind];
  const message = contentFrame(this).locator(`.callout-${cls}, .alert-${cls}`, { hasText: literal(text) });
  await assertPresence(message, notCase, {
    label: `${kind === 'info' || kind === 'error' ? 'an' : 'a'} ${kind} message with "${text}" in the module`,
    hint: 'Messages of a module are `.callout-<kind>` or `.alert-<kind>` elements inside the content frame (an error is `danger`). A message raised after an action in the top right corner is a notification: use "I should see the notification".',
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

/**
 * Flush caches through the "Clear cache" item of the toolbar: "frontend"
 * is "Flush frontend caches" (pages and their content), "all" is "Flush all
 * caches" (the system caches too, administrators only). The step waits for
 * the request to finish.
 *
 * Example #1: When I flush the frontend caches
 * Example #2: When I flush all caches
 * Example #3: When we flush the frontend caches
 * Example #4: And I flush all the caches
 * Example #5: When flush the frontend caches
 *
 */
When(/^(I |we )*flush (the frontend|all|all the) caches$/, async function (pronounCase, which) {
  const page = this.page;
  const cmd = /frontend/.test(which) ? 'pages' : 'all';
  const item = page.locator('#typo3-cms-backend-backend-toolbaritems-clearcachetoolbaritem').first();
  await actOrExplain('flush', `${which} caches`, async () => {
    await item.waitFor({ state: 'visible', timeout: budget(this) });
    const action = item.locator(`a[href*="cacheCmd=${cmd}"]`).first();
    if (!(await action.isVisible().catch(() => false))) await item.locator('button.toolbar-item-link, button').first().click();
    await action.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`cacheCmd=${cmd}`), { timeout: budget(this) * 2 }),
      action.click(),
    ]);
  }, CACHE_HINT);
  await smartSettle(page, 1000);
});

/**
 * Clear the cache of the page shown in the Page module with the "Clear
 * cache for this page" button of the module (`.t3js-clear-page-cache`).
 * Select a page first.
 *
 * Example #1: When I clear the cache of the page
 * Example #2: When we clear the cache of the page
 * Example #3: And I clear the cache of this page
 * Example #4: When I clear the cache of the current page
 * Example #5: When clear the cache of the page
 *
 */
When(/^(I |we )*clear the cache of (?:the|this|the current) page$/, async function (pronounCase) {
  const page = this.page;
  await waitForModule(this);
  const button = contentFrame(this).locator('.t3js-clear-page-cache').first();
  await actOrExplain('clear the cache of', 'the page', async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      page.waitForResponse((r) => /clearpagecache/i.test(r.url()), { timeout: budget(this) * 2 }),
      button.click(),
    ]);
  }, 'The button is in the button bar of the Page module once a page is selected in the page tree.');
  await smartSettle(page, 500);
});
