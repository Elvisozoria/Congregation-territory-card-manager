# Congregation Territory Card Manager

Aplicacion para gestionar tarjetas de territorios de congregaciones. Los territorios se definen dibujando poligonos en un mapa interactivo y cada uno se puede ver como una tarjeta imprimible con mapa y codigo QR opcional.

## Capturas de pantalla

### Pagina principal — Lista de territorios con mapa

![Pagina principal](docs/screenshots/01-index.png)

Muestra todos los territorios en una tabla y en un mapa interactivo con poligonos de colores. Desde aqui puedes crear, editar o ver la tarjeta de cada territorio.

### Crear nuevo territorio

![Nuevo territorio](docs/screenshots/02-new-territory.png)

Formulario para crear un territorio nuevo. Dibuja el poligono directamente en el mapa usando las herramientas de dibujo.

### Ver territorio con landmarks

![Ver territorio](docs/screenshots/03-show-territory.png)

Vista de un territorio individual con su poligono en el mapa. Puedes hacer clic en el mapa para agregar puntos de referencia (landmarks) con colores.

### Tarjeta imprimible

![Tarjeta](docs/screenshots/04-card-view.png)

Tarjeta lista para imprimir o descargar como imagen PNG. Incluye el mapa del territorio, nombre, numero y codigo QR.

### Imprimir todas las tarjetas

![Imprimir todas](docs/screenshots/05-print-all.png)

Vista con todas las tarjetas para imprimir en lote.

---

## Requisitos previos

Antes de instalar la aplicacion necesitas tener instalado lo siguiente en tu computadora:

### 1. Ruby (version 3.1 o superior)

Ruby es el lenguaje de programacion que usa la aplicacion.

- **Mac:** Viene preinstalado pero puede ser una version vieja. Se recomienda instalar con [rbenv](https://github.com/rbenv/rbenv#installation):
  ```bash
  brew install rbenv ruby-build
  rbenv install 3.1.3
  rbenv global 3.1.3
  ```
- **Windows:** Usa [RubyInstaller](https://rubyinstaller.org/) — descarga el instalador y sigue los pasos.
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update
  sudo apt install rbenv ruby-build
  rbenv install 3.1.3
  rbenv global 3.1.3
  ```

Para verificar que Ruby esta instalado, abre una terminal y escribe:
```bash
ruby --version
```
Deberia mostrar algo como `ruby 3.1.3`.

### 2. Rails 7

Rails es el framework web que usa la aplicacion. Una vez instalado Ruby, instala Rails:

```bash
gem install rails -v '~> 7.0'
```

Guia oficial de instalacion: [https://guides.rubyonrails.org/getting_started.html](https://guides.rubyonrails.org/getting_started.html)

### 3. PostgreSQL

PostgreSQL es la base de datos que usa la aplicacion.

- **Mac:**
  ```bash
  brew install postgresql@14
  brew services start postgresql@14
  ```
  O descarga [Postgres.app](https://postgresapp.com/) que es mas facil — solo arrastra a Aplicaciones y abrela.

- **Windows:** Descarga el instalador de [postgresql.org/download](https://www.postgresql.org/download/windows/) y sigue el asistente. Recuerda la contraseña que pongas.

- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt install postgresql postgresql-contrib libpq-dev
  sudo systemctl start postgresql
  ```

### 4. Git

Git es para descargar el codigo de la aplicacion.

- **Mac:** Viene preinstalado. Si no, instala con `brew install git`.
- **Windows:** Descarga de [git-scm.com](https://git-scm.com/download/win).
- **Linux:** `sudo apt install git`

### 5. Homebrew (solo Mac)

Si usas Mac y no tienes Homebrew, instalalo primero:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## Instalacion paso a paso

### Paso 1: Descargar el codigo

Abre una terminal y ejecuta:

```bash
git clone https://github.com/TU-USUARIO/congregation-territory-card-manager.git
cd congregation-territory-card-manager
```

> Reemplaza `TU-USUARIO` con el nombre de usuario de GitHub donde esta el repositorio.

### Paso 2: Instalar dependencias de Ruby

Dentro de la carpeta del proyecto, ejecuta:

```bash
bundle install
```

Si ves un error sobre `pg`, asegurate de que PostgreSQL esta instalado y corriendo.

### Paso 3: Crear la base de datos

```bash
bin/rails db:create
bin/rails db:migrate
```

Esto crea las tablas necesarias (territorios y landmarks) en PostgreSQL.

### Paso 4: Iniciar el servidor

```bash
bin/rails server
```

### Paso 5: Abrir en el navegador

Abre tu navegador y ve a:

```
http://localhost:3000
```

Ya puedes empezar a crear territorios.

---

## Como usar la aplicacion

### Crear un territorio

1. En la pagina principal, haz clic en **"New Territory"**
2. Llena los campos:
   - **Number:** Numero del territorio (ej: "1", "2", "3")
   - **Name:** Nombre del territorio (ej: "Centro", "Norte")
   - **Group:** Nombre del grupo (opcional)
   - **QR Link:** URL para el codigo QR (opcional — si lo dejas vacio, se genera un link a Google Maps automaticamente)
3. Dibuja el poligono del territorio en el mapa:
   - Haz clic en el icono de poligono en la barra de herramientas del mapa
   - Haz clic en el mapa para cada punto del poligono
   - Haz clic en el primer punto para cerrar el poligono
4. Haz clic en **"Create Territory"**

### Agregar landmarks (puntos de referencia)

1. Ve a la pagina de un territorio (haz clic en su nombre en la lista)
2. Haz clic en cualquier punto del mapa
3. Escribe el nombre del punto de referencia (ej: "Farmacia", "Escuela")
4. El punto se agrega automaticamente con un color diferente

### Ver e imprimir tarjetas

1. En la lista de territorios, haz clic en **"Card"** junto al territorio que quieres
2. Para descargar como imagen: haz clic en **"Download PNG"**
3. Para imprimir: haz clic en **"Print"**
4. Para imprimir todas las tarjetas de una vez: haz clic en **"Print All Cards"** en la pagina principal

### Importar territorios desde Google Earth (KML)

Si tienes territorios dibujados en Google Earth, puedes importarlos:

1. En Google Earth, exporta tus territorios como archivo `.kml` o `.kmz`
2. Copia el archivo a la carpeta del proyecto
3. Ejecuta en la terminal:
   ```bash
   bin/rails territories:import_kml[ruta/al/archivo.kml]
   ```

---

## Solucion de problemas comunes

### "Could not find gem 'pg'" o error al instalar pg

PostgreSQL no esta instalado o no se encuentra. Instala PostgreSQL siguiendo los pasos de la seccion de requisitos.

### "FATAL: role 'tu_usuario' does not exist"

Necesitas crear un usuario en PostgreSQL:
```bash
sudo -u postgres createuser --superuser $(whoami)
```

### El mapa no carga o se ve gris

Verifica que tienes conexion a internet. Los tiles del mapa se cargan desde OpenStreetMap y requieren internet.

### "Address already in use" al iniciar el servidor

Otro proceso esta usando el puerto 3000. Puedes usar otro puerto:
```bash
bin/rails server -p 3001
```
Y luego abre `http://localhost:3001` en el navegador.

---

## Referencia tecnica

### Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Backend | Ruby on Rails 7 |
| Base de datos | PostgreSQL |
| Frontend | Hotwire (Turbo + Stimulus) |
| Mapas | Leaflet.js + Leaflet.draw |
| Exportar PNG | html2canvas |
| Codigo QR | qrcodejs |
| JavaScript | Importmap (no requiere Node.js) |

### Rutas principales

| Ruta | Descripcion |
|------|-------------|
| `GET /` | Pagina principal con lista y mapa de territorios |
| `GET /territories/new` | Crear nuevo territorio |
| `GET /territories/:id` | Ver territorio con landmarks |
| `GET /territories/:id/card` | Tarjeta imprimible del territorio |
| `GET /print` | Todas las tarjetas para imprimir en lote |
