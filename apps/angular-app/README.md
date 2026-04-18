# angular-app

Angular application for the monorepo.

## Scripts

- `npm run start` - start local dev server
- `npm run build` - build production assets
- `npm run watch` - build in watch mode
- `npm run test` - run unit tests

This app is deployed under the `/angular/` route by the repository deployment workflows.

## Backend Domain Configuration

The SDR backend URL is runtime-configured (no hardcoded domain in Angular code).

Set the API domain in [apps/angular-app/public/runtime-config.js](apps/angular-app/public/runtime-config.js):

```js
window.__SDR_CONFIG__ = {
	apiBaseUrl: 'https://your-backend-domain.example.com'
};
```

Notes:

- Use an empty `apiBaseUrl` to call same-origin routes.
- This file is loaded before Angular bootstraps, so you can change backend domains without rebuilding the app bundle.
