# FomeBoa SP - aplicación para iPhone

## Qué tenemos

El repositorio incluye un proyecto de aplicación nativa creado con **Capacitor 8**.
No es un simple enlace en la pantalla de inicio: el proceso de compilación genera
un proyecto de Xcode y un ejecutable de prueba para el **simulador de iPhone**.

La aplicación utiliza el catálogo gastronómico compartido y los idiomas español,
portugués e inglés. El ícono nativo se genera con
`scripts/crear-icono-ios.swift`.

## Obtener el proyecto para Xcode

El flujo gratuito [Compilar FomeBoa SP para iPhone](https://github.com/nahuelbaez2011-sketch/fomeboa-br/actions/workflows/ios-build.yml)
produce un artefacto llamado **FomeBoa-SP-proyecto-iOS-Xcode**.

1. Abrí el flujo de GitHub Actions y elegí una ejecución exitosa.
2. Bajá el artefacto `FomeBoa-SP-proyecto-iOS-Xcode` desde Artifacts.
3. Descomprimí el archivo: contiene la carpeta `ios/`, con el proyecto
   nativo para Xcode.
4. Para editar y recompilar con todos los recursos, descargá o cloná también
   el repositorio completo y ejecutá `npm install`, `npm run build:mobile`,
   `npx cap sync ios`.

El artefacto **FomeBoa-SP-simulador-NO-instalar-en-iPhone** es exclusivamente
para un simulador de iPhone: no es un IPA firmado y **no se instala en un
iPhone real**.

## Cómo instalarla gratis en TU iPhone para probar

Apple permite instalar y probar aplicaciones propias con un Apple Account
gratuito en un iPhone conectado a **una Mac con Xcode**:

1. Instalá Xcode 26 o posterior en una Mac compatible.
2. Entrá a **Xcode > Settings > Accounts** con tu cuenta Apple.
3. Abrí el proyecto `ios/App/App.xcodeproj`.
4. En **Signing & Capabilities**, activá `Automatically manage signing`
   y seleccioná tu **Personal Team**.
5. Conectá tu iPhone y, si iOS lo solicita, activá Developer Mode y confiá
   en la computadora.
6. Elegí tu iPhone como destino en Xcode y presioná **Run**.

Apple indica que el aprovisionamiento de Personal Team caduca al cabo de
**7 días** y es necesario reinstalar la aplicación. No se requiere pagar
Apple Developer Program para estas pruebas personales.

Referencia oficial:
https://developer.apple.com/la/help/account/basics/about-your-developer-account

## Para TestFlight y App Store

Para distribuirla por TestFlight o App Store y que otras personas puedan
instalarla de forma normal se necesita una cuenta **Apple Developer Program**,
que actualmente cuesta alrededor de US$99 al año (impuestos según país).
NO se contrató.

Aún faltan pruebas de calidad, enlaces para eliminar cuentas, política de
privacidad, manejo de redirecciones de autenticación y configuración de
Apple/Google Sign In antes de publicarla al público.

## Estado del registro

Hay un proyecto Supabase Free real bajo el nombre **FomeBoa SP**.
La base de perfiles tiene RLS y los usuarios no pueden alterarse
`xp` ni `level`.

**Falta configurar en Supabase** el dominio de redirección, las
credenciales OAuth de Google y Apple, y conectarlo al frontend después
de comprobar el flujo de verificación por correo. Hasta entonces
`auth-config.js` permanece sin claves: la app es una versión de desarrollo
sin inicio de sesión real, no una versión publicable para usuarios finales.

Las claves `sb_secret_...`, `service_role` o contraseñas nunca deben
colocarse en el repositorio público.

## Sin cargos

La compilación iOS de prueba utiliza GitHub Actions en este repositorio público.
No está conectada a Apple Developer de pago ni genera cuotas mensuales.
