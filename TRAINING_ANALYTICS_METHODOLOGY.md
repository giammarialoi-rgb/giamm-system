# Training Analytics Methodology

Derived analytics only. Raw workout rows (`store.data`, logs, programmed weeks) are never rewritten by this engine. Formula version: `intel-v1`.

Every metric has `evidenceLevel`: MEASURED | DERIVED | EVIDENCE_SUPPORTED | MODEL_BASED | HEURISTIC | EXPERIMENTAL.

---

## Volume (tonnage)

**Definition:** Work as load × reps.  
**Formula:** `Σ(load × reps × partMultiplier)` — `partMultiplier` is 2 only when the exercise is marked per-parte.  
**Inputs:** logged load, reps.  
**Unit:** kg. **Category:** observed→derived.  
**Evidence:** Dose–response between weekly resistance volume and hypertrophy is supported, with large individual differences and no universal “magic number” (Schoenfeld et al. reviews).  
**Evidence level:** DERIVED. **Confidence:** high when loads are logged.  
**Limitations:** Does not invent warm-up vs work. Skipped exercises excluded.  
**formulaVersion:** `epley-v1` (shared load path).

---

## e1RM

**Definition:** Estimated 1RM from a submaximal set. Not a tested max.  
**Formula:** Epley `load × (1 + reps/30)`; singles = load. Invalid if reps > 12.  
**Exercise-specific.** Never sum e1RM across movements.  
**Estimated 5/8/10RM:** invert Epley from current e1RM when that e1RM exists.  
**Evidence:** Tested 1RM is generally reliable; prediction equations are estimates and degrade at high reps.  
**Evidence level:** DERIVED. **formulaVersion:** `epley-v1`.  
**Limitations:** Ugly or very high-rep sets omitted.

---

## RPE / RIR / intensity 0–10

Nurvan stores one effort number per set; scale comes from `exIntensity` / week / prefs.

- RIR `n` → intensity10 = `10 − n`, paired RPE ≈ `10 − n`
- RPE `n` → intensity10 = `n`, paired RIR ≈ `10 − n`

**Evidence:** Proximity to failure (RPE/RIR) is useful for autoregulation; it is not required that every set go to failure; strength vs hypertrophy relationships differ.  
**Evidence level:** USER REPORTED + DERIVED conversion. **formulaVersion:** `rir-rpe-v1`.  
**Missing effort → “—”.** Never invent 8.0.

---

## Relative intensity (% 1RM)

`load / e1RM × 100` only when that exercise has an e1RM.  
**Evidence level:** DERIVED. Bins `<60 / 60–70 / 70–80 / 80–90 / 90+` are counts of sets with a valid e1RM.

---

## Hard sets

Heuristic: RIR ≤ 2 or RPE ≥ 8.  
**Evidence level:** HEURISTIC. Unclassified if effort is missing.

---

## Effective volume / effective reps

`Σ load × (reps + estimatedRIR)`. Heuristic “work if taken to failure”.  
**Evidence level:** HEURISTIC. Not used alone to change volume.

---

## Volume landmarks (MV / MEV / MAV / MRV)

Defaults: MV 6, MEV 8, MAV 12–16, MRV 20 weekly sets. Configurable in `store.prefs.volumeLandmarks`.  
**Evidence:** Volume landmarks are coaching models, not universal physiology.  
**Evidence level:** MODEL_BASED. Shown as estimated / configurable.  
**formulaVersion:** `landmarks-v1`.

---

## Fatigue (intra-session)

Rep loss at matched load + RPE drift across sets of one exercise.  
Signals: stable / low / moderate / high.  
**Evidence level:** HEURISTIC. Not a fatigue percentage. Not “overtraining”.

---

## Training load (ATL / CTL / TSB)

Adapted from endurance load models:

- ATL / acute = last non-empty week volume  
- CTL / chronic = mean of up to 4 recent non-empty weeks  
- TSB ≈ CTL − ATL  
- Stress = acute / chronic  

**Methodology:** Adapted model. **Evidence:** limited / context-dependent for hypertrophy lifting. **Use:** trend only.  
**Evidence level:** MODEL_BASED. **formulaVersion:** `atl-adapt-v1`.  
Never a sole decision rule. Never an overtraining lamp.

---

## Recovery / readiness

**Observed:** BW, last duration, last RPE if present.  
**Estimated:** labels from acute/chronic (`low_recent_load` / `balanced_load` / `high_recent_load`).  
Shown as Recovery Estimate, never “Chest 87%”.  
**Evidence level:** HEURISTIC.

---

## Adaptation / volume responsiveness

Compares volume Δ and e1RM Δ across the zoomed window vs the previous window.  
Labels: POSITIVE / NEUTRAL / MIXED / NEGATIVE / insufficient data.  
Requires ≥2 weeks with data; confidence stays LOW until ≥4.  
**Evidence level:** ESTIMATED. Non-diagnostic.

---

## Recommendations

Rules (`reco-v1`):

- Increase +2.5 kg (or +1 kg if load < 20) if e1RM rose and RPE ≤ 8.5 and intra-session fatigue is not high  
- Maintain if stable  
- Consider −1 working set if e1RM fell and (RPE ≥ 9 or fatigue moderate/high)  

Always SUGGESTED. Written only to `store.intelligence` after Accept. Programmed `DATA.weeks` is never changed by the engine.  
**Evidence level:** HEURISTIC.

---

## Autoregulation (why this exists)

Literature supports RPE/RIR-based autoregulation as one valid way to progress; implementations differ and are not automatically superior to fixed loading. Velocity-based methods are optional and not assumed here (no velocity data in Nurvan).

---

## Frequency

Interpreted with weekly volume. When volume is equated, hypertrophy differences by frequency are smaller. Shown as sessions/week in the selected window.

---

## How to open a metric in the app

`TrainingAnalyticsEngine.explainMetric(id)` returns the catalog row (definition, formula, evidenceLevel, limitations, formulaVersion).
