from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RPA-IEP API"
    DATABASE_URL: str = "postgresql+psycopg2://usuario:password@localhost/rpa_iep_db"
    SECRET_KEY: str = "super_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    class Config:
        env_file = ".env"

settings = Settings()
