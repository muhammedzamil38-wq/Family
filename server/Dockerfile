FROM node:20-slim
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends poppler-utils && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . ./

RUN mkdir -p uploads/pdfs uploads/covers uploads/images && \
    chown -R node:node /app

EXPOSE 5000
USER node
CMD ["npm", "start"]
