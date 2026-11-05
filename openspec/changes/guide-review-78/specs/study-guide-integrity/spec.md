# Spec Delta

## Purpose

Keep published study concepts and question links aligned with the bank revision actually reviewed, with review provenance that remains honest when the source changes.

## ADDED Requirements

### Requirement: CQ-GUIDE-01 Substantive review before review-state changes

A guide's reviewed fingerprint/count SHALL advance only after its content, primary references and question mappings have been checked against the recorded source revision.

#### Scenario: Complete a guide review

- **WHEN** the maintainer marks one of the four outstanding guides reviewed
- **THEN** the content/mapping changes and provenance demonstrate that review; metadata equality alone is insufficient evidence

#### Scenario: Source changes during review

- **WHEN** the bank revision changes before the review is completed
- **THEN** the reviewer reconciles the new source or leaves that guide pending instead of stamping a stale review as current

### Requirement: CQ-GUIDE-02 Correct stable question links

Published concept links SHALL reach the intended current question IDs while preserving canonical bank identities and marked answers unless a separately justified answer correction is approved.

#### Scenario: Added, removed or reordered questions

- **WHEN** a source update changes the guide's related-question set
- **THEN** obsolete mappings are corrected or removed and retained links are checked for content relevance, not just ID existence

### Requirement: CQ-GUIDE-03 Honest partial and published status

Unreviewed guide snapshots SHALL retain their stale status; published review notes and maintained counts SHALL identify the actual reviewed revision and remaining work.

#### Scenario: Only some guides are ready

- **WHEN** review finishes for fewer than all four target guides
- **THEN** only completed snapshots change and the issue remains open for the others

#### Scenario: Publish completed guides

- **WHEN** the guide update is deployed
- **THEN** the guides render, their related links work and reviewed/stale indications match the recorded evidence
