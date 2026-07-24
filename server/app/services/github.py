import base64
import hashlib
from collections import Counter

import httpx
from cryptography.fernet import Fernet
from itsdangerous import URLSafeTimedSerializer

from app.core.config import settings


def require_oauth_config() -> None:
    if not all(
        (
            settings.github_oauth_client_id,
            settings.github_oauth_client_secret,
            settings.github_oauth_state_secret,
        ),
    ):
        raise RuntimeError("GitHub OAuth is not configured on the server.")


def state_serializer() -> URLSafeTimedSerializer:
    require_oauth_config()
    return URLSafeTimedSerializer(
        settings.github_oauth_state_secret,
        salt="starwaves-github-oauth",
    )


def token_cipher() -> Fernet:
    require_oauth_config()
    digest = hashlib.sha256(settings.github_oauth_state_secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_token(token: str) -> str:
    return token_cipher().encrypt(token.encode()).decode()


def decrypt_token(token: str) -> str:
    return token_cipher().decrypt(token.encode()).decode()


async def exchange_code(code: str) -> dict:
    require_oauth_config()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_oauth_client_id,
                "client_secret": settings.github_oauth_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_callback_url,
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("access_token"):
            raise ValueError(payload.get("error_description", "GitHub rejected the OAuth code."))
        return payload


GITHUB_QUERY = """
query StarWavesGitHub($cursor: String) {
  viewer {
    login
    url
    contributionsCollection {
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
      first: 100
      after: $cursor
      affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
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


async def fetch_github_data(token: str) -> dict:
    repositories = []
    contribution_data = None
    viewer_login = None
    viewer_url = None
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
                json={"query": GITHUB_QUERY, "variables": {"cursor": cursor}},
            )
            response.raise_for_status()
            payload = response.json()
            if payload.get("errors"):
                raise ValueError(payload["errors"][0].get("message", "GitHub query failed."))
            viewer = payload["data"]["viewer"]
            viewer_login = viewer["login"]
            viewer_url = viewer["url"]
            contribution_data = contribution_data or viewer["contributionsCollection"]
            connection = viewer["repositories"]
            repositories.extend(connection["nodes"])
            if not connection["pageInfo"]["hasNextPage"]:
                break
            cursor = connection["pageInfo"]["endCursor"]

    languages = Counter(
        repository["primaryLanguage"]["name"]
        for repository in repositories
        if repository.get("primaryLanguage")
    )
    language_total = sum(languages.values()) or 1
    calendar = contribution_data["contributionCalendar"]
    weekly = [
        sum(day["contributionCount"] for day in week["contributionDays"])
        for week in calendar["weeks"]
    ]
    return {
        "github": {
            "username": viewer_login,
            "profileUrl": viewer_url,
            "contributions": calendar["totalContributions"],
            "repositories": len(repositories),
            "stars": sum(repository["stargazerCount"] for repository in repositories),
            "forks": sum(repository["forkCount"] for repository in repositories),
            "commits": contribution_data["totalCommitContributions"],
            "pullRequests": contribution_data["totalPullRequestContributions"],
            "issues": contribution_data["totalIssueContributions"],
            "reviews": contribution_data["totalPullRequestReviewContributions"],
            "languages": [
                {"name": name, "percentage": round(count / language_total * 100)}
                for name, count in languages.most_common(6)
            ],
            "weeklyContributions": weekly[-12:],
        },
        "repositories": repositories,
    }
