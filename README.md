# Hoosat Create

**React server rendering, without the framework.**

Hoosat Create scaffolds a full-stack React and TypeScript app that streams HTML from a small, dependency-light Node.js server. No Express, no magic, just code you can read and own.

```
npx hoosat-create@latest
```

[Website](https://create.hoosat.fi) · [Tutorial](https://create.hoosat.fi/tutorial) · [Template](https://github.com/TMKCodes/hoosat-template) · [Server core](https://github.com/TMKCodes/hoosat-server-core) · [npm](https://www.npmjs.com/package/hoosat-create) · [Discord](https://discord.gg/UXPFcPaPBg)

| | |
|---|---|
| **1** | command to a running SSR app |
| **0** | Express or Babel dependencies |
| **3** | precompressed formats: br, gzip, deflate |
| **100%** | TypeScript, build tools included |

## Quick start

You need **Node.js 22, 24 or 26** and **git**. Node.js 20 and older are end-of-life, and the build tools are TypeScript files that only current Node.js can run directly.

```
$ npx hoosat-create@latest
Creating a new project from Hoosat React SSR Template.
Enter destination project name: my-site
Do you want to initialize a git repository? [Y/n] y
Project cloned successfully.
Project template dependencies installed with npm.
$ cd my-site && npm run dev
Server is running on port 8181
```

Open http://localhost:8181. The port comes from `PORT` in `.env`.

The script clones [hoosat-template](https://github.com/TMKCodes/hoosat-template) over HTTPS together with the [hoosat-server-core](https://github.com/TMKCodes/hoosat-server-core) submodule, writes your details into `package.json`, runs `npm install` and can initialise a fresh git repository for you.

For the full walkthrough, from an empty folder to a deployed site, read the [tutorial](https://create.hoosat.fi/tutorial). It is exactly how [create.hoosat.fi](https://create.hoosat.fi) was built.

### Command line arguments

Every question can be answered up front. Anything you leave out is asked interactively, and you can press Enter to leave it empty.

| Argument | Sets |
|---|---|
| `--destination` | Project folder and `package.json` name |
| `--description` | `package.json` description |
| `--author` | `package.json` author |
| `--license` | `package.json` license |
| `--keywords` | `package.json` keywords, comma-separated |
| `--gitInit` | Initialise a git repository: `Y` or `n` |

```
npx hoosat-create@latest --destination my-site --author "Your Name" --license MIT --gitInit Y
```

Values containing `;`, `|`, `&&`, `>`, `<`, `` ` `` or `$(` are rejected, and git and npm are run without a shell, so a project name can never be run as a command.

### Create a submodule

Inside an existing git repository, this creates an empty git repository at the destination and registers it as a submodule, ready for code you want to share with other projects later:

```
npx hoosat-create@latest submodule --destination src/client/submodule
```

## Client and server, kept apart

Many React frameworks fuse server and client code into the same files with server components, loaders and server actions, and decide at build time what runs where. In Hoosat Create, **the folder decides**.

| Folder | Runs in | What lives there |
|---|---|---|
| `src/client` | Browser | Your React app: pages, components and CSS. Bundled for the browser, starting from `src/client/index.tsx`. |
| `src/server` | Node.js | Your own HTTP server: middlewares, API routes and rendering. Bundled into `build/server.js`, starting from `src/server/index.tsx`. |

Two webpack configs, two bundles and no `"use client"` or `"use server"` directives. You always know what ships to the browser.

## Features

The template is a starting point you copy, not a framework you depend on. Every feature below is plain code in your repository.

- **Streaming SSR.** Pages render with React 19's `renderToPipeableStream`, so the browser gets real HTML first and then hydrates it into an interactive app.
- **A router you can read.** The server core is a few hundred lines of TypeScript on Node's `http` and `https` modules: middlewares, `:params`, wildcards and composable routers.
- **SEO in the first bytes.** Titles, meta, Open Graph and JSON-LD written with `react-helmet-async` are streamed into the `<head>`, so crawlers see them without running JavaScript.
- **Precompressed assets.** The build writes Brotli, gzip and deflate copies of every public file. The server picks one by `Accept-Encoding` and sets long cache headers.
- **TypeScript everywhere.** Strict TypeScript 6 for client and server code. Even the build tools are `.ts` files that Node runs directly with type stripping.
- **Built-in i18n.** i18next and react-i18next are wired in on both the server and the client.
- **Secure defaults.** A Content-Security-Policy header with a nonce, path traversal safe static files, and an `.npmrc` that only installs package versions that have been public for 7 days.
- **Tests from day one.** Jest 30 and Testing Library come configured, with example tests for the server core.
- **Fast dev loop.** `npm run dev` rebuilds the client and the server whenever you save and restarts the server with nodemon, so changes show up in seconds.

## How a request becomes a page

One request through the stack, from socket to interactive page. Each step is a file you can open.

1. **Request.** Node's `http` or `https` server accepts the request, and the URL is sanitised against path traversal.
2. **Middlewares.** Middlewares run in order, for example CORS, file uploads and precompressed static files.
3. **Routes.** API routes such as `/api/ping/:id` answer directly. Everything else falls through to the `*` route.
4. **React render.** The `*` route renders `<App />` inside a `StaticRouter` and streams it to the client.
5. **Head injection.** A transform stream writes Helmet tags, preload links and the bundles into the `<head>` while the HTML streams out.
6. **Hydration.** In the browser `hydrateRoot` attaches React to the existing markup. From here on, navigation happens on the client.

## Your server is just a file

`src/server/index.tsx` is the whole server. Middlewares and routes are plain functions:

```tsx
import { createRouter, createServer, listen } from './core/server';
import { assets } from './core/assets';
import { renderer } from './core/renderer';

const router = createRouter();

// Middlewares run in order, before any route.
router.Middleware(assets(publicDir));

// API routes answer directly.
router.Get("/api/hello/:name", (req, res) => {
  res.status(200).json({ message: "Hello, " + req.params!["name"] });
});

// Every other GET request is a React page.
router.Get("*", async (req, res) => {
  renderer({ res, jsx: <App url={req.url} />, publicDir });
});

listen(createServer(router), 8181, () => console.log("Ready"));
```

Path parameters are in `req.params`, and `res.status()`, `res.send()` and `res.json()` cover most responses. Group routes with `createRouter()` and mount them with `router.UseRouter()`.

## Project layout

```
my-site/
├── public/                 static files, copied into the build
├── src/
│   ├── client/             React app: App.tsx, routes/, components, *.css
│   ├── server/
│   │   ├── api-routes/     your API endpoints
│   │   ├── core/           hoosat-server-core (git submodule)
│   │   └── index.tsx       the server itself
│   └── __tests__/          Jest tests
├── build-tools/            TypeScript build helpers run by Node
├── webpack.client.config.js
└── webpack.server.config.js
```

`src/server/core` is a git submodule shared by every Hoosat project. Update it with `git submodule update --remote` instead of editing it in place.

Plain `.css` files anywhere under `src/client` are merged and minified into `/public/styles.css`, which the renderer links in every page. No imports needed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Builds into `build-dev`, starts the server and rebuilds whenever a file in `src` or `public` changes |
| `npm run build` | Production build into `build`, including precompressed copies of every asset |
| `npm start` | Runs the production server from `build/server.js` |
| `npm test` | Runs the Jest tests |
| `npm run typecheck` | Type checks the whole project with `tsc --noEmit` |

Webpack bundles the server and its dependencies into `build/server.js`, so production only needs the `build` folder. Put it behind a reverse proxy such as Caddy or nginx for TLS, or run it as a container.

## Current, boring, supported

Every dependency is on its latest major release, and the template is tested on all supported Node.js LTS lines.

| | |
|---|---|
| React | 19 |
| React Router | 8 |
| TypeScript | 6 |
| react-helmet-async | 3 |
| i18next | 27 |
| Webpack | 5 |
| Jest | 30 |
| Node.js | 22 · 24 · 26 |

## Release changes

### 1.5.0 -> 1.5.1
- Remove HoosatUI from the stack. The CLI no longer asks to install it, and `--hoosatui` is ignored with a warning.
- Template: drop the unused `react-markdown`, `rehype-highlight` and `remark-gfm` dependencies and the HoosatUI special case in the CSS build.

### 1.4.7 -> 1.5.0
- Requires Node.js 22 or newer (Node.js 20 is end-of-life), template is tested on Node.js 22, 24 and 26.
- Clone the template and its submodule over HTTPS, so no GitHub SSH key is needed.
- Run git and npm without a shell and with argument lists, so project names can not be interpreted as shell commands.
- Fix `--gitInit n` and `--hoosatui n` being treated as yes.
- Stop when cloning the template fails instead of continuing in the wrong directory.
- Fix `submodule` command on Windows and with git 2.38.1+.
- Template: React 19, React Router 8, TypeScript 6, Jest 30, i18next 27, security fixes in server core and all dependency vulnerabilities resolved.

### 1.4.5 -> 1.4.6
- Use submodule for server, make cloning of template recursive.

### 1.4.4 -> 1.4.5
- One small document change in server code example, to make your life easier.
- Add support for command line arguments.
- Add support for `npx hoosat-create submodule`.

### 1.4.3 -> 1.4.4
- Bring back the `#!/usr/bin/env node` line.

### 1.4.2 -> 1.4.3
- Update package.json to contain metadata.

### 1.4.1 -> 1.4.2
- Remove the `download-git-repo` dependency from hoosat-create.
- Validate input in hoosat-create. The following characters do not work in the project name: `;`, `|`, `&&`, `>`, `<`, `` ` ``, `$(`, `$()`

### 1.4.0 -> 1.4.1
- Changed `createServer` to include an options argument for changing the server protocol and to include SSL certificate information.
- JSDoc has been added and more documentation work.

### 1.3.5 -> 1.4.0
- Dropped Express.js and Babel from dependencies.
- Updated package.json scripts to use concurrently and nodemon.

## License

The `hoosat-create` CLI is licensed under the [ISC License](LICENSE.txt). Use it for your own projects or as a starting point for your own templates.

## Join us

Questions, ideas or something broken? Open an [issue](https://github.com/TMKCodes/hoosat-create/issues) or come talk on [Discord](https://discord.gg/UXPFcPaPBg).
