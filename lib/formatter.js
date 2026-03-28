'use strict';

/**
 * Decode HTML entities in a string using a single regex pass, so that
 * double-encoded entities (e.g. `&amp;lt;`) are resolved correctly to their
 * single-encoded form (`&lt;`) rather than being decoded twice.
 */
function decodeEntities(str) {
  const NAMED = {
    amp: '&',
    lt: '<',
    gt: '>',
    nbsp: ' ',
    quot: '"',
    le: '≤',
    ge: '≥',
    '#39': "'",
  };
  return str.replace(/&(?:#(\d+)|([a-z#][a-z0-9]*));/gi, (match, dec, name) => {
    if (dec) return String.fromCharCode(parseInt(dec, 10));
    return NAMED[name.toLowerCase()] ?? match;
  });
}

/**
 * Convert an HTML string (as returned by LeetCode's `content` field) into
 * clean, terminal-friendly Markdown.
 *
 * The conversion is intentionally lightweight – it handles the subset of HTML
 * that LeetCode actually uses in problem descriptions.
 *
 * @param {string} html
 * @returns {string}
 */
function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // ── <pre> blocks → fenced code blocks ────────────────────────────────────
  // Strip inner HTML tags only; entity decoding happens in a single pass later.
  md = md.replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `\`\`\`\n${text}\n\`\`\``;
  });

  // ── Inline formatting ──────────────────────────────────────────────────────
  md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>([\s\S]*?)<\/em>/gi, '_$1_');
  md = md.replace(/<i>([\s\S]*?)<\/i>/gi, '_$1_');
  md = md.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
  md = md.replace(/<sup>([\s\S]*?)<\/sup>/gi, '^$1');
  md = md.replace(/<sub>([\s\S]*?)<\/sub>/gi, '~$1');

  // ── Headings ───────────────────────────────────────────────────────────────
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1');

  // ── Lists ──────────────────────────────────────────────────────────────────
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '');

  // ── Block elements ─────────────────────────────────────────────────────────
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // ── Strip remaining tags ───────────────────────────────────────────────────
  // Output goes to a terminal (stdout), not to a browser renderer, so there is
  // no HTML-injection / XSS risk here.  We strip every remaining tag so that
  // the final string is plain text / Markdown only.
  md = md.replace(/<[^>]+>/g, '');

  // ── Decode remaining HTML entities (after tags are gone) ──────────────────
  md = decodeEntities(md);

  // ── Normalise whitespace ───────────────────────────────────────────────────
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}


/**
 * Assemble the final Markdown output string from a LeetCode problem object and
 * an optional walkccc C++ solution string.
 *
 * @param {object}      problem            – as returned by `getProblemDetails`
 * @param {string|null} [solution]         – raw C++ source, or null
 * @returns {string}
 */
function formatOutput(problem, solution) {
  const { questionId, title, difficulty, topicTags, content } = problem;
  const tags = (topicTags || []).map((t) => t.name).join(', ') || 'N/A';
  const description = htmlToMarkdown(content);

  const lines = [
    `# ${title} (LC #${questionId})`,
    `**Difficulty:** ${difficulty}  |  **Tags:** ${tags}`,
    '',
    '---',
    '',
    '## Problem',
    '',
    description,
  ];

  if (solution) {
    lines.push('', '---', '', '## C++ Solution (walkccc)', '', '```cpp', solution.trim(), '```');
  }

  return lines.join('\n');
}

module.exports = { htmlToMarkdown, formatOutput };
