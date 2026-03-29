# termleet

Revise LeetCode problems (with C++ solutions from [walkccc](https://github.com/walkccc/LeetCode)) directly in your terminal — no browser required.

## Preview

![preview](https://github.com/user-attachments/assets/1943d79d-f50f-41f0-89f7-938d05239d97)


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
```

### Run locally during development

```bash
# from repository root
npm install
npm install -g .

# run the globally linked CLI
dsa
```

If `dsa` can't find a walkccc solution after several attempts, it falls back to showing a LeetCode problem without the solution block so you can continue practicing.

`dsa` renders markdown directly in terminal using:
- [`marked-terminal`](https://www.npmjs.com/package/marked-terminal) for markdown structure
- [`cli-highlight`](https://www.npmjs.com/package/cli-highlight) for C++ syntax highlighting

The output is markdown-friendly.

## How it works

1. Fetches the full LeetCode problem list from the public endpoint (`https://leetcode.com/api/problems/all/`).
2. Picks a random free problem.
3. Fetches problem details without login:
   - First tries LeetCode's public GraphQL endpoint (`https://leetcode.com/graphql/`).
   - If GraphQL is blocked/rate-limited/unavailable, falls back to the public problem page (`/problems/<slug>/description/`) and extracts description data from embedded JSON.
4. Fetches the corresponding C++ solution from the [walkccc/LeetCode](https://github.com/walkccc/LeetCode) repository.
5. If walkccc has no solution for the chosen problem, a different problem is tried automatically.
6. During retries, unavailable slugs are tracked only in-memory for the current run (no local persistence file).
7. Renders markdown to styled terminal output.

## Development

```bash
# run unit tests (no network required)
npm test
```
