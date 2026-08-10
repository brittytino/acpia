.PHONY: help up down restart logs shell-backend shell-frontend seed migrate test clean

# Colors
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Show this help
	@echo ""
	@echo "$(CYAN)ACPIA — Agentic Child Protection Investigation Assistant$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "$(GREEN)Usage: make [target]$(RESET)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

up: ## Start all services
	@echo "$(CYAN)Starting ACPIA full stack...$(RESET)"
	cp -n .env.example .env 2>/dev/null || true
	docker compose up -d --build
	@echo "$(GREEN)All services started!$(RESET)"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  API:         http://localhost:8000/docs"
	@echo "  Keycloak:    http://localhost:8080"
	@echo "  Neo4j:       http://localhost:7474"
	@echo "  MinIO:       http://localhost:9001"
	@echo "  Grafana:     http://localhost:3001"
	@echo "  Jaeger:      http://localhost:16686"
	@echo "  Prometheus:  http://localhost:9090"
	@echo "  Traefik:     http://localhost:8090"

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Tail all service logs
	docker compose logs -f

logs-backend: ## Tail backend logs
	docker compose logs -f backend celery-worker

logs-agents: ## Tail agent pipeline logs
	docker compose logs -f agents

logs-frontend: ## Tail frontend logs
	docker compose logs -f frontend

shell-backend: ## Open shell in backend container
	docker compose exec backend /bin/bash

shell-agents: ## Open shell in agents container
	docker compose exec agents /bin/bash

shell-db: ## Open psql shell
	docker compose exec postgres psql -U acpia_user -d acpia

shell-neo4j: ## Open cypher-shell
	docker compose exec neo4j cypher-shell -u neo4j -p acpia_neo4j_secret

migrate: ## Run database migrations
	docker compose exec backend alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create msg="add_new_table")
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

seed: ## Seed database with demo data
	docker compose exec backend python scripts/seed_demo.py

test: ## Run all tests
	docker compose exec backend pytest tests/ -v --tb=short
	docker compose exec agents pytest tests/ -v --tb=short

test-backend: ## Run backend tests only
	docker compose exec backend pytest tests/ -v --tb=short

test-agents: ## Run agent tests only
	docker compose exec agents pytest tests/ -v --tb=short

pull-models: ## Pull Ollama AI models (llama3.1:8b, llava:13b)
	docker compose exec ollama ollama pull llama3.1:8b
	docker compose exec ollama ollama pull llava:13b
	docker compose exec ollama ollama pull nomic-embed-text

clean: ## Remove all containers and volumes (DESTRUCTIVE)
	@echo "$(CYAN)WARNING: This will delete all data!$(RESET)"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v --remove-orphans

ps: ## Show service status
	docker compose ps

status: ## Show running containers and health
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

build: ## Build all images without starting
	docker compose build

build-backend: ## Build backend image only
	docker compose build backend celery-worker celery-beat

build-agents: ## Build agents image only
	docker compose build agents

build-frontend: ## Build frontend image only
	docker compose build frontend

init: up migrate seed ## Full initialization: start, migrate, seed
	@echo "$(GREEN)ACPIA is ready!$(RESET)"
