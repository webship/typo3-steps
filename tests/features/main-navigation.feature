# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Main navigation
  As a visitor
  I want to move between the top-level pages of the site through the main menu
  So that I can reach the content I am looking for

  Scenario: Open the Features page from the main menu
    Given I am on the homepage
    When I open the "Features" menu item
    Then I should be on "/features"
    And I should be viewing the "feature set" page

  Scenario: Open the Customize page from the main menu
    Given I am on the homepage
    When I open the "Customize" menu item
    Then I should be on "/customize"
    And I should be viewing the "Incredible flexible" page

  Scenario: Open the Pages page from the main menu
    Given I am on the homepage
    When I open the "Pages" menu item
    Then I should be on "/pages"
    And I should be viewing the "Page Layouts" page

  Scenario: Navigate back to the homepage after visiting another page
    Given I am on the homepage
    When I open the "Features" menu item
    Then I should be on "/features"
    When I go to the homepage
    Then I should be on the homepage

  @mobile
  Scenario: Open a top-level page on a mobile viewport
    Given I am on the homepage
    When I set the viewport to the "xs" breakpoint
    And I reload the page
    And I open the "Pages" menu item
    Then I should be on "/pages"

  Scenario: The menu item of the page being viewed is the current one
    Given I am on "/features"
    Then the "Features" menu item should be current
    And the "Customize" menu item should not be current

  Scenario: A label is matched as a whole
    Given I am on the homepage
    Then I should see the "Pages" menu item
    And I should not see the "Page" menu item

  Scenario: Open a subpage through a simple dropdown
    Given I am on the homepage
    When I open the dropdown of the "Pages" menu item
    Then I should see the "2 Columns" dropdown link
    When I open the "2 Columns" dropdown link
    Then I should be on "/pages/2-columns"
    And the "Pages" menu item should be active
    And the "Pages" menu item should not be current
    And the "Customize" menu item should not be active
