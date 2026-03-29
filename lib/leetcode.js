'use strict';

const { getJSON, postJSON } = require('./http');

const LEETCODE_PROBLEMS_URL = 'https://leetcode.com/api/problems/all/';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

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

function levelToDifficulty(level) {
  if (level === 1) return 'Easy';
  if (level === 2) return 'Medium';
  if (level === 3) return 'Hard';
  return 'Unknown';
}

function slugToTitle(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function buildPublicFallbackDetails(titleSlug, fallbackProblem, description) {
  const stat = fallbackProblem && fallbackProblem.stat ? fallbackProblem.stat : {};
  const questionId = stat.frontend_question_id || stat.question_id || '';
  const title = stat.question__title || slugToTitle(titleSlug);
  const difficultyLevel =
    fallbackProblem && fallbackProblem.difficulty ? fallbackProblem.difficulty.level : undefined;

  return {
    questionId: String(questionId || ''),
    title,
    titleSlug,
    content: `<p>${description}</p>`,
    difficulty: levelToDifficulty(difficultyLevel),
    topicTags: [],
  };
}

async function getProblemDetailsFromPublicPage(titleSlug, fallbackProblem) {
  const url = `https://leetcode.com/problems/${titleSlug}/description/`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'termleet/1.0 (https://github.com/aalhadsawane/termleet)',
      Referer: 'https://leetcode.com/problemset/',
    },
    signal: AbortSignal.timeout(15000),
  });

  const html = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.statusCode = res.status;
    err.body = html;
    throw err;
  }

  const ldJsonMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!ldJsonMatch) {
    throw new Error(`No public description JSON found for slug: ${titleSlug}`);
  }

  let description = '';
  try {
    const parsed = JSON.parse(ldJsonMatch[1]);
    description = decodeEntities(parsed && parsed.description ? parsed.description : '');
  } catch {
    throw new Error(`Failed to parse public description JSON for slug: ${titleSlug}`);
  }

  if (!description) {
    throw new Error(`No public description found for slug: ${titleSlug}`);
  }

  return buildPublicFallbackDetails(titleSlug, fallbackProblem, description);
}

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
 * @param {object} [fallbackProblem] – stat_status_pair item from problem list
 * @returns {object} The `question` object from the GraphQL response.
 */
async function getProblemDetails(titleSlug, fallbackProblem) {
  try {
    const data = await postJSON(
      LEETCODE_GRAPHQL_URL,
      { query: QUESTION_DETAILS_QUERY, variables: { titleSlug } },
      {
        headers: {
          Referer: `https://leetcode.com/problems/${titleSlug}/description/`,
          Origin: 'https://leetcode.com',
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
  } catch (graphqlErr) {
    try {
      return await getProblemDetailsFromPublicPage(titleSlug, fallbackProblem);
    } catch (pageErr) {
      const firstError = graphqlErr && graphqlErr.message ? graphqlErr.message : String(graphqlErr);
      const secondError = pageErr && pageErr.message ? pageErr.message : String(pageErr);
      const err = new Error(
        `Failed to fetch details via GraphQL and public page for slug "${titleSlug}". GraphQL: ${firstError}. Public page: ${secondError}`,
      );
      err.statusCode =
        pageErr && typeof pageErr.statusCode === 'number'
          ? pageErr.statusCode
          : graphqlErr && typeof graphqlErr.statusCode === 'number'
            ? graphqlErr.statusCode
            : undefined;
      throw err;
    }
  }
}

module.exports = { getProblemList, getProblemDetails };
