# Estágio 1: Build do Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Configuração para maior resiliência em redes instáveis
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000
RUN npm install
COPY frontend/ .
RUN npm run build

# Estágio 2: Setup do Backend e Imagem Final
FROM node:20-alpine
# Instalar FFmpeg e dependências de imagem (CRÍTICO para áudio e stickers)
RUN apk add --no-cache \
    git \
    ffmpeg \
    imagemagick \
    graphicsmagick \
    vips-dev \
    build-base

WORKDIR /app

# Instalar dependências do backend primeiro (melhor caching)
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000
RUN npm install --omit=dev

# Copiar código do backend
COPY . .

# Copiar build do frontend do Estágio 1 para a pasta dist/public do backend
# Se o seu backend serve o frontend da pasta 'public', ajuste o destino
COPY --from=build-frontend /app/frontend/dist /app/frontend/dist

# Criar diretórios necessários
RUN mkdir -p /app/sessions /app/data

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV PORT=3000
ENV SESSIONS_DIR=/app/sessions
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

# Iniciar aplicação
CMD ["node", "src/index.js"]
