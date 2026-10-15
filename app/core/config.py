from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Sistema Escolar Facial"
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "escola_user"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "escola_db"
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_ALUNOS: str = "rostos_alunos"
    QDRANT_COLLECTION_FUNCIONARIOS: str = "rostos_funcionarios"
    REDIS_URL: str = "redis://localhost:6379/0"
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_TEMPLATE_ENTRADA: str = "entrada_aluno"
    FACE_CONFIDENCE_THRESHOLD: float = 0.85
    FACE_MODEL_NAME: str = "buffalo_l"
    CATRACA_PORTA: str = "COM3"
    CATRACA_BAUD: int = 9600
    UPLOADS_DIR: str = "uploads"
    HLS_DIR: str = "hls"
    PAINEL_DIST_PATH: str = ""

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
