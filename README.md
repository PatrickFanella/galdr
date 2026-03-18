# PulseScore

PulseScore is a full-stack SaaS application for B2B customer health monitoring. It brings together billing, CRM, and support signals from Stripe, HubSpot, and Intercom so teams can identify at-risk accounts earlier and make better retention decisions.

## Why this project is a strong portfolio piece

- Built a production-oriented product with a Go API, React/TypeScript frontend, and PostgreSQL data layer
- Integrated real-world third-party platforms including Stripe, HubSpot, and Intercom
- Implemented subscription billing, webhook processing, background scoring workflows, and authenticated account management
- Shipped with Dockerized environments, database migrations, automated checks, and GitHub Actions deployment to a VPS

## Technical strengths demonstrated

- **Backend engineering:** Go, HTTP APIs, middleware, service/repository architecture, webhook handling
- **Frontend development:** React 19, TypeScript, Vite, Tailwind CSS, dashboard-oriented UI
- **Data and integrations:** PostgreSQL, Stripe billing, CRM and support platform synchronization
- **Delivery and operations:** Docker, Nginx, CI/CD workflows, environment-based configuration

## Project impact

This project demonstrates the ability to design and ship a polished, end-to-end SaaS platform: backend services, frontend experience, external integrations, billing, deployment, and ongoing maintainability.

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker and Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
make run
```

Frontend:

```bash
cd web
npm install
npm run dev
```

## Quality checks

```bash
make lint test
cd web && npm run lint && npm run format:check
```

For deeper implementation and operational details, see `./Makefile`, `./docs`, and `./.github/workflows`.
