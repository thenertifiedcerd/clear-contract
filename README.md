# ClearContract

ClearContract is a React and Vite app for scanning, pasting, and reviewing contract text with OCR support, optional Firebase-backed persistence, and streamed AI analysis.

## Run locally

1. Install dependencies with `npm install`.
2. Create a `.env` file from `.env.example` and set the AI provider and Firebase values you want to use (`OPENROUTER_API_KEY` / `GEMINI_API_KEY`, or an `xpl_` key via `EXPLABS_API_KEY`).
3. Start the dev server with `npm run dev`.

## Build

Use `npm run build` to produce the production client bundle and server output.
