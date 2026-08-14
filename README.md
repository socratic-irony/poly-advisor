# Poly Advisor

A client-only Single Page Application (SPA) that provides an AI-powered advisor for Cal Poly questions and email responses.

![Poly Advisor Interface](https://github.com/user-attachments/assets/51439d86-a01c-4f76-b8fb-18dcf0f9803e)

## Features

- **BYOK (Bring Your Own Key)**: Uses your OpenAI API key stored in this browser's localStorage
- **Cal Poly Focus**: Searches exclusively within `*.calpoly.edu` domains
- **Smart Citations**: Provides inline citations and clickable sources
- **Email Thread Support**: Detects email threads and generates advisor responses
- **Configurable Search**: Choose between medium and high-depth web searches
- **Progressive Responses**: Reveals completed responses progressively for a smoother reading experience
- **Mobile-Friendly**: Responsive design optimized for all devices
- **No Backend Required**: Runs entirely in the browser, perfect for GitHub Pages

## Usage

1. **Add Your API Key**: Enter your OpenAI API key and click "Save"
2. **Configure Settings**: Choose search depth and model preferences
3. **Ask Questions**: Type Cal Poly-related questions or paste email threads
4. **Get Cited Answers**: Receive responses with inline citations and source links

## Key Capabilities

- Answer deadline questions (add/drop, registration, etc.)
- Provide step-by-step process instructions
- Draft email responses for advisors
- Cite the most recent official Cal Poly policies
- Handle conversational follow-ups

## Example Questions

- "When is the add/drop deadline for Fall 2026?"
- "How do I change my major to Philosophy?"
- "What forms do I need to submit for late withdrawal?"

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Validate code (run tests + build)
npm run validate
```

### Development Guidelines

**⚠️ IMPORTANT: All tests must pass before committing!**

This project uses automated pre-commit hooks that will:
1. ✅ Run all tests (`npm test`)
2. 🔨 Build the project (`npm run build`)
3. ❌ Block commits if either step fails

#### Before Making Changes
1. Always run `npm test` to ensure current tests pass
2. Make your changes incrementally
3. Run `npm run validate` frequently during development
4. Add tests for new features when appropriate

#### Pre-commit Hooks
- **Husky** automatically runs tests and builds before each commit
- If tests fail, the commit will be blocked
- Fix any failing tests before attempting to commit again
- Use `npm run validate` to manually check if your code is ready to commit

#### Mobile-First Development
- Test your changes on mobile viewports (320px+)
- Use responsive design patterns with Tailwind CSS
- Ensure touch targets are at least 44x44px
- Test with browser developer tools mobile emulation

## API Helper

For server-side or scripting scenarios, the `openai-responses.js` file demonstrates how to call the OpenAI Responses API while restricting web search to Cal Poly domains only.

```bash
export OPENAI_API_KEY=sk-...
node example.js
```

`completeWithDomainFilteredSearch(history)` automatically limits searches to `calpoly.edu` and its subdomains.

## Deployment

This app is configured for GitHub Pages deployment. Push to the main branch to trigger automatic deployment.

## Security

- Your API key is saved in this browser's localStorage until you use **Forget** in Settings.
- This is a browser-only app: requests go directly from your browser to the OpenAI API, not through a Poly Advisor server.
- Questions and any pasted or uploaded `.eml` email content are included in those API requests. Do not submit information you should not share with OpenAI.
- Never commit an API key to this repository or any other source file.

## Advising-document status

The bundled Philosophy advising reference is imported from the latest **PHIL.docx** supplied for this app and loaded at runtime from `public/PHIL_Advising_doc.md` (the browser-readable conversion). The app is still configured to search official Cal Poly pages for current information.

## Architecture

Built with:
- **React** + **TypeScript** for the frontend
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **OpenAI SDK** for API integration
- **GitHub Pages** for hosting

## Privacy

Poly Advisor does not store your API key or conversations on its own server. Request content is sent directly to the OpenAI API as described above.
