# www-travler7282-com

Public website repository for https://www.travler7282.com.

This repository now contains:

- The landing page frontend in `frontend/`.
- Shared deployment/infrastructure assets in `infrastructure/`.

Feature apps and backend services have been moved to their own repositories.

## Repository Layout

```
frontend/                           # Vite + TypeScript landing page
infrastructure/
  aws/cloudfront/scripts/           # CloudFront routing scripts
  k8s/                              # Shared Kubernetes manifests (manual apply)

.github/workflows/
  deploy_dev.yml                    # dev branch -> dev.travler7282.com
  deploy_prod.yml                   # main branch -> www.travler7282.com
```

## Tech Stack

- Runtime: Node 24 (`.nvmrc` / `.node-version`)
- Frontend: Vite 8 + TypeScript 5.8
- Hosting/CDN: AWS S3 + CloudFront
- DNS: AWS Route53

## Local Development

Run from repository root:

```bash
cd frontend
npm ci
npm run dev
```

Default dev server URL: http://localhost:5173

## Frontend Commands

Run from `frontend/`:

```bash
npm run dev
npm run lint
npm run test
npm run test:coverage
npm run build
npm run preview
```

Build output is generated at `frontend/dist`.

## Deployment

### Branch Mapping

- `dev` -> `dev.travler7282.com`
- `main` -> `www.travler7282.com`

### Workflow Behavior

Both deployment workflows:

1. Install dependencies in `frontend/`.
2. Run lint, tests, and production build.
3. Sync `frontend/dist` to the target S3 bucket.
4. Invalidate the target CloudFront distribution.

### Required GitHub Secrets

- `AWS_REGION`
- `AWS_DEV_ROLE_ARN`
- `AWS_DEV_BUCKET_NAME`
- `AWS_DEV_CLOUDFRONT_ID`
- `AWS_PROD_ROLE_ARN`
- `AWS_PROD_BUCKET_NAME`
- `AWS_PROD_CLOUDFRONT_ID`

## Related Repositories

Application-specific frontends and backend services are maintained in separate
repositories. The landing page may link to those external projects, but this
repository does not build or publish them.
