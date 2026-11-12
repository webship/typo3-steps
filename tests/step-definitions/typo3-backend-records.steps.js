'use strict';

// Record step definitions for the TYPO3 backend, proven against TYPO3 13 LTS
// with the official Introduction package.
//
// Covers: the record form (FormEngine) with its tabs, fields, validation
// and its Save, Close and Delete buttons; dialogs; the content elements of
// the Page module (add, edit, hide, unhide, delete); the tables and records
// of the List module; and removing a page before a scenario creates it.
//
// The record form, the Page module and the List module are rendered inside
// the content frame (`iframe[name="list_frame"]`); dialogs and the "new
// content element" wizard are in the top document. Every step looks in the
// right document on its own.

const { Given, When, Then } = require('@cucumber/cucumber');
const {
  budget,
  literal,
  exactLabel,
  escapeRegExp,
  actOrExplain,
  assertPresence,
  smartSettle,
  friendly,
} = require('./typo3-helpers');
const {
  contentFrame,
  waitForModule,
  revealTreePath,
  TREE_HINT,
} = require('./typo3-backend-helpers');

const FORM_HINT = 'The record form is FormEngine inside the content frame: every field is a `.form-group` with a label, tabs are `[role="tab"]` buttons, and a field of another tab is only found after "I open the ... record tab". Labels are matched as a whole.';
const DIALOG_HINT = 'Dialogs are `typo3-backend-modal` elements in the top document; the last button of the footer confirms, the first cancels.';
const CE_HINT = 'A content element of the Page module is a `.t3-page-ce[data-uid]` block inside its column (`.t3-page-column`); it is named by the header its preview shows. Select a page in the page tree first.';
const LIST_HINT = 'The List module shows one `.recordlist` per table, headed by the name of the table and the number of records ("Page Content (3)"); a record is a `tr[data-uid]` row named by its title column. Select a page in the page tree first.';

// ---------------------------------------------------------------------------
// The record form (FormEngine)
// ---------------------------------------------------------------------------

/** The visible `.form-group` of the record form whose own label is `label`. */
function recordField(world, label) {
  const frame = contentFrame(world);
  const own = frame.locator(':scope > label, :scope > legend, :scope > .form-label, :scope > .form-legend', { hasText: exactLabel(label) });
  return frame.locator('.form-group, fieldset.form-section', { has: own }).locator('visible=true').first();
}

/** Wait for the field with the label, or explain which labels the tab has. */
async function requireField(world, label) {
  const field = recordField(world, label);
  try {
    await field.waitFor({ state: 'visible', timeout: budget(world) });
  } catch {
    const labels = (await contentFrame(world).locator('.tab-pane.active .form-group > label, .tab-pane.active .form-group > legend, .form-section .form-group > label').allInnerTexts().catch(() => []))
      .map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
    throw friendly({
      message: `No "${label}" field in the record form. The open tab has: ${[...new Set(labels)].slice(0, 20).join(', ') || '(no fields; is a record open?)'}.`,
      hint: FORM_HINT,
    });
  }
  return field;
}

/**
 * Run an action on the record form and, when it fails while a dialog is
 * open, say so: a dialog covers the form until it is answered.
 */
async function onRecordForm(world, label, target, fn, hint) {
  try {
    return await fn();
  } catch (err) {
    const title = ((await world.page.locator('typo3-backend-modal .modal.show .modal-title, .modal.show .modal-title').last().innerText({ timeout: 500 }).catch(() => '')) || '').trim();
    if (title) {
      throw friendly({
        message: `Could not ${label} ${target}: the dialog "${title}" is open and covers the form.`,
        hint: 'Answer the dialog first with "I confirm the dialog", "I cancel the dialog" or "I press "..." in the dialog". TYPO3 asks "Refresh required" after a field that changes the form, and asks before closing a record with unsaved changes.',
      });
    }
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/** Read the value a field shows: input, textarea, rich text or select. */
async function readField(field) {
  return field.evaluate((group) => {
    const rte = group.querySelector('.ck-editor__editable');
    if (rte) return rte.innerText.trim();
    const select = group.querySelector('select');
    if (select) return [...select.selectedOptions].map((o) => o.textContent.trim()).join(', ');
    const input = group.querySelector('[data-formengine-input-name]:not([type="hidden"]), textarea, input[type="text"], input[type="number"], input[type="email"], input[type="url"]');
    return input ? input.value : '';
  });
}

/**
 * Fill in a field of the record form by its label. Works for text inputs,
 * text areas and the rich text editor (CKEditor 5). The field must be on
 * the open tab.
 *
 * Example #1: When I fill in the "Page Title" record field with "News"
 * Example #2: When I fill in the "Header" record field with "Welcome"
 * Example #3: When we fill in the "Subheader" record field with "Latest updates"
 * Example #4: And I fill in the "Text" record field with "A paragraph of text."
 * Example #5: When fill in the "Page Title" record field with ""
 *
 */
When(/^(I |we )*fill in the "([^"]*)?" record field with "([^"]*)?"$/, async function (pronounCase, label, value) {
  await waitForModule(this);
  const field = await requireField(this, label);
  await actOrExplain('fill in the record field', label, async () => {
    const rte = field.locator('.ck-editor__editable').first();
    if (await rte.count()) {
      await rte.click();
      await rte.press('ControlOrMeta+a');
      await rte.press('Delete');
      if (value) await rte.pressSequentially(value);
      return;
    }
    const input = field.locator('[data-formengine-input-name]:not([type="hidden"]), textarea, input[type="text"], input[type="number"], input[type="email"], input[type="url"]').locator('visible=true').first();
    await input.waitFor({ state: 'visible', timeout: budget(this) });
    await input.fill(value || '');
    // FormEngine copies the value to its hidden field and validates on change and blur.
    await input.dispatchEvent('change');
    await input.blur();
  }, FORM_HINT + ' The step fills text inputs, text areas and the rich text editor; use "I select ... in the ... record field" for a select box.');
});

/**
 * Choose an option of a select box of the record form by the label of the
 * field and the visible text of the option. A field that changes which
 * fields the form has ("Type", "Frame") opens the "Refresh required"
 * dialog: answer it with "I press "Save and refresh" in the dialog".
 *
 * Example #1: When I select "Center" in the "Alignment" record field
 * Example #2: When I select "H3" in the "Type" record field
 * Example #3: When we select "No Frame" in the "Frame" record field
 * Example #4: And I select "Small" in the "Space Before" record field
 * Example #5: When select "Right" in the "Alignment" record field
 *
 */
When(/^(I |we )*select "([^"]*)?" in the "([^"]*)?" record field$/, async function (pronounCase, option, label) {
  await waitForModule(this);
  const field = await requireField(this, label);
  const select = field.locator('select').locator('visible=true').first();
  await actOrExplain(`select "${option}" in the record field`, label, async () => {
    await select.waitFor({ state: 'visible', timeout: budget(this) });
    const options = (await select.locator('option').allInnerTexts()).map((t) => t.trim());
    const match = options.find((t) => exactLabel(option).test(t));
    if (!match) throw new Error(`the field offers: ${options.filter(Boolean).join(', ')}`);
    await select.selectOption({ label: match });
  }, FORM_HINT + ' Some select boxes reload the form when they change ("Type" of a page or a content element) and ask for confirmation in a dialog.');
  await smartSettle(this.page, 500);
});

/**
 * Open a tab of the record form by its label ("General", "Appearance",
 * "Access", ...).
 *
 * Example #1: When I open the "Access" record tab
 * Example #2: When I open the "Appearance" record tab
 * Example #3: When we open the "General" record tab
 * Example #4: And I open the "SEO" record tab
 * Example #5: When open the "Language" record tab
 *
 */
When(/^(I |we )*open the "([^"]*)?" record tab$/, async function (pronounCase, label) {
  await waitForModule(this);
  const frame = contentFrame(this);
  const tab = frame.locator('[role="tab"]', { hasText: exactLabel(label) }).first();
  await actOrExplain('open the record tab', label, async () => {
    await tab.waitFor({ state: 'visible', timeout: budget(this) });
    await tab.click();
    await frame.locator('[role="tab"][aria-selected="true"]', { hasText: exactLabel(label) }).first().waitFor({ state: 'visible', timeout: budget(this) });
  }, FORM_HINT);
});

/**
 * Save the record with the Save button of the button bar
 * (`button[name="_savedok"]`). A valid record is saved and stays open, and
 * the backend raises the "Record saved" notification; an invalid one is not
 * sent, and its fields are marked.
 *
 * Example #1: When I save the record
 * Example #2: When we save the record
 * Example #3: And I save the record
 * Example #4: When I save the page
 * Example #5: And I save the content element
 *
 */
When(/^(I |we )*save the (?:record|page|content element)$/, async function (pronounCase) {
  await waitForModule(this);
  const button = contentFrame(this).locator('button[name="_savedok"]').first();
  await onRecordForm(this, 'save', 'the record', async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click({ timeout: budget(this) });
  }, 'The Save button is in the button bar of the record form (`button[name="_savedok"]`); open a record first.');
  await waitForModule(this);
});

/**
 * Close the record form with the Close button of the button bar
 * (`.t3js-editform-close`) and return to the module the record was opened
 * from. Unsaved changes raise a dialog.
 *
 * Example #1: When I close the record
 * Example #2: When we close the record
 * Example #3: And I close the record
 * Example #4: When I close the page
 * Example #5: And I close the content element
 *
 */
When(/^(I |we )*close the (?:record|page|content element)$/, async function (pronounCase) {
  await waitForModule(this);
  const button = contentFrame(this).locator('.t3js-editform-close').first();
  await onRecordForm(this, 'close', 'the record', async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click({ timeout: budget(this) });
  }, 'The Close button is in the button bar of the record form (`.t3js-editform-close`); open a record first.');
  await waitForModule(this);
});

/**
 * Press the Delete button of the record form
 * (`.t3js-editform-delete-record`). The backend asks for confirmation in a
 * dialog: follow with "I confirm the dialog".
 *
 * Example #1: When I delete the record
 * Example #2: When we delete the record
 * Example #3: And I delete the record
 * Example #4: When I delete the open record
 * Example #5: When delete the record
 *
 */
When(/^(I |we )*delete the (?:open )?record$/, async function (pronounCase) {
  await waitForModule(this);
  const button = contentFrame(this).locator('.t3js-editform-delete-record').first();
  await actOrExplain('delete', 'the record', async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click();
  }, 'The Delete button is in the button bar of the form of a saved record (`.t3js-editform-delete-record`); a new record that was never saved has none.');
});

/**
 * Assert the value a field of the record form shows does (or does not)
 * contain a text: the value of an input or a text area, the text of the
 * rich text editor, or the selected option of a select box.
 *
 * Example #1: Then the "Page Title" record field should contain "News"
 * Example #2: And the "Header" record field should contain "Welcome"
 * Example #3: Then the "Alignment" record field should contain "Center"
 * Example #4: And the "Subheader" record field should not contain "Draft"
 * Example #5: Then the "Page Title" record field should not contain "Checkout"
 *
 */
Then(/^the "([^"]*)?" record field should( not)* contain "([^"]*)?"$/, async function (label, notCase, text) {
  await waitForModule(this);
  const field = await requireField(this, label);
  const deadline = Date.now() + budget(this);
  let value = await readField(field);
  while ((notCase ? value.includes(text) : !value.includes(text)) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    value = await readField(field);
  }
  if (notCase ? value.includes(text) : !value.includes(text)) {
    throw friendly({
      message: notCase
        ? `Expected the "${label}" record field not to contain "${text}", but it holds "${value}".`
        : `Expected the "${label}" record field to contain "${text}", but it holds "${value || '(nothing)'}".`,
      hint: FORM_HINT,
    });
  }
});

/**
 * Assert a field of the record form is (or is not) marked as invalid:
 * FormEngine adds `has-error` to the label and the input of a field that
 * fails its validation, for example an empty required field.
 *
 * Example #1: Then the "Page Title" record field should be marked as invalid
 * Example #2: And the "Page Title" record field should not be marked as invalid
 * Example #3: Then the "Header" record field should not be marked as invalid
 * Example #4: And the "Email" record field should be marked as invalid
 * Example #5: Then the "Subheader" record field should not be marked as invalid
 *
 */
Then(/^the "([^"]*)?" record field should( not)* be marked as invalid$/, async function (label, notCase) {
  await waitForModule(this);
  const field = await requireField(this, label);
  const read = () => field.evaluate((group) => !!group.querySelector('.has-error, [aria-invalid="true"]') || group.classList.contains('has-error'));
  const deadline = Date.now() + budget(this);
  let invalid = await read();
  while ((notCase ? invalid : !invalid) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    invalid = await read();
  }
  if (notCase ? invalid : !invalid) {
    throw friendly({
      message: notCase ? `Expected the "${label}" record field not to be marked as invalid, but it is.` : `Expected the "${label}" record field to be marked as invalid, but it is not.`,
      hint: FORM_HINT,
    });
  }
});

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

/** The dialog on top (`typo3-backend-modal`), in the top document. */
function dialog(world) {
  return world.page.locator('typo3-backend-modal .modal.show, .modal.show').last();
}

/** Wait for an open dialog, or say that none is open. */
async function requireDialog(world) {
  const box = dialog(world);
  try {
    await box.waitFor({ state: 'visible', timeout: budget(world) });
  } catch {
    throw friendly({
      message: 'No dialog is open.',
      hint: DIALOG_HINT + ' The action before this step did not ask for confirmation, or the dialog was already answered.',
    });
  }
  return box;
}

/**
 * Answer the open dialog: "confirm" presses the last button of its footer
 * (the action, for example "Delete record (!)"), "cancel" the first.
 *
 * Example #1: When I confirm the dialog
 * Example #2: When I cancel the dialog
 * Example #3: And we confirm the dialog
 * Example #4: And I cancel the dialog
 * Example #5: When confirm the dialog
 *
 */
When(/^(I |we )*(confirm|cancel) the dialog$/, async function (pronounCase, action) {
  const box = await requireDialog(this);
  await actOrExplain(action, 'the dialog', async () => {
    const buttons = box.locator('.modal-footer button');
    await buttons.first().waitFor({ state: 'visible', timeout: budget(this) });
    await (action === 'confirm' ? buttons.last() : buttons.first()).click();
    await box.waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  }, DIALOG_HINT);
  await waitForModule(this);
});

/**
 * Press a button of the open dialog by its label, for a dialog with more
 * than two answers.
 *
 * Example #1: When I press "Delete record (!)" in the dialog
 * Example #2: When I press "Cancel" in the dialog
 * Example #3: And we press "Save and refresh" in the dialog
 * Example #4: And I press "Keep editing" in the dialog
 * Example #5: When press "Yes, discard my changes" in the dialog
 *
 */
When(/^(I |we )*press "([^"]*)?" in the dialog$/, async function (pronounCase, label) {
  const box = await requireDialog(this);
  await actOrExplain('press in the dialog', label, async () => {
    const button = box.locator('.modal-footer button', { hasText: exactLabel(label) }).first();
    if (!(await button.count())) {
      const labels = (await box.locator('.modal-footer button').allInnerTexts()).map((t) => t.trim());
      throw new Error(`the dialog offers: ${labels.join(', ')}`);
    }
    await button.click();
    await box.waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  }, DIALOG_HINT);
  await waitForModule(this);
});

/**
 * Assert a dialog with the given title is (or is not) open, for example
 * "Delete this record?".
 *
 * Example #1: Then I should see the dialog "Delete this record?"
 * Example #2: And I should not see the dialog "Delete this record?"
 * Example #3: Then we should see the dialog "New Page Content"
 * Example #4: And I should see the dialog "Refresh required"
 * Example #5: Then should not see the dialog "New Page Content"
 *
 */
Then(/^(I |we )*should( not)* see the dialog "([^"]*)?"$/, async function (pronounCase, notCase, title) {
  const box = this.page.locator('typo3-backend-modal .modal.show, .modal.show', { has: this.page.locator('.modal-title', { hasText: literal(title) }) });
  await assertPresence(box, notCase, { label: `a dialog titled "${title}"`, hint: DIALOG_HINT, timeout: budget(this) });
});

// ---------------------------------------------------------------------------
// Content elements in the Page module
// ---------------------------------------------------------------------------

/** The content element of the Page module whose preview shows `header`. */
function pageElement(world, header, column) {
  const frame = contentFrame(world);
  const scope = column
    ? frame.locator('.t3-page-column', { has: frame.locator('.t3-page-column-title', { hasText: exactLabel(column) }) })
    : frame.locator('body');
  const byHeader = frame.locator('.element-preview-header-header, .element-preview-header', { hasText: exactLabel(header) });
  const byLabel = frame.locator('.visually-hidden', { hasText: new RegExp('^\\s*id=\\d+ - ' + escapeRegExp(header) + ' - ') });
  return scope.locator('.t3-page-ce[data-uid]', { has: byHeader.or(byLabel) });
}

/**
 * Add a content element to a column of the Page module: press "Create new
 * content" in the column, pick the element type in the wizard by its label
 * ("Header Only", "Regular Text Element", "Text & Images", ...) and land in
 * the record form of the new element. The column is named by its title
 * ("Normal", "Border", ...). Select a page in the page tree first.
 *
 * Example #1: When I add a "Header Only" content element to the "Normal" column
 * Example #2: When I add a "Regular Text Element" content element to the "Normal" column
 * Example #3: When we add a "Bullet List" content element to the "Border" column
 * Example #4: And I add a "Table" content element to the "Normal" column
 * Example #5: When add a "Header Only" content element to the "Normal" column
 *
 */
When(/^(I |we )*add an? "([^"]*)?" content element to the "([^"]*)?" column$/, async function (pronounCase, type, column) {
  const page = this.page;
  await waitForModule(this);
  const frame = contentFrame(this);
  const col = frame.locator('.t3-page-column', { has: frame.locator('.t3-page-column-title', { hasText: exactLabel(column) }) }).first();
  try {
    await col.waitFor({ state: 'visible', timeout: budget(this) });
  } catch {
    const titles = (await frame.locator('.t3-page-column-title').allInnerTexts().catch(() => [])).map((t) => t.trim()).filter(Boolean);
    throw friendly({
      message: `No "${column}" column in the Page module. ${titles.length ? `The page has: ${titles.join(', ')}.` : 'The module shows no columns: select a page in the page tree first.'}`,
      hint: 'The columns are those of the backend layout of the page, named by the title above each one.',
    });
  }
  await actOrExplain(`add a "${type}" content element to the column`, column, async () => {
    await col.locator('typo3-backend-new-content-element-wizard-button').last().click();
    const wizard = page.locator('typo3-backend-new-record-wizard').first();
    await wizard.waitFor({ state: 'visible', timeout: budget(this) });
    await wizard.locator('input[name="search"]').fill(type);
    const item = wizard.locator('button.item', { has: page.locator('.item-body-label', { hasText: exactLabel(type) }) }).first();
    try {
      await item.waitFor({ state: 'visible', timeout: budget(this) });
    } catch {
      const labels = (await wizard.locator('.item-body-label').allInnerTexts().catch(() => [])).map((t) => t.trim());
      throw new Error(labels.length ? `the wizard offers for this search: ${labels.join(', ')}` : 'the wizard offers no element type with this name');
    }
    await item.click();
    await page.locator('typo3-backend-new-record-wizard').first().waitFor({ state: 'detached', timeout: budget(this) }).catch(() => {});
  }, 'The element type is the label of an item of the "New Page Content" wizard (`typo3-backend-new-record-wizard`), matched as a whole.');
  await waitForModule(this);
  await frame.locator('button[name="_savedok"]').first().waitFor({ state: 'visible', timeout: budget(this) }).catch(() => {});
});

/**
 * Assert the Page module shows (or does not show) a content element with
 * the given header, on the whole page or in one column.
 *
 * Example #1: Then I should see the "Welcome" content element in the page module
 * Example #2: And I should not see the "Draft" content element in the page module
 * Example #3: Then I should see the "Welcome" content element in the "Normal" column
 * Example #4: And we should not see the "Welcome" content element in the "Border" column
 * Example #5: Then should see the "Welcome" content element in the page module
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" content element in the (?:page module|"([^"]*)" column)$/, async function (pronounCase, notCase, header, column) {
  await waitForModule(this);
  await assertPresence(pageElement(this, header, column), notCase, {
    label: `a "${header}" content element in ${column ? `the "${column}" column` : 'the Page module'}`,
    hint: CE_HINT,
    timeout: budget(this),
  });
});

/**
 * Act on a content element of the Page module through the buttons of its
 * header: "edit" opens its record form, "hide" and "unhide" switch its
 * visibility, "delete" asks for confirmation in a dialog (follow with "I
 * confirm the dialog").
 *
 * Example #1: When I edit the "Welcome" content element
 * Example #2: When I hide the "Welcome" content element
 * Example #3: When we unhide the "Welcome" content element
 * Example #4: And I delete the "Welcome" content element
 * Example #5: When edit the "Welcome" content element
 *
 */
When(/^(I |we )*(edit|hide|unhide|delete) the "([^"]*)?" content element$/, async function (pronounCase, action, header) {
  await waitForModule(this);
  const element = pageElement(this, header).first();
  await assertPresence(element, undefined, { label: `a "${header}" content element in the Page module`, hint: CE_HINT, timeout: budget(this) });
  const selector = {
    edit: '.t3-page-ce-header a[href*="/record/edit"]',
    hide: '.t3-page-ce-header a[href*="%5Bhidden%5D=1"]',
    unhide: '.t3-page-ce-header a[href*="%5Bhidden%5D=0"]',
    delete: '.t3-page-ce-header a[href*="%5Bdelete%5D=1"]',
  }[action];
  const button = element.locator(selector).first();
  if (!(await button.count())) {
    const hidden = await element.evaluate((el) => el.classList.contains('t3-page-ce-hidden'));
    throw friendly({
      message: `The "${header}" content element has no "${action}" button.`,
      hint: (action === 'hide' || action === 'unhide')
        ? `The element is ${hidden ? 'hidden: use "unhide"' : 'visible: use "hide"'}.`
        : 'The account may not have the right to change this element.',
    });
  }
  await actOrExplain(`${action} the content element`, header, () => button.click(), CE_HINT);
  await waitForModule(this);
});

/**
 * Assert a content element of the Page module is (or is not) hidden: a
 * hidden element carries `t3-page-ce-hidden`.
 *
 * Example #1: Then the "Welcome" content element should be hidden
 * Example #2: And the "Welcome" content element should not be hidden
 * Example #3: Then the "Draft" content element should be hidden
 * Example #4: And the "Teaser" content element should not be hidden
 * Example #5: Then the "Footer note" content element should not be hidden
 *
 */
Then(/^the "([^"]*)?" content element should( not)* be hidden$/, async function (header, notCase) {
  await waitForModule(this);
  const element = pageElement(this, header).first();
  await assertPresence(element, undefined, { label: `a "${header}" content element in the Page module`, hint: CE_HINT, timeout: budget(this) });
  const read = () => element.evaluate((el) => el.classList.contains('t3-page-ce-hidden'));
  const deadline = Date.now() + budget(this);
  let hidden = await read();
  while ((notCase ? hidden : !hidden) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    hidden = await read().catch(() => hidden);
  }
  if (notCase ? hidden : !hidden) {
    throw friendly({
      message: notCase ? `Expected the "${header}" content element not to be hidden, but it is.` : `Expected the "${header}" content element to be hidden, but it is visible.`,
      hint: CE_HINT,
    });
  }
});

// ---------------------------------------------------------------------------
// The List module
// ---------------------------------------------------------------------------

/** The table of the List module headed by `name` ("Page Content"). */
function listTable(world, name) {
  const frame = contentFrame(world);
  const heading = frame.locator('.recordlist-heading-title', { hasText: new RegExp('^\\s*' + escapeRegExp(name) + '\\s*(\\(\\s*\\d+\\s*\\))?\\s*$') });
  return frame.locator('.recordlist', { has: heading });
}

/** The row of a table of the List module whose title is `title`. */
function listRecord(world, title, table) {
  const frame = contentFrame(world);
  return listTable(world, table).locator('tr[data-uid]', { has: frame.locator('.col-title', { hasText: exactLabel(title) }) });
}

/**
 * Assert the List module shows (or does not show) a table for the selected
 * page. The table is named as the module heads it, without the number of
 * records: "Page", "Page Content", "Backend user", ...
 *
 * Example #1: Then I should see the "Page Content" table in the list module
 * Example #2: And I should see the "Page" table in the list module
 * Example #3: Then I should not see the "Backend user" table in the list module
 * Example #4: And we should see the "Page Content" table in the list module
 * Example #5: Then should not see the "Website User" table in the list module
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)?" table in the list module$/, async function (pronounCase, notCase, table) {
  await waitForModule(this);
  await assertPresence(listTable(this, table), notCase, { label: `a "${table}" table in the List module`, hint: LIST_HINT, timeout: budget(this) });
});

/**
 * Assert a table of the List module lists (or does not list) a record with
 * the given title.
 *
 * Example #1: Then I should see the record "Welcome" in the "Page Content" table
 * Example #2: And I should not see the record "Draft" in the "Page Content" table
 * Example #3: Then I should see the record "News" in the "Page" table
 * Example #4: And we should not see the record "Checkout" in the "Page" table
 * Example #5: Then should see the record "Welcome" in the "Page Content" table
 *
 */
Then(/^(I |we )*should( not)* see the record "([^"]*)?" in the "([^"]*)?" table$/, async function (pronounCase, notCase, title, table) {
  await waitForModule(this);
  if (!notCase) await assertPresence(listTable(this, table), undefined, { label: `a "${table}" table in the List module`, hint: LIST_HINT, timeout: budget(this) });
  await assertPresence(listRecord(this, title, table), notCase, { label: `a record "${title}" in the "${table}" table`, hint: LIST_HINT, timeout: budget(this) });
});

/**
 * Act on a record of a table of the List module through the buttons of its
 * row: "edit" opens its record form, "hide" and "unhide" switch its
 * visibility, "delete" asks for confirmation in a dialog (follow with "I
 * confirm the dialog").
 *
 * Example #1: When I edit the record "Welcome" in the "Page Content" table
 * Example #2: When I hide the record "Welcome" in the "Page Content" table
 * Example #3: When we unhide the record "Welcome" in the "Page Content" table
 * Example #4: And I delete the record "Welcome" in the "Page Content" table
 * Example #5: When edit the record "News" in the "Page" table
 *
 */
When(/^(I |we )*(edit|hide|unhide|delete) the record "([^"]*)?" in the "([^"]*)?" table$/, async function (pronounCase, action, title, table) {
  await waitForModule(this);
  const row = listRecord(this, title, table).first();
  await assertPresence(row, undefined, { label: `a record "${title}" in the "${table}" table`, hint: LIST_HINT, timeout: budget(this) });
  const selector = {
    edit: '.col-control a[href*="/record/edit"]',
    hide: '.col-control [data-datahandler-action="visibility"][data-datahandler-status="visible"]',
    unhide: '.col-control [data-datahandler-action="visibility"][data-datahandler-status="hidden"]',
    delete: '.col-control .t3js-modal-trigger[data-params*="[delete]"], .col-control .t3js-modal-trigger[data-uri*="%5Bdelete%5D"]',
  }[action];
  const button = row.locator(selector).first();
  if (!(await button.count())) {
    throw friendly({
      message: `The record "${title}" has no "${action}" button in the "${table}" table.`,
      hint: (action === 'hide' || action === 'unhide')
        ? 'A hidden record offers "unhide" and a visible one "hide"; a table without a visibility field offers neither.'
        : 'The account may not have the right to change this record.',
    });
  }
  await actOrExplain(`${action} the record`, title, () => button.click(), LIST_HINT);
  await waitForModule(this);
});

/**
 * Assert a record of a table of the List module is (or is not) hidden: the
 * icon of a hidden record carries the `icon-overlay-hidden` overlay.
 *
 * Example #1: Then the record "Welcome" in the "Page Content" table should be hidden
 * Example #2: And the record "Welcome" in the "Page Content" table should not be hidden
 * Example #3: Then the record "News" in the "Page" table should be hidden
 * Example #4: And the record "News" in the "Page" table should not be hidden
 * Example #5: Then the record "Draft" in the "Page Content" table should be hidden
 *
 */
Then(/^the record "([^"]*)?" in the "([^"]*)?" table should( not)* be hidden$/, async function (title, table, notCase) {
  await waitForModule(this);
  const row = listRecord(this, title, table).first();
  await assertPresence(row, undefined, { label: `a record "${title}" in the "${table}" table`, hint: LIST_HINT, timeout: budget(this) });
  const overlay = row.locator('.col-icon .icon-overlay-hidden');
  const deadline = Date.now() + budget(this);
  let hidden = (await overlay.count()) > 0;
  while ((notCase ? hidden : !hidden) && Date.now() < deadline) {
    await smartSettle(this.page, 250);
    hidden = (await overlay.count()) > 0;
  }
  if (notCase ? hidden : !hidden) {
    throw friendly({
      message: notCase ? `Expected the record "${title}" not to be hidden, but its icon carries the hidden overlay.` : `Expected the record "${title}" to be hidden, but its icon carries no hidden overlay.`,
      hint: LIST_HINT,
    });
  }
});

// ---------------------------------------------------------------------------
// A clean start
// ---------------------------------------------------------------------------

/**
 * Make sure a page does not exist before a scenario creates it: while the
 * page tree shows a page at the path, delete it through its context menu
 * and confirm. Does nothing when there is no such page, so a scenario that
 * was interrupted can run again. The page tree must be shown.
 *
 * Example #1: Given there is no "Congratulations > 404 > Webship test page" page
 * Example #2: Given there is no "Congratulations > News" page
 * Example #3: And there is no "Congratulations > 404 > Draft" page
 * Example #4: Given there is no "Congratulations > Pages > Temporary" page
 * Example #5: And there is no "Congratulations > Checkout" page
 *
 */
Given(/^there is no "([^"]*)?" page$/, async function (path) {
  const page = this.page;
  for (let guard = 0; guard < 10; guard += 1) {
    const node = await revealTreePath(this, path, { optional: true });
    if (!node) return;
    await actOrExplain('delete the page', path, async () => {
      await node.locator('.node-contentlabel').first().click({ button: 'right' });
      const item = page.locator('typo3-backend-context-menu [role="menuitem"]', { hasText: exactLabel('Delete') }).first();
      await item.waitFor({ state: 'visible', timeout: budget(this) });
      await item.click();
      const box = dialog(this);
      await box.waitFor({ state: 'visible', timeout: budget(this) });
      await box.locator('.modal-footer button').last().click();
      await box.waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
      await node.waitFor({ state: 'detached', timeout: budget(this) }).catch(() => {});
    }, TREE_HINT + ' The account needs the right to delete the page.');
    await waitForModule(this);
  }
  throw friendly({ message: `Could not remove every "${path}" page: one is still in the page tree after 10 deletions.`, hint: TREE_HINT });
});
