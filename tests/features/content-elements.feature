# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Content elements
  As an editor
  I want to check which content elements a page renders
  So that I know the page is built from the elements I placed on it

  Scenario: The start page is built from text and icon elements
    Given I am on the homepage
    Then I should see a "texticon" content element
    And I should see 3 "texticon" content elements
    And I should see a "textpic" content element
    And I should not see a "form_formframework" content element

  Scenario: The forms page carries a text element and a form
    Given I am on "/content-examples/form-elements/forms"
    Then I should see 1 "form_formframework" content element
    And I should see "contact or mail form" in the "Powerful Form Handling" content element
    And I should not see "Lorem ipsum" in the "Powerful Form Handling" content element

  Scenario: Every page names TYPO3 as its generator
    Given I am on the homepage
    Then the site should be running TYPO3
