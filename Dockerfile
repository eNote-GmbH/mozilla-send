##
# Send
#
# License https://gitlab.com/timvisee/send/blob/master/LICENSE
##

# Build project
FROM node:18.8-alpine3.15 AS base

ENV HUSKY=0
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_update_notifier=false

RUN set -x \
  # Change node uid/gid
  && apk --no-cache add shadow \
  && groupmod -g 1001 node \
  && usermod -u 1001 -g 1001 node

RUN set -x \
    # Add user
    && addgroup --gid 1000 app \
    && adduser --disabled-password \
        --gecos '' \
        --ingroup app \
        --home /app \
        --uid 1000 \
        app

USER app
WORKDIR /app

FROM base AS builder

COPY --chown=app:app package*.json ./
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci --cache .npm --prefer-offline

COPY --chown=app:app . ./
RUN npm run build

# Main image
FROM base

RUN mkdir -p /app/.config/configstore

COPY --chown=app:app package*.json ./
COPY --chown=app:app --from=builder /app/.npm .npm

RUN npm ci --omit=dev --cache .npm --prefer-offline \
    && npm cache clean --force --cache .npm

COPY --chown=app:app app app
COPY --chown=app:app common common
COPY --chown=app:app public/locales public/locales
COPY --chown=app:app server server
COPY --chown=app:app --from=builder /app/dist dist

RUN ln -s dist/version.json version.json

ENV PORT=1443

CMD ["node", "server/bin/prod.js"]
