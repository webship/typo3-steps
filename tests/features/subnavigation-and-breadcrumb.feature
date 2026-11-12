# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Subnavigation and breadcrumb
  As a visitor
  I want the subnavigation and the breadcrumb of a content page
  So that I know where I am and can move to the neighbouring pages

  Background:
    Given I am on "/content-examples/form-elements/forms"

  Scenario: The subnavigation lists the neighbouring pages
    Then I should see the "Forms" subnavigation item
    And I should see the "Login" subnavigation item
    And I should see the "Search" subnavigation item
    And I should not see the "Checkout" subnavigation item

  Scenario: Open a page from the subnavigation
    When I open the "Search" subnavigation item
    Then I should be on "/content-examples/form-elements/search"
    And I should be viewing the "Search" page

  Scenario: The breadcrumb shows the path to the page
    Then I should see the breadcrumb
    And the breadcrumb should contain "Congratulations"
    And the breadcrumb should contain "Content Examples"
    And "Forms" should be in the breadcrumb
    And the breadcrumb should not contain "Checkout"

  Scenario: The start page has no breadcrumb
    Given I am on the homepage
    Then I should not see the breadcrumb
