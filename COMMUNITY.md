# FomeBoa SP — perfiles y contribuciones, versión 1

## Implementado

Al iniciar sesión con Google, el botón abre Mi perfil. Los controles de acceso se ocultan de verdad mediante CSS [hidden]; Cerrar sesión es un enlace pequeño. El perfil muestra nombre, fecha de alta, XP, nivel, historial propio de reseñas, insignias obtenidas y pendientes, favoritos de la cuenta y avisos enviados.

Cada usuario tiene una reseña activa por local. Puede guardar, editar y borrar su puntuación de 1 a 5 y un comentario. El promedio numérico de FomeBoa se muestra en las tarjetas. Los comentarios se muestran en el historial privado del autor; todavía no se publica una lista de comentarios de otros usuarios. Ninguna puntuación procede de Google.

## Recompensas

- 10 XP por cada valoración publicada de un local diferente.
- 20 XP adicionales cuando el comentario tiene al menos 40 caracteres recortados y 20 caracteres alfanuméricos. Este umbral es una regla mecánica, no una verificación humana de calidad.
- Valorar con 1 o 5 estrellas concede exactamente lo mismo.
- Editar no acumula puntos de nuevo. Borrar una reseña recalcula XP, nivel e insignias.
- Máximo 10 locales nuevos valorados en 24 horas por cuenta. Un recibo privado persistente por local impide reiniciar ese contador eliminando y recreando una reseña.
- Niveles: Principiante (0), Explorador (50), Catador (150), Conocedor (400), Referente (800) y Embajador (1500 XP).

Nueve insignias: Bienvenido a FomeBoa (cuenta), Primera opinión (1 local), Explorador gastronómico (5), Voz de la comunidad (20), Amante del café (5 cafeterías), Ruta del pan (5 panaderías), Dulce explorador (5 pastelerías), Ruta de bares (5 bares) y Explorador de zonas (3 zonas diferentes). No son certificaciones profesionales ni sanitarias.

## Datos y seguridad

Tablas en Supabase: fomeboa_venues, fomeboa_reviews, fomeboa_review_totals, fomeboa_favorites, fomeboa_reports, fomeboa_badge_catalog y fomeboa_user_badges. Todas tienen RLS. Los recibos de frecuencia están en fomeboa_private.review_receipts, sin acceso de clientes.

El cliente no puede modificar XP, nivel, insignias, nombres del registro de sedes ni totales de puntuaciones. Las reglas se ejecutan en triggers privados del servidor, con comprobación de usuario y sesión activa para las contribuciones. La función pública fomeboa_save_review utiliza SECURITY INVOKER. El historial, los favoritos y los avisos están limitados al propietario. Los promedios se pueden leer con una cuenta autenticada.

La Edge Function fomeboa-venue valida el JWT con Supabase Auth. Sólo admite IDs presentes en el catálogo abierto del commit ea95752c22c812d6a8dc0f0b723e2530e151445e; descarga archivos de distrito desde una URL fijada y no confía en nombres o categorías enviados por el navegador. El registro se carga bajo demanda. Mantener actualizado ese commit de origen cuando cambien las exclusiones del catálogo. Estar en este registro NO acredita que el establecimiento siga abierto.

La clave de servicio sólo se utiliza dentro de la Edge Function; no se entrega al navegador. No se crearon planes pagos.

## Avisos

El usuario puede informar cierre, mudanza, ubicación incorrecta, duplicado u otro problema. El aviso se guarda como pending y aparece en su historial, sin abrir GitHub y sin eliminar automáticamente el local. Todavía falta la pantalla de moderación administrativa. No se asignaron privilegios de administrador automáticamente al primer usuario.

## Comprobaciones realizadas

Pruebas de servidor en una transacción revertida: guardar 1 estrella, obtener 30 XP con comentario; cambiar a 5 sin aumentar XP; mantener una reseña por sede; prohibir edición directa de XP e insignias e inserción de sedes; guardar favoritos y avisos; borrar reseña y recalcular insignias y promedio; impedir lecturas/escrituras anónimas. No quedaron reseñas ficticias en producción.

Prueba local en Chromium a 390 × 844 con cuenta simulada: Google oculto, cierre de sesión pequeño, historial, nueve insignias, guardar valoración, favoritos, avisos, idioma inglés, eliminación y salida. Es una prueba con datos simulados, NO un inicio de sesión real con la cuenta del propietario ni una prueba completa del dispositivo físico.

Pendientes antes de un lanzamiento amplio: moderación administrativa, mayor prevención de reseñas falsas, privacidad y eliminación de cuenta completas, políticas de publicación de comentarios y comprobación del recorrido real en dispositivos. No presentar la visita autodeclarada como visita certificada.
