# FomeBoa SP · Cuentas de usuario y aplicaciones móviles

## Estado real del proyecto

- Interfaz de crear cuenta, iniciar sesión, recuperar contraseña, cerrar sesión y ver perfil incorporada en `auth.js`.
- Backend elegido: Supabase Auth y PostgreSQL con Row Level Security (RLS).
- Las cuentas **no están habilitadas todavía**: `auth-config.js` tiene URL y clave pública vacías hasta que se conecte un proyecto administrado por el propietario.
- No se guardan contraseñas en GitHub Pages ni en archivos de la web.
- **Decisión actual**: para entrar a la interfaz de FomeBoa se requerirá una sesión registrada y verificada en Supabase. El bloqueo visual se activa automáticamente al configurar un proyecto real; mientras las credenciales públicas sigan vacías, la web permanece accesible para desarrollo y pruebas.
- Los 48.934 registros gastronómicos y sus favoritos locales preexistentes no se convierten automáticamente en cuentas.
- Los proyectos nativos Android/iOS aún deben generarse, probarse, firmarse y publicarse.

## Activación segura de Supabase

1. Crear o conectar un proyecto Supabase administrado por el propietario de FomeBoa, preferentemente a través de la conexión de Supabase en ChatGPT.
2. Abrir **SQL Editor** en Supabase y ejecutar `supabase/schema.sql` una vez. Esto crea `public.fomeboa_profiles`, sus políticas RLS y un trigger que genera el perfil después del registro. **No asignar XP desde el navegador**.
3. En **Authentication > Providers > Email** habilitar correo y contraseña y **Confirm Email**.
4. En **Authentication > URL Configuration** establecer Site URL `https://nahuelbaez2011-sketch.github.io/fomeboa-br/` y permitir esa URL como redirección de confirmación y recuperación.
5. Copiar **Project URL** y exclusivamente la **publishable key** (`sb_publishable_...` o `anon` pública heredada) a `auth-config.js`. **Nunca copiar una clave `sb_secret_`, `service_role` ni contraseñas a archivos públicos o commits.**
6. Probar registro, confirmación por correo, inicio de sesión, recuperar contraseña y cierre de sesión. Verificar que un usuario no pueda leer o editar el perfil de otro; que un navegador no pueda cambiar XP ni nivel y que el registro duplicado no altere cuentas previas.
7. Para producción, configurar un servicio SMTP propio para confirmaciones y recuperación: el envío de prueba integrado de Supabase tiene límites estrictos.

## Contabilizar usuarios

Supabase Dashboard > Authentication > Users muestra las cuentas registradas. Los usuarios activos mensuales (MAU) son otra métrica. Los detalles privados de cuentas y correos **no se publican** en el sitio. No crear un endpoint público que divulgue todos los usuarios.

## Datos mínimos

Se asocian al ID interno de Auth: correo electrónico autenticado, nombre público (máximo 40 caracteres), fecha de creación y perfil con nivel y XP. La contraseña la gestiona Supabase Auth; no se guarda en nuestra base de datos de catálogo.

## Android e iOS, misma cuenta

El sitio actual está preparado para un contenedor nativo con Capacitor 8:

```bash
npm install
npm run build:mobile
npx cap add android
npx cap add ios
npx cap sync
```

Para compilar Android se requiere Android Studio y un entorno Android configurado. Para compilar y firmar iOS se requiere macOS y Xcode. Los identificadores iniciales de app se definen en `capacitor.config.json`. La autenticación con email y contraseña usa el mismo proyecto Supabase en las tres plataformas. Más adelante, si añadimos Google/Apple Sign-In, necesitaremos redirecciones móviles y su configuración de plataformas.

La carpeta `www/` generada empaqueta el catálogo abierto y los recursos de la web. Esto puede aumentar el tamaño de instalación: una futura optimización puede descargar catálogos por zona.

## Antes del lanzamiento público en App Store y Google Play

- Incorporar dentro de la app el flujo de **eliminación de cuenta** y eliminación de datos, con backend verificado; Apple lo exige cuando se permite crear cuentas. No publicar la app nativa antes de tenerlo.
- Publicar política de privacidad y términos de uso correctos; definir retención, exportación de datos, borrado y moderación.
- Implementar valoraciones reales, una por usuario/local como base, prevención de fraude, y cálculo de XP en el servidor (nunca confiar en puntos enviados desde el móvil).
- No confundir `anon` pública con una clave secreta; aplicar RLS y controles de columnas a todas las tablas.
- Si se incorporan proveedores sociales como Google, comprobar los requisitos de acceso de Apple y la configuración de proveedores.

Referencias oficiales:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://capacitorjs.com/docs/getting-started
- https://developer.apple.com/app-store/review/guidelines/

## Idiomas de la interfaz

El selector ubicado junto a «Explorá São Paulo» permite alternar **Español, Português y English**. La preferencia se guarda localmente, también en la pantalla de acceso. Los nombres comerciales y los nombres propios de los distritos no se traducen.

## Registro obligatorio y métricas para anunciantes

- Una vez conectado y activado Supabase, la entrada normal a la interfaz exige un usuario con sesión autenticada, validada mediante `auth.getUser()`; no aceptar solamente sesiones almacenadas en el navegador.
- **Cuidado: GitHub Pages es alojamiento estático.** El bloqueo de interfaz no puede convertir archivos estáticos públicos en datos privados; para una restricción de acceso completa, mover la obtención de datos y las acciones privadas a un backend autenticado con RLS.
- Para justificar alcance ante anunciantes, distinguir **cuentas registradas**, **usuarios activos mensuales**, **visitas** y **búsquedas por zona**. La cifra de cuentas por sí sola no acredita uso activo ni conversiones. Usar métricas agregadas y privacidad desde el diseño, sin compartir correos personales.
- Antes de publicar iOS, comprobar el requisito de Apple de permitir acceso sin inicio de sesión si las funciones centrales no dependen realmente de la cuenta, y ofrecer eliminación de cuenta dentro de la aplicación. Véase https://developer.apple.com/app-store/review/guidelines/ sección 5.1.1(v).
- El conector de Supabase no devolvió proyectos existentes al consultar en noviembre de 2026. Crear uno requiere elegir explícitamente organización y aceptar cualquier coste que corresponda; no fue creado automáticamente.
