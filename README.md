# 🔥 Roast2Site

**Get your website roasted, then build a better one.**

A web app that analyzes/roasts websites and generates professional landing pages. Built with OpenClaw.

## Features

- **Website Roaster**: Enter any URL and get brutally honest (or professional) feedback
- **Toggle Feedback**: Switch between 🔥 Roast Mode and 📊 Professional analysis
- **Landing Page Generator**: Answer a few questions, get a complete HTML landing page
- **Download Ready**: Export your generated landing page as an HTML file

## Quick Start

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:3000

## API Key

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express
- **AI**: Google Gemini (free tier)
- **Web Scraping**: Axios + Cheerio

## User Flow

```
Start
  ├── "I have a website" → Enter URL → Roast/Analysis → Build Landing Page
  └── "I don't have a website" → Build Landing Page directly
                                         ↓
                              Answer Questions → Generate → Download HTML
```

## API Endpoints

- `POST /api/analyze` - Analyze a website URL
- `POST /api/generate-landing` - Generate a landing page
- `GET /api/health` - Check API status

## License

MIT

---

Built with [OpenClaw](https://openclaw.ai) ⚡
