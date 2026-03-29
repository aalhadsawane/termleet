'use strict';

const assert = require('node:assert/strict');
const { htmlToMarkdown, formatOutput } = require('../lib/formatter');
const { buildSolutionUrl } = require('../lib/walkccc');
const {
  parseArgs,
  renderForTerminal,
  isNetworkError,
  isLeetCodeAccessError,
  pickRandomFromPool,
  getProblemSlug,
  buildProblemPool,
  rememberUnavailableSlug,
} = require('../bin/dsa');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── htmlToMarkdown ────────────────────────────────────────────────────────────

console.log('\nhtmlToMarkdown');

test('strips basic HTML tags', () => {
  assert.equal(htmlToMarkdown('<p>Hello world</p>').trim(), 'Hello world');
});

test('decodes HTML entities', () => {
  assert.ok(htmlToMarkdown('a &amp; b').includes('a & b'));
  assert.ok(htmlToMarkdown('&lt;div&gt;').includes('<div>'));
  assert.ok(htmlToMarkdown('<p>a&nbsp;b</p>').includes('a b'));
});

test('converts <strong> to bold markdown', () => {
  assert.ok(htmlToMarkdown('<strong>bold</strong>').includes('**bold**'));
});

test('converts <em> to italic markdown', () => {
  assert.ok(htmlToMarkdown('<em>italic</em>').includes('_italic_'));
});

test('converts <code> to inline code', () => {
  assert.ok(htmlToMarkdown('<code>myVar</code>').includes('`myVar`'));
});

test('converts <pre> blocks to fenced code', () => {
  const out = htmlToMarkdown('<pre>int x = 1;\nreturn x;</pre>');
  assert.ok(out.includes('```'));
  assert.ok(out.includes('int x = 1;'));
});

test('converts <ul>/<li> to markdown list', () => {
  const out = htmlToMarkdown('<ul><li>Item A</li><li>Item B</li></ul>');
  assert.ok(out.includes('- Item A'));
  assert.ok(out.includes('- Item B'));
});

test('converts headings', () => {
  assert.ok(htmlToMarkdown('<h2>Section</h2>').includes('## Section'));
});

test('collapses excessive newlines', () => {
  const out = htmlToMarkdown('<p>A</p><p>B</p><p>C</p>');
  assert.ok(!out.includes('\n\n\n'));
});

test('does not double-decode &amp;lt; (should stay &lt;)', () => {
  // &amp;lt; represents the literal text "&lt;" – it should NOT become "<"
  assert.ok(htmlToMarkdown('&amp;lt;').includes('&lt;'));
  assert.ok(!htmlToMarkdown('&amp;lt;').includes('<'));
});

test('handles null/empty input', () => {
  assert.equal(htmlToMarkdown(''), '');
  assert.equal(htmlToMarkdown(null), '');
});


// ── buildSolutionUrl ──────────────────────────────────────────────────────────

console.log('\nbuildSolutionUrl');

test('encodes problem ID and title into correct URL', () => {
  const url = buildSolutionUrl(1, 'Two Sum');
  assert.equal(
    url,
    'https://raw.githubusercontent.com/walkccc/LeetCode/main/solutions/1.%20Two%20Sum/1.cpp',
  );
});

test('encodes titles with special characters', () => {
  const url = buildSolutionUrl(10, 'Regular Expression Matching');
  assert.ok(url.includes('10.%20Regular%20Expression%20Matching'));
  assert.ok(url.endsWith('/10.cpp'));
});

test('handles numeric id', () => {
  const url = buildSolutionUrl(100, 'Same Tree');
  assert.ok(url.includes('100.%20Same%20Tree'));
});

// ── formatOutput ──────────────────────────────────────────────────────────────

console.log('\nformatOutput');

const fakeProblem = {
  questionId: '1',
  title: 'Two Sum',
  difficulty: 'Easy',
  topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
  content: '<p>Given an array of integers <code>nums</code>...</p>',
};

test('includes problem title and ID', () => {
  const out = formatOutput(fakeProblem, null);
  assert.ok(out.includes('Two Sum'));
  assert.ok(out.includes('LC #1'));
});

test('includes difficulty and tags', () => {
  const out = formatOutput(fakeProblem, null);
  assert.ok(out.includes('Easy'));
  assert.ok(out.includes('Array'));
  assert.ok(out.includes('Hash Table'));
});

test('includes problem description', () => {
  const out = formatOutput(fakeProblem, null);
  assert.ok(out.includes('`nums`'));
});

test('includes C++ solution when provided', () => {
  const out = formatOutput(fakeProblem, 'class Solution {};');
  assert.ok(out.includes('```cpp'));
  assert.ok(out.includes('class Solution {};'));
});

test('omits solution section when null', () => {
  const out = formatOutput(fakeProblem, null);
  assert.ok(!out.includes('```cpp'));
  assert.ok(!out.includes('walkccc'));
});

test('handles empty topicTags gracefully', () => {
  const out = formatOutput({ ...fakeProblem, topicTags: [] }, null);
  assert.ok(out.includes('N/A'));
});

// ── CLI parsing & terminal rendering ───────────────────────────────────────────

console.log('\ncli');

test('parseArgs supports --difficulty=value format', () => {
  const { opts, error } = parseArgs(['--difficulty=medium', '--no-solution']);
  assert.equal(error, undefined);
  assert.equal(opts.difficulty, 'medium');
  assert.equal(opts.noSolution, true);
});

test('parseArgs supports --difficulty value format', () => {
  const { opts, error } = parseArgs(['--difficulty', 'hard']);
  assert.equal(error, undefined);
  assert.equal(opts.difficulty, 'hard');
});

test('parseArgs rejects invalid difficulty', () => {
  const { error } = parseArgs(['--difficulty=insane']);
  assert.ok(error && error.includes('Invalid difficulty'));
});

test('parseArgs rejects unknown options', () => {
  const { error } = parseArgs(['--wat']);
  assert.ok(error && error.includes('Unknown option'));
});

test('parseArgs catches missing --difficulty value', () => {
  const { error } = parseArgs(['--difficulty']);
  assert.ok(error && error.includes('Missing value'));
});

test('renderForTerminal uses marked parse output', () => {
  const result = renderForTerminal('# Hello', { parse: () => 'rendered' });
  assert.equal(result, 'rendered');
});

test('isNetworkError detects fetch/network messages', () => {
  assert.equal(isNetworkError(new Error('fetch failed')), true);
  assert.equal(isNetworkError(new Error('ECONNRESET happened')), true);
  assert.equal(isNetworkError(new Error('totally different error')), false);
});

test('isLeetCodeAccessError detects 403/429 responses', () => {
  assert.equal(isLeetCodeAccessError({ statusCode: 403 }), true);
  assert.equal(isLeetCodeAccessError({ statusCode: 429 }), true);
  assert.equal(isLeetCodeAccessError({ statusCode: 500 }), false);
  assert.equal(isLeetCodeAccessError(new Error('no status')), false);
});

test('pickRandomFromPool returns and removes a random item', () => {
  const pool = ['a', 'b', 'c'];
  const picked = pickRandomFromPool(pool, () => 0.5); // index 1
  assert.equal(picked, 'b');
  assert.deepEqual(pool, ['a', 'c']);
});

test('pickRandomFromPool returns null for empty pools', () => {
  const pool = [];
  const picked = pickRandomFromPool(pool, () => 0);
  assert.equal(picked, null);
  assert.deepEqual(pool, []);
});

test('getProblemSlug returns the question title slug', () => {
  const problem = { stat: { question__title_slug: 'two-sum' } };
  assert.equal(getProblemSlug(problem), 'two-sum');
});

test('buildProblemPool filters out remembered unavailable slugs', () => {
  const problems = [
    { stat: { question__title_slug: 'two-sum' } },
    { stat: { question__title_slug: 'add-two-numbers' } },
  ];
  const pool = buildProblemPool(problems, new Set(['two-sum']));
  assert.deepEqual(pool, [{ stat: { question__title_slug: 'add-two-numbers' } }]);
});

test('buildProblemPool falls back to full list when all are unavailable', () => {
  const problems = [{ stat: { question__title_slug: 'two-sum' } }];
  const pool = buildProblemPool(problems, new Set(['two-sum']));
  assert.deepEqual(pool, problems);
});

test('rememberUnavailableSlug adds new slugs only once', () => {
  const unavailable = new Set();
  assert.equal(rememberUnavailableSlug(unavailable, 'two-sum'), true);
  assert.equal(rememberUnavailableSlug(unavailable, 'two-sum'), false);
  assert.deepEqual(Array.from(unavailable), ['two-sum']);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
