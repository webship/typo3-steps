# The accounts are those of the users registry in cucumber.js; the module
# names are those of a TYPO3 13 backend in English.
Feature: Backend login
  As an editor
  I want to log in to and out of the backend
  So that only people with an account can change the site

  Scenario: An anonymous visitor gets the login form
    Given I am not logged in
    Then I should not be logged in
    And I should see "Username"
    And I should see "Password"

  Scenario: The administrator logs in by its handle
    Given I am a logged in user with the "admin" user
    Then I should be logged in
    And I should be logged in as "admin"
    And I should not be logged in as "editor"

  Scenario: The editor logs in by its handle
    Given I am a logged in user with the "editor" user
    Then I should be logged in as "editor"

  Scenario: A wrong password is refused
    Given I am not logged in
    When I log in to the backend as "admin" with password "not-the-password"
    Then I should see a login error
    And I should see the login error "Your login attempt did not succeed"
    And I should not be logged in

  Scenario: Logging out returns to the login form
    Given I am a logged in user with the "editor" user
    When I log out
    Then I should not be logged in
    And I should not see a login error
