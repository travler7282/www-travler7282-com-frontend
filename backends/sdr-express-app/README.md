# sdr-express-app

Express + TypeScript backend for the SDR Angular UI.

## Features

- Health endpoints for k3s probes: `/healthz`, `/readyz`
- SDR status endpoint: `GET /api/sdr/status`
- SDR tune endpoint: `POST /api/sdr/tune`
- Docker-ready build for k3s deployment

## Local development

```bash
npm run dev --workspace sdr-express-app
```

Server defaults:

- Host: `0.0.0.0`
- Port: `8080`
- CORS origin: `*` (configure in prod)

## API quick test

```bash
curl http://localhost:8080/api/sdr/status
curl -X POST http://localhost:8080/api/sdr/tune \
  -H "Content-Type: application/json" \
  -d '{"frequencyHz":14200000,"bandwidthHz":2800,"mode":"USB"}'
```

## Build container image

```bash
docker build -t sdr-express-app:local ./backends/sdr-express-app
```

## k3s deployment

Update image in `k8s/deployment.yaml`, then:

```bash
kubectl apply -f backends/sdr-express-app/k8s/deployment.yaml
kubectl rollout status deployment/sdr-express-app
```
