# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Page not found
  As a visitor
  I want a clear answer for an address that does not exist
  So that I know the page was not found instead of seeing a broken page

  Scenario: An unknown address answers with the page not found page
    Given I am on "/this-page-does-not-exist"
    Then I should be on the 404 page
    And I should see "Page Not Found"

  Scenario: An existing page is not a page not found answer
    Given I am on "/features"
    Then I should not be on the 404 page
    And I should see "Features"
