# WÜRST

WÜRST is a local-first engineering platform. This repository is the scaffold for the desktop application: Electron, React, TypeScript, and Vite, with a thin composition root and separate presentation, application, and core boundaries.

The workspace shown in the app is fixture content. It does not connect to Jira, run agents, or perform live verification.

## Requirements

- Node.js 22.12 or newer
- npm (the lockfile is `package-lock.json`)

## Clean install

```sh
npm ci
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Builds the main process and preload, starts the Vite renderer server, and opens Electron. |
| `npm run dev:ui` | Opens the React workspace in a browser against the in-memory client. No Electron process. |
| `npm run typecheck` | Type-checks core, application, presentation, the Electron host, and the in-memory preview. |
| `npm test` | Runs the focused behavior tests. |
| `npm run build` | Production build of main, preload, and renderer into `out/`. |
| `npm start` | Production preview. Rebuilds with `electron-vite preview` and opens Electron without the Vite dev server. |
| `npm run package` | Production build, then an unpacked package for the current operating system in `release/`. |

Closing the window quits the application and stops the host-status timer. In development, `electron-vite` exits when the Electron process exits, which stops the renderer dev server.

## Layout

- `packages/core` — framework-independent policy boundary. No policy behavior yet.
- `packages/application` — client contract, runtime validation, and the in-memory client.
- `packages/presentation` — React workspace. It receives an application client and does not import Electron.
- `src/main`, `src/preload`, `src/renderer` — Electron host, preload bridge, and renderer composition.
- `src/preview` — browser composition root for the in-memory client.

The dependency direction and the reasons for it are recorded in [docs/decisions/0001-scaffold-architecture.md](docs/decisions/0001-scaffold-architecture.md).

## Packaging

`npm run package` uses electron-builder's unpacked `dir` target for the machine running the command. On this Linux x64 host the output is `release/linux-unpacked/wurst`. macOS and Windows outputs are configured the same way and have not been produced or launched here.

The packaged application loads `out/renderer/index.html` from the asar. It does not start Vite.

This Linux host launched the packaged app without Chromium's `--no-sandbox` flag, and the renderer process was started with `--enable-sandbox`. A more restricted container may still need `--no-sandbox`. That flag is an environment workaround. The window keeps `webPreferences.sandbox`, context isolation, and `nodeIntegration: false` either way.
