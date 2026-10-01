import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { phoneRequiredInterceptor } from './app/interceptors/phone-required.interceptor';

/** One reload after new deploy when cached shell loses hashed chunks (PWA / slow networks). */
let chunkReloadTried = false;
window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event.reason && (event.reason as Error).message) || event.reason || '');
  if (
    !chunkReloadTried &&
    /Failed to fetch dynamically imported module|ChunkLoadError|loading chunk \d+/i.test(msg)
  ) {
    chunkReloadTried = true;
    event.preventDefault();
    window.location.reload();
  }
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([phoneRequiredInterceptor]))
  ]
}).catch((err) => console.error('Bootstrap error', err));
