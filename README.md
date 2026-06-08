# CarbonWise — Carbon Footprint Awareness Platform

CarbonWise is a lightweight web app built for **PromptWars Virtual · Main Challenge 3**. It helps individuals understand, track, and reduce their carbon footprint through simple inputs, transparent calculations, and personalized action recommendations.

## Chosen vertical

**Carbon Footprint Awareness Platform** — a practical assistant for individuals who want quick, understandable climate guidance without needing expert knowledge or complex carbon accounting tools.

## Approach and logic

CarbonWise asks for weekly user context across four everyday areas:

- Ground travel and flights
- Home electricity and natural gas usage
- Food choices
- New goods spending

The app then:

1. Normalizes inputs to avoid negative or invalid values.
2. Applies documented emission factors in `src/carbon.js`.
3. Calculates weekly and annual CO₂e totals by category.
4. Identifies the largest category for the user.
5. Selects relevant reduction actions only when the user's profile matches each action trigger.
6. Sorts recommendations by estimated weekly savings so the highest-impact action appears first.
7. Persists the profile and completed actions in local storage so users can return to their plan.

## How the solution works

- The calculator updates instantly as the user edits values and saves progress locally in the browser.
- Users can mark recommended actions as complete to track progress toward a 20% annual reduction goal.
- The summary card labels the footprint as low, moderate, or high impact.
- The category breakdown visualizes which parts of the user's week produce the most emissions.
- The action plan estimates weekly and annual savings from simple behavior changes.
- Accessibility features include semantic headings, labels for every input, skip navigation, high contrast states, and live-region result updates.

## Assumptions

- Emission factors are simplified averages for awareness and education, not certified greenhouse-gas inventory values.
- Flight hours are entered as a weekly average so occasional annual trips can still be represented.
- Home energy emissions are divided by household size to estimate an individual's share.
- Shopping emissions use a simple spend-based estimate for newly purchased goods.
- Completed action tracking stays on the user's device through `localStorage`; no personal data is sent to a server.

## Tech stack

- Vanilla JavaScript ES modules
- Node.js static preview server
- Node test runner
- Plain CSS, no heavy UI framework

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Repository-size note

The project intentionally avoids large assets and heavy generated files so the public GitHub repository can remain below the 10 MB challenge limit. Do not commit `node_modules` or `dist`.
