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
import { Transform } from 'node:stream';
import { transformIndexHtml } from './server/transform-index';
import { IncomingMessage, ServerResponse } from 'node:http';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Security Related Headers
 */
// Generate a NONCE and correctly set it
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(32).toString('base64');
  res.locals['nonce'] = nonce;
  console.log(`created a nonce: ${nonce}`);
  next();
});
app.use(
  helmet({
    frameguard: {
      action: 'deny',
    },
    hidePoweredBy: true,
    contentSecurityPolicy: {
      directives: {
      "script-src": [
        "'self'",
        // "'strict-dynamic'",
        // @ts-ignore
        (req: IncomingMessage, res: ServerResponse) => `'nonce-${res.locals['nonce']}'`,
      ],
      "style-src": ["'self'", "'unsafe-inline'"],
      "object-src": ["'none'"],
    },
    useDefaults: true
    }
  })
);

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
    },
  })
);

/**
 * Apply rate limiter to all other requests (Angular)
 */
const dynamicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
});
app.use(dynamicLimiter);

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
  console.log("Angular rendering...");
  angularApp
    .handle(req, {
      nonce: res.locals['nonce'],
    } as RequestContext)
    .then((response) => {
      if(!response) {
        next();
        return;
      }

      console.log("Transforming node response")
      transformIndexHtml(response, res, {
        NONCE_VALUE: res.locals['nonce'],
      });
    })
    .then(console.log)
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
