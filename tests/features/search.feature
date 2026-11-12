# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Search
  As a visitor
  I want to search the site
  So that I can find a page without browsing the menus

  # Indexed Search adds a page to its index the first time the page is
  # rendered for a visitor, so the background opens the pages it searches for.
  Background:
    Given I am on "/features"
    And I am on "/customize"
    And I am on "/content-examples/form-elements/search"

  Scenario: The search page carries the search form
    Then I should see an "indexedsearch_pi2" content element
    And I should see "ready to use search" in the "Indexed Search" content element

  Scenario: A search lists the pages that contain the word
    When I search the site for "TYPO3"
    Then I should see search results
    And I should see "Features" in the search results
    And I should see "Customize" in the search results
    And I should not see "Checkout" in the search results

  Scenario: A search for an unknown word returns nothing
    When I search the site for "zzzqqqxyz"
    Then I should see no search results
    And I should see "No results found."
