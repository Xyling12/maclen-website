FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install

# Install yt-dlp, ffmpeg and curl
RUN apk add --no-cache ffmpeg python3 curl
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

COPY . .
EXPOSE 80
CMD ["node", "server.js"]
