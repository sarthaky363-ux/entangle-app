# ENTANGLE

ENTANGLE is a simulated disaster-response coordination console for Mumbai flood and heatwave scenarios. It takes citizen and field reports, keeps a versioned event history, computes credibility and priority with TypeScript rules, compares dispatch plans, and puts an operator between recommendations and any local approval action.

**Public repository:** [github.com/sarthaky363-ux/entangle-app](https://github.com/sarthaky363-ux/entangle-app)

**Live demo:** [sarthaky363-ux.github.io/entangle-app](https://sarthaky363-ux.github.io/entangle-app/)

> **Prototype, not an emergency service.** Data, map coordinates, alerts, routes, resource inventories, and simulations are demonstration inputs. The app does not contact responders or send public messages.

## The problem

During a fast-moving incident, control-room staff must reconcile noisy reports, identify duplicates and rumors, understand which reports are corroborated, allocate limited responders and supplies, and explain why a recommendation changed. A chat transcript alone cannot reliably keep those facts synchronized or replay how a decision was reached.

## Why agents instead of one chatbot?

ENTANGLE separates bounded work that reacts to shared state: report triage, resource-aware dispatch planning, seeded outcome simulation, and post-approval message drafting. Deterministic TypeScript functions own numeric calculations and state changes; Gemini, when configured, is used for triage tool selection and limited plain-language explanations or translation. The credibility scorer is deterministic code, not an LLM agent.

This is not a claim that agents are inherently safer than a chatbot. The benefit in this prototype is the auditable event stream, explicit tool boundaries, reproducible calculations, and operator approval gates. It is still a demo and its model-generated prose is not proof of facts.

## Architecture

```text
Citizen / field reports       Official alerts       Operator actions
            \                       |                       /
             +----------------------+----------------------+
                                    |
                     Zustand WorldState event log
                  append event -> reducer -> projections
                         | subscriptions / events
      +------------------+-------------------+-------------------+
      |                  |                   |                   |
 Credibility         Triage             Dispatch            Simulation
 TypeScript rules    Gemini tools       local planning      seeded Monte
 + event updates     + TS fallback      + optional Gemini   Carlo (300)
      |                  |                   |                   |
      +------------------+-------------------+-------------------+
                                    |
                       candidate plans + metrics
                                    |
                           Human approval gate
                         /                     \
              local assignment updates     Comms drafts
                                            after approval
                                                 |
                                    per-message human approval
                                                 |
                                      local mock outbox only
```

The browser UI is React, Vite, and Zustand. Events are appended in memory and reduced into the current WorldState; subscribed agents react to relevant event types. `vite.config.ts` provides the development Gemini endpoint, while `server.ts` provides the same endpoint and serves the production build.

## Agents and operator roles

The UI shows five roles; only four are separate event-driven agent modules.

| Role | Work and trigger | Tools / output | Failure behavior |
|---|---|---|---|
| **Credibility** | Deterministic scoring when reports arrive and when relevant official alerts are released; recalculates affected reports and emits `CREDIBILITY_UPDATED`. | `computeCredibility` and `evaluateAllAffectedReports` in `src/tools/credibility.ts`; score, reasons, verification status, then an event. | No LLM dependency. A report below `0.35` stays visible and is excluded from triage/dispatch eligibility until corroborated. |
| **Triage** | On `REPORT_ADDED`, `REPORT_INGESTED`, and `CREDIBILITY_UPDATED`. | Gemini function calls for six tools in `src/tools/triageTools.ts`; deterministic fallback; final decision is `merged`, `new_incident`, or `ignored`. | Network/API failure, bad response, or exhausted tool turns falls back to local triage. Tool errors are logged; freeze/reset supersedes work. |
| **Dispatch** | Once at startup, then on incident, volunteer, resource, credibility, rejection, road-closure, or official-alert changes. | Gemini may call `build_plan`; TypeScript builds three candidates and calculates route estimates, coverage, risk, and probabilities. Output is `DISPATCH_PLANS_UPDATED`. | Incomplete Gemini tool calls or request failures use locally built plans; explanations also have deterministic fallbacks. Unhandled failures emit `AGENT_ERROR_LOGGED`. |
| **Simulation** | Debounced after candidate-plan or simulation-seed changes. | `monteCarlo(plan, world, trials, seed)` runs 300 seeded trials and emits `SIMULATION_RESULTS_UPDATED`. Gemini may phrase the computed results. | Explanation failures use a deterministic sentence. Simulation errors emit `AGENT_ERROR_LOGGED`; stale, reset, or frozen work is ignored. |
| **Comms** | Only after a human `PLAN_APPROVED` event. | No function tools. Requests English, Hindi, and Marathi text; validates the drafts and emits `COMMS_DRAFTS_CREATED`. | Invalid or unavailable model output is replaced with fixed templates. Drafts remain unapproved; a separate human action is required for each message. |

Operator/system actions are also part of the design: approving or rejecting a candidate, approving an individual message, freezing/resuming the system, and the reducer that enforces those event rules. See [agent contracts and schemas](docs/agents.md).

## Entanglement, superposition, and measurement—in plain words

- **Entanglement:** In this app, it is a metaphor for shared state. A new report can change credibility; that change can cause triage or dispatch to reconsider; a new plan can trigger simulation. Agents react to the same event history rather than maintaining disconnected chat context.
- **Superposition:** Dispatch keeps three *alternative candidate plans* visible at once: maximise coverage, protect critical incidents, and minimise risk. They are ordinary software alternatives with heuristic weights—not quantum states or a claim that the plans are physically or statistically independent.
- **Measurement:** The operator chooses and approves one candidate. The reducer marks that plan approved, discards the other candidates, and updates local volunteer/resource/incident state. This is a UI metaphor for an explicit decision; it does not dispatch a real vehicle.

Plan probabilities are relative scores calculated in TypeScript, then adjusted using simulated reach, worst-case reach, and risk. They are not calibrated forecasts or literal probabilities of success.

## Run locally

Requirements: a current Node.js installation (Vite 8) and either Bun or npm. The repository includes `bun.lock`.

```sh
bun install
bun run dev
```

Or, with npm:

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (default `http://localhost:3000`). The demo works without Gemini and uses deterministic/fixed fallbacks. To enable Gemini-backed triage selection, translation, and explanations, set `GEMINI_API_KEY` in a local `.env` file before starting the dev server. See [`.env.example`](.env.example); it contains no credentials.

For the Express production server:

```sh
npm run build
npx tsx server.ts
```

`server.ts` serves `dist` and the Gemini endpoint on `PORT` (default `3000`). The development Vite server also uses port `3000`; do not run both on that port at once. `DISABLE_HMR=true` disables Vite hot-module replacement and its file watcher; it does not configure the server port.

## Play the scenario

1. Select **Run scenario** in the top bar. It resets the WorldState to its seeded baseline and schedules 14 events across 90 simulated seconds.
2. Leave playback at **1x** for the full 90 seconds, or choose **2x**/**4x** to speed it up; pause and resume preserve the schedule. The scenario includes citizen reports, two official alerts, a road closure, a boat stock-out, and a Powai rumor followed by a field report.
3. Use **Reports**, **Incident Queue**, and **Timeline** to inspect reports, credibility changes, incident creation, and the event history. **Inject Report (8 Scenarios)** also lets you test a preset report or type/speak a report.
4. In **Dispatch plan lattice**, compare the three alternatives, read the simulation summary, and select **Explain this decision** to inspect the event-backed trace. Choose **Approve** or **Reject with reason**; rejection text is stored as a planning constraint.
5. After plan approval, review each English/Hindi/Marathi draft in **Comms Agent · operator review**. Approve a message to add it to the local mock outbox. Nothing is transmitted.
6. Use **Kill Switch** and confirm to freeze agent work and reject event writes. Confirm **Resume** to accept new events again.

## Safety guardrails and boundaries

- **Human approval gate:** Only a human action can approve a candidate plan or approve a comms draft. Unverified linked reports block plan approval. Each message requires its own approval.
- **Kill switch:** A human `SYSTEM_FROZEN` event freezes the store; while frozen, only an authorized human `UNFREEZE` is accepted. Agents check for cancellation between work stages, but an already-started network request may still finish before its result is ignored.
- **No invented metrics by design:** Credibility, priority, routing estimates, plan metrics, and Monte Carlo results are computed by TypeScript; model prompts instruct the LLM not to calculate or change numbers. Generated explanations are not mathematically checked against every metric, so treat structured values as authoritative and prose as explanatory only.
- **Event audit:** State changes are represented in an append-only event array and can be replayed in the current app session. This is in-memory demo state, not a durable or tamper-proof operational audit service.
- **No real feeds or dispatch:** The map, alerts, reports, resources, and volunteers are scenario data. No emergency service is contacted, and SMS/WhatsApp previews are local only.

## Known limitations

- Credibility uses code-defined keyword, location, time, corroboration, and trust heuristics. It does not currently ingest live sensor telemetry; optional sensor fields in the data type are not an active feed.
- Dispatch uses schematic coordinates, fixed vehicle speeds, simple closure penalties, and demo inventories—not a live road graph, traffic system, or verified logistics database.
- Monte Carlo results come from 300 seeded synthetic trials and hand-coded assumptions. Reproducibility does not make those assumptions operationally validated.
- Gemini is optional; when it is absent or unavailable, deterministic heuristics and templates provide the fallback. Model prose may still be incomplete or inaccurate.
- The state/event log is in memory and resets with the demo. There is no user authentication, persistence, or external operational integration.
- Voice entry depends on browser speech-recognition support. The app submits a transcript, not raw audio; the browser may use its own speech service.
- This interface is a prototype, not an operationally validated or accessibility-certified emergency control system.

## Roadmap

1. Integrate verified, authenticated **IMD/NDMA feeds** with provenance, freshness, and failure handling.
2. Add **WhatsApp Business API** only behind appropriate operator authorization, delivery tracking, and safeguards; the current outbox is a mock.
3. Evaluate **Bhashini** for supported Indian-language speech/translation workflows with human review and safe offline behavior.

## Documentation

- [Agent triggers, tool schemas, outputs, and errors](docs/agents.md)
- [Design tokens, components, and accessibility notes](docs/design-system.md)
- [Three-minute demo script](docs/demo-script.md)

No real API keys or credentials are committed. Keep local secrets in `.env`, which is ignored by Git; `.env.example` contains only empty values and non-secret settings.
