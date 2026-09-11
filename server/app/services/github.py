"""GitHub data service: OAuth helpers (re-exported) and GraphQL data fetching."""

from collections import Counter
import hashlib
import time

import httpx

from app.services.oauth import (
    decrypt_token,
    encrypt_token,
    exchange_code,
    github_state_serializer as state_serializer,
    github_token_cipher as token_cipher,
    require_oauth_config,
)


GITHUB_QUERY = """
query StarWavesGitHub($cursor: String, $repositoryLimit: Int!, $includeStats: Boolean!) {
  viewer {
    login
    url
    contributionsCollection @include(if: $includeStats) {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { contributionCount date }
        }
      }
    }
    repositories(
      first: $repositoryLimit
      after: $cursor
      affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        description
        url
        homepageUrl
        isPrivate
        isArchived
        pushedAt
        stargazerCount
        forkCount
        primaryLanguage { name }
        owner { login }
      }
    }
  }
}
"""

GITHUB_DATA_CACHE_TTL = 60
_github_data_cache: dict[str, tuple[float, dict]] = {}


async def fetch_github_data(token: str, repository_limit: int = 100, include_stats: bool = True) -> dict:
    repository_limit = max(1, min(repository_limit, 100))
    cache_key = hashlib.sha256(
        f"{token}:{repository_limit}:{include_stats}".encode(),
    ).hexdigest()
    cached = _github_data_cache.get(cache_key)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    repositories = []
    contribution_data = None
    viewer_login = None
    viewer_url = None
    repository_count = 0
    cursor = None
    async with httpx.AsyncClient(timeout=20) as client:
        while True:
            response = await client.post(
                "https://api.github.com/graphql",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "StarWaves/0.1",
                },
                json={
                    "query": GITHUB_QUERY,
                    "variables": {"cursor": cursor, "repositoryLimit": repository_limit},
                },
            )
            response.raise_for_status()
            payload = response.json()
            if payload.get("errors"):
                raise ValueError(payload["errors"][0].get("message", "GitHub query failed."))
            viewer = payload["data"]["viewer"]
            viewer_login = viewer["login"]
            viewer_url = viewer["url"]
            contribution_data = contribution_data or viewer.get("contributionsCollection")
            connection = viewer["repositories"]
            repository_count = connection["totalCount"]
            repositories.extend(connection["nodes"])
            if not connection["pageInfo"]["hasNextPage"] or repository_limit < 100:
                break
            cursor = connection["pageInfo"]["endCursor"]

    languages = Counter(
        repository["primaryLanguage"]["name"]
        for repository in repositories
        if repository.get("primaryLanguage")
    )
    language_total = sum(languages.values()) or 1
    calendar = contribution_data["contributionCalendar"] if contribution_data else None
    weekly = (
        [
            sum(day["contributionCount"] for day in week["contributionDays"])
            for week in calendar["weeks"]
        ]
        if calendar
        else []
    )
    result = {
        "github": {
            "username": viewer_login,
            "profileUrl": viewer_url,
            "contributions": calendar["totalContributions"] if calendar else 0,
            "repositories": repository_count,
            "stars": sum(repository["stargazerCount"] for repository in repositories),
            "forks": sum(repository["forkCount"] for repository in repositories),
            "commits": contribution_data["totalCommitContributions"] if contribution_data else 0,
            "pullRequests": contribution_data["totalPullRequestContributions"] if contribution_data else 0,
            "issues": contribution_data["totalIssueContributions"] if contribution_data else 0,
            "reviews": contribution_data["totalPullRequestReviewContributions"] if contribution_data else 0,
            "languages": [
                {"name": name, "percentage": round(count / language_total * 100)}
                for name, count in languages.most_common(6)
            ],
            "weeklyContributions": weekly[-12:],
        },
        "repositories": repositories,
    }
    _github_data_cache[cache_key] = (time.monotonic() + GITHUB_DATA_CACHE_TTL, result)
    return result
