# frontend-portfolio-new

Frontend de jmrg.dev. Sitio público con blog y proyectos en español e inglés, construido sobre
Next.js 16 con App Router y React 19. Todo el contenido llega de una API REST externa: aquí no hay
textos ni datos escritos a mano.

## Stack

Next.js 16.2.12, React 19.2.4, TypeScript 5 y Tailwind CSS 4. La internacionalización va con
next-intl 4.13. El formateo y el linting los reparten Biome y ESLint 9. Las pruebas de maquetación
usan Playwright.

El gestor de paquetes es pnpm 11 sobre Node 24. Si no lo tienes instalado como binario, corepack lo
resuelve: `corepack pnpm <comando>`.

## Requisitos previos

El sitio no arranca solo. Necesita la API detrás, que es privada: cada petición, incluidas las
públicas, exige un token Bearer.

1. Levanta el backend en `https://localhost:3001`. Sirve HTTP/2 sobre TLS con certificados
   autofirmados, así que los scripts de este repo pasan `NODE_EXTRA_CA_CERTS` apuntando al
   certificado local del backend. Sin esa variable, `fetch` rechaza la conexión.
2. En desarrollo, `API_AUTH_DEV_TOKEN=true` hace que la aplicación pida un token de desarrollo al
   propio backend. Los scripts `dev`, `build` y `start` ya la llevan puesta.
3. Añade el origen de este frontend a `CORS_ORIGINS` en el backend. Su CORS está cerrado por
   defecto.

## Puesta en marcha

```bash
corepack pnpm install
corepack pnpm dev
```

El servidor de desarrollo queda en `http://localhost:3000`. Para probar desde un móvil de la red
local, `next.config.ts` ya autoriza los rangos privados habituales en `allowedDevOrigins`.

Para servir el build de producción:

```bash
corepack pnpm build
corepack pnpm start
```

Las métricas de rendimiento solo tienen sentido sobre ese build. En desarrollo no hay minificación
ni caché, así que cualquier medida sale distorsionada.

## Scripts

| Script | Qué hace |
|---|---|
| `dev` | Servidor de desarrollo |
| `build` | Compilación de producción |
| `start` | Sirve el build compilado |
| `start:standalone` | Sirve la salida standalone, copiando antes `public` y los estáticos |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `format` | Formatea con Biome |
| `verify` | Biome, typecheck, lint, build y comprobación de secretos, en ese orden |
| `verify:no-secrets` | Busca tokens filtrados en el bundle del cliente |
| `openapi` | Regenera los tipos de la API desde `openapi.json` |

## Rutas e idiomas

El prefijo de idioma es obligatorio y los pathnames están traducidos. `/es/proyectos` y
`/en/projects` son las rutas canónicas: pedir el segmento del otro idioma devuelve un 307 hacia la
correcta.

```
/[locale]                 portada
/[locale]/blog            listado
/[locale]/blog/[slug]     artículo
/[locale]/proyectos       listado (en inglés, /projects)
/[locale]/proyectos/[slug] ficha de proyecto
```

Los dos idiomas no tienen por qué estar sincronizados. El modelo de datos permite que un artículo o
un proyecto exista en uno y no en el otro, así que cada listado muestra lo que hay en su idioma.

## Imágenes

El CMS guarda rutas relativas (`blog/ejemplo.png`). `src/lib/images.ts` las resuelve contra
`NEXT_PUBLIC_IMAGE_BASE_URL`, cuyo valor por defecto es el CDN de producción. Todo el render pasa
por `src/components/machine/cms-image.tsx`, que descarta las imágenes que no puede resolver.

En `next.config.ts` se sirven AVIF y WebP, se recortan los anchos por encima del original y la caché
del optimizador dura 31 días. Esa caché no se invalida: si reemplazas una imagen conservando el
nombre, seguirá sirviéndose la anterior hasta que expire.

## Pruebas

```bash
corepack pnpm exec playwright test
```

`tests/layout.spec.ts` comprueba dos cosas en las seis rutas de listado, sus detalles y nueve anchos
de pantalla: que ninguna página provoque scroll horizontal y que ningún destino interactivo baje de
24 por 24 píxeles CSS, el mínimo del criterio 2.5.8 de WCAG 2.2 nivel AA.

La suite reutiliza el servidor de desarrollo si ya lo tienes en el 3000, y arranca uno propio si no.
Antes de empezar, `tests/warmup.ts` pide cada ruta una vez, porque en desarrollo la primera visita
dispara la compilación y esa espera hacía fallar pruebas de forma intermitente.

## Despliegue

El build genera salida `standalone`. El `Dockerfile` del repositorio construye la imagen a partir de
ahí. Las variables que el contenedor necesita en tiempo de ejecución son la URL de la API, su token
y `SITE_URL` para las URL canónicas.
