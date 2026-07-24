import time
from typing import Any

import httpx

CONTEST_CACHE_TTL = 10 * 60
_contest_cache: tuple[float, list[dict[str, Any]]] | None = None


def format_duration(seconds: int) -> str:
    hours, remainder = divmod(seconds, 3600)
    minutes = remainder // 60
    return " ".join(
        part
        for part in (
            f"{hours}h" if hours else "",
            f"{minutes}m" if minutes else "",
        )
        if part
    )


class ContestService:
    @staticmethod
    async def fetch_contests() -> list[dict[str, Any]]:
        global _contest_cache
        now = time.time()

        if _contest_cache and (now - _contest_cache[0] < CONTEST_CACHE_TTL):
            return _contest_cache[1]

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get("https://kontests.net/api/v1/all")
                response.raise_for_status()
                raw_contests = response.json()
            except Exception:
                return _contest_cache[1] if _contest_cache else []

        grouped_by_site: dict[str, list[dict[str, Any]]] = {}
        for contest in raw_contests:
            site_name = contest.get("site", "Other")
            if site_name not in grouped_by_site:
                grouped_by_site[site_name] = []

            duration_seconds = int(float(contest.get("duration", 0)))
            grouped_by_site[site_name].append(
                {
                    "title": contest.get("name"),
                    "start_time": contest.get("start_time"),
                    "end_time": contest.get("end_time"),
                    "duration": format_duration(duration_seconds),
                    "url": contest.get("url"),
                    "status": contest.get("status"),
                },
            )

        sites_output = [
            {"site": site_name, "contests": contests}
            for site_name, contests in grouped_by_site.items()
        ]

        _contest_cache = (now, sites_output)
        return sites_output
