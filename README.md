[English](README.en.md)

# Tarjetas de Territorio — Gestor para Congregaciones

Una aplicación web gratuita y de código abierto para gestionar, asignar e imprimir tarjetas de territorio para congregaciones. Funciona en dos modos: **sin conexión** (datos en tu navegador) o **en línea** (Firebase, datos compartidos en tiempo real).

**[Usar la aplicación ahora](https://elvisozoria.github.io/Congregation-territory-card-manager/)** — no requiere instalación, funciona directo desde el navegador.

![Vista principal con territorios](docs/screenshots/main-territories-dark.png)

## Video Tutorial

Mira el tutorial completo donde se explica cada función paso a paso:

- [Ver en YouTube](https://youtu.be/vCRbdb3Vsfw)
- [Ver en Delonix Videos](https://videos.delonix.io/recordings/wrgPabe7elLTCmFBIQbW)

## Documentación Completa

La [Guía de Usuario](https://elvisozoria.github.io/Congregation-territory-card-manager/docs/guia-de-usuario.html) incluye instrucciones detalladas con capturas de pantalla para todas las funciones: crear territorios, asignar, imprimir tarjetas, gestionar roles y más.

## Funcionalidades

- **Gestión de territorios** — Crea, edita y elimina territorios con polígonos sobre un mapa interactivo (Leaflet)
- **Puntos de referencia** — Marcadores de colores en el mapa para ubicar lugares clave
- **Manzanas** — Etiquetas numeradas para bloques de calles dentro del territorio
- **Asignaciones** — Asigna territorios a publicadores con historial completo de trabajo
- **Tarjetas imprimibles** — Vista de tarjeta con mapa, polígono, referencias y QR opcional
- **Descarga PNG** — Descarga tarjetas como imágenes de alta resolución (2x)
- **Imprimir todo** — Renderiza todas las tarjetas para impresión masiva
- **Compartir** — Links públicos para compartir territorios sin necesidad de cuenta
- **Roles y permisos** — Tres niveles: Administrador, Conductor, Publicador
- **Importar KML/KMZ** — Importa polígonos desde Google Earth
- **Bilingue** — Interfaz en español e inglés
- **Tema claro/oscuro** — Con persistencia en localStorage

## Cómo Usar

### Opción 1: Usar en línea (recomendado)

Abre **[elvisozoria.github.io/Congregation-territory-card-manager](https://elvisozoria.github.io/Congregation-territory-card-manager/)** y listo. Puedes elegir modo offline (datos en tu navegador) o crear una cuenta con Google para sincronizar datos con tu congregación.

### Opción 2: Descargar y usar en tu computadora

1. Descarga o clona este repositorio
2. Ejecuta `npm install && npm run build`
3. Abre `dist/index.html` en tu navegador

Puedes modificar el código como quieras y adaptarlo a las necesidades de tu congregación.

## Guardar tus Datos

- **Guardar JSON** — Descarga todos los territorios, puntos e historial como archivo JSON
- **Cargar JSON** — Restaura datos desde un archivo guardado
- **Importar KML** — Importa polígonos de Google Earth

## Stack Tecnológico

- Vanilla JavaScript con Vite (bundler)
- Leaflet.js + Leaflet.draw (mapas y polígonos)
- Firebase Auth + Firestore (modo online)
- html-to-image (exportación PNG)
- qrcode (generación de códigos QR)
- JSZip (extracción de KMZ)

## Contribuir

Este es un proyecto de código abierto y todas las contribuciones son bienvenidas. Si tienes ideas para nuevas funcionalidades, encuentras un error, o quieres mejorar el código:

- Abre un [issue](https://github.com/Elvisozoria/Congregation-territory-card-manager/issues) para reportar errores o solicitar funcionalidades
- Envía un pull request con tus cambios
- Haz un fork y adáptalo a las necesidades de tu congregación

## Licencia

MIT
