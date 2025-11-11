# Usa Node 22 oficial
FROM node:22-bullseye

# Instala dependências necessárias pro Chromium do Puppeteer
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  libxshmfence1 \
  libnss3 \
  libgbm1 \
  libasound2 \
  libxss1 \
  libgtk-3-0 \
  libdrm2 \
  libxdamage1 \
  libxcomposite1 \
  libxrandr2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libatspi2.0-0 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2t64 \
  libx11-xcb1 \
  libx11-6 \
  fonts-liberation \
  libappindicator3-1 \
  libgbm-dev \
  xdg-utils \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY package*.json ./
RUN npm install

COPY . .

# Expõe a porta do servidor
EXPOSE 8080

# Comando de inicialização
CMD ["npm", "start"]
