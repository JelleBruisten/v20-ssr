import { mergeApplicationConfig, ApplicationConfig, CSP_NONCE, inject, REQUEST_CONTEXT } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { RequestContext } from '../request-context';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes(serverRoutes),
    ),
    {
      provide: CSP_NONCE,
      useFactory: () => {
        const requestContext = inject<RequestContext>(REQUEST_CONTEXT);
        console.log(`request context`, requestContext);
        return requestContext.nonce
      }
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
