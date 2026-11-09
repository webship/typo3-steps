# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Home page
  As a visitor
  I want the TYPO3 Introduction home page to load with its key content and navigation
  So that I know the site is working before I explore further

  Background:
    Given I am on the homepage

  Scenario: Home page loads with its hero heading
    Then I should be viewing the "enterprise CMS" page
    And I should see "Possibilities"

  Scenario: Main menu shows the top-level items
    Then I should see the "Home" menu item
    And I should see the "Features" menu item
    And I should see the "Customize" menu item
    And I should see the "Pages" menu item
    And I should see the "Content Examples" menu item

  @mobile
  Scenario: Main menu is reachable on a mobile viewport
    When I set the viewport to the "xs" breakpoint
    And I reload the page
    Then I should see the "Features" menu item
    And I should see the "Content Examples" menu item
