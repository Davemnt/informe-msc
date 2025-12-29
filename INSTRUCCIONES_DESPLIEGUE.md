

# Instrucciones para Desplegar el Frontend en Firebase Hosting

Tu URL de Firebase es: **https://informe-msc.firebaseapp.com**

Sigue estos pasos para desplegar tu aplicación:

### Paso 1: Instalar Firebase Tools

```sh
npm install -g firebase-tools
```

### Paso 2: Iniciar sesión en Firebase

```sh
firebase login
```

### Paso 3: Desplegar tu Sitio

```sh
firebase deploy --only hosting
```

Una vez que el comando termine, tus archivos estarán disponibles en la URL de tu proyecto.

**¡Listo!** Podrás ver tu diseño visitando [https://informe-msc.firebaseapp.com](https://informe-msc.firebaseapp.com).
