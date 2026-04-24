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
- `apps/react-app`: React + TypeScript app built with Vite. **RoboArm** is a robotic arm controller that manages hardware in my lab, featuring a live camera feed. It includes a status indicator reflecting the arm's availability.
- `apps/vue-app`: Vue 3 + TypeScript app built with Vite. **WXStation** is a weather monitor that aggregates real-time local sensor data from my lab with National Weather Service updates for a comprehensive display.
- `apps/angular-app`: Angular app built with Angular CLI and Angular Material. **SDRx** is a Software Defined Radio (SDR) application that controls an RTL-SDR receiver. It supports demodulation for AM, FM, LSB, USB, DSB, WFM, and various digital modes (WIP).

## Environments and Branch Mapping

- Development environment:
	- Domain: `dev.travler7282.com`
	- GitHub branch: `dev`
	- Workflow: `.github/workflows/deploy_dev.yml`

- Production environment:
	- Domain: `www.travler7282.com`
	- GitHub branch: `main`
	- Workflow: `.github/workflows/deploy_prod.yml`

## Workspace Scripts

Run from repository root:

- Install dependencies: `npm install`
- Build all apps: `npm run build:all`
- Run tests (where present): `npm run test:all`

## Local Development

Run an individual app from the root with npm workspaces:

- Landing page: `npm run dev --workspace=landing-page`
- React app (RoboArm): `npm run dev --workspace=react-app`
- Vue app (WxStation): `npm run dev --workspace=vue-app`
- Angular app (SDRx): `npm run start --workspace=angular-app`
