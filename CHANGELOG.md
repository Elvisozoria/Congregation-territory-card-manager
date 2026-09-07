# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
versionado semántico. Cada PR contra `main` añade su entrada bajo un nuevo
encabezado de versión. Se despliega a GitHub Pages y Firebase Hosting en cada
merge.

## [2.5.0] - 2026-09-07

### Added

- Documentación al día: la guía de usuario estrena secciones para etiquetas,
  casas aproximadas, límite de la congregación, «qué toca ahora», registro S-13
  y varias congregaciones, y se reescriben asignar y completar, que ya no
  describían el flujo real. Los dos README recogen las funciones que faltaban y
  este changelog arranca aquí. `scripts/screenshots.sh` regenera las capturas de
  la guía, que cada rediseño dejaba desactualizadas. (#33)

### Changed

- Los mapas base vuelven al Voyager de CARTO en cuanto hay una llave en
  `VITE_CARTO_KEY`; sin ella la app sigue con los de Esri, que no piden
  registro. La llave gratuita cubre cinco millones de peticiones al mes y admite
  uso no comercial, así que una congregación no se acerca al límite. Nunca se
  queda sin mapa, que es lo que hace seguro desplegar sin la llave puesta. (#33)

## [2.4.0] - 2026-09-07

### Added

- «Qué toca ahora» al abrir la app: asignaciones que llevan más de dos meses
  fuera, territorios nunca trabajados y los que llevan más tiempo sin salir,
  cada uno con su botón al lado. Sólo aparece si hay algo que atender. Antes eso
  sólo salía leyendo el S-13 entero o recorriendo las fichas una por una. (#32)
- Asignar y completar desde la propia lista, sin abrir cada territorio: repartir
  cinco pasaba de quince clics y cinco idas y vueltas a cinco confirmaciones.
  (#32)
- Interruptor por territorio para imprimir el estimado de casas en la tarjeta,
  junto al del código QR. (#32)
- Las tarjetas se imprimen ordenadas por número, y con `#/print?tag=X` sale sólo
  ese sector; desde la lista aparece «Imprimir estos» cuando hay un filtro
  puesto. Un aviso nombra los territorios sin contorno, cuyas tarjetas saldrían
  vacías. (#32)

### Changed

- Se puede asignar un territorio a cualquier persona, tenga cuenta o no. En modo
  en línea sólo se podía elegir entre usuarios registrados, así que una
  congregación sin miembros dados de alta no podía asignar nada, y la mayoría de
  los publicadores no va a tener cuenta nunca. Ahora se escribe el nombre, con
  sugerencias de quien tiene cuenta y de quien ya trabajó territorios; el
  vínculo con el usuario se guarda cuando el nombre coincide con un miembro.
  (#32)
- El formulario de territorio es de dos columnas, con el mapa a un lado y un
  botón para verlo a pantalla completa; un territorio sin contorno abre
  directamente en modo dibujo, así que sobra el párrafo que explicaba dónde
  estaba el icono del pentágono. (#32)
- Configuración ordenada por uso: la congregación primero, la cuenta después, lo
  técnico al final. El bloque de contraseña sólo aparece en cuentas de correo y
  contraseña, no con sesión de Google. (#32)
- Rediseño visual: trece tamaños de fuente pasan a una escala de seis, los ocho
  radios de borde a tres, y el espacio a múltiplos de cuatro. Un solo azul en
  toda la app, el mismo con el que se dibuja el territorio en el mapa; antes
  había dos a un paso de distancia, uno para los botones y otro para el dato. El
  rojo se reserva para lo que destruye, así que cerrar sesión y el botón del
  S-13 lo pierden. Las secciones dejan de ser tarjetas para que la tarjeta
  signifique territorio. (#32)
- La ficha de la lista se reordena alrededor de lo que el ojo busca: el número
  manda, en cifras tabulares para que el 1 y el 10 queden alineados, el estado
  sube a su lado, la zona baja a la línea de datos y sólo una acción conserva
  peso. En la ficha del territorio «Volver» deja de ser un botón que competía
  con tres acciones reales y pasa a ser una miga de pan. (#32)
- «Limpiar S-13» pasa a «Empezar hoja nueva» y deja de ser rojo: no borra nada,
  lo anterior sigue en el historial de cada territorio. (#32)
- Los puntos de referencia se abren por defecto, porque su descripción es lo que
  orienta a quien no conoce la zona; los filtros del historial aparecen sólo
  cuando hay registros suficientes para que filtrar signifique algo. (#32)
- El mapa de la lista se puede plegar y la app recuerda la elección. (#32)

### Fixed

- Los nombres dejan de cortarse en la tabla y en el S-13, donde el nombre
  completo es la razón de ser del formulario. (#32)
- La tabla de miembros ya no se derrama fuera de su tarjeta, y el aviso de «no
  puedes cambiar tu propio rol» deja de ocupar una columna sin ancho partido
  letra por letra. (#32)
- Las fichas mantienen una sola línea de base cuando un nombre ocupa dos
  renglones, y un territorio sin contorno se marca en la lista. (#32)

## [2.3.0] - 2026-09-06

### Changed

- El mapa por defecto pasa al lienzo gris claro de Esri: el de calles trae
  relieve sombreado y una paleta beige que ensuciaba todas las vistas y enterraba
  los contornos, y en las tarjetas impresas se notaba de más. El de calles no
  desaparece, queda como capa a un clic, porque colorea las carreteras y en el
  campo eso a veces es lo que hace falta para ubicarse. (#31)

## [2.2.2] - 2026-09-06

### Fixed

- `npm install` fallaba en los dos workflows de despliegue: al fusionar dos
  ramas que habían editado el bloque `scripts`, la entrada `test` se quedó sin
  su coma final y el archivo dejó de ser JSON válido. Ningún arreglo de la
  versión anterior había llegado a producción. (#30)

## [2.2.1] - 2026-09-06

### Fixed

- Iniciar sesión se quedaba colgado en «...» al cerrar sesión y volver a entrar:
  cada arranque de la tienda de datos registraba un observador de sesión nuevo
  sin soltar el anterior, y con dos vivos el viejo daba la carga por lista y el
  nuevo ya no resolvía su promesa. Refrescar la página lo salvaba, que es
  justamente lo que se veía. (#29)
- El encuadre del mapa caía al nivel de zoom entero inferior y dejaba los
  territorios pequeños en medio de un mapa muy abierto; con zoom fraccionado el
  encuadre se ajusta de verdad. (#29)
- La tabla de miembros se salía de su tarjeta con nombres o correos largos.
  (#29)

## [2.2.0] - 2026-09-06

### Added

- Una misma cuenta puede llevar varias congregaciones, con un selector en
  Configuración para cambiar entre ellas sin cerrar sesión y un botón para crear
  otra. El perfil guarda un mapa de membresías y `congregationId` pasa a ser
  simplemente la activa, así que el resto de la app y las reglas de seguridad
  siguen leyendo los mismos campos. (#28)

### Fixed

- Cierra un agujero anterior a este cambio: la regla que dejaba a un
  administrador actualizar usuarios de su congregación también encajaba con su
  propio perfil, donde la comprobación de congregación siempre se cumple, así
  que cualquier admin podía moverse a otra congregación y ponerse el rol que
  quisiera. (#28)
- Una invitación para alguien que ya pertenece a una congregación dejaba de
  sobrescribir su perfil, cosa que le borraba la que ya llevaba. (#28)

## [2.1.1] - 2026-09-06

### Fixed

- Al importar un KML se descartaba la descripción de cada zona, que es donde
  Google Earth y las herramientas de mapas guardan el texto libre y, en un
  territorio rural, las comunidades que lo componen. Ahora se conserva como
  notas, y las escritas a mano nunca se pisan al reimportar. (#27)

## [2.1.0] - 2026-09-06

### Added

- Límite de la congregación: se sube el KML o KMZ que da la sucursal y se dibuja
  sobre los mapas como guía al trazar territorios, con los cuatro linderos
  escritos que trae el archivo. Es orientación, nunca restricción: se pueden
  crear territorios fuera de la línea, porque los linderos reales no siempre
  coinciden con el trazo. (#26)
- Etiquetas en lugar del campo de grupo único. Un territorio puede llevar
  varias, y la lista filtra acumulando condiciones y agrupa por ellas. No hay
  colección de etiquetas detrás: el catálogo se deriva de las que están en uso,
  así que no hay huérfanas ni pantalla que administrar. El grupo anterior pasa a
  ser la primera etiqueta. (#26)
- Casas aproximadas por territorio, con ordenación por ese número, para repartir
  la carga parejo y saber si un territorio es una salida o tres. (#26)

## Historial anterior

Ver `git log` — el changelog arranca en la versión 2.1.0, del 6 de septiembre
de 2026.
