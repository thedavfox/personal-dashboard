from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    todo_db_url: str | None = None

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    anthropic_api_key: str | None = None

    stock_api_key: str | None = None
    stock_api_base_url: str = "https://finnhub.io/api/v1"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
