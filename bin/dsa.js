#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { marked } = require('marked');
const { markedTerminal } = require('marked-terminal');
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
const UNAVAILABLE_SLUGS_FILE = path.join(os.homedir(), '.termleet-unavailable-slugs.json');
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
marked.use(markedTerminal({}, { language: 'cpp', ignoreIllegals: true }));

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

function renderForTerminal(markdown, { parse = marked.parse } = {}) {
  return parse(markdown);
}

function pickRandomFromPool(pool, random = Math.random) {
  if (!pool.length) return null;
  const index = Math.floor(random() * pool.length);
  return pool.splice(index, 1)[0];
}

function getProblemSlug(problem) {
  return problem && problem.stat && problem.stat.question__title_slug
    ? problem.stat.question__title_slug
    : '';
}

function buildProblemPool(problems, unavailableSlugs) {
  const filtered = problems.filter((problem) => !unavailableSlugs.has(getProblemSlug(problem)));
  return (filtered.length > 0 ? filtered : problems).slice();
}

function rememberUnavailableSlug(unavailableSlugs, slug) {
  if (!slug || unavailableSlugs.has(slug)) return false;
  unavailableSlugs.add(slug);
  return true;
}

async function loadUnavailableSlugs() {
  try {
    const content = await fs.readFile(UNAVAILABLE_SLUGS_FILE, 'utf8');
    const slugs = JSON.parse(content);
    return new Set(Array.isArray(slugs) ? slugs.filter((slug) => typeof slug === 'string' && slug) : []);
  } catch {
    return new Set();
  }
}

async function saveUnavailableSlugs(unavailableSlugs) {
  await fs.writeFile(UNAVAILABLE_SLUGS_FILE, JSON.stringify(Array.from(unavailableSlugs), null, 2) + '\n');
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
    const unavailableSlugs = await loadUnavailableSlugs();

    if (problems.length === 0) {
      clearLine();
      console.error('No free problems found matching the given criteria.');
      process.exit(1);
    }

    let problem = null;
    let fallbackProblem = null;
    let solution = null;
    let detailFailures = 0;
    let solutionFailures = 0;
    let unavailableSlugsChanged = false;

    const pool = buildProblemPool(problems, unavailableSlugs);

    for (let attempt = 0; attempt < MAX_ATTEMPTS && pool.length > 0; attempt++) {
      const picked = pickRandomFromPool(pool);
      const slug = getProblemSlug(picked);

      status(`⏳ Fetching problem details… (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);

      let details;
      try {
        details = await getProblemDetails(slug);
      } catch (err) {
        detailFailures++;
        if (!isNetworkError(err)) {
          unavailableSlugsChanged = rememberUnavailableSlug(unavailableSlugs, slug) || unavailableSlugsChanged;
        }
        if (isNetworkError(err) && detailFailures >= 2) {
          throw new Error(
            'Network appears unavailable while fetching LeetCode data. Check your internet connection and try again.',
          );
        }
        continue;
      }

      if (!details || !details.content) {
        unavailableSlugsChanged = rememberUnavailableSlug(unavailableSlugs, slug) || unavailableSlugsChanged;
        continue;
      }
      fallbackProblem = details;

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

    if (unavailableSlugsChanged) {
      await saveUnavailableSlugs(unavailableSlugs);
    }

    if (!problem && fallbackProblem && !opts.noSolution) {
      problem = fallbackProblem;
      console.error('Note: walkccc solution not found for sampled problems. Showing problem only.');
    }

    if (!problem) {
      console.error(
        `Could not find a suitable problem after ${MAX_ATTEMPTS} attempts.\n` +
          'Try again, or use --no-solution to skip the walkccc lookup.\n' +
          `(LeetCode detail failures: ${detailFailures}, walkccc misses: ${solutionFailures})`,
      );
      process.exit(1);
    }

    const markdown = formatOutput(problem, solution);
    process.stdout.write(renderForTerminal(markdown));
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

module.exports = {
  parseArgs,
  renderForTerminal,
  isNetworkError,
  pickRandomFromPool,
  getProblemSlug,
  buildProblemPool,
  rememberUnavailableSlug,
};
