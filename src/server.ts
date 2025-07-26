import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import expressStaticGzip from 'express-static-gzip';
import { join } from 'node:path';
import crypto from 'crypto';
import { RequestContext } from './request-context';
import { IncomingMessage, ServerResponse } from 'node:http';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Security Related Headers
 */
app.use((req, res, next) => {
  // create nonce for the CSP
  const nonce = crypto.randomBytes(32).toString('base64');

  // save nonce in the local variables for this request
  res.locals['nonce'] = nonce;

  // setup helmet for security related protection/headers etc
  helmet({
    frameguard: {
      action: 'deny',
    },
    hidePoweredBy: true,
    contentSecurityPolicy: {
      directives: {
        'script-src': [
          "'self'",
          // "'strict-dynamic'",
          () => `'nonce-${nonce}'`,
        ],
        'style-src': ["'self'", "'unsafe-inline'"],
        'object-src': ["'none'"],
      },
      useDefaults: true,
    },
  })(req, res, next);
});

/**
 * Serve static files from /browser with compression
 */
app.use(
  '/',
  expressStaticGzip(browserDistFolder, {
    enableBrotli: true,
    orderPreference: ['br', 'gz'],
    index: false,
    // redirect: true,
    serveStatic: {
      maxAge: '1y',
      immutable: true,
    },
  })
);

/**
 * Apply rate limiter to all other requests (Angular)
 */
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: false,
    legacyHeaders: false,
  })
);

/**
 *
 */
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      const ae = req.headers['accept-encoding'] || '';
      return ae.includes('br') || ae.includes('gzip');
    },
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  console.log('Angular rendering...');
  angularApp
    .handle(req, {
      nonce: res.locals['nonce'],
    } as RequestContext)
    .then(async (response) => {
      if (!response) return next();

      // Clone the response (stream can be used only once)
      const originalBody = await response.text();

      // gather the nonce to be inserted
      const nonce = res.locals['nonce'];

      // replace every "{{nonce_value}}""
      const replacedBody = originalBody.replace(/{{nonce_value}}/g, nonce);

      // Create new Response with modified body
      const modifiedResponse = new Response(replacedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      return writeResponseToNodeResponse(modifiedResponse, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
