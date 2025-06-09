# Etapa 1: Build para Windows usando Electron Builder
FROM electronuserland/builder:wine as build

# Defina o diretório de trabalho
WORKDIR /app

# Copie todos os arquivos do seu projeto para dentro do container
COPY . .

# Instale as dependências (sem auditoria e sem scripts interativos)
RUN npm install --omit=dev

# Instale também as dependências de desenvolvimento para o build
RUN npm install --only=dev

# Gera o build do app para Windows (.exe)
RUN npm install electron-builder --save-dev && \
    npx electron-builder --win --x64
