function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // 1. If it's a request for a physical file (contains a dot), let it pass through
    if (uri.includes('.')) {
        return request;
    }

    // 2. Logic for sub-app routing (apps live under /apps/<name>/)
    if (uri.startsWith('/apps/roboarm')) {
        request.uri = '/apps/roboarm/index.html';
    } else if (uri.startsWith('/apps/wxstation')) {
        request.uri = '/apps/wxstation/index.html';
    } else if (uri.startsWith('/apps/sdrx')) {
        request.uri = '/apps/sdrx/index.html';
    } else {
        // 3. Fallback for the main landing page
        request.uri = '/index.html';
    }

    console.log("Redirected to: " + request.uri);
    return request;
}