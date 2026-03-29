# termleet

Revise LeetCode problems (with C++ solutions from [walkccc](https://github.com/walkccc/LeetCode)) directly in your terminal — no browser required.

## Installation

```bash
npm install -g termleet
```

> Requires Node.js 18 or later.

### Run locally during development

```bash
# from repository root
npm install
npm install -g .

# run the globally linked CLI
dsa
```

## Usage

```bash
dsa                        # random problem + C++ solution
dsa --difficulty=medium    # filter by difficulty (easy | medium | hard)
dsa --no-solution          # show the problem only
```

If `dsa` can't find a walkccc solution after several attempts, it now falls back to showing a LeetCode problem without the solution block so you can continue practicing.

`dsa` renders markdown directly in terminal using:
- [`marked-terminal`](https://www.npmjs.com/package/marked-terminal) for markdown structure
- [`cli-highlight`](https://www.npmjs.com/package/cli-highlight) for C++ syntax highlighting

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

## Preview

![termleet terminal output](https://github.com/user-attachments/assets/5fda78fc-d612-4cdb-88b6-a3f72d7825f4)

## How it works

1. Fetches the full LeetCode problem list from the public endpoint (`https://leetcode.com/api/problems/all/`).
2. Picks a random free problem.
3. Fetches problem details without login:
   - First tries LeetCode's public GraphQL endpoint (`https://leetcode.com/graphql/`).
   - If GraphQL is blocked/rate-limited/unavailable, falls back to the public problem page (`/problems/<slug>/description/`) and extracts description data from embedded JSON.
4. Fetches the corresponding C++ solution from the [walkccc/LeetCode](https://github.com/walkccc/LeetCode) repository.
5. If walkccc has no solution for the chosen problem, a different problem is tried automatically.
6. Renders markdown to styled terminal output.

During fetch/retry, `dsa` prints `[debug]` lines to stderr with attempt, selected slug, and failure reasons so you can quickly identify where requests are failing.

## Development

```bash
# run unit tests (no network required)
npm test
```
