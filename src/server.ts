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

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Rate limiter for dynamic (non-static) requests
 * Applies to requests AFTER static assets are served
 */
const dynamicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: false,
  legacyHeaders: false
});

/**
 * Security Related Headers
 */
app.use(helmet({
frameguard: {
  action: 'deny'
},
hidePoweredBy: true,

}))

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
  }),
);

/**
 * Apply rate limiter to all other requests (Angular or API)
 */
app.use(dynamicLimiter);


/**
 *
 */

app.use(compression({
  threshold: 1024,
  level: 6,
  filter: (req, res) => {
    console.log(res.getHeaders()['content-encoding']);
    const ae = req.headers['accept-encoding'] || '';
    return ae.includes('br') || ae.includes('gzip');
  }
}));

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
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
