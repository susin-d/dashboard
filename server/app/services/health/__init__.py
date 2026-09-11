"""Facade — preserves `from app.services.health import collect_health` import path.

The monolithic 284-line health.py has been split per SRP:
- checks/database.py, cache.py, whatsapp.py, workspace.py  (each <70 lines, single probe)
- endpoints.py  (inventory, cached)
- aggregator.py (composition + logging)
- liveness.py   (zero-I/O fast path for GET /health)
- constants.py  (shared table list + timing)
"""

from .aggregator import collect_checks, collect_health, get_check
from .endpoints import collect_endpoints
from .liveness import build_liveness

__all__ = ["build_liveness", "collect_checks", "collect_endpoints", "collect_health", "get_check"]
