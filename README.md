# termleet

Revise LeetCode problems (with C++ solutions from [walkccc](https://github.com/walkccc/LeetCode)) directly in your terminal — no browser required.

## Installation

```bash
npm install -g termleet
```

> Requires Node.js 18 or later.

## Usage

```bash
dsa                        # random problem + C++ solution
dsa --difficulty=medium    # filter by difficulty (easy | medium | hard)
dsa --no-solution          # show the problem only
dsa | glow -               # pipe through glow for rendered markdown
```

The output is markdown-friendly:

```
# Two Sum (LC #1)
**Difficulty:** Easy  |  **Tags:** Array, Hash Table

---

## Problem

Given an array of integers `nums` and an integer `target`...

---

## C++ Solution (walkccc)

\`\`\`cpp
class Solution {
 public:
  vector<int> twoSum(vector<int>& nums, int target) { ... }
};
\`\`\`
```

## How it works

1. Fetches the full LeetCode problem list (`leetcode.com/api/problems/all/`).
2. Picks a random free problem.
3. Retrieves full details (title, description, tags) via the LeetCode GraphQL API.
4. Fetches the corresponding C++ solution from the [walkccc/LeetCode](https://github.com/walkccc/LeetCode) repository.
5. If walkccc has no solution for the chosen problem, a different problem is tried automatically.
6. Prints the result as clean Markdown.

## Development

```bash
# run unit tests (no network required)
npm test
```
