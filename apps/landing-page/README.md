# landing-page

Landing page application built with Vite + TypeScript (no UI framework).

## What It Does

- Serves as the root experience for the site
- Provides navigation cards to the apps:
  - `/roboarm/` (RoboArm)
  - `/wxstation/` (WXStation)
  - `/sdrx/` (SDRx)

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - type-check and build production assets
- `npm run preview` - preview production build locally

## Implementation Notes

- `index.html` contains the page markup
- `src/main.ts` is the Vite entry module
- `src/style.css` contains styling imported by `src/main.ts`
