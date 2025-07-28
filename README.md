# Poly Advisor

A client-only Single Page Application (SPA) that provides an AI-powered advisor for Cal Poly questions and email responses.

![Poly Advisor Interface](https://github.com/user-attachments/assets/51439d86-a01c-4f76-b8fb-18dcf0f9803e)

## Features

- **BYOK (Bring Your Own Key)**: Uses your OpenAI API key stored locally in browser
- **Cal Poly Focus**: Searches exclusively within `*.calpoly.edu` domains
- **Smart Citations**: Provides inline citations and clickable sources
- **Email Thread Support**: Detects email threads and generates advisor responses
- **Configurable Search**: Choose between medium and high-depth web searches
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

- "When is the add/drop deadline for Fall 2024?"
- "How do I change my major to Philosophy?"
- "What forms do I need to submit for late withdrawal?"

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

This app is configured for GitHub Pages deployment. Push to the main branch to trigger automatic deployment.

## Security

- API keys are stored only in your browser's localStorage
- No sensitive data is transmitted to our servers
- All OpenAI requests are made directly from your browser

## Architecture

Built with:
- **React** + **TypeScript** for the frontend
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **OpenAI SDK** for API integration
- **GitHub Pages** for hosting

## Privacy

Your API key and conversations are never stored on our servers. All data remains in your browser session.