#
# Student OS — one image serving the API and the built client on one origin.
#
# Same-origin is not incidental: the refresh token is an httpOnly cookie, and
# serving the client from the API means that cookie is same-site and no CORS
# preflight is involved. Splitting them across two hosts would need SameSite
# relaxed, which is the thing the cookie exists to avoid.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

# No Python here on purpose.
#
# The icon font is subset by a fonttools script, and the obvious move is to
# install Python and regenerate it during the image build. That buys nothing:
# it adds ~50 MB, and it makes every image build depend on Alpine's package
# mirror and PyPI being reachable — two more things that can fail a deploy.
#
# The generated font is committed, and CI regenerates it on every push and
# fails if the result differs. So by the time a commit is buildable, its
# committed font is already known to be current. The build script notices the
# missing toolchain, warns, and uses it.

WORKDIR /app

# Manifests first: this layer is cached until a dependency actually changes,
# so ordinary source edits do not re-run the install.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# The verification is not paranoia. npm can print "Exit handler never called!",
# leave the tree half-installed, and still exit 0 — which was observed building
# this image. Without a check, that produces an image whose build step then
# fails somewhere confusing, or worse, succeeds with pieces missing. Assert the
# toolchain is actually there.
RUN npm ci --no-audit --no-fund \
  && test -x node_modules/.bin/vite \
  || (echo "npm ci left an incomplete tree — vite is missing" && exit 1)

COPY . .
RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only — no Vite, no test runner, no build toolchain
# in the image that faces the internet.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --omit=dev --no-audit --no-fund --workspace server --include-workspace-root \
  && test -d node_modules/express \
  || (echo "npm ci left an incomplete tree — express is missing" && exit 1)
RUN npm cache clean --force

COPY server/src ./server/src
COPY --from=build /app/client/dist ./client/dist

# The API writes uploads here; created before dropping privileges so the
# unprivileged user owns it rather than failing on first write.
RUN mkdir -p server/uploads && chown -R node:node /app

# Never root. A code-execution bug in the judge sandbox is a much smaller
# problem when the process that escapes it owns nothing.
USER node

EXPOSE 5000

# Readiness, not liveness: this reports unhealthy when the database is
# unreachable, which is when the container genuinely cannot serve traffic.
# For a restart policy, point at /api/health instead — restarting every
# container over a database blip turns an outage into a crash loop.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Node runs as PID 1 here. It does not reap zombies or forward signals to
# children, but this process spawns none — and it installs its own SIGTERM
# handler to drain connections, so an init shim would add nothing.
CMD ["node", "server/src/index.js"]
