function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // 1. If it's a request for a physical file (contains a dot), let it pass through
    if (uri.includes('.')) {
        return request;
    }

    // 2. Logic for sub-app routing
    if (uri.startsWith('/roboarm')) {
        request.uri = '/roboarm/index.html';
    } else if (uri.startsWith('/wxstation')) {
        request.uri = '/wxstation/index.html';
    } else if (uri.startsWith('/sdrx')) {
        request.uri = '/sdrx/index.html';
    } else {
        // 3. Fallback for the main landing page
        request.uri = '/index.html';
    }

    console.log("Redirected to: " + request.uri);
    return request;
}