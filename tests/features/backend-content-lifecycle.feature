# The page titles are those of the typo3/cms-introduction demo content; the
# labels are those of a TYPO3 13 backend in English. The scenarios build on
# each other: a page is created, filled, hidden, shown and deleted again.
Feature: Pages and content elements
  As an editor
  I want to create, change, hide and delete a page and its content
  So that I can keep the website up to date

  Background:
    Given I am a logged in user with the "admin" user
    And I open the "Page" module

  Scenario: A page needs a title
    Given there is no "Congratulations > 404 > Webship test page" page
    When I choose "New subpage" from the context menu of the "Congratulations > 404" page
    Then the module heading should be "Create new Page"
    When I save the record
    Then the "Page Title" record field should be marked as invalid
    And I should not see the notification "Record saved"

  Scenario: Create a page
    When I choose "New subpage" from the context menu of the "Congratulations > 404" page
    And I fill in the "Page Title" record field with "Webship test page"
    Then the "Page Title" record field should not be marked as invalid
    When I save the record
    Then I should see the notification "Record saved"
    And the module heading should be "Edit Page"
    And the "Page Title" record field should contain "Webship test page"
    When I close the record
    Then I should see the "Congratulations > 404 > Webship test page" page in the page tree
    And the "Congratulations > 404 > Webship test page" page should be hidden in the page tree

  # A logged in backend user previews hidden pages, so the visitor scenarios
  # drop the session first.
  Scenario: A new page is hidden from visitors until it is enabled
    Given I am not logged in
    And I am on "/404/webship-test-page"
    Then I should be on the 404 page

  Scenario: Enable the page
    When I choose "Enable" from the context menu of the "Congratulations > 404 > Webship test page" page
    Then the "Congratulations > 404 > Webship test page" page should not be hidden in the page tree

  Scenario: Add a content element to the page
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I add a "Header Only" content element to the "Normal" column
    And I fill in the "Header" record field with "Webship test header"
    And I fill in the "Subheader" record field with "Written by an automated test"
    And I select "Center" in the "Alignment" record field
    And I save the record
    Then I should see the notification "Record saved"
    And the "Alignment" record field should contain "Center"
    When I close the record
    Then I should see the "Webship test header" content element in the page module
    And I should see the "Webship test header" content element in the "Normal" column
    And I should not see the "Webship test header" content element in the "Border" column
    And the "Webship test header" content element should not be hidden

  Scenario: Visitors see the page and its content
    Given I am not logged in
    And I am on "/404/webship-test-page"
    Then I should not be on the 404 page
    And I should see "Webship test header"
    And I should see "Written by an automated test"
    And I should see a "header" content element

  Scenario: Edit the content element
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I edit the "Webship test header" content element
    Then the "Header" record field should contain "Webship test header"
    When I fill in the "Header" record field with "Webship edited header"
    And I open the "Appearance" record tab
    And I select "No Frame" in the "Frame" record field
    Then I should see the dialog "Refresh required"
    When I press "Save and refresh" in the dialog
    Then I should not see the dialog "Refresh required"
    And the "Frame" record field should contain "No Frame"
    When I close the record
    Then I should see the "Webship edited header" content element in the page module
    And I should not see the "Webship test header" content element in the page module

  Scenario: Hide and show the content element
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I hide the "Webship edited header" content element
    Then the "Webship edited header" content element should be hidden
    When I unhide the "Webship edited header" content element
    Then the "Webship edited header" content element should not be hidden

  Scenario: The List module shows the records of the page
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I open the "List" module
    Then I should see the "Page Content" table in the list module
    And I should see the record "Webship edited header" in the "Page Content" table
    And I should not see the record "Webship test header" in the "Page Content" table
    And the record "Webship edited header" in the "Page Content" table should not be hidden
    When I hide the record "Webship edited header" in the "Page Content" table
    Then the record "Webship edited header" in the "Page Content" table should be hidden
    When I unhide the record "Webship edited header" in the "Page Content" table
    Then the record "Webship edited header" in the "Page Content" table should not be hidden

  Scenario: Edit a record from the List module
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I open the "List" module
    And I edit the record "Webship edited header" in the "Page Content" table
    Then the module heading should be "Edit Page Content"
    When I fill in the "Header" record field with "Webship listed header"
    And I save the record
    And I close the record
    Then I should see the record "Webship listed header" in the "Page Content" table

  Scenario: Delete a record from the List module
    When I select the "Congratulations > 404 > Webship test page" page in the page tree
    And I open the "List" module
    And I delete the record "Webship listed header" in the "Page Content" table
    Then I should see the dialog "Delete this record?"
    When I cancel the dialog
    Then I should see the record "Webship listed header" in the "Page Content" table
    When I delete the record "Webship listed header" in the "Page Content" table
    And I confirm the dialog
    Then I should not see the record "Webship listed header" in the "Page Content" table

  Scenario: Rename the page
    When I choose "Edit" from the context menu of the "Congratulations > 404 > Webship test page" page
    And I fill in the "Page Title" record field with "Webship renamed page"
    And I save the record
    And I close the record
    Then I should see the "Congratulations > 404 > Webship renamed page" page in the page tree
    And I should not see the "Congratulations > 404 > Webship test page" page in the page tree

  Scenario: Hide the page
    When I choose "Disable" from the context menu of the "Congratulations > 404 > Webship renamed page" page
    Then the "Congratulations > 404 > Webship renamed page" page should be hidden in the page tree

  Scenario: Delete the page
    When I choose "Delete" from the context menu of the "Congratulations > 404 > Webship renamed page" page
    Then I should see the dialog "Delete"
    When I confirm the dialog
    Then I should not see the "Congratulations > 404 > Webship renamed page" page in the page tree
