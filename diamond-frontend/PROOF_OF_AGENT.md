# Proof-of-Agent dashboard (home page `/`)

The Proof-of-Agent (ZK-Kernel) dashboard is the site's home page. The earlier DIAMOND fleet overview moved to `/fleet/`; all other DIAMOND pages are unchanged.
Everything on the page is scripted demo data and is labelled **DEMO · SIMULATED**. Proofs are **dev-mode** (PRD FR-PV-6): no zkVM is connected.

## Setup
    npm install          # adds three, qrcode (+ types); refreshes package-lock.json
    npm run test:poa     # 9 engine tests (policy, tagger, chain, verifier, all tamper types)
    npm run typecheck && npm run build

## PRD traceability
| PRD | Where | Status |
| --- | --- | --- |
| §9 policy language: allow / args (max, min, equals_session) / sinks / flow rules / limits / ordering / default deny | `lib/poa/policy.ts` (banking-agent-v1 v3 from §9.1) | Done. `equals` / `enum` are accepted but not enforced (PRD: tagger-side) |
| §9.3 canonical JSON + Merkle root P, leaf = H(rule_id ‖ rule) | `policy.ts` `publishPolicy`, `crypto.ts` | Done (SHA-256) |
| FR-PE-5 rule ID + human explanation, FR-PE-6 dry run | `ruleText`, `api.evaluate`, Policy screen "Test a call" | Done |
| §8.3 labels FR-LT-1..4: regex tagger, propagation by value hash, tagger hash in header | `lib/poa/tagger.ts` | Done in regex form. Presidio is gateway-side |
| §10.1 step record, §10.3 certificate | `types.ts`, `run.ts` | Done. `proof_mode` is implied by the `dev-mode:` prefix |
| FR-GW-3/5 evaluate before execution, blocked calls logged as steps; FR-GW-6 hashes only in public view; FR-GW-7 monotonic index | `run.ts`, `verifier.ts` | Simulated gateway; raw args never rendered |
| FR-TR hash chain h0 = H(run_id ‖ P), h_i = H(h_{i-1} ‖ step) | `run.ts` `chain` | Done |
| FR-PV-3 ALLOWED must satisfy rules, BLOCKED must truly violate the named rule | `verifier.ts` | Done (re-run in the browser over the dev-mode trace) |
| FR-CV-1..5 certificate JSON + QR, offline verifier, drag-and-drop, tamper mode | Proof and Verifier screens | Done. 7 tamper types, all caught |
| §13.1 screens 1-6 | Live run, Policy, Proof progress + Certificate, Verifier, Runs | Done |
| §13.2 no raw PII, rule ID on every red/green, explicit latency states + pre-generated proof fallback | all screens | Done |
| §12 API boundary | `lib/poa/api.ts` (`PoaApi`, `demoApi`) | Interface done; HTTP implementation against a real gateway is not written |

## Not done (needs the backend)
Real zkVM proof and guest image ID, Ed25519 certificate signature, on-chain anchor, live tool-call streaming, policy version history, revocation list (P2), WASM verifier.

## Verified here / not verified here
Verified: the engine and verifier under strict TypeScript and Node tests (9/9). Not verified: the React pages, the three.js sphere and the QR code were only syntax-checked. This sandbox has no npm access, so `npm install`, `next build` and a browser run still need to happen on your machine.
