# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Languages
  As a visitor
  I want to read a page in my own language
  So that I can use the site without knowing English

  Scenario: A translated page offers its translations
    Given I am on "/content-examples/and-more/any-language-any-character"
    Then the page language should be "en-US"
    And the "Deutsch" language should be available
    And the "Dansk" language should be available

  Scenario: Switch a translated page to German and back
    Given I am on "/content-examples/and-more/any-language-any-character"
    When I switch to the "Deutsch" language
    Then I should be on "/de/content-examples/and-more/jede-sprache-jedes-zeichen"
    And the page language should be "de-DE"
    When I switch to the "English" language
    Then I should be on "/content-examples/and-more/any-language-any-character"
    And the page language should be "en-US"

  Scenario: Switch a translated page to Danish by its language code
    Given I am on "/content-examples/and-more/any-language-any-character"
    When I switch to the "da-DK" language
    Then I should be on "/da/content-examples/and-more/alle-sprog-alle-tegn"
    And the page language should be "da-DK"

  Scenario: A page without a translation does not offer the language
    Given I am on the homepage
    Then the "English" language should be available
    And the "Deutsch" language should not be available
    And the "Dansk" language should not be available
