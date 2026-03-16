# Makefile — Apple Container + Podman compatible deploy workflow.
# Pattern: validate ALWAYS runs before build/run — no deploy without green gate.

IMAGE   := diary-bot
TAG     := latest
DATA    := $(PWD)/data

# ── Detect runtime ────────────────────────────────────────────────────────────
# Prefer Apple Container if available, fall back to Podman then Docker
ifeq ($(shell command -v container 2>/dev/null),)
  ifeq ($(shell command -v podman 2>/dev/null),)
    RUNTIME := docker
  else
    RUNTIME := podman
  endif
else
  RUNTIME := container
endif

.DEFAULT_GOAL := help

.PHONY: help validate build run dev stop logs clean

help:
	@echo ""
	@echo "  Diary Bot — Apple Container / OCI deploy"
	@echo "  Runtime detected: $(RUNTIME)"
	@echo ""
	@echo "  make validate   Run pre-flight validation (config + schema + agent)"
	@echo "  make build      Build OCI image (runs validate first)"
	@echo "  make run        Run container in background (runs validate first)"
	@echo "  make dev        Run with hot-reload volume mount (local only)"
	@echo "  make logs       Tail container logs"
	@echo "  make stop       Stop and remove container"
	@echo "  make clean      Remove image"
	@echo ""

# ── Validation gate ───────────────────────────────────────────────────────────
# No target that touches the container can bypass this.

validate:
	@echo "→ Running pre-flight validation..."
	python validate.py
	@echo "→ Validation passed."

# ── Build ─────────────────────────────────────────────────────────────────────

build: validate
	@echo "→ Building $(IMAGE):$(TAG) with $(RUNTIME)..."
	$(RUNTIME) build -f Containerfile -t $(IMAGE):$(TAG) .
	@echo "→ Build complete."

# ── Run (production) ─────────────────────────────────────────────────────────

run: validate
	@mkdir -p $(DATA)
	@echo "→ Starting $(IMAGE):$(TAG) with $(RUNTIME)..."
	$(RUNTIME) run \
		--name $(IMAGE) \
		--detach \
		--restart unless-stopped \
		--env-file .env \
		--volume $(DATA):/app/data \
		$(IMAGE):$(TAG)
	@echo "→ Container started. Use 'make logs' to follow."

# ── Dev (hot-reload, local only) ─────────────────────────────────────────────

dev: validate
	@mkdir -p $(DATA)
	@echo "→ Starting dev mode (source mounted, interactive)..."
	$(RUNTIME) run \
		--name $(IMAGE)-dev \
		--rm \
		--interactive \
		--tty \
		--env-file .env \
		--volume $(PWD):/app \
		--volume $(DATA):/app/data \
		$(IMAGE):$(TAG)

# ── Ops ───────────────────────────────────────────────────────────────────────

logs:
	$(RUNTIME) logs --follow $(IMAGE)

stop:
	$(RUNTIME) stop $(IMAGE) 2>/dev/null || true
	$(RUNTIME) rm   $(IMAGE) 2>/dev/null || true

clean: stop
	$(RUNTIME) rmi $(IMAGE):$(TAG) 2>/dev/null || true
