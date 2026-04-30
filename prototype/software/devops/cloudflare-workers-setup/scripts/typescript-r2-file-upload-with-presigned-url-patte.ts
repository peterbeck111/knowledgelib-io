// Input:  PUT /upload/:filename with binary body
// Output: Stores file in R2, returns metadata

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'PUT' && url.pathname.startsWith('/upload/')) {
      const filename = url.pathname.replace('/upload/', '');
      const contentType = request.headers.get('content-type') || 'application/octet-stream';

      const object = await env.UPLOADS.put(filename, request.body, {
        httpMetadata: { contentType },
        customMetadata: { uploadedAt: new Date().toISOString() }
      });

      return Response.json({
        key: object.key,
        size: object.size,
        etag: object.httpEtag
      }, { status: 201 });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/files/')) {
      const key = url.pathname.replace('/files/', '');
      const object = await env.UPLOADS.get(key);

      if (!object) return new Response('Not Found', { status: 404 });

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'ETag': object.httpEtag
        }
      });
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
} satisfies ExportedHandler<Env>;
