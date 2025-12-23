FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código fonte
COPY . .

# Criar diretório de sessões
RUN mkdir -p /app/sessions

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000
ENV SESSIONS_DIR=/app/sessions

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "src/index.js"]
