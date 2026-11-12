# The accounts are those of the users registry in cucumber.js.
Feature: Caches
  As an administrator
  I want to flush the caches from the backend
  So that a change shows on the website at once

  Scenario: Flush the frontend caches
    Given I am a logged in user with the "admin" user
    When I flush the frontend caches
    Then I should not see the notification "Error"

  Scenario: Flush all caches
    Given I am a logged in user with the "admin" user
    When I flush all caches
    Then I should not see the notification "Error"

  Scenario: Clear the cache of one page
    Given I am a logged in user with the "admin" user
    And I open the "Page" module
    And I select the "Congratulations > Features" page in the page tree
    When I clear the cache of the page
    Then I should see the notification "Successfully cleared page cache"
    And I should not see the notification "Error"
