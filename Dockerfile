# Usa Node 22 no Debian Bullseye (Railway friendly)
FROM node:22-bullseye

# Instala dependências do Chrome necessárias para o Puppeteer
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
  libx11-xcb1 \
  libx11-6 \
  fonts-liberation \
  libappindicator3-1 \
  libgbm-dev \
  xdg-utils \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos e instala dependências do projeto
COPY package*.json ./
RUN npm install

COPY . .

# Expõe a porta da aplicação
EXPOSE 8080

# Inicializa o app
CMD ["npm", "start"]
