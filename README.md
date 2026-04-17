# www-travler7282-com-frontend

Frontend for www.travler7282.com a portfolio website showcasing front end work
by Michael Hunt (travler7282). The root of the site is the landing-page app, this
is a simple Vite app with no UI framework. There are three cards on the site to
allow the person visiting the site to select one of three applicaitons, vue-app,
angular-app, or react-app each showcasing their respective frameworks.

The source code is at https://www.github.com/travler7282/www-travler7282-com-frontend.

The website is distributed on AWS CloudFront to provide a worldwide CDN. The
site is distributed to edge devices which then cache and deliver content at
faster speeds for vistors. In addition, a CloudFront function is used to
route the user to the appropriate app when a subdirectory is added to the URL.
This is needed since S3 buckets are used with CloudFront to serve static files.

Repository:
https://github.com/travler7282/www-travler7282-com-frontend

## Applications

- `apps/landing-page`: Vite + TypeScript app (no UI framework). This is the main landing page and links to the framework-specific apps.
- `apps/react-app`: React + TypeScript app built with Vite.
- `apps/vue-app`: Vue 3 + TypeScript app built with Vite.
- `apps/angular-app`: Angular app built with Angular CLI.

## Environments and Branch Mapping

- Development environment:
	- Domain: `dev.travler7282.com`
	- GitHub branch: `dev`
	- Workflow: `.github/workflows/deploy_dev.yml`

- Production environment:
	- Domain: `prod.travler7282.com`
	- GitHub branch: `main`
	- Workflow: `.github/workflows/deploy_prod.yml`

## Workspace Scripts

Run from repository root:

- Install dependencies: `npm install`
- Build all apps: `npm run build:all`
- Run tests (where present): `npm run test:all`

## Local Development

Run an individual app from the root with npm workspaces:

- Landing page (Vite): `npm run dev --workspace landing-page`
- React app: `npm run dev --workspace react-app`
- Vue app: `npm run dev --workspace vue-app`
- Angular app: `npm run start --workspace angular-app`
