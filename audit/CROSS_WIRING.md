# Cross-Wiring Behavioral Proof

Date: 2026-04-26

Proof basis:

- Existing backend suite: `backend/tests/integration/api.integration.test.ts`, `backend/tests/integration/routes-coverage.test.ts`, `backend/tests/unit/report.service.test.ts`
- New focused proof: `backend/tests/integration/cross-wiring.test.ts`
- Route/service inspection for UI-visible flows that the frontend does not expose directly

## Event Verification

| Event | Result | Proof |
|---|---|---|
| 1. Manual transaction created | Verified. Manual creates go through `createTransaction`, which synchronously computes classification, treatment, and initial `policy_flags_json`. | `transactions.service.ts` and `cross-wiring.test.ts` assert `policy_flags_json`, `evidence_status='missing'`, and treatment fields on create. |
| 2. CSV import creates transactions | Verified. CSV imports call the same `createTransaction` path as manual transactions, so imported rows receive the same initial classification/treatment/policy behavior. | `imports.routes.ts` uses `createTransaction`; `cross-wiring.test.ts` imports a CSV for a business with a missing-evidence policy and confirms the imported row gets matching flags and treatment fields. |
| 3. Evidence linked | Verified. `evidence_status`/`evidence_count` update on transaction detail, treatment refresh fires, and `policy_flags_json` is now recomputed so `missing_evidence_rule` clears after a successful link. | Existing integration tests already proved evidence status/count; this pass adds policy-flag recomputation via `refreshPolicyFlagsForTransaction` in `evidence.routes.ts`, covered by `cross-wiring.test.ts`. |
| 4. Evidence unlinked | Verified. Unlink restores `evidence_status='missing'`, resets count, treatment refresh fires again, and `policy_flags_json` is recomputed so missing-evidence flags return. | `cross-wiring.test.ts` exercises link then unlink on the same transaction. |
| 5. Review action applied | Verified. `review_status`, `category_final`, and `business_activity_final` update through `applyReviewAction`; treatment refresh fires; `review_decisions` history is written; `policy_flags_json` is now recomputed against the effective category (`category_final` fallback `category_suggested`). | `review.service.ts`, `review.routes.ts`, and `cross-wiring.test.ts` verify `mark_personal`, treatment update to `personal_or_excluded`, and a persisted `review_decisions` row. |
| 6. Policy created/toggled | Partially verified. New transactions immediately respect active rules. Existing transactions are still not recomputed when a policy is created, activated, deactivated, or edited. | Verified by existing `api.integration.test.ts` and `routes-coverage.test.ts`. Deferred gap remains for backfilling existing rows. |
| 7. Reports evidence-status aggregation | Verified. `GET /api/reports/evidence-status` returns aggregated bucket rows (`missing`, `weak`, `linked`), not one row per transaction. | `report.service.test.ts` covers the aggregation logic; `reports.routes.ts` exposes the aggregate route; `cross-wiring.test.ts` confirms array shape from the live route. |
| 8. Reconciliation scan | Verified with limitations. Scan creates candidates for same-date/same-amount pairs and resolve/reject wiring works. It does not currently scope by business/workspace or apply richer heuristics. | `reconciliation.service.ts`, `routes-coverage.test.ts`, and `cross-wiring.test.ts`. Candidate reason text was corrected in this pass to `Same date/amount candidate` so the stored reason matches actual scan logic. |

## Bugs Fixed In This Pass

1. `policy_flags_json` is now recomputed after evidence link, evidence unlink, and review actions.
2. Policy restricted-category checks now use the effective category (`category_final` first, then `category_suggested`) during recomputation.
3. Reconciliation candidate reason text now matches the actual same-date/same-amount scan logic.

## Deferred Gaps

1. Policy create/toggle/edit does not recompute existing transactions. New transactions are correct; historical rows remain stale until touched by another event or recreated.
2. `PATCH /api/treatment/transactions/:id/final` still does not write a `review_decisions` audit row.
3. Reconciliation scanning is intentionally simple and global: same date + same amount, no business/workspace scoping, no vendor similarity, and no dedupe merge action.

## Outcome

Cross-wiring is now correct for the high-frequency user events that happen after transaction creation: evidence linking, evidence unlinking, and review actions all keep treatment and policy-derived state synchronized. The remaining gaps are bulk recomputation and richer reconciliation behavior, both documented for follow-up rather than expanded in this pass.
