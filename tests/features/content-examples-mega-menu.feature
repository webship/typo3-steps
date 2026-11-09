Feature: Content Examples mega menu
  As a visitor
  I want to reach a content-example page through the "Content Examples" mega menu
  So that I can browse the individual content-element demos

  Scenario: The mega menu lists content-example links
    Given I am on the homepage
    When I open the mega menu
    Then I should see the "Accordion" dropdown link
    And I should see the "Quote" dropdown link
    And I should see the "Gallery" dropdown link

  Scenario: Open the Quote page through the mega menu
    Given I am on the homepage
    When I open the mega menu
    And I open the "Quote" dropdown link
    Then I should be on "/content-examples/text/quote"
    And I should be viewing the "Quote" page

  Scenario: Open the Accordion page through the mega menu
    Given I am on the homepage
    When I open the mega menu
    And I open the "Accordion" dropdown link
    Then I should be on "/content-examples/interactive/accordion"
    And I should be viewing the "Accordions" page

  @mobile
  Scenario: Open a content-example page through the mega menu on a mobile viewport
    Given I am on the homepage
    When I set the viewport to the "xs" breakpoint
    And I reload the page
    And I open the mega menu
    And I open the "Quote" dropdown link
    Then I should be on "/content-examples/text/quote"
