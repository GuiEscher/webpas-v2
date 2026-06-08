# webpas/Dockerfile
# Estágio 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# AUMENTA O LIMITE DE MEMÓRIA DO NODE PARA 4GB
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# Estágio 2: Nginx para servir os arquivos
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]