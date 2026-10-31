# ===================================================
# SMAgen frontend production image
# Vue 3 + Vite SPA compiled into Nginx Alpine
# ===================================================

# Stage 1: Build static assets with the Node version supported by package.json.
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Keep API requests same-origin in the browser. Nginx proxies them to the
# backend configured at container start time.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build production bundle
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
