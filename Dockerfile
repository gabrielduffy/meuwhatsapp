FROM node:20-alpine

# Instalar git (necessário para Baileys)
RUN apk add --no-cache git

# Diretório de trabalho
WORKDIR /app

# Copiar package.json do backend
COPY package*.json ./

# Instalar dependências do backend
RUN npm install --omit=dev

# Copiar código fonte
COPY . .

# Instalar dependências e build do frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
RUN npm run build

# Voltar para diretório raiz
WORKDIR /app

# Criar diretórios
RUN mkdir -p /app/sessions /app/data

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV PORT=3000
ENV SESSIONS_DIR=/app/sessions
ENV DATA_DIR=/app/data

# Iniciar aplicação
CMD ["node", "src/index.js"]
