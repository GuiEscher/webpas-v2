# sv-python/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copia e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o script e a planilha
COPY . .

# Comando para rodar o script (pode ser usado como uma task separada)
CMD ["python", "main.py"]