# The module names are those of a TYPO3 13 backend in English; the accounts
# are those of the users registry in cucumber.js.
Feature: Backend modules
  As an editor
  I want the modules my account may use, and no others
  So that I can do my work without the tools of an administrator

  Scenario: The administrator opens modules from the module menu
    Given I am a logged in user with the "admin" user
    When I open the "Page" module
    Then the "Page" module should be active
    And the module heading should be "TYPO3 Introduction"
    And I should see the info message "Please select a page in the page tree" in the module
    When I open the "List" module
    Then the "List" module should be active
    And the "Page" module should not be active

  Scenario: Two modules with the same label are told apart by their group
    Given I am a logged in user with the "admin" user
    When I open the "Site Management > Settings" module
    Then the "site_settings" module should be active
    And I should see "Site Settings" in the module

  Scenario: The administrator has the administration modules
    Given I am a logged in user with the "admin" user
    Then I should see the "Extensions" module
    And I should see the "Backend Users" module
    And I should see the "Admin Tools > Settings" module

  Scenario: The editor only has the content modules
    Given I am a logged in user with the "editor" user
    Then I should see the "Page" module
    And I should see the "List" module
    And I should see the "Forms" module
    And I should not see the "Extensions" module
    And I should not see the "Backend Users" module
    And I should not see the "Log" module

  Scenario: The administrator reads the log
    Given I am a logged in user with the "admin" user
    When I open the "Log" module
    Then the "Log" module should be active
    And the module heading should be "Administration log"
    And I should not see the error message "Access denied" in the module

  Scenario: The editor reaches the form definitions
    Given I am a logged in user with the "editor" user
    When I open the "Forms" module
    Then the "Forms" module should be active
    And the module heading should be "Form Management"
    And I should see "Introduction Contact Form" in the module
