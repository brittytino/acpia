# Contributing to ACPIA

Thank you for your interest in contributing to the Advanced Child Protection Intelligence Agency (ACPIA) platform. Because this platform handles sensitive workflows and intelligence logic, we strictly enforce coding standards, security reviews, and proper testing for all pull requests.

## 1. Getting Started

Before contributing, please read the [README.md](README.md) to understand the system architecture.

### Development Environment
For local development, you should run the components natively (without Docker) for faster iteration. Ensure you have:
* Python 3.11+
* Node.js 20+
* PostgreSQL 15+

You can use the provided `./start_all.sh` script to boot the PostgreSQL database, FastAPI backend, and both Next.js frontends concurrently.

## 2. Coding Standards

### Backend (Python/FastAPI)
* Follow **PEP 8** style guidelines.
* We use `black` for formatting and `ruff` for linting.
* **Security Rule:** Never inject raw evidence data directly into AI prompts without strict sanitization.
* **Integrity Rule:** Do not modify existing rows in the `CustodyLog`. It must remain append-only to preserve hash-chain integrity.

### Frontend (Next.js/React)
* Follow strict TypeScript typings. Do not use `any` unless absolutely necessary.
* Use Tailwind CSS for all styling, relying on the predefined tokens in `globals.css` (e.g., `var(--ink)`, `var(--steel)`).
* UI changes must adhere to the ACPIA Premium Design Language (fixed layouts, calm color palette, responsive design).

## 3. Pull Request Process

1. **Fork the repo** and create a feature branch (`feature/your-feature-name`).
2. Ensure you have run all local linters and tests.
3. If you change database schemas, ensure you include Alembic migration scripts.
4. Open a Pull Request against the `main` branch.
5. Provide a clear description of the problem solved, and link to any relevant issues.
6. A core team member will review your code for security and architectural alignment before merging.

## 4. Reporting Security Vulnerabilities

If you discover a security loophole (e.g., related to evidence hashing, authentication, or AI prompt injection), **do NOT open a public issue.** Please email the core maintainers directly to disclose it responsibly.
