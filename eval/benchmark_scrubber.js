#!/usr/bin/env node
/**
 * Scrubber Recall Evaluation Benchmark (PRD §3.4 Metric M-1, §17, §19, TEST-005)
 *
 * Evaluates deterministic secret scrubbing across both client and backend implementations
 * using the labelled corpus in eval/planted_secrets_corpus.json.
 *
 * PRD Acceptance Targets:
 * - Overall Recall >= 95%
 * - No Category < 90%
 * - Reports per-category precision and recall
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrubText as backendScrubText } from '../backend/src/core/scrubber.js';
import { scrubText as cliScrubText } from '../cli/src/core/scrubber.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corpusPath = path.join(__dirname, 'planted_secrets_corpus.json');
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

console.log('════════════════════════════════════════════════════════════════════════════');
console.log('  AGENTRELAY LCP — SCRUBBER RECALL EVALUATION (METRIC M-1)');
console.log('════════════════════════════════════════════════════════════════════════════\n');

function runBenchmark(engineName, scrubFn) {
  console.log(`Running evaluation on: [${engineName}]`);
  console.log(`----------------------------------------------------------------------------`);

  const categoryStats = {};
  let totalPlanted = 0;
  let totalDetected = 0;
  let totalControlFp = 0;

  // 1. Evaluate planted test cases
  for (const tc of corpus.test_cases) {
    if (!categoryStats[tc.category]) {
      categoryStats[tc.category] = { total: 0, detected: 0, failed: [] };
    }
    categoryStats[tc.category].total += 1;
    totalPlanted += 1;

    const { text, redactionCounts } = scrubFn(tc.input);
    const count = redactionCounts[tc.expected_type] || 0;
    const containsPlaceholder = text.includes(tc.expected_redacted);

    if (count > 0 && containsPlaceholder) {
      categoryStats[tc.category].detected += 1;
      totalDetected += 1;
    } else {
      categoryStats[tc.category].failed.push({
        id: tc.id,
        input: tc.input,
        expected: tc.expected_redacted,
        actual: text
      });
    }
  }

  // 2. Evaluate control cases for false positives
  for (const ctrl of corpus.control_cases) {
    const { text, redactionCounts } = scrubFn(ctrl.input);
    const totalRedactions = Object.values(redactionCounts).reduce((a, b) => a + b, 0);
    if (totalRedactions > 0 || text !== ctrl.input) {
      totalControlFp += 1;
    }
  }

  // 3. Print per-category report table
  console.log(
    '%-18s | %-8s | %-9s | %-12s | %-6s'.replace(/%-\d+s/g, (m) => m),
    'Category', 'Planted', 'Detected', 'Recall (%)', 'Status'
  );
  console.log('----------------------------------------------------------------------------');

  let allCategoriesMeetTarget = true;

  for (const [cat, stats] of Object.entries(categoryStats)) {
    const recall = (stats.detected / stats.total) * 100;
    const meetsTarget = recall >= 90.0;
    if (!meetsTarget) allCategoriesMeetTarget = false;

    console.log(
      `${cat.padEnd(18)} | ${String(stats.total).padEnd(8)} | ${String(stats.detected).padEnd(9)} | ${(recall.toFixed(1) + '%').padEnd(12)} | ${meetsTarget ? '✔ PASS' : '✖ FAIL'}`
    );

    if (stats.failed.length > 0) {
      for (const f of stats.failed) {
        console.log(`   [FAIL] ${f.id}: expected ${f.expected} but was not scrubbed.`);
      }
    }
  }

  console.log('----------------------------------------------------------------------------');
  const overallRecall = (totalDetected / totalPlanted) * 100;
  const overallMeetsTarget = overallRecall >= 95.0 && allCategoriesMeetTarget;

  console.log(`Total Planted Secrets : ${totalPlanted}`);
  console.log(`Total Detected Secrets: ${totalDetected}`);
  console.log(`Overall Recall (M-1)  : ${overallRecall.toFixed(1)}% (Target: >= 95.0%)`);
  console.log(`Control False Positives: ${totalControlFp} (Target: 0)`);
  console.log(`Target Status         : ${overallMeetsTarget ? '✔ PASSED METRIC M-1 TARGET' : '✖ FAILED TARGET'}\n`);

  return overallMeetsTarget && totalControlFp === 0;
}

const backendPassed = runBenchmark('Backend Scrubber (backend/src/core/scrubber.js)', backendScrubText);
const cliPassed = runBenchmark('CLI Scrubber (cli/src/core/scrubber.js)', cliScrubText);

if (backendPassed && cliPassed) {
  console.log('🎉 ALL SCRUBBER IMPLEMENTATIONS PASSED METRIC M-1 BENCHMARK TARGETS (≥ 95% overall, no category < 90%).\n');
  process.exit(0);
} else {
  console.error('❌ SCRUBBER BENCHMARK FAILED METRIC M-1 TARGET.');
  process.exit(1);
}
