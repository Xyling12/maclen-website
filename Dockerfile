FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install

# Install yt-dlp, ffmpeg and curl
RUN apk add --no-cache ffmpeg python3 curl
# yt-dlp нужен лишь как запасной вариант для HLS-клипов — делаем загрузку устойчивой и НЕ фатальной,
# чтобы временный сбой сети к GitHub CDN не валил всю сборку.
RUN (curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o /usr/local/bin/yt-dlp \
        https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
     || wget -T 30 -t 5 -O /usr/local/bin/yt-dlp \
        https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
     || echo "WARN: yt-dlp download skipped (network); HLS clip fallback disabled") \
    && chmod a+rx /usr/local/bin/yt-dlp 2>/dev/null || true

COPY . .
EXPOSE 80
CMD ["node", "server.js"]
