import { build } from 'esbuild';

// Bundles the CLI with @flowink/core into one self-contained file. A terminal
// tool should install with zero registry dependencies - core is an
// implementation detail of the CLI, not something the shell shares.
await build({
  entryPoints: ['dist/cli.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.bundle.js',
  banner: { js: '#!/usr/bin/env node' },
});
