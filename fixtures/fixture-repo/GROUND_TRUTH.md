# Fixture Repository Ground Truth

This fixture repo contains pre-computed commits, pull requests, and issues with planted ground truth claims to evaluate ColdCase accuracy.

## Expected Claims & Receipt Mapping

| Claim ID | Ground Truth Statement | Type | Evidence ID | Expected Tier |
|---|---|---|---|---|
| `gt_1` | Replaced legacy memory cache with SQLite to support offline mode | stated | `pr:1` | `HIGH` |
| `gt_2` | Fixed memory leak in websocket event loop by clearing listeners | stated | `issue:2` | `HIGH` |
| `gt_3` | Updated design tokens for dark theme contrast compliance | inferred | `commit:0000000000000000000000000000000000000000` | `MEDIUM` |
| `gt_4` | Initial repository scaffolding and monorepo structure | inferred | `commit:0000000000000000000000000000000000000000` | `HIGH` |

## Verification Criteria
- Discovery Rate: ≥ 90%
- Quote-Check Pass Rate: 100%
- Precision: 100%
