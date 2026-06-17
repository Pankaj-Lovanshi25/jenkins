# Jenkins AI Review Flow

This project demonstrates a Jenkins pipeline that:

1. Checks out the repository.
2. Installs dependencies.
3. Runs a basic validation step.
4. Sends only the changed files and changed hunks to an AI reviewer.
5. Stores the review in `review.txt` and `ai-review-report.md`.
6. Posts the review as a GitHub PR comment when a PR is available, or as a commit comment otherwise.

## Local Run

```bash
npm install
npm start
```

## AI Review

Set `GROQ_API_KEY` in Jenkins credentials or in a local `.env` file, then run:

```bash
npm run review
```

## Jenkins Notes

- Create a Jenkins secret text credential with ID `GROQ_API_KEY`.
- The pipeline uses `npm ci` for reproducible installs.
- If the Jenkins credential is missing, the pipeline falls back to the repo's local `.env` support.
- The AI review script only inspects changed files from the current PR or branch push.
- The review output is written to both `review.txt` and `ai-review-report.md` before the GitHub comment step runs.
