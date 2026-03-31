# ⚡ LiveDeploy Pipeline System v3.0

A full-stack CI/CD automation platform. Paste any GitHub repo URL → auto-analyzes → AI modifies → deploys → live URL!

## 🆕 What's New in v3
- **Natural Language AI** — Just say what you need, no coding required!
- **Auto Repo Analysis** — Tech stack, type, files auto-detected
- **Project Overview Card** — See what's in the repo before deploying
- **AI Suggestions** — Auto-suggested improvements based on repo
- **Render Only** — Stable, no Railway credit issues

## 🚀 Quick Start

### 1. Edit docker-compose.yml — Add your tokens:
```yaml
- GITHUB_TOKEN=ghp_your_github_token
- RENDER_API_KEY=rnd_your_render_api_key
```

### 2. Run:
```bash
docker-compose up --build
```

### 3. Open:
```
http://localhost:3000
```

## 🔑 Getting API Keys

### GitHub Token
1. github.com → Settings → Developer Settings → Personal Access Tokens
2. Generate token with `repo` and `read:user` scopes

### Render API Key
1. dashboard.render.com → Account Settings → API Keys
2. Create new key

## 💻 Tech Stack
- Frontend: React.js + Bootstrap 5
- Backend: Node.js + Express.js
- Database: MongoDB
- Auth: JWT
- Deploy: Render API
- DevOps: Docker + GitHub Actions
- AI: Pattern-based NLP

## 📁 Structure
```
ldp-v3/
├── backend/          # Node.js API
│   ├── routes/       # auth, github, ai, deploy
│   └── services/     # deployService
├── frontend/         # React app
│   └── src/pages/    # Dashboard, Pipeline, History
├── docker-compose.yml
└── README.md
```
