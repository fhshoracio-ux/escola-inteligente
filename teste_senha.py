from app.core.security import verificar_senha
from app.core.logging_config import logger

hash = '9d1b7469118f4bdd9c88912020ca2053$9513e2c63b6e9b66af586fa9b8becf8a16219e0aab8f34ff4931c5baf8dbec92'
logger.info(verificar_senha('Admin@2024', hash))