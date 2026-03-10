---
phase: 1
slug: niche-validation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual checklist review (no code in this phase) |
| **Config file** | none |
| **Quick run command** | Review Gate Scoring Sheet completeness for each niche |
| **Full suite command** | Review all 4 artifacts: gate sheets, IBGE data, gap analysis, conversation notes |
| **Estimated runtime** | ~5 minutes (manual review) |

---

## Sampling Rate

- **After every task commit:** Review artifact completeness against requirement
- **After every plan wave:** Review all wave outputs against success criteria
- **Before `/gsd:verify-work`:** All 5 artifacts must exist with evidence
- **Max feedback latency:** N/A (manual phase)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Verification Method | Artifact Exists | Status |
|---------|------|------|-------------|-----------|---------------------|-----------------|--------|
| 01-01 | 01 | 1 | NICH-01 | manual | Check gate scoring sheet has all 5 criteria with evidence per niche | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 2 | NICH-02 | manual | Check research doc has data from 3+ of 4 sources per niche | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 2 | NICH-03 | manual | Check journey map has 3+ friction points with measurable impact | ❌ W0 | ⬜ pending |
| 01-04 | 01 | 2 | NICH-04 | manual | Check gap analysis has 2+ entries with source citations | ❌ W0 | ⬜ pending |
| 01-05 | 01 | 3 | NICH-05 | manual | Check call notes — count CONFIRMS vs NOT CONFIRMS (need 3/5) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Create output folder `.planning/phases/01-niche-validation/outputs/` for artifacts
- [ ] Prepare gate scoring sheet template as reusable file
- [ ] Prepare validation conversation script as reference file
- [ ] Map user's personal network contacts by sector

*No code infrastructure needed — all gaps are document templates.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3+ niches scored on 5 criteria | NICH-01 | Human judgment on evidence quality | Review gate sheet: each criterion has YES/NO + evidence sentence |
| Market data from real sources | NICH-02 | Data comes from external sites | Verify IBGE/Trends/LinkedIn/Apollo links are live and data matches |
| Customer journey with friction points | NICH-03 | Qualitative mapping | Review journey map: 3+ friction points with "measurable value" column filled |
| Real gaps with evidence | NICH-04 | Qualitative analysis | Review gap analysis: 2+ gaps with source citation, not assumptions |
| 5 real conversations validated | NICH-05 | Human conversations | Review call notes: 5 entries with date, name, role, and scoring |

*All phase behaviors are manual-only — this is a research/validation phase with no code.*

---

## Validation Sign-Off

- [x] All tasks have verification method defined
- [x] Sampling continuity: every task has a verification checkpoint
- [x] Wave 0 covers all MISSING references (template creation)
- [x] No watch-mode flags
- [x] Feedback latency: N/A (manual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
