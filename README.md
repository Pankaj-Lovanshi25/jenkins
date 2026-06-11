# Jenkins AI Review Flow

This project demonstrates a Jenkins pipeline that:

1. Checks out the repository.
2. Installs dependencies.
3. Runs a basic validation step.
4. Sends the changed code to an AI reviewer.
5. Prints bugs, fixes, and optimization suggestions in the build log.

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
- If `GROQ_API_KEY` is missing, the AI review stage is skipped and the build continues.
- The AI review script prefers changed files, then falls back to core project files.
