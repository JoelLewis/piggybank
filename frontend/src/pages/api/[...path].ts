import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ request, params }) => {
  const path = params.path;
  // Use internal URL for backend
  // Default to http://localhost:4000/api if not set (matches docker-compose)
  const backendUrl = import.meta.env.INTERNAL_API_URL || 'http://localhost:4000/api';

  // Construct the target URL
  // Ensure we don't double slash or miss a slash
  const baseUrl = backendUrl.endsWith('/') ? backendUrl : backendUrl + '/';
  const targetPath = path || '';
  const targetUrl = new URL(targetPath, baseUrl);

  // Copy query parameters from the original request
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    // Prepare headers
    const headers = new Headers(request.headers);
    headers.delete('host'); // Let fetch set the host

    // Forward the request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body as any,
      // @ts-ignore - duplex is needed for some environments but might not be in types
      duplex: 'half'
    });

    // Return the response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error(`Proxy error for ${targetUrl}:`, error);
    return new Response(JSON.stringify({ error: 'Internal Proxy Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
