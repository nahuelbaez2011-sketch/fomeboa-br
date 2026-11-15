# FomeBoa SP · registro con Google (etapa web, luego Android)

El proyecto **FomeBoa SP** ya usa Supabase Auth y el frontend ya tiene un
botón «Continuar con Google». **No habilitar el botón a ciegas**: la aplicación
consulta el estado público del proveedor antes de ofrecer el inicio de sesión.
La configuración final de Google requiere acciones del propietario en Google
Cloud y Supabase. No hay una integración de Google Cloud OAuth con escritura
conectada a este chat, así que **nadie debe subir su Client Secret a GitHub**.

## Proyecto y URLs exactas

- Sitio web FomeBoa: `https://nahuelbaez2011-sketch.github.io/fomeboa-br/`
- Origen web para Google OAuth: `https://nahuelbaez2011-sketch.github.io`
- URL de respuesta de Google hacia Supabase (Authorized redirect URI):
  `https://lecbsawivmlkofrtpwde.supabase.co/auth/v1/callback`
- Panel de Supabase para Google:
  https://supabase.com/dashboard/project/lecbsawivmlkofrtpwde/auth/providers?provider=Google
- Configuración de URLs de Supabase:
  https://supabase.com/dashboard/project/lecbsawivmlkofrtpwde/auth/url-configuration
- Credenciales de Google Cloud:
  https://console.cloud.google.com/auth/clients

## Configurar sin pagar

1. Entrá a **Google Cloud Console** con la cuenta Google que controlará la
   aplicación. Elegí o creá un proyecto **FomeBoa SP**. Crear un proyecto y un
   cliente OAuth no requiere contratar un servicio pago. No habilites APIs
   de facturación ni presupuestos con gastos.
2. Abrí **Google Auth Platform > Branding**, completá el nombre público
   FomeBoa SP, correo de soporte y datos requeridos. En **Audience**, elegí
   `External` para admitir otras cuentas Google en el futuro. Durante las
   pruebas mantené el estado `Testing` y agregá TU cuenta Google como usuario
   de prueba. El resto del público no podrá iniciar sesión hasta que Google
   permita usar el proyecto según su estado de publicación.
3. Abrí **Clients > Create Client**. Tipo: **Web application**.
   Nombre: `FomeBoa SP Web`.
4. En **Authorized JavaScript origins** agregá:
   `https://nahuelbaez2011-sketch.github.io`
5. En **Authorized redirect URIs** agregá:
   `https://lecbsawivmlkofrtpwde.supabase.co/auth/v1/callback`
6. Guardá. Google mostrará un **Client ID** (no secreto) y un **Client Secret**
   (secreto). **No los pegues en el chat ni en GitHub**. Conservá el secret
   privado; ingresalo solamente en el panel seguro de Supabase.
7. En [Supabase, Google provider](https://supabase.com/dashboard/project/lecbsawivmlkofrtpwde/auth/providers?provider=Google)
   habilitá **Google** e ingresá **Client ID** y **Client Secret**.
   Guardá los cambios. No hace falta configurar Apple ni iOS.
8. En [Supabase Auth > URL Configuration](https://supabase.com/dashboard/project/lecbsawivmlkofrtpwde/auth/url-configuration):
   **Site URL** `https://nahuelbaez2011-sketch.github.io/fomeboa-br/`.
   Añadí la misma URL exacta a **Redirect URLs**.
9. Abrí la web en una ventana privada, tocá **Continuar con Google**,
   seleccioná tu propia cuenta de prueba, aceptá el consentimiento. Tras
   regresar a FomeBoa deberías ver **Mi perfil**.

## Verificación del primer usuario

En Supabase **Authentication > Users**, verificá que figure tu cuenta
Google. El trigger crea automáticamente un registro en
`public.fomeboa_profiles`, con:

- ID de Auth del usuario (UUID)
- nombre público de la cuenta Google
- `xp=0`, `level=1`
- idioma preferido inicial `es`

Si aparece error de proveedor deshabilitado, comprobar el paso 7; si aparece
error `redirect_to not allowed`, comprobar el paso 8; si sale `access blocked`
o `unverified app`, revisar **Audience**, el usuario de prueba y la pantalla
de consentimiento en Google Cloud.

**Seguridad:** no convertir automáticamente al primer registro en
administrador. La asignación de privilegios de propietario debe hacerse luego
con identidad verificada y autorización del servidor. No guardar contraseñas de
Google: Supabase administra OAuth y la sesión.

## Próxima etapa

Android nativo requiere configurar la redirección a la app o usar
Google Identity Services nativo (con hash SHA-1 del certificado y su Client ID
Android). En esta etapa **solamente activamos el acceso de Google a la web**;
iOS y Apple Sign-In quedan fuera del alcance.

Documentación oficial:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://developers.google.com/identity/protocols/oauth2
