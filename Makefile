.PHONY: help up down restart logs shell-db seed migrate pull-models backend seal console dev

CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Show this help
	@echo ""
	@echo "$(CYAN)VERITAS — Evidence you can trust. Investigation you can defend.$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "$(GREEN)Usage: make [target]$(RESET)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

up: ## Start Postgres + Ollama (docker compose)
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up -d
	@echo "$(GREEN)Postgres (47800) and Ollama (47801) are up.$(RESET)"
	@echo "Now run: make backend   (in one terminal)"
	@echo "         make seal      (in another)"
	@echo "         make console   (in another)"

down: ## Stop Postgres + Ollama
	docker compose down

restart: ## Restart Postgres + Ollama
	docker compose restart

logs: ## Tail docker compose logs
	docker compose logs -f

shell-db: ## Open a psql shell (owner role)
	docker exec -it acpia-postgres psql -U acpia -d acpia

migrate: ## Apply Alembic migrations
	cd backend && . .venv/bin/activate && alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create msg="add_thing")
	cd backend && . .venv/bin/activate && alembic revision --autogenerate -m "$(msg)"

seed: ## Seed demo users (investigator1/supervisor1/auditor1/admin, all password123)
	cd backend && . .venv/bin/activate && python scripts/seed.py

pull-models: ## Pull the three Ollama models this build uses
	docker exec acpia-ollama ollama pull moondream
	docker exec acpia-ollama ollama pull qwen2.5:3b
	docker exec acpia-ollama ollama pull nomic-embed-text

backend: ## Run the FastAPI backend (port 47802)
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 47802

seal: ## Run the Seal frontend (port 47803)
	cd seal && npm run dev -- -p 47803

console: ## Run the Console frontend (port 47804)
	cd police-console && npm run dev -- -p 47804

ps: ## Show docker compose service status
	docker compose ps
