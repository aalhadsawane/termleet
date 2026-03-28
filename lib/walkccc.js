'use strict';

const { probe } = require('./http');

const WALKCCC_RAW_BASE =
  'https://raw.githubusercontent.com/walkccc/LeetCode/main/solutions';

/**
 * Build the raw GitHub URL for a walkccc C++ solution.
 *
 * walkccc directory naming pattern: `{id}. {title}/{id}.cpp`
 * Example: `solutions/1. Two Sum/1.cpp`
 *
 * @param {string|number} id     – numeric problem ID
 * @param {string}        title  – exact LeetCode problem title
 * @returns {string} Fully-encoded URL.
 */
function buildSolutionUrl(id, title) {
  const folder = encodeURIComponent(`${id}. ${title}`);
  return `${WALKCCC_RAW_BASE}/${folder}/${id}.cpp`;
}

/**
 * Fetch the C++ solution from walkccc/LeetCode.
 *
 * Returns the raw source code string, or `null` if not found.
 *
 * @param {string|number} id     – problem ID (e.g. 1)
 * @param {string}        title  – problem title (e.g. 'Two Sum')
 * @returns {Promise<string|null>}
 */
async function getSolution(id, title) {
  const url = buildSolutionUrl(id, title);
  const { ok, text } = await probe(url);
  return ok ? text : null;
}

module.exports = { getSolution, buildSolutionUrl };
