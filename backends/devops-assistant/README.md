# AI-DEVOPS-ASSISTANT
This directory is the ai-devops-assistant backend. This backend provides FastAPI
services with a simple API with documentation available at the /docs endpoint.

## Docker/Podman
For podman, replace docker with podman in the commands below or
create an alias.
### Build the docker image
```
  docker build -t ai-devops-assistant .
```
### Run this backend in a docker container
```
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key_here \
  ai-devops-assistant
```

## Persist Database via Volume Mount
```
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key_here \
  -v $(pwd)/chroma_db:/data/chroma_db \
  ai-devops-assistant
```
## Install in your local environment
### Install packages using pip
```
pip install -r requirements.txt
```

### Run this backend in your terminal
```
uvicorn main:app --host 0.0.0.0 --port 8002 --proxy-headers
```

## API Documentation
http://localhost:8002/devops-assistant/api/v1/docs (replace localhost with your hostname if hosted on a different server)

## Kubernetes Secret Setup (Dev and Prod)

The Kubernetes manifests in `k8s/deployment-dev.yaml` and
`k8s/deployment-prod.yaml` expect these secrets:

- `ai-devops-secrets-dev`
- `ai-devops-secrets-prod`

These commands assume the `default` namespace. If you move later, append
`-n <namespace>` to each `kubectl` command.

Create secrets before applying the deployment manifests.

### Create dev secret
```bash
kubectl create secret generic ai-devops-secrets-dev \
  --from-literal=OPENAI_API_KEY='<your-dev-openai-key>' \
  --from-literal=APP_API_KEY='<your-dev-app-api-key>'
```

### Create prod secret
```bash
kubectl create secret generic ai-devops-secrets-prod \
  --from-literal=OPENAI_API_KEY='<your-prod-openai-key>' \
  --from-literal=APP_API_KEY='<your-prod-app-api-key>'
```

If secrets already exist and must be rotated, delete and recreate them.