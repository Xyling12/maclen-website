FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install

# Install yt-dlp and ffmpeg (using alpine edge community for yt-dlp, or we install it via curl)
RUN apk add --no-cache ffmpeg python3
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

COPY . .
EXPOSE 80
CMD ["node", "server.js"]
