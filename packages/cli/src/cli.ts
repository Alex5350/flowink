#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { renderFlow } from '@flowink/core/dist/index.js';
import type { FlowSpec } from '@flowink/core/dist/index.js';

/**
 * flowink render <spec.json> [-o out.svg]
 *
 * Reads a FlowSpec JSON document and writes the rendered animated SVG.
 * The output embeds everything (styles, system fonts, animation) and never
 * contains SMIL, so it can be committed and referenced from a README as-is.
 */

interface Args {
  specPath: string | null;
  outPath: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let outPath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '-o' || arg === '--out') {
      outPath = argv[++i] ?? null;
    } else if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }
  return { specPath: positional[0] ?? null, outPath };
}

function printUsage(): void {
  console.log(`flowink — animated architecture-flow SVGs from JSON specs

Usage:
  flowink render <spec.json> [-o out.svg]

The spec is a FlowSpec: title, subtitle, chip, theme, nodes (manual
coordinates), and edges (semantic colors, direction, labels, packets).
The output is a self-contained SVG with CSS-only animation - safe for
GitHub README <img> embedding, honoring prefers-reduced-motion, and
guaranteed SMIL-free.`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== 'render') {
    printUsage();
    process.exit(command ? 1 : 0);
  }
  const { specPath, outPath } = parseArgs(rest);
  if (!specPath) {
    console.error('error: a spec file is required (see --help)');
    process.exit(1);
  }

  let raw = '';
  try {
    raw = readFileSync(specPath, 'utf8');
  } catch (error) {
    console.error(`error: cannot read ${specPath}: ${(error as Error).message}`);
    process.exit(1);
  }

  let spec: FlowSpec | null = null;
  try {
    spec = JSON.parse(raw) as FlowSpec;
  } catch (error) {
    console.error(`error: invalid JSON in ${specPath}: ${(error as Error).message}`);
    process.exit(1);
  }

  let svg = '';
  try {
    svg = renderFlow(spec);
  } catch (error) {
    console.error(`error: invalid spec: ${(error as Error).message}`);
    process.exit(1);
  }

  const target = outPath ?? specPath.replace(/\.json$/i, '') + '.svg';
  writeFileSync(target, svg);
  const nodes = spec.nodes.length;
  const edges = spec.edges.length;
  console.log(`rendered ${nodes} nodes / ${edges} edges -> ${target} (${svg.length} bytes, CSS-only animation)`);
}

main();
