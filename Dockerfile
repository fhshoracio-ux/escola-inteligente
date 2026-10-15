# Imagem para a API FastAPI do Sistema Escolar Facial
FROM python:3.11-slim

# Variaveis de ambiente padrao de execucao
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production

WORKDIR /app

# Dependencias de sistema necessarias para opencv-python-headless,
# insightface/onnxruntime e compilacao de pacotes nativos
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependencias Python primeiro para aproveitar o cache de camadas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o codigo da aplicacao
COPY app ./app

# Diretorios de dados persistentes (uploads e streams HLS)
RUN mkdir -p /app/uploads /app/hls

EXPOSE 9081

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:9081/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9081"]
