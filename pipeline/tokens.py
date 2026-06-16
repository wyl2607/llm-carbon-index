"""Token derivation (A2). Pure function, no I/O."""

from __future__ import annotations


def output_tokens(total_tokens: int, ratio: float = 0.20) -> int:
    """Derive estimated output (completion) tokens from total prompt+completion.

    Per ASSUMPTIONS.md#A2 (and DATA_SCHEMAS top-level assumptions):
    rankings-daily reports combined tokens; energy scales primarily with
    output tokens. Default split 80:20 (input:output) => ratio=0.20.

    Returns integer count (rounded to nearest). Non-negative inputs only.
    """
    if total_tokens < 0:
        total_tokens = 0
    # ratio documented in ASSUMPTIONS; no other magic ratio allowed here
    return int(round(total_tokens * ratio))


def input_tokens(total_tokens: int, est_output_tokens: int) -> int:
    """Derive estimated input (prompt) tokens as total - output (A2).

    Input tokens are NOT energy-free: they drive the prefill phase (see
    ASSUMPTIONS.md#E-PREFILL). Kept consistent with `output_tokens` so
    input + output == total. Non-negative.
    """
    return max(0, int(total_tokens) - int(est_output_tokens))
