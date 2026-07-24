import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "StarWaves API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_v1_prefix: str = os.getenv("API_V1_PREFIX", "/api/v1")
    cors_origins_raw: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")
    github_oauth_client_id: str | None = os.getenv("GITHUB_OAUTH_CLIENT_ID")
    github_oauth_client_secret: str | None = os.getenv("GITHUB_OAUTH_CLIENT_SECRET")
    github_oauth_state_secret: str | None = os.getenv("GITHUB_OAUTH_STATE_SECRET")
    github_oauth_callback_url: str = os.getenv(
        "GITHUB_OAUTH_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/integrations/github/callback",
    )
    google_oauth_client_id: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    google_oauth_client_secret: str | None = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    google_oauth_state_secret: str | None = os.getenv("GOOGLE_OAUTH_STATE_SECRET")
    google_oauth_callback_url: str = os.getenv(
        "GOOGLE_OAUTH_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/integrations/google-calendar/callback",
    )
    google_drive_oauth_callback_url: str = os.getenv(
        "GOOGLE_DRIVE_OAUTH_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/integrations/google-drive/callback",
    )
    frontend_url: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    firestore_database_id: str = os.getenv(
        "FIRESTORE_DATABASE_ID",
        "(default)",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]


settings = Settings()
