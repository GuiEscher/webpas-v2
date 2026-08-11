# backend/Dockerfile
FROM node:18-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install --production

# Copia o restante do código
COPY . .

# Cria a pasta de uploads e dá permissão total de escrita
RUN mkdir -p uploads && chmod 777 uploads

# Expõe a porta que o Express utiliza
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["npm", "start"]