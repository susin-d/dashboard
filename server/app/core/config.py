import os
from dataclasses import dataclass

from dotenv import load_dotenv

app_env = os.getenv("APP_ENV", "development").lower()
if app_env == "production" and os.path.exists(".env.prod"):
    load_dotenv(".env.prod", override=True)
elif os.path.exists(".env"):
    load_dotenv(".env", override=True)
else:
    load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "StarWaves API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_v1_prefix: str = os.getenv("API_V1_PREFIX", "/api/v1")
    cors_origins_raw: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,http://localhost,http://127.0.0.1,capacitor://localhost,https://starwaves.susindran.in,https://api.starwaves.susindran.in",
    )
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")
    firebase_private_key: str | None = os.getenv("FIREBASE_PRIVATE_KEY")
    firebase_client_email: str | None = os.getenv("FIREBASE_CLIENT_EMAIL")
    firebase_private_key_id: str | None = os.getenv("FIREBASE_PRIVATE_KEY_ID")
    firebase_client_id: str | None = os.getenv("FIREBASE_CLIENT_ID")
    firebase_auth_uri: str = os.getenv(
        "FIREBASE_AUTH_URI",
        "https://accounts.google.com/o/oauth2/auth",
    )
    firebase_token_uri: str = os.getenv(
        "FIREBASE_TOKEN_URI",
        "https://oauth2.googleapis.com/token",
    )
    firebase_auth_provider_cert_url: str = os.getenv(
        "FIREBASE_AUTH_PROVIDER_X509_CERT_URL",
        "https://www.googleapis.com/oauth2/v1/certs",
    )
    firebase_client_cert_url: str | None = os.getenv(
        "FIREBASE_CLIENT_X509_CERT_URL",
    )
    firebase_type: str = os.getenv("FIREBASE_TYPE", "service_account")
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
    gmail_oauth_callback_url: str = os.getenv(
        "GMAIL_OAUTH_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/integrations/gmail/callback",
    )
    google_chat_oauth_callback_url: str = os.getenv(
        "GOOGLE_CHAT_OAUTH_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/integrations/google-chat/callback",
    )
    frontend_url: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    auth_google_callback_url: str = os.getenv(
        "AUTH_GOOGLE_CALLBACK_URL",
        "http://127.0.0.1:8000/api/v1/auth/google/callback",
    )
    auth_secret_key: str = os.getenv(
        "AUTH_SECRET_KEY",
        "starwaves-super-secret-auth-key-change-in-prod",
    )
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_url: str | None = os.getenv("OPENAI_URL") or None
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
    anthropic_url: str | None = os.getenv("ANTHROPIC_URL") or None
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_url: str | None = os.getenv("GEMINI_URL") or None
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    firestore_database_id: str = os.getenv(
        "FIRESTORE_DATABASE_ID",
        "(default)",
    )
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str | None = os.getenv("SMTP_USER")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "noreply@starwaves.susindran.in")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]


settings = Settings()
