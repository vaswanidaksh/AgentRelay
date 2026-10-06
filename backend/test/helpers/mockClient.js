import { Readable } from 'stream';

/**
 * Creates an in-process mock HTTP client for Express apps.
 * Executes requests directly through Express middleware pipeline without opening TCP network sockets.
 */
export function createMockClient(app) {
  return async function request(method, urlPath, { headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlPath, 'http://localhost');
      const req = new Readable();
      req._read = () => {};
      req.method = method.toUpperCase();
      req.url = parsedUrl.pathname + parsedUrl.search;
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());
      req.headers = {
        host: 'localhost',
        ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
      };

      if (body !== null && body !== undefined) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        req.headers['content-type'] = req.headers['content-type'] || 'application/json';
        req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
        req.push(bodyStr);
        req.push(null);
      } else {
        req.push(null);
      }

      let statusCode = 200;
      const responseHeaders = {};
      let responseBody = '';
      let isDone = false;

      const finish = () => {
        if (isDone) return;
        isDone = true;
        resolve({
          status: statusCode,
          headers: responseHeaders,
          text: async () => responseBody,
          json: async () => {
            try {
              return JSON.parse(responseBody);
            } catch (e) {
              return responseBody;
            }
          }
        });
      };

      const res = {
        get statusCode() {
          return statusCode;
        },
        set statusCode(code) {
          statusCode = code;
        },
        setHeader(name, val) {
          responseHeaders[name.toLowerCase()] = val;
        },
        getHeader(name) {
          return responseHeaders[name.toLowerCase()];
        },
        writeHead(code, message, hdrs) {
          statusCode = code;
          if (hdrs) Object.assign(responseHeaders, hdrs);
        },
        status(code) {
          statusCode = code;
          return res;
        },
        json(data) {
          responseHeaders['content-type'] = 'application/json';
          responseBody = JSON.stringify(data);
          finish();
          return res;
        },
        send(data) {
          responseBody = typeof data === 'string' ? data : JSON.stringify(data);
          finish();
          return res;
        },
        write(chunk) {
          responseBody += chunk ? chunk.toString() : '';
        },
        end(chunk) {
          if (chunk) responseBody += chunk.toString();
          finish();
        }
      };

      app.handle(req, res, (err) => {
        if (err) {
          if (!isDone) {
            statusCode = 500;
            responseBody = JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: err.message } });
            finish();
          }
        }
      });
    });
  };
}
