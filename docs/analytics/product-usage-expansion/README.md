# Product usage analytics expansion

[한국어](README.ko.md)

Status: application instrumentation implemented in the working tree on 2026-11-03; deployment and production GA receipt remain unverified. The original assessment used frontend commit `ec2efd98a0de365d465c105bbfd7576e85415b33`. See [Implementation results](implementation-results.md) for delivered scope, GA definitions and verification.

## Purpose

Expand measurement across the service's meaningful user actions and their observed outcomes. Keep enough breadth for exploratory analysis, including features outside the existing signup and refresh funnels. Distinguish opening a feature, attempting an operation, receiving its result, and using that result.

The proposed scope includes document preparation, writing and saving, search, relationship graphs and timelines, AI chat, setting error checks, memos, versions, export, project and account management, help and feedback. High-frequency editing and camera movement are summarized or excluded rather than sent on every browser event.

## Documents

| Document                                                          | Responsibility                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Current state](current-state.md)                                 | Checked-out behavior, existing events, source evidence and outdated documentation.                     |
| [Additional events](additional-events.md)                         | **The single catalog of proposed event names, triggers, parameters, action values and outcome rules.** |
| [Measurement plan](measurement-plan.md)                           | Questions, journeys, report denominators and interpretation limits.                                    |
| [Implementation and validation](implementation-and-validation.md) | Instrumentation owners, rollout order, GA configuration and acceptance cases.                          |

[Implementation results](implementation-results.md) records the subsequent code and GA configuration work. Four detailed reports were subsequently published in the GA Reports navigation on 2026-11-03; see [GA report results](ga-report-results.md) for the actual menu, report IDs and verification.

Start with current state, use the catalog to implement, and use the other documents to decide what the resulting measurements mean and how to verify them. Each file has an English authoritative version and a Korean translation in the same directory.

## Existing contracts remain authoritative

- [Acquisition and onboarding](../acquisition-onboarding/acquisition-events.md)
- [First core value](../first-core-value/core-value-events.md)
- [Setting document refresh](../refresh/refresh-events.md)

Existing events are retained. The catalog explicitly identifies overlaps and additions; it does not rename `project_created`, reinterpret `sign_up` as consent completion, or reinterpret `manuscript_saved` as a first save or a body-only change.

P0 means the first implementation batch, P1 the subsequent breadth expansion, and P2 optional detail after initial reports prove useful. These are proposed priorities, not commitments or evidence of deployment. The original investigation added documentation only. Subsequent implementation is recorded separately in implementation-results; the original baseline and proposed catalog remain available for comparison.
