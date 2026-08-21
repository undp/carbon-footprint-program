## ADDED Requirements

### Requirement: The representative's identifier is labelled as an identity document

The field that holds the representative's bare identifier SHALL be labelled as the representative's identity document, and SHALL NOT be labelled with a country-specific identifier name outside the deployment's shared label constant.

The kind of document SHALL NOT be stored as a separate field. The document number identifies its own kind well enough for this deployment — a national identity document carries the country's fixed format and a passport does not — and no consumer reports on the distinction. Storing a type only earns a column once something reads it.

#### Scenario: The identifier is named as an identity document

- **WHEN** the representative section of the organization form renders
- **THEN** the identifier field is labelled as the representative's identity document

#### Scenario: Existing record renders unchanged

- **WHEN** an organization saved before this change is read
- **THEN** its representative identifier renders without error and no document-type field is shown

### Requirement: The form states which document applies to which person

The representative document field SHALL carry help text stating which document applies to nationals and which applies to foreign nationals without a national identity document, so a registrant enters the right one without consulting external guidance. With no type selector, this text is the only thing that tells them which document to reach for.

#### Scenario: Help text is available on the document field

- **WHEN** the representative document field renders
- **THEN** the text states which document applies to nationals and which applies to foreign nationals

### Requirement: Inscription states the documents that evidence identity and representation

The inscription request SHALL state explicitly which documents evidence the organization's identity and the representative's authority, distinguishing the document required as a base from the documents required only where applicable. Listing the accepted file types is not sufficient: the requirement is that the applicant knows which documents to attach before submitting.

#### Scenario: Required documents are stated before submission

- **WHEN** an applicant opens the inscription request
- **THEN** the base document is named, and the conditionally required documents are named as such

#### Scenario: Conditional documents are distinguishable from the base document

- **WHEN** the required-document list renders
- **THEN** the base document and the conditionally required documents are presented as separate categories, not as one undifferentiated list
