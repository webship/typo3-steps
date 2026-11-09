Feature: Accordion content element
  As a visitor
  I want to expand the accordion panels on the Accordion content-example page
  So that I can read each panel's content without leaving the page

  Background:
    Given I am on "/content-examples/interactive/accordion"

  Scenario: The accordion page loads with its panels
    Then I should be viewing the "Accordions" page
    And I should see "Media Left"
    And I should see "Media Right"
    And I should see "No Media"

  Scenario: Expand a panel and read its content
    When I open the "Media Left" accordion panel
    Then I should see "short video" in the "Media Left" accordion panel

  Scenario: Expand another panel and read its content
    When I open the "Media Right" accordion panel
    Then I should see "meanest place" in the "Media Right" accordion panel

  Scenario: Expand the text-only panel and read its content
    When I open the "No Media" accordion panel
    Then I should see "Lorem ipsum" in the "No Media" accordion panel

  @mobile
  Scenario: Expand a panel on a mobile viewport
    When I set the viewport to the "xs" breakpoint
    And I open the "No Media" accordion panel
    Then I should see "Lorem ipsum" in the "No Media" accordion panel
