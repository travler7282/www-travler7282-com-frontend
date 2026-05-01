FROM node:24-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY backends/sdrx/package.json ./backends/sdrx/package.json
RUN npm ci --workspace=sdrx-backend --include-workspace-root=false

WORKDIR /repo/backends/sdrx
COPY backends/sdrx/tsconfig.json ./tsconfig.json
COPY backends/sdrx/src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
COPY backends/sdrx/package.json ./backends/sdrx/package.json
RUN npm ci --workspace=sdrx-backend --include-workspace-root=false --omit=dev

WORKDIR /repo/backends/sdrx
COPY --from=build /repo/backends/sdrx/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
