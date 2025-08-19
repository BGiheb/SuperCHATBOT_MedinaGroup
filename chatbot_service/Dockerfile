# Image de base Python (3.13.1 comme en local)
FROM python:3.13.1-slim

# Définir le dossier de travail
WORKDIR /app

# Installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 8000

# Lancer uvicorn (API FastAPI/Starlette)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
