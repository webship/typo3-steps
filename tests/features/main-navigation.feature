Feature: Main navigation
  As a visitor
  I want to move between the site's top-level pages via the main menu
  So that I can reach the content I'm looking for

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
