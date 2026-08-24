# Contributing - environment notes

Setup is standard (root `npm install` links all workspaces; `dotnet build
dotnet/FlowInk.slnx` builds the .NET side). This page records the *non-obvious*
traps hit while building FlowInk, so a contributor's machine cannot lose an evening
to them twice.

## The global-gitignore trap (this really happened)

A machine-level `~/.gitignore_global` containing `**/packages/*` silently excluded
the entire `packages/` tree from the repository. Symptoms: every clean install - CI,
fresh clone - failed workspace resolution while the author's working tree, with the
files simply on disk, passed everything.

- Detect: `git check-ignore -v packages/core/package.json` names the offending
  rule; `git ls-files packages/` showing nothing is the smoking gun.
- Fix (already in this repo): the package sources are force-tracked and
  `.gitignore` carries `!packages/` / `!packages/**` negations.
- Habit: after adding a package, `git ls-files <dir>` before pushing.

## Workspace package names must not collide with the root

A workspace package named identically to the root project (`flowink` inside
`flowink`) silently corrupts npm's workspace registration: `-w` flags report "No
workspaces found" and hoisting links only some packages. The CLI package is
`flowink-cli` for this reason.

## npm 10 vs npm 11 lockfiles

Node 22 bundles npm 10, which rejects npm-11-written lockfiles during resolution.
CI installs the lockfile's npm (`npm install -g npm@11.17.0`) before `npm install`.
Locally, check `npm -v` when workspace behavior looks insane.

## Watch `npm install` output inside unpublished workspaces

`npm install -D <pkg> -w <workspace>` while peer dependencies are unpublished fails
with a registry 404 - and a `tail -1` hides it. This once left `ng-packagr` absent
from devDependencies while the build *appeared* to work (it resolved from a stale
global cache). Grep install output for `E404`/`error` before trusting a green build.

## Building the Angular package

`npm run build -w @flowink/angular` runs ng-packagr; the output in `dist/` is the
real artifact. The in-repo demo consumes **source** via tsconfig paths - it validates
the component, never the package (see
[findings F1](findings-first-consumer-validation.md)). To validate packaging, run
`npm pack` and install the tarball somewhere fresh.

## Bundling the CLI

The CLI build compiles with tsc, then bundles with esbuild (banner supplies the
shebang - the TypeScript source must **not** carry one, or the shebang lands
mid-file as a syntax error). Any change to CLI imports should be followed by a
standalone install test: `npm install -g <tarball> && flowink render …`.

## Renderer changes touch two languages

The TypeScript and C# renderers are held to byte parity by the golden fixture
(`dotnet/tests/FlowInk.Tests/fixtures/`). Any renderer change requires regenerating
`parity-ts.svg` (via the CLI) *in the same commit*, or parity CI fails - that is the
system working. Beware cross-language float formatting and midpoint rounding when
touching geometry (see [ADR 0002](adr/0002-spec-parity.md)).
