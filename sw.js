const IMAGE_CACHE = "homepage-images-v1";

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.destination !== "image") {
    return;
  }

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const response = await fetch(request);

      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
      }

      return response;
    })
  );
});
