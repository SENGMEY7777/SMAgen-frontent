# SMAgen Frontend

Vue 3 + Vite frontend for the KAIRO workspace.

## Project Structure

```text
src/
├── app/                    # Application bootstrap and router
│   ├── App.vue
│   ├── main.js
│   └── router/
├── assets/                 # Global styles and static source assets
├── components/
│   ├── branding/           # Brand-specific UI
│   ├── common/             # Reusable UI components
│   └── layout/             # Page and navigation layouts
├── config/                 # Application constants and configuration
├── services/               # API and realtime integrations
├── stores/                 # Pinia state stores
├── utils/                  # Shared formatting and utility functions
└── views/
    ├── auth/               # Login and registration screens
    ├── dashboard/          # Main workspace screens
    └── workflows/          # Workflow and run detail screens
```

The `@/` alias points to `src/`, so imports remain stable when files move between feature folders.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
