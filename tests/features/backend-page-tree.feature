# The page titles are those of the typo3/cms-introduction demo content.
Feature: Page tree
  As an editor
  I want to find a page in the page tree and open it in a module
  So that I can work on the right page

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "Page" module

  Scenario: Select a page and read it in the module
    When I select the "Congratulations" page in the page tree
    Then the module heading should be "Congratulations"
    And I should see "Create new content" in the module

  Scenario: Reach a deep page by its path
    When I select the "Congratulations > Content Examples > Text > Rich Text" page in the page tree
    Then the module heading should be "Rich Text"
    And I should see the "Congratulations > Content Examples > Text > Quote" page in the page tree

  Scenario: Expand and collapse a page
    When I expand the "Congratulations > Pages" page in the page tree
    Then I should see the "Congratulations > Pages > 2 Columns" page in the page tree
    When I collapse the "Congratulations > Pages" page in the page tree
    Then I should not see the "2 Columns" page in the page tree

  Scenario: A page that does not exist is not in the tree
    Then I should see the "Congratulations > Features" page in the page tree
    And I should not see the "Congratulations > Checkout" page in the page tree
    And the "Congratulations > Features" page should not be hidden in the page tree

  Scenario: Filter the page tree
    When I search the page tree for "Accordion"
    Then I should see the "Accordion" page in the page tree
    And I should not see the "Features" page in the page tree
    When I search the page tree for ""
    Then I should see the "Congratulations > Features" page in the page tree

  Scenario: The module follows the page when the module changes
    When I select the "Congratulations > Features" page in the page tree
    And I open the "List" module
    Then the module heading should be "Features"
    And I should see "Page Content" in the module
