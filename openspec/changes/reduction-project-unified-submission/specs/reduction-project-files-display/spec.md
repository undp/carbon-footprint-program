## ADDED Requirements

### Requirement: getReductionProjectById returns submission files

`GET /reduction-projects/:id` SHALL include a `files` array in its response, containing the files linked to the most recent submission for that project. If no submission exists, `files` SHALL be an empty array.

#### Scenario: Project with submission returns files

- **WHEN** `GET /reduction-projects/:id` is called for a project with a PENDING submission that has linked files
- **THEN** the response includes a `files` array with each file's id, name, url, and any other metadata needed for display

#### Scenario: Project with no submission returns empty files

- **WHEN** `GET /reduction-projects/:id` is called for a project with no submissions
- **THEN** the response includes `files: []`

### Requirement: File upload section is always visible in the reduction project form

The reduction project form SHALL always render the file upload input section, regardless of the project's display status.

#### Scenario: Form always shows file upload

- **WHEN** the reduction project form is open (for create or edit)
- **THEN** the file upload section is visible and interactive

### Requirement: SUBMITTED status renders the entire form as read-only

When a reduction project has `SUBMITTED` display status, the frontend form SHALL render all fields (name, description, and all other content fields) and the file section as non-interactive. The user can view the submitted data but cannot modify or re-submit it.

#### Scenario: SUBMITTED project shows existing files as read-only

- **WHEN** the user opens the form for a project with SUBMITTED display status
- **THEN** the file upload section displays the files from the latest submission in a read-only state (no add/remove controls)

#### Scenario: SUBMITTED project disables all form fields

- **WHEN** the user opens the form for a project with SUBMITTED display status
- **THEN** all form fields are disabled and the submit button is hidden or disabled

### Requirement: REVIEWED status shows empty file input

When a reduction project has `REVIEWED` display status, the frontend form SHALL show an empty file upload section, requiring the user to attach new files before re-submitting.

#### Scenario: REVIEWED project clears file input

- **WHEN** the user opens the form for a project with REVIEWED display status
- **THEN** the file upload input is empty (previously submitted files are NOT pre-populated)

#### Scenario: REVIEWED project requires new files on submit

- **WHEN** the user submits the form for a REVIEWED project without attaching any files
- **THEN** the form shows a validation error requiring at least one file

### Requirement: REVIEWED re-submission calls PATCH and creates a new submission

When the user submits the form for a `REVIEWED` project, the frontend SHALL call `PATCH /reduction-projects/:id` with the current field values and the new `fileUuids`. The backend MUST create a new `REDUCTION_PROJECT_VERIFICATION` submission and link the new files to it, transitioning the project back to `SUBMITTED` display status.

#### Scenario: Successful REVIEWED re-submission

- **WHEN** the user attaches at least one file and submits the form for a REVIEWED project
- **THEN** `PATCH /reduction-projects/:id` is called with all field values and the new `fileUuids`, a new submission is created, and the project transitions to SUBMITTED display status

#### Scenario: REVIEWED re-submission does not reuse or modify the old submission

- **WHEN** `PATCH /reduction-projects/:id` is processed for a REVIEWED project with `fileUuids`
- **THEN** the existing REVIEWED submission is left unchanged and a new `REDUCTION_PROJECT_VERIFICATION` submission is created
