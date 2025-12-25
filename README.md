# Informe del Sumo Consejo - Aplicación Web

Una aplicación web profesional para la recepción y administración de informes institucionales.

## 🚀 Características

- **Formulario dinámico** con lógica condicional completa
- **Sistema de administración** con autenticación
- **Registro automático** de fecha y agrupación por persona
- **Diseño profesional** responsive en tonos neutros con acentos naranja
- **Base de datos SQLite** para almacenamiento local

## 📋 Estructura del Proyecto

```
informe-sumo-consejo/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── database.js        # Configuración de SQLite
│   ├── routes/           # Endpoints de la API
│   └── models/           # Modelos de datos
├── frontend/
│   ├── index.html        # Página de inicio
│   ├── formulario.html   # Formulario de informes
│   ├── admin.html        # Panel de administración
│   ├── css/              # Estilos
│   └── js/               # Lógica del frontend
└── package.json
```

## 🛠️ Instalación y Uso

1. **Instalar dependencias:**
   ```bash
   npm run install-deps
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

3. **Iniciar en producción:**
   ```bash
   npm start
   ```

4. **Acceder a la aplicación:**
   - Frontend: `http://localhost:3000`
   - API Backend: `http://localhost:3000/api`

## 🔐 Administrador

- **Usuario:** admin
- **Contraseña:** admin123
- **Panel:** `/admin.html`

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