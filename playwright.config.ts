import { defineConfig, devices } from '@playwright/test';

/**
 * Suite de regresión de maquetación. Corre contra el servidor de desarrollo:
 * reutiliza el que ya esté escuchando en el 3000 y solo arranca uno propio si no lo hay,
 * para no chocar con el que el usuario tiene abierto en su terminal.
 *
 * Las notas de rendimiento NO se miden aquí: eso exige el build de producción en el 3100
 * según `docs/rubrica.md`. Este archivo cubre lo que sí es idéntico en desarrollo —
 * geometría, desbordamientos y tamaño de los destinos táctiles.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/warmup.ts',
  testIgnore: ['warmup.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'corepack pnpm dev',
    url: 'http://localhost:3000/es',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
