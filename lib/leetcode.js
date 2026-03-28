'use strict';

const { getJSON, postJSON } = require('./http');

const LEETCODE_PROBLEMS_URL = 'https://leetcode.com/api/problems/all/';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

/** Map from API difficulty level integer to human-readable string. */
const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3 };

const QUESTION_DETAILS_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      title
      titleSlug
      content
      difficulty
      topicTags {
        name
      }
    }
  }
`;

/**
 * Fetch the full list of LeetCode problems.
 *
 * @param {object}  opts
 * @param {string}  [opts.difficulty]  – 'easy' | 'medium' | 'hard'
 * @returns {Array} Filtered array of stat_status_pair objects.
 */
async function getProblemList({ difficulty } = {}) {
  const data = await getJSON(LEETCODE_PROBLEMS_URL);

  let problems = (data.stat_status_pairs || []).filter((p) => !p.paid_only);

  if (difficulty) {
    const level = DIFFICULTY_LEVEL[difficulty.toLowerCase()];
    if (level !== undefined) {
      problems = problems.filter((p) => p.difficulty.level === level);
    }
  }

  return problems;
}

/**
 * Fetch full problem details (title, content, tags, difficulty) via GraphQL.
 *
 * @param {string} titleSlug  – e.g. 'two-sum'
 * @returns {object} The `question` object from the GraphQL response.
 */
async function getProblemDetails(titleSlug) {
  const data = await postJSON(
    LEETCODE_GRAPHQL_URL,
    { query: QUESTION_DETAILS_QUERY, variables: { titleSlug } },
    {
      headers: {
        Referer: 'https://leetcode.com',
      },
    },
  );

  if (data.errors && data.errors.length > 0) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }

  const question = data.data && data.data.question;
  if (!question) {
    throw new Error(`No question data returned for slug: ${titleSlug}`);
  }

  return question;
}

module.exports = { getProblemList, getProblemDetails };
