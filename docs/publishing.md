# Publishing FlowInk

Everything needed to ship the packages to npm and NuGet - accounts, order, commands,
verification, and what to do when something goes wrong. The CI pipeline
(`.github/workflows/publish.yml`) automates the mechanical parts; this document
covers the decisions and the one-time setup.

## Package inventory

| Package | Registry | Identity | Depends on |
|---|---|---|---|
| `@flowink/core` | npm | scoped, public | - (zero runtime deps) |
| `@flowink/react` | npm | scoped, public | peers: `@flowink/core`, `react` |
| `@flowink/angular` | npm | scoped, public | peers: `@flowink/core`, `@angular/*` |
| `flowink-cli` | npm | unscoped, public | - (core bundled by esbuild) |
| `FlowInk.Core` | NuGet | `FlowInk.Core` | - |
| `FlowInk.Blazor` | NuGet | `FlowInk.Blazor` | `FlowInk.Core` (project reference → package dependency) |

Name availability verified (npm registry and nuget.org search: no collisions as of
this writing). **Re-verify before first publish** - `npm view @flowink/core` should
404 today and resolve after.

## One-time account setup

**npm** (owner: the account that will own the `flowink` org/scope):

1. Create/log in at npmjs.com. Publishing scoped public packages on a free plan
   works with `--access public`.
2. Create the `flowink` **organization** on npmjs.com (Settings → Organizations),
   and add the publishing account to it - or publish the scope under your username
   first and migrate later (both work; the org is cleaner for a multi-package scope).
3. Enable 2FA (required for publishes). Create an **Automation** access token
   (Access Tokens → Generate → type *Automation* - bypasses the OTP prompt so CI
   can publish) and add it as the repository secret **`NPM_TOKEN`**.
4. For **provenance** (recommended, already wired in CI): the workflow uses OIDC
   `id-token: write` + `--provenance`; requires the npm token's account to allow it
   (default on) and the repo to be public on GitHub.

**NuGet**:

1. Create/log in at nuget.org.
2. Upload an API key (Account → API Keys → Create, scoped to
   `FlowInk.Core*` and `FlowInk.Blazor*`, push only) → store as the repository
   secret **`NUGET_API_KEY`**.

## Versioning

Single shared version across all six packages (deliberate: the two renderers are
held to byte parity, so version drift is meaningless). Bump with:

```bash
# from the repo root - update all package.json files + both csproj files + CI tarball name
grep -rl '0\.1\.2' packages/*/package.json dotnet/src/*/*.csproj .github/workflows/publish.yml | xargs sed -i '' 's/0\.1\.2/0.2.0/g'
npm install          # regenerate the lockfile
git commit -am "chore: release 0.2.0"
git tag v0.2.0 && git push --follow-tags
```

Pre-1.0 semver: breaking changes bump minor, fixes bump patch. The version
*alignment itself* has a CI-enforced cost - the 0.1.2 bump found three stale
references that would each have broken a real release.

## Release procedure (automated path)

1. Everything merged to `main`, CI green.
2. Bump + tag + push (above). The `Publish` workflow runs: `verify` job first
   (full build + all test suites on both stacks), then `npm` and `nuget` jobs in
   parallel.
3. npm publishes in dependency order - **core before react/angular** (their peer
   declarations resolve against the registry at publish time) - with
   `--access public --provenance`. The CLI is order-independent (bundled).
   NuGet pushes always target **nuget.org explicitly** (never a machine-configured
   private feed - see the workflow comment).
4. Post-release verification:

   ```bash
   npm view @flowink/core version        # expect the new version
   npm view flowink dist.tarball          # tarball URL
   curl -s <tarball-url> | grep -c animate   # 0 - SMIL-free, even via CDN
   curl -s https://api.nuget.org/v3-flatcontainer/flowink.core/index.json
   ```

5. Smoke-test the real registry install in a scratch project (the
   [quickstarts](quickstarts.md) minus the tarball step):

   ```bash
   npm install @flowink/core @flowink/react   # no tarballs - from the registry
   ```

## Release procedure (manual fallback)

If CI can't run (registry incident, provenance disagreement):

```bash
npm login                                # interactive, 2FA
cd packages/core && npm publish --access public
cd ../react  && npm publish --access public
cd ../angular && npm publish --access public
cd ../cli && npm publish --access public

dotnet pack dotnet/src/FlowInk.Core/FlowInk.Core.csproj -c Release -o dist
dotnet pack dotnet/src/FlowInk.Blazor/FlowInk.Blazor.csproj -c Release -o dist
dotnet nuget push dist/FlowInk.Core.*.nupkg --source https://api.nuget.org/v3/index.json
dotnet nuget push dist/FlowInk.Blazor.*.nupkg --source https://api.nuget.org/v3/index.json
```

`prepublishOnly` hooks run build + tests per package - a red suite blocks the
publish locally too, not just in CI.

## Store presence: icons and package READMEs (done - verify after each version bump)

The npm package page **is the package README** and the NuGet page shows the
embedded icon - both were wired in one pass and must survive version bumps:

- **npm**: every package ships `README.md` + `logo.svg` (relative reference -
  self-contained in the tarball, no external dependency). The logo is the
  FlowInk mark: three nodes joined by animated sky flows - CSS-only animation,
  SMIL-free, `prefers-reduced-motion` honored (the library dogfooding itself in
  its own icon). Dry-run check: `npm pack --dry-run | grep -E 'README|logo'`.
- **NuGet**: both `.csproj` files set `PackageIcon` + pack `docs/icon.png`
  (256×256, rendered from the SVG) and `PackageReadmeFile` into the `.nupkg`
  root - the nuget.org page shows the icon *and* the rendered README without
  any external URL (a `PackageIconUrl` legacy fallback is also set). Pack check:
  `unzip -l dist/FlowInk.Core.*.nupkg | grep -E 'icon|README'`.
- **Regenerating the icon**: edit `docs/logo.svg`, render to PNG at 256px (open
  the SVG in a browser at 256×256 viewport and screenshot), save as
  `docs/icon.png`. Source of truth is the SVG.

## What ships (verified by dry-run)

- **@flowink/core**: `dist/` only - 6 files, ~11 kB unpacked; no test files
  (excluded from the build), no sources, no lockfile.
- **@flowink/react**: `dist/` - the component + types.
- **@flowink/angular**: `dist/` - ng-packagr FESM2022 + types + package metadata.
- **flowink-cli**: `dist/cli.js` - the esbuild bundle with the shebang banner;
  **zero runtime dependencies** declared.
- **NuGet packages**: `lib/net10.0/*.dll` + `icon.png` + `README.md` at the
  package root; license expression MIT and repository/project URLs in the manifest.

## Other distribution channels (analysis)

| Channel | Verdict |
|---|---|
| **GitHub Packages** (npm + NuGet) | Already possible: same workflows with `registry: npm.pkg.github.com` / a GitHub source and `GITHUB_TOKEN`. Worth it only if you want per-PR preview builds before npm trust is established. Not configured to keep one source of truth. |
| **unpkg / jsDelivr CDN** | Free once npm-published (`https://unpkg.com/@flowink/core/dist/index.js`). Worth adding as install-free trial links in the README after first publish. |
| **jsr.io (Deno)** | Viable for core+cli (pure ESM), but adds a second TypeScript packaging story for a library whose consumers are npm-centric. Revisit if Deno demand appears. |
| **Package Commander / winget / brew for CLI** | Premature - the CLI is a project dependency (`npx flowink`), not an OS tool. |

## When something goes wrong

- **npm, immediately after publish**: unpublish within 72 h is possible for
  packages with zero dependents (`npm unpublish @flowink/core@0.2.0`). After that,
  or with dependents: `npm deprecate @flowink/core@0.2.0 "use 0.2.1"` and ship a
  fixed patch.
- **Wrong version published**: never reuse a version number - publish the next
  patch and deprecate the bad one.
- **NuGet**: unlisting is possible (owner portal); deprecation with a recommended
  replacement is `dotnet nuget deprecate` or the portal. NuGet versions are also
  immutable once indexed.
- **Name squatting discovered late**: npm org transfer and NuGet owner adds are
  both supported - add the new owner, transfer, remove old.

## Pre-publish checklist

- [ ] `npm view @flowink/core` → 404 (or shows our latest - not someone else's)
- [ ] `npm whoami` logged in as the publishing account (manual path)
- [ ] Secrets `NPM_TOKEN` + `NUGET_API_KEY` set on the repository
- [ ] All versions aligned across the six packages + CI tarball name
- [ ] `npm publish --dry-run --access public` clean in each package; tarball
      contents reviewed (dist only, no tests; README + logo present)
- [ ] NuGet pack verified: `unzip -l` shows `icon.png` + `README.md`
- [ ] Full suites green: `npm test`, `dotnet run --project dotnet/tests/FlowInk.Tests`
- [ ] Tag pushed; `Publish` workflow green; post-release verification block run
