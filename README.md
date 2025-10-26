# Gecko Advisor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.14.0-orange.svg)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**A privacy-first website scanner that provides transparent, deterministic privacy scores with explainable evidence.**

Built by [Privacy Gecko](https://geckoadvisor.com), Gecko Advisor is a fast, opinionated tool that helps users understand the privacy implications of any website. 100% free, open source, and privacy-respecting—no tracking, no limits, no compromises.

---

## Features

- **Privacy-First Scanning**: Analyzes cookies, trackers, third-party requests, and security headers without collecting user data
- **Transparent Scoring**: Deterministic privacy score (0-100) with full explanation of deductions
- **Explainable Evidence**: Every finding is backed by detailed evidence—see exactly what was detected and why it matters
- **Fast & Efficient**: Shallow crawl engine scans up to 10 pages in seconds
- **Community-Driven**: Uses trusted privacy lists from [EasyPrivacy](https://easylist.to/) and [WhoTracks.me](https://whotracks.me/)
- **100% Free & Open Source**: No paywalls, no usage limits, no data collection—forever
- **Self-Hostable**: Full Docker support for deployment on your own infrastructure
- **Modern Stack**: React + TypeScript + Express + BullMQ + PostgreSQL

---

## Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 10.14.0 (pinned version)
- **Docker** and **Docker Compose** (recommended for local development)
- **PostgreSQL** 15.x and **Redis** 7.x (if running without Docker)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/gecko-advisor.git
   cd gecko-advisor
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

4. **Start with Docker** (recommended):
   ```bash
   make dev
   ```
   This will:
   - Start all services (frontend, backend, worker, PostgreSQL, Redis)
   - Apply Prisma migrations automatically
   - Seed the database with demo data
   - Frontend available at `http://localhost:8080`
   - API available at `http://localhost:5000`

5. **Or run services individually**:
   ```bash
   pnpm dev
   ```

### Configuration

Key environment variables in `.env`:

```bash
# Application
APP_ENV=development              # development | stage | production
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/geckoadvisor

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security (optional)
ADMIN_API_KEY=your-secret-admin-key
TURNSTILE_SECRET_KEY=your-cloudflare-turnstile-key  # Bot protection
TURNSTILE_SITE_KEY=your-cloudflare-site-key

# Object Storage (optional - for report archival)
OBJECT_STORAGE_ENABLED=false
OBJECT_STORAGE_ENDPOINT=https://your-bucket.s3.region.provider.com
OBJECT_STORAGE_BUCKET=gecko-reports
OBJECT_STORAGE_ACCESS_KEY=your-access-key
OBJECT_STORAGE_SECRET_KEY=your-secret-key
```

---

## Usage

### Scanning a Website

**Via Web Interface**:
1. Navigate to `http://localhost:8080`
2. Enter a URL and submit
3. View real-time scan progress
4. Review the privacy report with detailed evidence

**Via API**:
```bash
# Submit scan (requires Turnstile token in production)
curl -X POST http://localhost:5000/api/v2/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Response: {"scanId": "abc123", "slug": "example-com-abc123"}

# Check status
curl http://localhost:5000/api/v2/scan/abc123/status

# Get report
curl http://localhost:5000/api/v2/report/example-com-abc123
```

### Understanding Privacy Scores

Gecko Advisor uses a **100-point scoring system** where privacy violations result in deductions:

- **Tracking & Analytics** (-5 to -15 per tracker)
- **Third-Party Cookies** (-8 per cookie)
- **Data Sharing** (-10 to -30 based on number of third parties)
- **Security Issues** (-5 to -20 for missing headers, insecure cookies)

Every deduction is explained with:
- **What was detected** (specific tracker, cookie, or issue)
- **Why it matters** (privacy/security implication)
- **Category** (tracking, data sharing, security)
- **Severity** (low, medium, high, critical)

---

## Architecture

Gecko Advisor is built as a **monorepo** with clearly separated concerns:

```
gecko-advisor/
├── apps/
│   ├── frontend/          # React + Vite + TypeScript + Tailwind CSS
│   ├── backend/           # Express API with Zod validation
│   └── worker/            # BullMQ worker for scanning & scoring
├── packages/
│   └── shared/            # Shared schemas, types, and utilities
├── infra/
│   ├── docker/            # Docker Compose configurations
│   └── prisma/            # Database schema, migrations, seeds
└── assets/
    └── docs/              # Project documentation
```

### Technology Stack

**Frontend**:
- React 18 with TypeScript
- Vite for blazing-fast builds
- TanStack Query for data fetching
- React Router for navigation
- Tailwind CSS for styling

**Backend**:
- Express.js with TypeScript
- Zod for runtime validation
- Prisma ORM for database access
- RFC 7807 error responses
- Security middleware (Helmet, CORS, rate limiting)

**Worker**:
- BullMQ for job queue management
- Cheerio for HTML parsing
- Custom scoring engine
- Privacy list integration

**Infrastructure**:
- PostgreSQL 15 for data persistence
- Redis 7 for queue management
- Docker + Docker Compose for deployment
- Nginx for frontend serving with security headers

---

## Development

### Common Commands

```bash
# Development
pnpm dev                    # Start all services in development mode
make dev                    # Docker: start dev stack + migrate + seed

# Building & Testing
pnpm build                  # Build all packages
pnpm lint                   # Lint all packages
pnpm typecheck              # Type check all packages
pnpm test                   # Run all tests

# Database
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:migrate         # Deploy migrations
pnpm seed                   # Seed database with demo data
```

### Project Structure

- **Monorepo**: Uses pnpm workspaces for package management
- **Shared Package**: Common schemas and utilities in `packages/shared`
- **Type Safety**: Strict TypeScript throughout the project
- **Validation**: Zod schemas for runtime type safety
- **Testing**: Vitest for unit and integration tests

### Code Standards

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint**: Enforces consistent code style and best practices
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Structured commit messages
- **WCAG AA Compliance**: Accessibility-first frontend development

For detailed development guidelines, see the code comments and inline documentation.

---

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or suggesting ideas, your help makes Gecko Advisor better for everyone.

**Before contributing**:
1. Read our [Contributing Guidelines](./CONTRIBUTING.md)
2. Review our [Code of Conduct](./CODE_OF_CONDUCT.md)
3. Check existing [Issues](https://github.com/yourusername/gecko-advisor/issues) and [Pull Requests](https://github.com/yourusername/gecko-advisor/pulls)

**Quick Start for Contributors**:
```bash
# Fork the repository and clone your fork
git clone https://github.com/yourusername/gecko-advisor.git
cd gecko-advisor

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, test thoroughly
pnpm typecheck && pnpm lint && pnpm test

# Commit with conventional commit format
git commit -m "feat: add new privacy detection rule"

# Push and create a pull request
git push origin feature/your-feature-name
```

---

## Responsible Use Guidelines

Gecko Advisor is designed to **educate users about web privacy** and help website owners improve their privacy practices. When using this tool:

**Do**:
- Use it to audit your own websites
- Use it for educational and research purposes
- Use it to understand privacy implications of public websites
- Respect rate limits and server resources
- Report vulnerabilities responsibly (see [SECURITY.md](./SECURITY.md))

**Don't**:
- Use it to attack, harm, or disrupt websites
- Bypass authentication or access unauthorized content
- Scan websites at excessive rates that could impact availability
- Use scan results to harass or defame website owners
- Violate any applicable laws or regulations

**Privacy Commitment**:
- Gecko Advisor does **not collect or store user data** during scans
- All scans are performed server-side with no user tracking
- Scan results are public by default (by design for transparency)
- Self-hosted instances give you full control over data retention

By using Gecko Advisor, you agree to use it ethically and responsibly. Abuse may result in rate limiting or blocking.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

### Third-Party Licenses & Attributions

Gecko Advisor uses the following privacy lists and resources:

- **EasyPrivacy** by [EasyList](https://easylist.to/) - Used under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- **WhoTracks.me Tracker Database** by [Ghostery](https://whotracks.me/) - Used under [MIT License](https://github.com/ghostery/whotracks.me/blob/master/LICENSE)
- **Privacy Icons** from [Lucide](https://lucide.dev/) - Licensed under [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)

We are grateful to the privacy community for maintaining these essential resources.

---

## Support & Contact

- **Documentation**: [assets/docs/](./assets/docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/gecko-advisor/issues)
- **Security Vulnerabilities**: security@geckoadvisor.com (see [SECURITY.md](./SECURITY.md))
- **General Inquiries**: hello@geckoadvisor.com
- **Website**: [geckoadvisor.com](https://geckoadvisor.com)

---

## Acknowledgments

Built with care by the Privacy Gecko team. Special thanks to:
- The open source community for invaluable tools and libraries
- EasyList and Ghostery for maintaining privacy lists
- Contributors who help improve Gecko Advisor
- Users who trust us to help them understand web privacy

**Privacy matters. Keep it simple. Keep it free.**

---

*Gecko Advisor - Transparent privacy scanning for everyone.*
