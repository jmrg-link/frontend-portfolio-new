import { defineConfig, devices } from '@playwright/test';

/**
 * Suite de regresión de maquetación. Corre contra el servidor de desarrollo: reutiliza el que ya
 * escuche en el 3000 y arranca uno propio solo si no lo hay.
 *
 * Cubre lo que en desarrollo es idéntico a producción: geometría, desbordamientos y tamaño de
 * los destinos táctiles. Las métricas de rendimiento no se miden aquí, porque exigen el build de
 * producción.
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
