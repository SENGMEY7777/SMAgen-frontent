# ===================================================
# SMAgen frontend production image
# Vue 3 + Vite SPA compiled into Nginx Alpine
# ===================================================

# ─── Stage 1: Build static assets ───────────────────────────────────────────
FROM node:22-alpine AS build-stage

WORKDIR /app

# Leverage Docker layer cache — only reinstall when lockfile changes.
COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Keep API requests same-origin in the browser. Nginx proxies them to the
# backend configured at container start time.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build production bundle
RUN npm run build

# ─── Stage 2: Serve with hardened Nginx ──────────────────────────────────────
FROM nginx:1.27-alpine AS production-stage

# Remove the default Nginx config — ours is injected via template.
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy compiled SPA assets and the Nginx config template.
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Nginx runs as the built-in non-root 'nginx' user (UID 101) by default in
# the official image. Ensure the html directory is readable by that user.
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Override the pid and temp paths so Nginx can run without root after startup.
RUN sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf && \
    sed -i '/user  nginx;/d' /etc/nginx/nginx.conf

EXPOSE 80

# Nginx official image already drops to the nginx user after binding port 80.
CMD ["nginx", "-g", "daemon off;"]
