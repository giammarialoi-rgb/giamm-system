# Training Analytics Engine

Formulas live in `web/training-analytics-engine.js`. The Stats UI only renders results.

Observed = written by the athlete. Derived = calculated from observed. Estimated = model, not a measurement. Predictive metrics are not shipped.

---

## Volume / tonnage

**Definition:** Work done as load × reps.

**Formula:** `Σ (load × reps × partMultiplier)`

**Required:** logged load and reps on a set. `partMultiplier` is 2 only when that exercise is marked “per parte” (how Nurvan already counts unilateral work). It is a calculation mode, not a KPI.

**Output:** kg. Missing load or reps → set ignored.

**Limitations:** Does not invent warm-up vs working sets. Skipped exercises are excluded.

**Confidence:** high when loads are logged.

---

## Sets / reps

**Definition:** Count of logged working rows with load > 0 and reps > 0.

**Hard sets:** only if RIR ≤ 2 or RPE ≥ 8 is present. Otherwise `hardSet` is null — never auto-tagged.

**Warm-up:** no flag in the data model. Not classified.

---

## Intensity (0–10)

RIR and RPE are opposite scales. One field (`*_rir`) stores the number; `exIntensity` / week / prefs say which scale.

| Scale | Input | intensity10 | paired estimate |
| --- | --- | --- | --- |
| RIR | 0–10 | `10 − RIR` | RPE ≈ `10 − RIR` |
| RPE | 1–10 | RPE | RIR ≈ `10 − RPE` |

**Average intensity** = mean of `intensity10` on sets that have an effort value. If none, show “—” / not enough data.

**Confidence:** medium. Conversion is the standard 10-point pairing, not a lab measure.

---

## Effective volume (pts)

**Formula:** `Σ load × (reps + estimatedRIR)`

With RPE, `estimatedRIR = 10 − RPE`. If effort is missing, RIR term is 0 (tonnage only).

**Kind:** derived. It estimates work if the set had gone to failure. It is **not** tonnage.

---

## e1RM

**Formula:** Epley `load × (1 + reps / 30)`; singles = load.

**Required:** load > 0 and 1 ≤ reps ≤ 12. Higher reps → no estimate.

**Kind:** estimated. Unreliable on high-rep or ugly sets.

**Relative intensity:** `load / e1RM × 100` only when e1RM exists.

---

## Period / zoom

**Training weeks (default):** program week index `wN` in `store.data`. Weeks copied and finalized the same calendar day stay distinct (W1, W2, W3).

**Calendar weeks:** ISO week of `store.logs[].at` for that session. Sets without a finalized log date are omitted (not invented).

Zoom is a slider: last N buckets, or all. KPI, table, and charts all use the same window.

---

## Moving averages

MA4 / MA8 / MA12 on weekly volume. Shown only when that many non-empty periods exist in the series used for the average window.

---

## Period comparison

Current window vs the immediately previous window of the same length.

Deltas are descriptive (`volume increased +18%`), not “improvement”.

---

## Volume landmarks (MV / MEV / MAV / MRV)

Configurable defaults: MV 6, MEV 8, MAV 12–16, MRV 20 weekly sets.

**Kind:** estimated / user-specific / configurable. Not universal physiology. Override via `store.prefs.volumeLandmarks`.

If there is no weekly set count, status is omitted.

---

## Fatigue / training load

- Acute = volume of the last non-empty week in the window  
- Chronic = mean volume of up to the last 4 non-empty weeks (needs ≥ 2)  
- Stress = acute / chronic  

**Kind:** estimated. Documented ACWR-style ratio, replaceable.

---

## Recovery

**Observed:** bodyweight, last session duration, last average RPE if logged.

**Recovery Estimate:** label from acute/chronic (`low_recent_load` / `balanced_load` / `high_recent_load`). Never shown as “Chest 87%”.

---

## PR detection

Weight PR, reps-at-load PR, e1RM PR. Derived/estimated events from the set stream. Not persisted as a separate database in this version; recomputed.

---

## Data quality

No RIR/RPE → intensity “—”.  
No eligible sets → no e1RM.  
No history → no landmarks status, no chronic load, no recovery estimate.  
Calendar orphans (sets without `logs.at`) are counted, not dated.
