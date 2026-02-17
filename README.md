# Event Chaos: Live Production Simulator

Web game (desktop + mobile) built with React + Vite.

## Art Direction (AAA Block 1)

- Art bible: `docs/ART_BIBLE.md`
- Runtime theme system: `utils/artDirection.ts`
- UI system base (buttons): `utils/uiSystem.ts` + `components/Button.tsx`

## Cinematic UI (AAA Block 2)

- HUD/menu cinematic hierarchy: `utils/uiCinematics.ts`
- Mobile overlay safety policy: `utils/mobileUiPolicy.ts`
- Regression tests: `tests/mobile-ui-policy-regressions.test.ts` + `tests/ui-cinematics-regressions.test.ts`

## Art Assets Pack

- Runtime asset mappings: `utils/artAssets.ts`
- Integrated asset bundle: `public/assets/aaa/`
- Regression tests: `tests/art-assets-regressions.test.ts`

## Local Run

Prerequisite: Node.js 18+.

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build production: `npm run build`
4. Run tests: `npm run test`

## AI/API Note

The game runs fully offline-first and does not require any external AI API key to work.
If an API key exists in env vars, it is treated as optional runtime metadata only.
