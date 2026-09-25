# Contributing to AgentRelay

Thank you for your interest in contributing to AgentRelay!

## Project Structure

```
AgentRelay/
├── docs/             # Project documentation
├── frontend/         # Vite + React + Tailwind frontend application
├── backend/          # Backend API server (separate owner)
├── tests/            # Integration / end-to-end tests
├── infrastructure/   # Deployment and infrastructure configs
├── scripts/          # Build, CI, and utility scripts
└── .github/workflows # GitHub Actions CI/CD pipelines
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

> Backend setup instructions will be added by the backend team.

## Branch Naming

- `feature/<phase>-<description>` for new features
- `fix/<description>` for bug fixes
- `chore/<description>` for tooling/config changes

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type: short description

feat:  new feature
fix:   bug fix
chore: tooling, config, dependencies
docs:  documentation only
```
