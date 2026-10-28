#!/usr/bin/env node
// Benchmark the type-checking cost of individual files.
//
// Each file is checked in isolation (plus whatever it imports) using the
// project's tsconfig, and compared against an empty-file baseline so the
// fixed cost of loading lib/*.d.ts is subtracted out.
//
// Usage:
//   node scripts/bench-types.mjs [options] <file...>
//
// Options:
//   --runs <n>         timing runs per file (default 5; counts are deterministic)
//   --project <path>   tsconfig to extend (default ./tsconfig.json)
//   --trace            also print per-file check time from --generateTrace
//   --json             print results as JSON instead of a table

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const cacheDir = join(root, "node_modules", ".cache", "bench-types");
const tscBin = join(root, "node_modules", ".bin", "tsc");

const parseArgs = (argv) => {
  const opts = { runs: 5, project: "tsconfig.json", trace: false, json: false, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--runs") opts.runs = Number(argv[++i]);
    else if (arg === "--project") opts.project = argv[++i];
    else if (arg === "--trace") opts.trace = true;
    else if (arg === "--json") opts.json = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else opts.files.push(arg);
  }
  if (!Number.isInteger(opts.runs) || opts.runs < 1) throw new Error("--runs must be a positive integer");
  return opts;
};

// Turns "Check time:  0.002s" / "Memory used: 27724K" / "Types: 2714" into numbers.
const parseDiagnostics = (output) => {
  const stats = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Za-z ]+):\s+([\d.]+)(s|K)?\s*$/);
    if (!match) continue;
    const [, key, value, unit] = match;
    const name = key.trim().toLowerCase().replace(/ (\w)/g, (_, c) => c.toUpperCase());
    stats[name] = unit === "s" ? Number(value) * 1000 : Number(value);
  }
  return stats;
};

const writeConfig = (name, file, project) => {
  const configPath = join(cacheDir, `${name}.tsconfig.json`);
  const config = {
    extends: resolve(root, project),
    include: [],
    files: [resolve(root, file)],
    // rootDir defaults to the config's own directory, which here is the cache dir.
    compilerOptions: { noEmit: true, incremental: false, rootDir: root },
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
};

const runTsc = (configPath, extraArgs = []) => {
  const result = spawnSync(tscBin, ["-p", configPath, "--extendedDiagnostics", ...extraArgs], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  const output = result.stdout + result.stderr;
  const errors = output.split("\n").filter((line) => /error TS\d+/.test(line));
  return { stats: parseDiagnostics(output), errors };
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const bench = (name, file, opts) => {
  const configPath = writeConfig(name, file, opts.project);
  const runs = Array.from({ length: opts.runs }, () => runTsc(configPath));
  const { stats, errors } = runs[0];
  return {
    file,
    types: stats.types ?? 0,
    instantiations: stats.instantiations ?? 0,
    symbols: stats.symbols ?? 0,
    files: stats.files ?? 0,
    memoryKB: stats.memoryUsed ?? 0,
    checkMs: median(runs.map((r) => r.stats.checkTime ?? 0)),
    totalMs: median(runs.map((r) => r.stats.totalTime ?? 0)),
    errors,
    configPath,
  };
};

// Per-file checkSourceFile durations. Handles both complete ("X") events and
// begin/end ("B"/"E") pairs, which the native compiler emits per checker thread.
const traceCheckTimes = (configPath, name) => {
  const traceDir = join(cacheDir, `${name}.trace`);
  rmSync(traceDir, { recursive: true, force: true });
  runTsc(configPath, ["--generateTrace", traceDir]);
  const raw = JSON.parse(readFileSync(join(traceDir, "trace.json"), "utf8"));
  const events = Array.isArray(raw) ? raw : raw.traceEvents;

  const totals = new Map();
  const add = (path, dur) => totals.set(path, (totals.get(path) ?? 0) + dur);
  const stacks = new Map();
  for (const event of events) {
    if (event.name !== "checkSourceFile") continue;
    if (event.ph === "X") add(event.args?.path, event.dur);
    else if (event.ph === "B") {
      const stack = stacks.get(event.tid) ?? [];
      stack.push(event);
      stacks.set(event.tid, stack);
    } else if (event.ph === "E") {
      const begin = stacks.get(event.tid)?.pop();
      if (begin) add(begin.args?.path, event.ts - begin.ts);
    }
  }

  return [...totals]
    .filter(([path]) => path && !path.includes("/node_modules/"))
    .map(([path, us]) => ({ file: relative(root, path), checkMs: us / 1000 }))
    .sort((a, b) => b.checkMs - a.checkMs);
};

const fmt = (n, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits });

const printTable = (baseline, results, opts) => {
  const header = ["file", "instantiations", "types", "symbols", "check ms", "total ms", "Δ total ms", "memory MB"];
  const rows = [
    ["(empty baseline)", fmt(baseline.instantiations), fmt(baseline.types), fmt(baseline.symbols),
      fmt(baseline.checkMs, 1), fmt(baseline.totalMs, 1), "-", fmt(baseline.memoryKB / 1024, 1)],
    ...results.map((r) => [
      r.file,
      fmt(r.instantiations - baseline.instantiations),
      fmt(r.types - baseline.types),
      fmt(r.symbols - baseline.symbols),
      fmt(r.checkMs, 1),
      fmt(r.totalMs, 1),
      fmt(r.totalMs - baseline.totalMs, 1),
      fmt(r.memoryKB / 1024, 1),
    ]),
  ];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  rows.forEach((row) => console.log(line(row)));
  console.log(`\nCounts are relative to the empty baseline. Times are the median of ${opts.runs} run(s).`);

  for (const r of results) {
    if (r.errors.length) {
      console.log(`\n⚠ ${r.file} has ${r.errors.length} type error(s); numbers may be incomplete:`);
      r.errors.slice(0, 5).forEach((e) => console.log(`  ${e}`));
    }
    if (r.trace) {
      console.log(`\nCheck time per file for ${r.file} (from trace):`);
      r.trace.forEach((t) => console.log(`  ${t.checkMs.toFixed(2).padStart(8)} ms  ${t.file}`));
    }
  }
};

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.files.length) {
    console.error("Usage: node scripts/bench-types.mjs [--runs n] [--project tsconfig.json] [--trace] [--json] <file...>");
    process.exit(1);
  }
  if (!existsSync(tscBin)) throw new Error(`tsc not found at ${tscBin}; run npm install`);
  for (const file of opts.files) {
    if (!existsSync(resolve(root, file))) throw new Error(`File not found: ${file}`);
  }

  mkdirSync(cacheDir, { recursive: true });
  const emptyFile = join(cacheDir, "empty.ts");
  writeFileSync(emptyFile, "export {};\n");

  const baseline = bench("baseline", emptyFile, opts);
  baseline.file = "(empty baseline)";
  const results = opts.files.map((file, i) => {
    const result = bench(`file-${i}`, file, opts);
    if (opts.trace) result.trace = traceCheckTimes(result.configPath, `file-${i}`);
    return result;
  });

  if (opts.json) {
    const strip = ({ configPath, ...rest }) => rest;
    console.log(JSON.stringify({ baseline: strip(baseline), results: results.map(strip) }, null, 2));
  } else {
    printTable(baseline, results, opts);
  }
};

main();
