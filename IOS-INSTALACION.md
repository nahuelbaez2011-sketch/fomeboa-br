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

## Instalarla gratis en un iPhone usando solamente Windows

Se puede probar sin Mac y sin pagar Apple Developer, usando el IPA
sin firmar construido en GitHub Actions y un programa de instalación
compatible con Apple ID gratuito, como Sideloadly.

1. En la ejecución más reciente que termine exitosamente del flujo
   [Compilar FomeBoa SP para iPhone](https://github.com/nahuelbaez2011-sketch/fomeboa-br/actions/workflows/ios-build.yml),
   descargá el artefacto **FomeBoa-SP-IPA-Windows-para-firmar**.
2. Extraé el ZIP descargado. Adentro está
   `FomeBoa-SP-Windows-sin-firmar.ipa`.
3. Descargá Sideloadly exclusivamente desde su página oficial:
   https://sideloadly.io/ .
4. En Windows, conectá tu iPhone con un cable y aceptá "Confiar en
   esta computadora" en el teléfono. Si Sideloadly no lo detecta,
   instalá los controladores de Apple indicados por Sideloadly.
5. En Sideloadly elegí tu iPhone, arrastrá el archivo IPA, ingresá el
   Apple ID desde la propia aplicación de firma y presioná Start.
   No compartas tus contraseñas ni códigos de verificación con
   FomeBoa, GitHub o ChatGPT.
6. En el iPhone, si se solicita, activá el modo desarrollador en
   **Ajustes > Privacidad y seguridad > Modo desarrollador** y
   autorizá la aplicación en
   **Ajustes > General > VPN y gestión de dispositivos**.
7. Con un Apple ID gratuito la firma normalmente dura **7 días**:
   Sideloadly puede volver a firmarla mientras tu PC siga disponible.

**Aviso:** este método instala una app de pruebas para uso propio,
no la publica en App Store ni verifica automáticamente todas sus
funcionalidades. El IPA original se entrega sin firma; sólo el
equipo del usuario puede instalarlo firmándolo con su cuenta.
Sideloadly es un programa de terceros; revisá sus condiciones y
sus permisos antes de introducir tu cuenta Apple.

Referencias:
- https://sideloadly.io/
- https://sideloadly.io/faq.html

## Alternativa con una Mac

Con Xcode y una cuenta Apple gratuita también es posible instalar
la aplicación en un iPhone conectado a la Mac, utilizando un equipo
de desarrollo personal. Las firmas gratuitas duran siete días.

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
