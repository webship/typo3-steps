# The paths, menu labels and copy below are those of the typo3/cms-introduction
# demo content on the bootstrap_package theme; swap them for your own content
# when you copy this feature.
Feature: Contact form
  As a visitor
  I want the contact form to tell me what I left out and to confirm a complete message
  So that I know whether my message was accepted

  Background:
    Given I am on "/content-examples/form-elements/forms"

  Scenario: An empty form marks its mandatory fields
    When I submit the "introductionContactForm" form
    Then the "Full name and surname" field should be marked as invalid
    And the "Email" field should be marked as invalid
    And the "Subject" field should be marked as invalid
    And the "Message" field should be marked as invalid
    And the "Company" field should not be marked as invalid
    And I should see the error "This field is mandatory." for the "Email" field
    And I should not see the error "This field is mandatory." for the "Company" field

  Scenario: An invalid email address is refused
    When I fill in "Full name and surname" with "Webship QA"
    And I fill in "Email" with "not-an-email"
    And I fill in "Subject" with "A question"
    And I fill in "Message" with "A message written by an automated test."
    And I submit the "introductionContactForm" form
    Then the "Email" field should be marked as invalid
    And I should see the error "You must enter a valid email address." for the "Email" field
    And the "Subject" field should not be marked as invalid

  Scenario: A complete form is confirmed
    When I fill in "Full name and surname" with "Webship QA"
    And I fill in "Email" with "subscriber@example.com"
    And I fill in "Subject" with "A question"
    And I fill in "Message" with "A message written by an automated test."
    And I submit the "introductionContactForm" form
    Then I should be on "/content-examples/form-elements/forms/thank-you"
    And I should see "Thank you!"
