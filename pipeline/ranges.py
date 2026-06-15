"""Range type for uncertainty bands (ENGINEERING_STANDARDS §2).

Every energy/CO2 quantity is a Range {low,mid,high} with low <= mid <= high.
Multiplication is deliberately conservative: scalar scales all endpoints;
Range * Range is endpoint-wise (low*low, mid*mid, high*high). This is a
band, not a statistical interval.

All operations assume non-negative values (domain of the CO2 model).
"""

from __future__ import annotations

from typing import Union

from pipeline.types import RangeDict


class Range:
    """Conservative uncertainty range. Enforces low <= mid <= high on construction
    and (for positive operands) after arithmetic.
    """

    def __init__(self, low: float, mid: float, high: float) -> None:
        low_f, mid_f, high_f = float(low), float(mid), float(high)
        if not (low_f <= mid_f <= high_f):
            raise ValueError(
                f"Range invariant violated: low({low_f}) <= mid({mid_f}) <= high({high_f})"
            )
        self.low = low_f
        self.mid = mid_f
        self.high = high_f

    def __repr__(self) -> str:
        return f"Range(low={self.low}, mid={self.mid}, high={self.high})"

    def to_dict(self) -> RangeDict:
        """Serialize to the canonical RangeDict shape for JSON / ModelEstimate."""
        return {"low": self.low, "mid": self.mid, "high": self.high}

    # --- arithmetic (positive scalars / Ranges only in this domain) ---

    def __mul__(self, other: Union[int, float, Range]) -> Range:
        if isinstance(other, (int, float)):
            # scalar multiply: scale endpoints
            k = float(other)
            return Range(self.low * k, self.mid * k, self.high * k)
        if isinstance(other, Range):
            # range-multiply endpoint-wise (conservative band)
            return Range(
                self.low * other.low,
                self.mid * other.mid,
                self.high * other.high,
            )
        return NotImplemented

    def __rmul__(self, other: Union[int, float]) -> Range:
        return self.__mul__(other)

    def __truediv__(self, other: Union[int, float]) -> Range:
        if isinstance(other, (int, float)):
            k = float(other)
            if k == 0:
                raise ZeroDivisionError("division by zero in Range")
            return Range(self.low / k, self.mid / k, self.high / k)
        return NotImplemented

    def __add__(self, other: Range) -> Range:
        if isinstance(other, Range):
            return Range(self.low + other.low, self.mid + other.mid, self.high + other.high)
        return NotImplemented

    def __radd__(self, other: Range) -> Range:
        return self.__add__(other)
