
# Instrucciones para Desplegar el Frontend en Firebase Hosting

Hola. Como no puedo ejecutar los comandos de despliegue por ti, aquí tienes los pasos para que puedas subir tu diseño a Firebase y verlo en la URL pública.

Tu URL de Firebase es: **https://informe-msc.firebaseapp.com**

Sigue estos pasos en tu propia terminal para desplegar los archivos de la carpeta `frontend`:

### Paso 1: Instalar Firebase Tools

Si no lo has hecho antes, necesitas instalar las herramientas de Firebase de forma global en tu computadora.

```sh
npm install -g firebase-tools
```

### Paso 2: Iniciar sesión en Firebase

Ejecuta este comando. Se abrirá una ventana en tu navegador para que inicies sesión con tu cuenta de Google.

```sh
firebase login
```

### Paso 3: Inicializar Firebase en tu Proyecto

Una vez que hayas iniciado sesión, ve a la raíz de tu proyecto en la terminal (`c:\Users\monte\OneDrive\Escritorio\Informe MSC\informe-sumo-consejo`) y ejecuta:

```sh
firebase init hosting
```

Durante el proceso, te hará algunas preguntas:

*   **? What do you want to use as your public directory?**
    *   Escribe: `frontend` y presiona Enter. (Esta es la carpeta que contiene tu diseño).

*   **? Configure as a single-page app (rewrite all urls to /index.html)?**
    *   Escribe: `N` (No) y presiona Enter.

*   **? Set up automatic builds and deploys with GitHub?**
    *   Escribe: `N` (No) y presiona Enter.

*   **? File frontend/index.html already exists. Overwrite?**
    *   Si te pregunta esto, escribe `N` (No) para no sobreescribir tus archivos.

### Paso 4: Desplegar tu Sitio

Finalmente, ejecuta este comando para subir tus archivos a Firebase.

```sh
firebase deploy --only hosting
```

Una vez que el comando termine, tus archivos estarán disponibles en la URL de tu proyecto.

**¡Listo!** Podrás ver tu diseño visitando [https://informe-msc.firebaseapp.com](https://informe-msc.firebaseapp.com).
