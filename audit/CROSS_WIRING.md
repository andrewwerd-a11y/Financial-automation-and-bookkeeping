# Cross-Module Wiring Analysis

Generated during Phase 1 audit.

| Event | Should refresh | Currently refreshes | Gap |
|---|---|---|---|
| Transaction created | classification, treatment, policy_flags | ✅ all three (createTransaction calls classifier → suggestTreatment → evaluateTransactionPolicies synchronously) | none |
| Evidence linked | evidence_status (derived), treatment | ✅ treatment (refreshTreatmentForTransaction wired in d39beca) | ⚠️ policy_flags NOT refreshed — a `missing_evidence` policy would still flag after a link (see DECISIONS D-005) |
| Evidence unlinked | same as above | ✅ treatment refreshed | ⚠️ same policy_flags gap |
| Review action applied | category_final, business_activity_final, review_status, treatment | ✅ review fields updated; ✅ treatment refreshed (d39beca) | ⚠️ policy_flags NOT refreshed after review |
| Treatment final set | (audit trail) | ⚠️ no review_decision row created on treatment_final update | Minor gap — `updateTransactionTreatment` only updates the column |
| Policy rule created/toggled | policy_flags on existing transactions | ❌ NOT refreshed — existing transactions keep stale flags | Documented in DECISIONS D-005; async rescan recommended |
| Document uploaded | (none required — evidence not linked automatically) | ✅ correct | none |
| Connector sync | new transactions get classification + treatment + policy eval | ✅ createTransaction is called, same path as manual creates | none |
| Business deleted/changed | related transactions / docs / policies | N/A — no DELETE or UPDATE endpoint for businesses exists | No gap since no operation exists |

## Summary

- **Wired correctly:** transaction creation, connector sync, review action (fields + treatment).
- **Treatment refresh now wired:** evidence link/unlink, review actions (fixed in this pass).
- **Documented gaps (by design):** policy_flags re-evaluation after evidence/review changes; policy_flags bulk rescan after policy toggle.
- **Minor gap:** `updateTransactionTreatment` (PATCH /treatment/:id/final) does not write a `review_decisions` audit row.
