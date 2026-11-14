# Catálogo de FomeBoa SP

## Resultado guardado — 14 de noviembre de 2026

El catálogo pasó de **6.656 a 48.935 registros gastronómicos**, con **42.279 altas netas**. Los resultados reproducibles se guardan en `catalogo/manifest.json` y `catalogo/ampliacion-resumen.json`.

| Tipo de establecimiento | Registros |
| --- | ---: |
| Restaurantes | 24.809 |
| Bares | 8.203 |
| Comida rápida | 3.408 |
| Cafeterías | 2.790 |
| Panaderías | 4.077 |
| Pubs | 856 |
| Heladerías | 2.103 |
| Confiterías | 1.395 |
| Pastelerías | 971 |
| Otros tipos gastronómicos | 323 |
| Total | 48.935 |

Ejemplos de cobertura por zona: Cambuci 271; Ipiranga 631; Vila Mariana 1.187; Moema 1.066; Pinheiros 2.021; Guarulhos 3.434.

Son registros de fuentes abiertas, no 48.935 establecimientos verificados individualmente como abiertos hoy. Permanecen 995 registros originales de OSM sin nombre comercial, identificados explícitamente como tales. No se inventan marcas, estrellas, opiniones, fotografías ni promociones reales.

## Alcance y fuentes

El catálogo no equivale a todos los negocios de Google Maps ni a un censo completo. Conserva el área urbana acordada: latitudes -23.80 a -23.35 y longitudes -46.90 a -46.36, filtrada por los distritos del municipio de São Paulo y por el municipio de Guarulhos. No se incorporaron municipios vecinos fuera de ese alcance.

- **OpenStreetMap**: catálogo original, geometría distrital y fuente alternativa de consulta por zona. Los datos conservan sus identificadores OSM y atribución ODbL.
- **Overture Maps Places**, edición `2026-10-21.0`: fuente adicional de nombres, categorías, coordenadas y direcciones. Se conservan identificadores GERS, edición, proveedores y licencias por registro.
- **Guarulhos**: para completar la ampliación se utilizó un polígono municipal de OpenStreetMap, validado como área administrativa que contiene el centro municipal. No se utilizó un círculo aproximado.

Las atribuciones y textos de licencia se guardan en `catalogo/licencias/`. El catálogo combinado se distribuye bajo ODbL 1.0, conservando los avisos originales de las aportaciones CDLA-Permissive-2.0, Apache-2.0 y CC0. Las fichas muestran su fuente; la confianza de existencia de Overture NO se convierte en puntuación gastronómica.

## Calidad y duplicados

Se filtran categorías gastronómicas, puntos fuera del área y registros de Overture con confianza inferior a 0,5. Los estados explícitamente cerrados se excluyen cuando están disponibles. Una ausencia de estado no prueba que un local siga abierto.

La primera ampliación detectó 1.481 coincidencias entre registros nuevos y guardados. La pasada específica de Guarulhos incorporó otras 3.191 altas netas a sus 243 registros anteriores. Las coincidencias de un registro ya guardado durante una segunda pasada no se cuentan como nuevos comercios.

La deduplicación utiliza identificador, nombre normalizado, proximidad y dirección. No se fusionan sucursales únicamente porque compartan nombre, ni direcciones con números distintos. Pueden persistir casos ambiguos que requieren revisión humana. Se comprueban identificadores únicos, conservación de registros previos y correspondencia de los conteos con todos los archivos distritales.

## Cómo se consulta

El sitio carga el archivo del distrito seleccionado desde `catalogo/zonas/`, sin repetir toda la descarga del proveedor por visitante. `Ver todos los locales guardados` abre `catalogo/todos.json`. La página presenta resultados en grupos de 60: es paginación visual, no un límite del catálogo.

Los filtros por tipo, nombre y distrito, los favoritos y las zonas seleccionadas se mantienen. La publicidad continúa separada del catálogo; los anuncios de demostración están señalados como ficticios.

## Tres formas de incorporación

1. **Importación compartida de datos abiertos**: `scripts/catalogo.py` construye la base OSM; `scripts/ampliar_catalogo.py` agrega Overture; `scripts/completar_guarulhos.py` completa Guarulhos y los avisos de fuente. Los flujos de GitHub Actions se ejecutan bajo demanda o ante cambios de sus archivos, no con una programación periódica.
2. **Propuesta individual**: `Agregar un local faltante` guarda un borrador SOLO en el navegador. Para enviarlo, el usuario abre un issue precompletado en GitHub (requiere cuenta; su contenido será público) o exporta sus propuestas. No hay publicación automática.
3. **Importación por lotes**: CSV o JSON de hasta 2 MB y 2.000 filas en el navegador. Se validan campos y duplicados. Los registros quedan pendientes y locales hasta revisión administrativa.

## Formato de propuestas

Columnas obligatorias: `name,type,zone,address,sourceUrl`. Opcional: `cuisine`.

Tipos: `restaurant`, `cafe`, `bar`, `pub`, `fast_food`, `food_court`, `bakery`, `pastry`, `coffee`, `ice_cream`, `biergarten`, `confectionery`, `deli`.

`zone` debe coincidir con un distrito del catálogo o con Guarulhos. `sourceUrl` debe apuntar a una fuente verificable, preferentemente la web oficial o datos proporcionados por el comercio. No se deben aportar datos personales ni copiar reseñas o imágenes ajenas.

JSON admite una lista o `{ "schemaVersion": 1, "venues": [...] }`.

## Revisión administrativa

```sh
python3 scripts/catalogo.py --import-file propuestas.json
# CSV separado por coma:
python3 scripts/catalogo.py --import-file propuestas.csv
```

La importación deja todo en `catalogo/curados.json` con `status: pending-review`, aunque el archivo de entrada afirme estar aprobado. El administrador verifica nombre, sucursal, dirección, distrito, actividad y fuente. Solo después cambia a `approved` y agrega `reviewedAt` en formato ISO.

El flujo de ampliación conserva la base guardada. Para reconstruir también las altas manuales aprobadas y luego reponer las fuentes complementarias, ejecutar en una copia de trabajo y validar antes de publicar:

```sh
python3 scripts/catalogo.py
python3 scripts/ampliar_catalogo.py
python3 scripts/completar_guarulhos.py
```

No publicar únicamente la salida del primer paso si se desea conservar el catálogo combinado. Los scripts de ampliación no deben interpretarse como un censo actualizado en tiempo real.

## Publicación

GitHub Pages publica desde `main`. Los commits del token de Actions no disparan por sí solos otra compilación de Pages; un commit normal posterior publica los datos guardados. Esta versión no contrata servicios ni cambia automáticamente esa configuración.
