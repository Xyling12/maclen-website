FROM nginx:alpine

# Copy site files
COPY . /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.default

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
