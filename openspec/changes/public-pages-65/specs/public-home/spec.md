# Spec Delta

## Purpose

Introduce QuizMos before practice while preserving existing links, study data and access permissions.

## ADDED Requirements

### Requirement: CQ-HOME-07 Balanced desktop density and color transitions

Landing SHALL use selective inter-section color/content transitions and a final CTA in the page's color family. Desktop SHALL provide useful catalog/learning-flow support content while mobile retains compact core content. Do not fabricate user statistics or learning outcomes; reduced motion SHALL disable new effects.

#### Scenario: Animated catalog counts

- **WHEN** Home opens with normal motion, or the user switches to reduced motion
- **THEN** desktop catalog digits roll once to the real registry counts without layout shift or repeated screen-reader announcements; reduced motion immediately displays the final digits without animation, and hero/card entry effects preserve keyboard focus and existing section fade transitions

#### Scenario: Desktop and mobile presentation

- **WHEN** landing is viewed on a wide desktop or phone
- **THEN** desktop shows catalog facts/learning steps, supporting content does not lengthen the phone view, and primary headings/CTAs/contrast remain clear

#### Scenario: Change section or motion preference

- **WHEN** sections change with normal motion or reduced motion is enabled
- **THEN** gradient/accent and reveal transitions are subtle normally; reduced motion shows final colors/content immediately without losing focus/controls

### Requirement: CQ-HOME-01 Public entry and compatible deep links

The application SHALL open Home at URLs without a hash or at `#/`, preserving `#/library`, `#/my-quizzes` and existing quiz paths. Entry behavior is independent of authentication or prior visits.

#### Scenario: Direct home and library entry

- **WHEN** a guest or signed-in user opens root or `#/`, including after a previous visit
- **THEN** Home appears, its CTA opens `#/library`, direct `#/library` entry still opens Quiz Bank and refresh retains the page

#### Scenario: Existing links and malformed links

- **WHEN** a quiz opens with alias `aws-ace`, a resume/question query or a malformed hash
- **THEN** the quiz still canonicalizes to Google ACE with its query retained, and malformed hashes retain the existing Library fallback

### Requirement: CQ-HOME-02 Useful and accurate introduction

Home SHALL introduce Practice, Exam and study guides, with a product preview, AIP-C01/CCAR-P links and a clear practice CTA. Content SHALL reflect actual features, use the QuizMos name and avoid unsupported statistics, testimonials or exam-pass guarantees.

#### Scenario: Start without signing in

- **WHEN** a guest selects the primary CTA or a featured bank
- **THEN** Library or that bank's overview opens without mandatory sign-in, and internal introductory sections do not alter quiz routes

### Requirement: CQ-HOME-03 Dark-first public entry with retained preferences

Home and Donate SHALL initialize dark without a valid preference, retain saved themes and allow light/dark switching. Direct Library/quiz entry SHALL preserve the existing system fallback; navigation does not reset the theme. EN SHALL remain the default language and VN remain available.

#### Scenario: New public visit and explicit preference

- **WHEN** Home or Donate opens with empty/unavailable storage, including when the system uses light mode
- **THEN** the page uses dark, a saved light preference uses light, and theme/language controls remain usable

#### Scenario: Direct study entry and navigation

- **WHEN** Library/quiz opens directly with empty storage and the user navigates between pages
- **THEN** the initial theme follows the system as before, the active theme persists across navigation and preferences survive reload when storage is available

### Requirement: CQ-HOME-04 Safe navigation and public accessibility

Home and Donate SHALL share application navigation/title/focus/accessibility contracts, without deleting drafts/checkpoints or changing account permissions during navigation. Public content SHALL remain readable while auth is loading or failing.

#### Scenario: Leave an active exam

- **WHEN** a user in an active exam selects logo/Home/Donate or uses Back/Forward, including rapid repeated clicks
- **THEN** only one leave decision takes effect, Cancel preserves the exam/timer and confirmed navigation retains existing resume behavior

#### Scenario: Keyboard and small-screen visit

- **WHEN** keyboard or a 320px screen is used with EN/VN, light/dark, text zoom or reduced motion
- **THEN** navigation/CTAs/headings/focus remain clear without horizontal overflow, primary controls are at least 44px and normal text meets 4.5:1 contrast

#### Scenario: Account transition while on a public page

- **WHEN** auth is slow, fails or changes accounts while viewing Home/Donate
- **THEN** public content remains usable without showing the previous account's private drafts/checkpoints

### Requirement: CQ-HOME-05 Viewport sections and motion

Landing SHALL contain 4 full-width sections at least as tall as the viewport below the header, with section snapping and clear section navigation. Large content SHALL expand to preserve readability/controls. Reveal/transitions SHALL respect reduced motion without blocking wheel/touch/keyboard or leaking snap behavior into Library/Donate.

#### Scenario: Move between sections

- **WHEN** users scroll with a wheel, touch, Page Down or section controls
- **THEN** the next section appears with snapping/contrasting backgrounds, header/CTAs remain usable and section anchors do not overwrite the hash route

#### Scenario: Small viewport or reduced motion

- **WHEN** the viewport is small, landscape, zoomed or reduced motion is enabled
- **THEN** content/controls are not cropped, motion is reduced/disabled, all content remains readable and snap behavior is removed on leaving Home

### Requirement: CQ-HOME-06 Discoverable donation entry

Landing SHALL expose Donate prominently in the header and hero in addition to the final support invitation. Every entry SHALL open the same Donate page through the existing navigation guard.

#### Scenario: Find donation without scrolling

- **WHEN** Home opens on desktop or phone
- **THEN** Donate can be found and opened from the header/hero by keyboard or pointer without reaching the footer
