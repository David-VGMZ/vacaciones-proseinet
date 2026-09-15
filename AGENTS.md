# AGENTS.md

Vacation/leave manager ("Gestor de Vacaciones") for Proseinet. Vanilla ES-module web app deployed to Firebase Hosting, backed by Firebase Auth + Cloud Firestore, browser-only (Mexico LFT leave rules).

## Commands

- No build, test, lint, or typecheck tooling exists. Verifying changes = reading the code; there is nothing to run.
- `npm start` is `node index.html` and is **broken** — do not use or "fix" it.
- Firebase CLI (15.x) is installed globally. Local preview: `firebase serve` (serves `public/`). Deploy: `firebase deploy`.

## Architecture

- `public/` is the entire site (`firebase.json` → `hosting.public`). HTML/JS/CSS only; no bundler or framework.
- Firebase SDK is imported at runtime from `https://www.gstatic.com/firebasejs/10.7.1/firebase-*.js` ES modules. The `firebase` npm dependency (v12) is **not used** — keep using the CDN 10.7.1 import style in any new code.
- `index.html` (dashboard) + every page loads `/app.js` (hub) and `/firebase-config.js`. `app.js` owns the auth gate (`onAuthStateChanged` redirects to `/login.html`), Firestore `onSnapshot` listeners for `usuarios` + `solicitudes`, and the global `AppState` object with dashboard rendering.
- Page modules: `calendario.js`, `configuracion.js`, `empleados.js`, `loginSrc.js`. They import from `/app.js`. Note `empleados.html` gets `empleados.js` only via `app.js`'s import (no script tag); `calendario.js`/`configuracion.js` are also loaded directly by their pages.
- No router: each page is one static HTML file, and `app.js`/page modules check for specific element IDs (`empleadosGrid`, `configuracionContainer`, `requestsTableBody`, `calendarBody`) to decide what to render.
- Circular imports exist (`app.js` ↔ page modules); safe because cross-module bindings are only used inside functions, never at module top level. Keep it that way.

## Firebase specifics

- Project (`firebase.json` site): `vacaciones-proseinet-34230`; `.firebaserc` default project is `vacaciones-proseinet` (different IDs — deploy targets the site).
- `cleanUrls: true` + `trailingSlash: false` → nav links are extensionless (`/solicitudes` → `solicitudes.html`, `/calendario`, `/empleados`, `/configuracion`). New pages must match this.
- `public/firebase-config.js` has the public web config hardcoded (normal for Firebase). Front-end role checks (`rol === 'operador'`, see `verificarRolOperador` in `configuracion.js`) are cosmetic; security comes from Firestore rules.
- Firestore collections:
  - `usuarios`: `nombre`, `cargo`, `area`, `rol`, `fechaIngreso`, `saldoTotal`, `saldoDisponible`, `ultimoAnioAcreditado`, `avatarIniciales`.
  - `solicitudes`: `uid_empleado`, `empleado`, `cargo`, `iniciales`, `avatarBg`, `fechaInicio`, `fechaFin`, `fechasTexto`, `dias`, `tipo`, `motivo`, `estado` (`pendiente|aprobado|rechazado`), `creadoEn`.
- Approving a request decrements the employee's `saldoDisponible` (`app.js`). Requested days = weekdays excluding Mexican holidays (`nombresFeriados` / `FERIADOS_OFICIALES_MX` in `app.js`).
- Leave balance follows Mexico LFT by seniority (`calcularDiasDerechoLFT` in `app.js`): 12 days after 1 yr, +2/yr up to 32. `cargarPerfilUsuario` auto-recredits `saldoDisponible` on work anniversaries and writes back to Firestore.

## Conventions / gotchas

- UI text and comments are in Spanish (es-MX). Keep new copy in Spanish.
- `firebase.json` sets HTML `Cache-Control: no-cache, no-store, must-revalidate` and all assets (js/css/img) `max-age=0, must-revalidate`. Assets are revalidated by ETag on every load (304 when unchanged), so a deploy is always fresh. Do NOT add `?v=` query strings to asset URLs — versioned URLs were removed in favor of this header-based revalidation.
- Inline `onclick` handlers (e.g. `cerrarSesion()`, `abrirDetalleDesdeNotificacion()`) call functions that must be explicitly attached to `window` (e.g. `window.cerrarSesion = ...`). Keep that pattern for new globals.
- Stack/libraries: Bootstrap 5.3, Font Awesome 6.7.2, SweetAlert2, Chart.js (dashboard), all via CDN `<script>` tags.
