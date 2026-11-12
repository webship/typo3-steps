'use strict';

// Shared helpers for the TYPO3 backend step files.
//
// Not a step file: it registers no step definitions and no hooks. It holds
// the users registry, the backend login, the content frame and the page
// tree lookups.

const {
  budget,
  exactLabel,
  navigate,
  smartSettle,
  friendly,
} = require('./typo3-helpers');

const BACKEND_HINT = 'The backend is at `/typo3`: the login form (`#t3-username`, `#t3-password`, `#t3-login-submit`) and, once logged in, the shell (`.scaffold`) with the module menu, the toolbar, the page tree and the content frame.';
const TREE_HINT = 'The page tree is `#typo3-pagetree-tree`; it is shown by the modules of the "Web" group (Page, List, ...). A page is a `[role="treeitem"]` row matched by its whole title; name a page that is not shown yet by its path, for example "Congratulations > Content Examples > Text". An account only sees the pages of its page mounts.';

/**
 * Look a handle up in the users registry (`worldParameters.users`).
 *
 * @param {object} world - The cucumber World (`this` inside a step).
 * @param {string} handle - The key of the account in the registry.
 * @returns {{username: string, password: string}}
 */
function resolveUser(world, handle) {
  const users = (world.parameters && world.parameters.users) || {};
  const user = users[handle];
  if (!user || !user.username) {
    const known = Object.keys(users);
    throw friendly({
      message: `No user "${handle}" in the users registry.`,
      hint: known.length
        ? `The registry (worldParameters.users in cucumber.js) has: ${known.join(', ')}.`
        : 'Add a users block to the worldParameters of cucumber.js: users: { admin: { username: "admin", password: process.env.TYPO3_ADMIN_PASS } }.',
    });
  }
  return user;
}

/** Open `/typo3/` and wait for the login form. */
async function openLoginForm(world) {
  await navigate(world, '/typo3/');
  try {
    await world.page.locator('#t3-username').waitFor({ state: 'visible', timeout: budget(world) });
  } catch {
    throw friendly({
      message: `Expected the backend login form at ${world.page.url()}, but it is not shown.`,
      hint: BACKEND_HINT + ' A session that is still logged in lands in the backend; a site with another backend entry point (`BE/entryPoint`) or a locked backend shows no form here.',
    });
  }
}

/**
 * Log in to the backend with a username and a password. With
 * `mustSucceed`, a refused login throws the message of the login form.
 */
async function backendLogin(world, username, password, { mustSucceed }) {
  const page = world.page;
  await world.context.clearCookies();
  await openLoginForm(world);
  await page.locator('#t3-username').fill(username);
  await page.locator('#t3-password').fill(password);
  await page.locator('#t3-login-submit').click();
  const shell = page.locator('.scaffold .scaffold-modulemenu').first();
  const error = page.locator('#t3-login-error').first();
  try {
    await shell.or(error).first().waitFor({ state: 'visible', timeout: budget(world) * 3 });
  } catch {
    throw friendly({
      message: `The backend did not answer the login of "${username}": neither the backend nor a login error appeared.`,
      hint: BACKEND_HINT + ' An account with multi-factor authentication stops at the code form, which this step does not fill in.',
    });
  }
  if (await error.isVisible().catch(() => false)) {
    if (!mustSucceed) return;
    const text = ((await error.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ');
    throw friendly({
      message: `The backend refused the login of "${username}": ${text}`,
      hint: 'Check users.<handle> in the worldParameters of cucumber.js against the accounts of the site. Create a missing account once with `vendor/bin/typo3 backend:user:create`.',
    });
  }
  await recordNotifications(world);
  await smartSettle(page, 2000);
  await waitForModule(world);
}

/**
 * Keep a log of the notifications the backend raises in the top document
 * (`window.__typo3Notifications`), now and after every reload. A
 * notification can leave the screen within a second, before the next step
 * runs; the log is what "I should see the notification" reads.
 */
async function recordNotifications(world) {
  const recorder = () => {
    if (window !== window.top || window.__typo3NotificationObserver) return;
    window.__typo3Notifications = window.__typo3Notifications || [];
    const note = (el) => {
      if (!el || el.__typo3Logged) return;
      el.__typo3Logged = true;
      window.__typo3Notifications.push({
        title: el.getAttribute('notification-title') || '',
        message: el.getAttribute('notification-message') || '',
        severity: el.getAttribute('notification-severity') || '',
      });
    };
    const scan = (root) => {
      if (!root || root.nodeType !== 1) return;
      if (root.matches && root.matches('typo3-notification-message')) note(root);
      if (root.querySelectorAll) root.querySelectorAll('typo3-notification-message').forEach(note);
    };
    window.__typo3NotificationObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(scan));
    });
    const start = () => {
      scan(document.documentElement);
      window.__typo3NotificationObserver.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start);
  };
  if (!world.__typo3NotificationRecorder) {
    world.__typo3NotificationRecorder = true;
    await world.context.addInitScript(recorder);
  }
  await world.page.evaluate(recorder).catch(() => {});
}

/** The content frame of the backend, where the module is rendered. */
function contentFrame(world) {
  return world.page.frameLocator('iframe[name="list_frame"]');
}

/**
 * Wait until the module in the content frame is loaded: the frame has a
 * body, the loading indicator of the frame is gone and the network is
 * quiet. Never throws; the step that follows reports what is missing.
 */
async function waitForModule(world) {
  const page = world.page;
  const timeout = budget(world);
  await smartSettle(page, 1500);
  const frame = contentFrame(world);
  await frame.locator('body').first().waitFor({ state: 'attached', timeout }).catch(() => {});
  await page.locator('.scaffold-content-module typo3-backend-progress-bar, #nprogress').first().waitFor({ state: 'detached', timeout }).catch(() => {});
  const handle = page.frame({ name: 'list_frame' });
  if (handle) await handle.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
  await smartSettle(page, 1000);
}

/** The rows of the page tree with the given title, optionally at a level. */
function treeNode(world, title, level) {
  const scope = level ? `[role="treeitem"][aria-level="${level}"]` : '[role="treeitem"]';
  return world.page.locator(`#typo3-pagetree-tree ${scope}`, { has: world.page.locator('.node-name', { hasText: exactLabel(title) }) });
}

/**
 * Find a row of the page tree. The tree is virtual: only the rows in view
 * exist in the document, so the tree is scrolled from the top until the row
 * appears or the end is reached.
 */
async function findTreeNode(world, title, { after } = {}) {
  const page = world.page;
  const container = page.locator('#typo3-pagetree-tree').first();
  const lookup = async () => {
    const rows = treeNode(world, title);
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      if (!after) return row;
      const treeId = (await row.getAttribute('data-tree-id')) || '';
      if (treeId.startsWith(after + '_')) return row;
    }
    return null;
  };
  let row = await lookup();
  if (row) return row;
  const scrollTo = (top) => container.evaluate((el, y) => {
    const scroller = el.querySelector('.nodes-container') || el;
    const target = scroller.scrollHeight > scroller.clientHeight ? scroller : (el.closest('.navigation-tree-container') || el);
    target.scrollTop = y;
    return { top: target.scrollTop, max: target.scrollHeight - target.clientHeight, step: Math.max(target.clientHeight - 64, 64) };
  }, top);
  let pos = await scrollTo(0).catch(() => null);
  if (!pos) return null;
  for (let guard = 0; guard < 200; guard += 1) {
    await smartSettle(page, 300);
    row = await lookup();
    if (row) return row;
    if (pos.top >= pos.max) break;
    pos = await scrollTo(pos.top + pos.step);
  }
  return null;
}

/**
 * Walk a path of page titles ("A > B > C") through the page tree, expanding
 * every page before the last, and return the row of the last one. With
 * `optional`, a missing page returns null; otherwise it throws.
 */
async function revealTreePath(world, path, { optional } = {}) {
  const page = world.page;
  const timeout = budget(world);
  const titles = String(path).split('>').map((p) => p.trim()).filter(Boolean);
  try {
    await page.locator('#typo3-pagetree-tree [role="treeitem"]').first().waitFor({ state: 'visible', timeout });
  } catch {
    throw friendly({ message: 'The page tree is not shown.', hint: TREE_HINT });
  }
  let parentTreeId;
  let node = null;
  for (let i = 0; i < titles.length; i += 1) {
    const deadline = Date.now() + (optional && i === titles.length - 1 ? 2000 : timeout);
    node = await findTreeNode(world, titles[i], { after: parentTreeId });
    while (!node && Date.now() < deadline) {
      await smartSettle(page, 300);
      node = await findTreeNode(world, titles[i], { after: parentTreeId });
    }
    if (!node) {
      if (optional) return null;
      const shown = (await page.locator('#typo3-pagetree-tree [role="treeitem"] .node-name').allInnerTexts().catch(() => [])).map((t) => t.trim()).slice(0, 12);
      throw friendly({
        message: `No "${titles[i]}" page in the page tree${i ? ` under "${titles.slice(0, i).join(' > ')}"` : ''}. The rows in view are: ${shown.join(', ') || '(none)'}.`,
        hint: TREE_HINT,
      });
    }
    await node.scrollIntoViewIfNeeded().catch(() => {});
    parentTreeId = await node.getAttribute('data-tree-id');
    if (i < titles.length - 1 && (await node.getAttribute('aria-expanded')) === 'false') {
      await node.locator('.node-toggle').first().click();
      await page.locator(`#typo3-pagetree-tree [role="treeitem"][data-tree-id="${parentTreeId}"][aria-expanded="true"]`).waitFor({ state: 'visible', timeout }).catch(() => {});
      await smartSettle(page, 500);
    }
    node = page.locator(`#typo3-pagetree-tree [role="treeitem"][data-tree-id="${parentTreeId}"]`).first();
  }
  return node;
}

module.exports = {
  resolveUser,
  openLoginForm,
  backendLogin,
  recordNotifications,
  contentFrame,
  waitForModule,
  treeNode,
  findTreeNode,
  revealTreePath,
  BACKEND_HINT,
  TREE_HINT,
};
