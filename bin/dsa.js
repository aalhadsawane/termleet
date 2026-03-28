#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
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
`.trim();

const MAX_ATTEMPTS = 10;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function clearLine() {
  process.stderr.write('\r' + ' '.repeat(70) + '\r');
}

function status(msg) {
  process.stderr.write(`\r${msg}`);
}

function parseArgs(args) {
  const opts = { difficulty: undefined, noSolution: false, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--no-solution') {
      opts.noSolution = true;
      continue;
    }
    if (arg.startsWith('--difficulty=')) {
      opts.difficulty = arg.split('=')[1];
      continue;
    }
    if (arg === '--difficulty') {
      const next = args[i + 1];
      if (!next || next.startsWith('-')) {
        return { error: 'Missing value for --difficulty. Use easy, medium, or hard.' };
      }
      opts.difficulty = next;
      i++;
      continue;
    }
    return { error: `Unknown option: ${arg}` };
  }

  if (opts.difficulty) {
    opts.difficulty = opts.difficulty.toLowerCase().trim();
    if (!VALID_DIFFICULTIES.has(opts.difficulty)) {
      return { error: `Invalid difficulty: ${opts.difficulty}. Use easy, medium, or hard.` };
    }
  }

  return { opts };
}

function isNetworkError(err) {
  const message = (err && err.message ? err.message : '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('timed out') ||
    message.includes('econn') ||
    message.includes('enotfound') ||
    message.includes('network')
  );
}

function renderWithGlow(markdown, { spawn = spawnSync } = {}) {
  const glow = spawn('glow', ['-'], {
    input: markdown,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

  if (glow.error && glow.error.code === 'ENOENT') {
    return { usedGlow: false, output: markdown, warning: 'glow not found; printing raw markdown.' };
  }
  if (glow.error) {
    return { usedGlow: false, output: markdown, warning: `glow failed: ${glow.error.message}` };
  }
  if (glow.status !== 0) {
    const stderr = (glow.stderr || '').trim();
    return {
      usedGlow: false,
      output: markdown,
      warning: stderr ? `glow exited with code ${glow.status}: ${stderr}` : `glow exited with code ${glow.status}`,
    };
  }
  return { usedGlow: true, output: glow.stdout || '' };
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.error) {
    console.error(parsed.error);
    console.error('\n' + HELP_TEXT);
    process.exit(1);
  }

  const { opts } = parsed;

  if (opts.help) {
    console.log(HELP_TEXT);
    return;
  }

  try {
    status('⏳ Fetching problem list…');
    const problems = await getProblemList({ difficulty: opts.difficulty });

    if (problems.length === 0) {
      clearLine();
      console.error('No free problems found matching the given criteria.');
      process.exit(1);
    }

    let problem = null;
    let solution = null;
    let detailFailures = 0;
    let solutionFailures = 0;

    const pool = problems.slice();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const slug = picked.stat.question__title_slug;

      status(`⏳ Fetching problem details… (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);

      let details;
      try {
        details = await getProblemDetails(slug);
      } catch (err) {
        detailFailures++;
        if (isNetworkError(err) && detailFailures >= 2) {
          throw new Error(
            'Network appears unavailable while fetching LeetCode data. Check your internet connection and try again.',
          );
        }
        continue;
      }

      if (!details || !details.content) continue;

      if (!opts.noSolution) {
        status('⏳ Fetching walkccc solution…');
        solution = await getSolution(details.questionId, details.title);
        if (!solution) {
          solutionFailures++;
          continue; // walkccc doesn't have this problem – retry
        }
      }

      problem = details;
      break;
    }

    clearLine();

    if (!problem) {
      console.error(
        `Could not find a suitable problem after ${MAX_ATTEMPTS} attempts.\n` +
          'Try again, or use --no-solution to skip the walkccc lookup.\n' +
          `(LeetCode detail failures: ${detailFailures}, walkccc misses: ${solutionFailures})`,
      );
      process.exit(1);
    }

    const markdown = formatOutput(problem, solution);
    const rendered = renderWithGlow(markdown);
    if (rendered.warning) {
      console.error(`Warning: ${rendered.warning}`);
    }
    process.stdout.write(rendered.output);
  } catch (err) {
    clearLine();
    if (isNetworkError(err)) {
      console.error(
        'Error: Network appears unavailable. Please check your internet connection and try again.',
      );
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, renderWithGlow, isNetworkError };
