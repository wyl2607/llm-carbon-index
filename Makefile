# LLM Carbon Index — developer entry points.
# Phase 6H reproducibility: `make verify [DATE ...]` replays a published run from its
# frozen snapshot under data/raw/snapshots/ and asserts byte-identity with the committed
# golden (ignoring generated_at). No network. Exit non-zero with a diff on mismatch.

.PHONY: verify test lint

# Extra goals on the command line (e.g. a date) are passed through as args and
# absorbed by the no-op catch-all below, so `make verify 2026-06-14` works.
verify:
	uv run python -m pipeline.verify $(filter-out $@,$(MAKECMDGOALS))

test:
	uv run pytest -q

lint:
	uv run ruff check .

# Silently succeed for bare argument goals (dates) handed to `verify`.
%:
	@:
