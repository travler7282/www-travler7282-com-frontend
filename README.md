# www-travler7282-com

## Frontends

The www-travler7282-com repository is the home of the www.travler7282.com
website showcasing work by Michael Hunt (travler7282). The root of the site
is the landing-page app; this is a Vite app built without a UI framework.
The landing page is a portfolio starting point where the visitor explores
information about me and selects an app from the showcase. Each app is 
displayed along with the tech stack and clicking on an app opens it in the
browser. There are other features, links, skills, images, and items on the
page as well.

## Infrastructure

The website is distributed on AWS CloudFront to provide a worldwide CDN. The
site is distributed to edge devices which then cache and deliver content at
faster speeds for vistors. In addition, a CloudFront function is used to
route the user to the appropriate app when a subdirectory is added to the URL.
This is needed since S3 buckets are used with CloudFront to serve static files.

## Backends

The backend for each app is hosted in my lab and runs on a Linux-based virtual
machine, a K3s cluster, and containerized microservices for each backend. DNS
is configured using AWS Route53, Let's Encrypt is used for TLS certificates, and
the Traefik ingress controller is used to steer public ingress traffic to the
appropriate Kubernetes microservice. The entire setup demonstrates Engineering
skills across a broad spectrum, including network, system, Cloud (DevOps),
and software engineering using a variety of tech stacks, languages, and AWS services.

*Note*: These backends are available at `api.travler7282.com/<backendname>/api/v1/<endpoint>`
All backends support the `heathz` and `readyz` endpoints, many endpoints support the `docs` endpoint
and will display the SwagerUI OpenAPI documentation.
- `backends/sdrx`: Node 24 + Express + TypeScript — SDRx control and telemetry API
- `backends/roboarm`: Python 3.11 + FastAPI — RoboArm BLE controller with camera feed
- `backends/wxstation`: Python 3.11 + FastAPI — WXStation weather data aggregator
- `backends/springtime`: Java 17 + Spring Boot - Demonstration of using Spring Boot to create a RESTful API

## Additional Cloud Information

There are other cloud based providers such as Azure and GCP that can be used with
some modification to the existing infrastructure scripts.

## Repositories

[GitHub Repository travler7282/www-travler7282-com](https://github.com/travler7282/www-travler7282-com)

## Environments

[Production Environment www.travler7282.com](https://www.travler7282.com)
[Development Environment dev.travler7282.com](https://dev.travler7282.com)

## Social Media

[LinkedIn Profile](https://www.linkedin.com/in/travler7282)
[X Profile](https://twitter.com/travler7282)
[Intragram](https://www.instagram.com/travler7282)
[Facebook](https://www.facebook.com/travler7282)

## Source Control Profiles

[GitHub](https://github.com/travler7282)
[GitLab](https://gitlab.com/travler7282)

## Apps

- `apps/landing-page`: Vite + TypeScript app (no UI framework). This is the main landing page and links to the framework-specific apps.
- `apps/roboarm`: React + TypeScript app built with Vite. **RoboArm** is a robotic arm controller that manages hardware in my lab, featuring a live camera feed. It includes a status indicator reflecting the arm's availability.
- `apps/wxstation`: Vue 3 + TypeScript app built with Vite. **WXStation** is a weather monitor that aggregates real-time local sensor data from my lab with National Weather Service updates for a comprehensive display.
- `apps/sdrx`: Angular app built with Angular CLI and Angular Material. **SDRx** is a Software Defined Radio (SDR) application that controls an RTL-SDR receiver. It supports demodulation for AM, FM, LSB, USB, DSB, WFM, and various digital modes (WIP).

## Environments and Branch Mapping

- Development environment:
	- Domain: `dev.travler7282.com`
	- GitHub branch: `dev`
	- Workflow: `.github/workflows/deploy_dev.yml`

- Production environment:
	- Domain: `www.travler7282.com`
	- GitHub branch: `main`
	- Workflow: `.github/workflows/deploy_prod.yml`

### Backend Image Publishing in CI

The deployment workflows now publish backend Docker images for SDRx, RoboArm,
WXStation, and DevOps Assistant.

- Push/merge to `dev` runs `.github/workflows/deploy_dev.yml` and publishes
  `*-dev` tags.
- Push/merge to `main` runs `.github/workflows/deploy_prod.yml` and publishes
  production version tags.

## Workspace Scripts

Run from repository root:

- Install dependencies: `npm install`
- Build all apps: `npm run build:all`
- Run tests (where present): `npm run test:all`

## Python Backend Tests (venv)

Use a repository-local virtual environment for Python backend tests.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backends/roboarm/requirements.txt -r backends/wxstation/requirements.txt -r backends/devops-assistant/requirements.txt
$env:APP_CONFIG='backends/devops-assistant/config.yaml'
.\.venv\Scripts\python.exe -m pytest backends/roboarm/tests backends/wxstation/tests backends/devops-assistant/tests
```

### macOS/Linux

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r backends/roboarm/requirements.txt -r backends/wxstation/requirements.txt -r backends/devops-assistant/requirements.txt
APP_CONFIG=backends/devops-assistant/config.yaml ./.venv/bin/python -m pytest backends/roboarm/tests backends/wxstation/tests backends/devops-assistant/tests
```

## Local Development

Run an individual frontend app from the root with npm workspaces:

- Landing page: `npm run dev --workspace=landing-page`
- RoboArm: `npm run dev --workspace=roboarm`
- WXStation: `npm run dev --workspace=wxstation`
- SDRx: `npm run start --workspace=sdrx`

Run an individual backend:

- SDRx backend: `npm run dev:sdrx`
- RoboArm backend: `cd backends/roboarm && uvicorn main:app --reload --port 8000`
- WXStation backend: `cd backends/wxstation && uvicorn main:app --reload --port 8001`
- DevOps Assistant backend: `cd backends/devops-assistant && uvicorn main:app --reload --port 8002`

## Local Port Mapping

### Frontend Dev Servers

| App | Workspace command | Port |
|---|---|---|
| landing-page | `npm run dev --workspace=landing-page` | 5173 |
| roboarm | `npm run dev --workspace=roboarm` | 5174 |
| wxstation | `npm run dev --workspace=wxstation` | 5175 |
| sdrx | `npm run start --workspace=sdrx` | 4200 |

### Backend Dev Servers

| Service | Run command | Port |
|---|---|---|
| sdrx | `npm run dev:sdrx` | 8080 |
| roboarm | `cd backends/roboarm && uvicorn main:app --reload --port 8000` | 8000 |
| wxstation | `cd backends/wxstation && uvicorn main:app --reload --port 8001` | 8001 |
| devops-assistant | `cd backends/devops-assistant && uvicorn main:app --reload --port 8002` | 8002 |

`devops-assistant` is intentionally set to `8002` for local runs so it does not
conflict with `roboarm` on `8000`.

## DevOps Assistant Kubernetes Secrets

The `backends/devops-assistant/k8s/deployment-dev.yaml` and
`backends/devops-assistant/k8s/deployment-prod.yaml` manifests reference
environment-specific Kubernetes secrets:

- `ai-devops-secrets-dev`
- `ai-devops-secrets-prod`

These commands assume the `default` namespace. If you move later, append
`-n <namespace>` to each `kubectl` command.

Create them before applying deployments.

### Development

```bash
kubectl create secret generic ai-devops-secrets-dev \
	--from-literal=OPENAI_API_KEY='<your-dev-openai-key>' \
	--from-literal=APP_API_KEY='<your-dev-app-api-key>'
```

### Production

```bash
kubectl create secret generic ai-devops-secrets-prod \
	--from-literal=OPENAI_API_KEY='<your-prod-openai-key>' \
	--from-literal=APP_API_KEY='<your-prod-app-api-key>'
```

If the secrets already exist, update them with:

```bash
kubectl delete secret ai-devops-secrets-dev
kubectl delete secret ai-devops-secrets-prod
```

Then re-run the `kubectl create secret` commands above.
