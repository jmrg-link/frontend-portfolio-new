# syntax=docker/dockerfile:1

# Imagen del frontend jmrg.dev. Multi-stage sobre node:24-alpine:
#   deps    → instala dependencias con pnpm (corepack, versión pineada en
#             package.json#packageManager) y caché de store entre builds.
#   builder → `next build` (output standalone). El build hace SSG contra el
#             API, así que necesita BACKEND_API_URL alcanzable. El token entra
#             SOLO por secret mount: nunca como ARG/ENV, que persisten en las
#             capas («Build arguments and environment variables are
#             inappropriate for passing secrets», docs.docker.com/build/
#             building/secrets). `backend_ca` es opcional: solo para builds
#             contra un backend con TLS autofirmado (local); en producción no
#             se pasa.
#   runner  → solo standalone + static + public, usuario no-root. El servidor
#             es el server.js que emite Next (nextjs.org/docs/app/api-reference/
#             config/next-config-js/output); `next start` no participa.
#
# Env de runtime (task definition / docker run, nada horneado):
#   BACKEND_API_URL, BACKEND_API_TOKEN, SITE_URL,
#   TURNSTILE_SECRET_KEY, MAILTRAP_TOKEN, CONTACT_EMAIL_TO
#   (NEXT_PUBLIC_TURNSTILE_SITE_KEY es pública y va inlineada en el build.)

FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BACKEND_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG SITE_URL=https://jmrg.dev
ENV BACKEND_API_URL=$BACKEND_API_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    SITE_URL=$SITE_URL
RUN --mount=type=secret,id=backend_api_token \
    --mount=type=secret,id=backend_ca,required=false \
    sh -c 'export BACKEND_API_TOKEN="$(cat /run/secrets/backend_api_token)"; \
           if [ -s /run/secrets/backend_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/backend_ca; fi; \
           pnpm exec next build'

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
USER node
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
