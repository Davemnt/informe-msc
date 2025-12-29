
# Informe del Sumo Consejo - Aplicación Web

Aplicación web profesional para la recepción y administración de informes institucionales, 100% basada en Firebase (Firestore + Hosting).

## 🚀 Características

- **Formulario dinámico** con lógica condicional completa
- **Sistema de administración** con autenticación Firebase
- **Registro automático** de fecha y agrupación por persona
- **Diseño profesional** responsive en tonos neutros con acentos naranja
- **Almacenamiento seguro en Firestore**

## 📋 Estructura del Proyecto

```
informe-sumo-consejo/
├── frontend/
│   ├── index.html        # Página de inicio
│   ├── formulario.html   # Formulario de informes
│   ├── admin.html        # Panel de administración
│   ├── css/              # Estilos
│   └── js/               # Lógica del frontend
├── functions/            # (Opcional, solo si usas Cloud Functions)
└── package.json
```

## 🛠️ Instalación y Uso

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Desplegar en Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

3. **Acceder a la aplicación:**
   - Frontend: `https://informe-msc.firebaseapp.com`

## 🔐 Administrador

- Acceso mediante autenticación Firebase (email y contraseña configurados en Firestore/Auth)
- Panel: `/admin.html`

## 🎨 Diseño

- **Paleta de colores:** Neutros (blanco, negro, grises) + naranja (botones)
- **Tipografía:** Sans-serif profesional
- **Layout:** Responsive para desktop y mobile
- **Componentes:** Cards con sombra suave, botones redondeados

## 📝 Funcionalidades

### Para Usuarios
- Envío de informes con datos personales
- Selección de organizaciones y unidades
- Formulario condicional inteligente
- Validaciones automáticas

### Para Administradores
- Visualización de todos los informes
- Agrupación por persona
- Filtros por fecha, organización y unidad
- Gestión completa del sistema

## 🔁 Preguntas Personalizadas (Firestore o fallback estático)

La aplicación soporta dos modos para las "preguntas personalizadas":

- Modo recomendado (dinámico): usar **Cloud Firestore** para almacenar la colección `preguntas`.
- Modo sin coste (hosting-only): la app usa un archivo estático `frontend/data/preguntas.json` como fallback.

Si no quieres activar Cloud Functions ni cambiar a Blaze, la aplicación funcionará con cero coste usando el fallback estático. Para usar Firestore (dinámico) sigue estas instrucciones:

1. En la consola de Firebase, activa Authentication y crea un usuario administrador (por ejemplo `admin@informe-msc.local`) con una contraseña (PIN).
2. En Firestore, crea una colección `preguntas` y añade documentos con los campos:
    - `texto` (string)
    - `tipo` (string: `texto`, `numero` o `fecha`)
    - `orden` (number)
    - `activa` (boolean)
3. (Opcional, recomendado) Crea una colección `admins` con un documento cuyo id sea el `uid` del usuario admin. Esto se usa para reglas de seguridad.
4. Ajusta las reglas de Firestore para permitir lectura pública de `preguntas` y operaciones de escritura solo a admins autenticados. Ejemplo mínimo:

```js
rules_version = '2';
service cloud.firestore {
   match /databases/{database}/documents {
      match /preguntas/{docId} {
         allow read: if true;
         allow create, update, delete: if request.auth != null
            && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
      }
      match /admins/{adminId} {
         allow read: if false;
         allow write: if false;
      }
   }
}
```

5. En el frontend la app ya intenta leer Firestore automáticamente (si `firebase-init.js` está presente y el SDK cargado). Si Firestore no está disponible, usa `frontend/data/preguntas.json`.

Ejemplo prellenado: `frontend/data/preguntas.json` contiene 3 preguntas de ejemplo para que la UI muestre contenido sin configuración adicional.

Si quieres, puedo añadir pasos detallados para crear el usuario admin y aplicar las reglas desde la consola.