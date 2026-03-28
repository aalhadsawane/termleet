#!/usr/bin/env node
'use strict';

const { getProblemList, getProblemDetails } = require('../lib/leetcode');
const { getSolution } = require('../lib/walkccc');
const { formatOutput } = require('../lib/formatter');

const HELP_TEXT = `
termleet – random LeetCode problem in your terminal

Usage:
  dsa [options]

Options:
  --difficulty=<easy|medium|hard>   Filter by difficulty
  --no-solution                     Print the problem only (skip C++ solution)
  --help, -h                        Show this help

Examples:
  dsa
  dsa --difficulty=medium
  dsa --no-solution
  dsa | glow -
`.trim();

const MAX_ATTEMPTS = 10;

function clearLine() {
  process.stderr.write('\r' + ' '.repeat(70) + '\r');
}

function status(msg) {
  process.stderr.write(`\r${msg}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT);
    return;
  }

  const difficultyArg = args.find((a) => a.startsWith('--difficulty='));
  const difficulty = difficultyArg ? difficultyArg.split('=')[1] : undefined;
  const noSolution = args.includes('--no-solution');

  try {
    status('⏳ Fetching problem list…');
    const problems = await getProblemList({ difficulty });

    if (problems.length === 0) {
      clearLine();
      console.error('No free problems found matching the given criteria.');
      process.exit(1);
    }

    let problem = null;
    let solution = null;

    // Shuffle a working copy so we don't repeat the same entries on retry.
    const pool = problems.slice().sort(() => Math.random() - 0.5);
    let poolIdx = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (poolIdx >= pool.length) {
        poolIdx = 0; // wrap around if pool is exhausted
      }
      const picked = pool[poolIdx++];
      const slug = picked.stat.question__title_slug;

      status(`⏳ Fetching problem details… (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);

      let details;
      try {
        details = await getProblemDetails(slug);
      } catch {
        continue;
      }

      if (!details || !details.content) continue;

      if (!noSolution) {
        status('⏳ Fetching walkccc solution…');
        solution = await getSolution(details.questionId, details.title);
        if (!solution) continue; // walkccc doesn't have this problem – retry
      }

      problem = details;
      break;
    }

    clearLine();

    if (!problem) {
      console.error(
        `Could not find a suitable problem after ${MAX_ATTEMPTS} attempts.\n` +
        'Try again, or use --no-solution to skip the walkccc lookup.',
      );
      process.exit(1);
    }

    console.log(formatOutput(problem, solution));
  } catch (err) {
    clearLine();
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
