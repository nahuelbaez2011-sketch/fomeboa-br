# Catálogo de FomeBoa SP

## Alcance

El catálogo compartido no equivale a todos los negocios de Google Maps ni a un censo comercial completo. Importa establecimientos de OpenStreetMap dentro del rectángulo urbano definido en `scripts/catalogo.py`, los asigna a los polígonos distritales existentes y consulta Guarulhos por su área administrativa. No incluye estrellas, reseñas ni fotos copiadas de Google.

Cada registro conserva su fuente. Los lugares sin nombre en OSM se identifican explícitamente como «nombre sin registrar»; no se les inventa una marca. La existencia en una base de datos tampoco garantiza que el local siga abierto.

## Tres entradas

1. **Catálogo compartido**: el proceso `Catalogo gastronomico` importa datos abiertos y guarda `catalogo/todos.json`, archivos por distrito y `catalogo/manifest.json`. El mapa carga el archivo de la zona en vez de repetir consultas al proveedor por cada visitante. Si no hay archivo disponible, conserva la consulta anterior por zona.
2. **Propuesta individual**: el botón `Agregar un local faltante` guarda un borrador SOLO en el navegador. El usuario puede abrir un issue precompletado en GitHub y enviarlo (requiere cuenta; su contenido será público), o exportar las propuestas en JSON. No hay envío silencioso a un servidor ni publicación automática de propuestas.
3. **Importación por lotes**: el navegador acepta CSV o JSON de hasta 2 MB y 2000 filas, valida campos y avisa de duplicados y rechazos. La lista queda pendiente y local. Para incorporarla al repositorio, un administrador importa el archivo exportado con el comando indicado abajo.

## Formato de importación

Columnas obligatorias, respetando mayúsculas: `name,type,zone,address,sourceUrl`.
Columna opcional: `cuisine`.

Tipos: `restaurant`, `cafe`, `bar`, `pub`, `fast_food`, `food_court`, `bakery`, `pastry`, `coffee`, `ice_cream`, `biergarten`, `confectionery`, `deli`.

`zone` debe coincidir con un distrito cargado (por ejemplo Cambuci o Vila Mariana) o con Guarulhos. `sourceUrl` debe apuntar a una fuente verificable, preferentemente la web oficial del local o datos proporcionados con permiso. No aportar datos personales, imágenes o reseñas ajenas.

JSON admite una lista de objetos o `{ "schemaVersion": 1, "venues": [...] }`.

## Revisión y publicación

```sh
python3 scripts/catalogo.py --import-file propuestas.json
# También acepta CSV con separador coma:
python3 scripts/catalogo.py --import-file propuestas.csv
```

La importación administrativa deja todo en `catalogo/curados.json` con `status: pending-review`, aunque el archivo entrante afirme estar aprobado. El administrador verifica nombre, sucursal, dirección, distrito, estado de actividad y fuente. Solo después cambia el estado a `approved` y agrega `reviewedAt` en fecha ISO. Las entradas pendientes no entran en el catálogo público.

Subir el archivo revisado dispara la reconstrucción. También se puede ejecutar `Catalogo gastronomico` mediante `Run workflow`. No se ha programado un rastreo periódico.

El proceso conserva el catálogo anterior si falla la consulta principal, y no sustituye una base válida por una respuesta vacía o incompleta. Si falla Guarulhos, lo indica en el manifiesto y conserva los datos anteriores disponibles de ese municipio.

## Publicación en GitHub Pages

La configuración existente publica desde `main`. Los commits realizados solo con `GITHUB_TOKEN` no disparan otra compilación de Pages. Después de una reconstrucción, un commit normal al repositorio publica los cambios; alternativamente, el propietario puede cambiar Pages a un flujo de despliegue de Actions. Esta versión no cambia automáticamente la configuración de Pages ni contrata servicios.

## Calidad

El identificador OSM elimina repeticiones del mismo objeto; también se detectan coincidencias de nombre, dirección y zona. Las sucursales de una cadena no se fusionan solo porque comparten nombre. La revisión humana sigue siendo necesaria ante registros ambiguos o sin dirección.

Los datos derivados de OSM se publican con atribución a sus colaboradores y referencia a ODbL 1.0. Toda cifra visible representa registros cargados, no cobertura total de la ciudad.
