# The audit steps are webship-js's own (axe-core). The levels below are the
# ones the Introduction demo content holds on the Bootstrap Package theme; a
# site that fixes the findings named in the comments can raise them.
@a11y
Feature: Accessibility audit
  As a site owner
  I want the main pages audited against the accessibility rules
  So that a theme or a content change cannot quietly ship a serious violation

  # The only finding on these pages is a moderate one: a heading level is
  # skipped ("heading-order").
  Scenario Outline: A public page has no serious accessibility violations
    Given I am on "<path>"
    Then the page should have no serious accessibility violations
    And the page should have no critical accessibility violations
    And the page should have a title
    And the page language should be "en-US"

    Examples:
      | path                                  |
      | /                                     |
      | /features                             |
      | /content-examples/form-elements/forms |

  Scenario Outline: A page with a form passes the audit without a finding
    Given I am on "<path>"
    Then the page should have no accessibility violations
    And every form field should have an accessible label

    Examples:
      | path                                   |
      | /content-examples/form-elements/login  |
      | /content-examples/form-elements/search |

  # The rich text example carries one text colour with too little contrast
  # ("color-contrast", serious), so this page is held at the critical level.
  Scenario: A content page has no critical accessibility violations
    Given I am on "/content-examples/text/rich-text"
    Then the page should have no critical accessibility violations
    And the page should not violate the accessibility rule "image-alt"
    And the page should not violate the accessibility rule "link-name"

  Scenario: A translated page declares its language
    Given I am on "/de/content-examples/and-more/jede-sprache-jedes-zeichen"
    Then the page language should be "de-DE"
    And the page should have no critical accessibility violations

  # The login form of the backend carries one text colour with too little
  # contrast ("color-contrast", serious).
  Scenario: The backend login page has no critical accessibility violations
    Given I am not logged in
    Then the page should have no critical accessibility violations
    And every form field should have an accessible label
    And the page should have a title

  # The backend shell of TYPO3 13.4 carries one critical finding of its own
  # ("aria-valid-attr-value" on two elements), so the shell is checked rule
  # by rule here.
  Scenario: The backend names its page, its language, its buttons and its links for an editor
    Given I am a logged in user with the "editor" user
    When I open the "Page" module
    And I select the "Congratulations > Features" page in the page tree
    Then the page should have a title
    And the page should not violate the accessibility rule "html-has-lang"
    And the page should not violate the accessibility rule "button-name"
    And the page should not violate the accessibility rule "link-name"
    And the page should not violate the accessibility rule "image-alt"
