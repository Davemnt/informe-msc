# Guía de Instalación y Configuración

## 📋 Requisitos Previos

- **Node.js** versión 16 o superior
- **npm** (viene incluido con Node.js)
- **Navegador web** moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalación Rápida

### 1. Clonar o descargar el proyecto

```bash
# Si tienes git instalado
git clone <url-del-repositorio>
cd informe-sumo-consejo

# O descomprimir si descargaste un ZIP
```

### Cambiar Puerto del Servidor
# Guía de Instalación y Configuración

## 📋 Requisitos Previos

- **Node.js** versión 16 o superior
- **npm** (viene incluido con Node.js)
- **Navegador web** moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalación Rápida

### 1. Clonar o descargar el proyecto

```bash
# Si tienes git instalado
git clone <url-del-repositorio>
cd informe-sumo-consejo

# O descomprimir si descargaste un ZIP
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Desplegar en Firebase Hosting

```bash
firebase deploy --only hosting
```

### 4. Acceder a la aplicación

Una vez desplegado, abrir en el navegador:

- **Frontend:** https://informe-msc.firebaseapp.com
- **Panel Administrativo:** https://informe-msc.firebaseapp.com/admin

## 🔐 Acceso Administrativo

- Acceso mediante autenticación Firebase (email y contraseña configurados en Firestore/Auth)

## 📁 Estructura de Archivos

```
PORT=8080
JWT_SECRET=tu-clave-secreta-muy-segura-aqui
```

### Backup de la Base de Datos

La base de datos SQLite se encuentra en `backend/informes.db`. Para hacer backup:

```bash
```
# Copiar el archivo de base de datos
cp backend/informes.db backup/informes_backup_$(date +%Y%m%d).db
```

### Personalizar Credenciales de Admin

Editar el archivo `backend/database.js`, buscar la línea:

```javascript
const defaultPassword = bcrypt.hashSync('admin123', 10);
```

Cambiar `'admin123'` por tu contraseña deseada.

## 🐛 Solución de Problemas

### Error: "Puerto en uso"

Si el puerto 3000 está ocupado:

```bash
# Cambiar puerto temporalmente
PORT=8080 npm start

# O crear archivo .env con PORT=8080
```

### Error: "Cannot find module"

Reinstalar dependencias:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error de conexión a base de datos

Verificar permisos de escritura en la carpeta `backend/`:

```bash
# Linux/Mac
chmod 755 backend/

# Windows (ejecutar como administrador)
icacls backend /grant Users:F
```

## 📱 Uso en Dispositivos Móviles

Para acceder desde otros dispositivos en la misma red:

1. Obtener la IP local de tu computadora
2. Iniciar el servidor: `npm start`
3. Acceder desde el móvil: `http://TU_IP:3000`

### Obtener IP local:

```bash
# Windows
ipconfig

# Linux/Mac
ifconfig | grep inet
```

## 🚀 Despliegue en Producción

### Opción 1: Servidor Propio

```bash
# Instalar pm2 globalmente
npm install -g pm2

# Iniciar con pm2
pm2 start backend/server.js --name "sumo-consejo"

# Configurar inicio automático
pm2 startup
pm2 save
```

### Opción 2: Heroku

1. Crear cuenta en Heroku
2. Instalar Heroku CLI
3. Ejecutar:

```bash
heroku create tu-app-sumo-consejo
git add .
git commit -m "Deploy inicial"
git push heroku main
```

## 📊 Mantenimiento

### Limpiar logs antiguos

```bash
# Si usas pm2
pm2 logs --lines 1000 > logs_backup.txt
pm2 flush
```

### Optimizar base de datos

```bash
# Conectar a SQLite directamente
sqlite3 backend/informes.db

# Ejecutar en SQLite
VACUUM;
.quit
```

## 🔧 Scripts Disponibles

```bash
# Iniciar en modo desarrollo
npm run dev

# Iniciar en producción
npm start

# Instalar dependencias
npm run install-deps
```

## 🔗 Integración con Firebase (Firestore + Auth)

Si deseas usar Firebase en lugar de SQLite/Backend, el proyecto ya incluye una integración cliente que escribe los informes en Firestore y permite autenticar el panel administrativo con Firebase Auth.

Pasos rápidos:

1. En la consola de Firebase, crea un proyecto (ej. `informe-msc`) y habilita **Firestore** y **Authentication → Email/Password**.
2. Crea una cuenta administrativa (por ejemplo `admin@tudominio.com`) en Authentication → Users.
3. En Firestore, crea una colección `informes` (no es obligatorio — se crea al primer guardado).
4. Reglas de seguridad mínimas (ajusta según tu política):

```rules
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		// Lectura/escritura para usuarios autenticados
		match /informes/{doc} {
			allow read, write: if request.auth != null;
		}
	}
}
```

5. En el frontend ya está incluido el SDK de Firebase (compat) y el archivo `frontend/js/firebase-init.js` con la configuración del proyecto. Si cambias la configuración, edítala en ese archivo.

6. Crear usuario administrador (PIN): en la consola Firebase → Authentication → Add user.

	- Email: `admin@informe-msc.local` (por defecto; puedes cambiar `adminEmail` en `frontend/js/firebase-init.js`)
	- Password: el PIN que quieras usar (ej. `1234`)

	El panel de administración pedirá únicamente el PIN y usará el email configurado.

7. Probar localmente:

```bash
npm run dev
```

Abrir `http://localhost:3000/formulario` y enviar un informe (se guardará en Firestore). Abrir `http://localhost:3000/admin`, iniciar sesión con el email creado y la contraseña, y deberías ver los informes desde Firestore.

Notas:
- El frontend usa la versión `-compat` del SDK para mantener compatibilidad con los scripts actuales.
- Si prefieres mantener la lógica en el servidor, en lugar de la integración cliente, puedes usar el Firebase Admin SDK en `backend/` (requiere una Key de Service Account y cambios en `backend/database.js`).


## 📞 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, crear un issue en el repositorio del proyecto con la siguiente información:

- Versión de Node.js: `node --version`
- Sistema operativo
- Descripción detallada del problema
- Pasos para reproducir el error
- Screenshots (si aplica)