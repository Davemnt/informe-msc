const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Database = require('./database');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.db = new Database();
    this.jwtSecret = process.env.JWT_SECRET || 'sumo-consejo-secret-key-2024';
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeDatabase();
  }

  initializeMiddleware() {
    // Seguridad
    this.app.use(helmet({
      contentSecurityPolicy: false // Para permitir estilos inline
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // límite de 100 requests por ventana por IP
      message: 'Demasiadas solicitudes desde esta IP'
    });
    this.app.use('/api', limiter);

    // CORS
    this.app.use(cors());

    // Parser JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir archivos estáticos
    this.app.use(express.static(path.join(__dirname, '../frontend')));
  }

  initializeRoutes() {
    // Middleware de autenticación
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
      }

      jwt.verify(token, this.jwtSecret, (err, user) => {
        if (err) {
          return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
      });
    };

    // 🔐 RUTAS DE AUTENTICACIÓN
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
          return res.status(400).json({ 
            error: 'Usuario y contraseña son requeridos' 
          });
        }

        const admin = await this.db.getAdminByUsername(usuario);
        
        if (!admin) {
          return res.status(401).json({ 
            error: 'Credenciales inválidas' 
          });
        }

        const passwordValid = await bcrypt.compare(password, admin.password);
        
        if (!passwordValid) {
          return res.status(401).json({ 
            error: 'Credenciales inválidas' 
          });
        }

        const token = jwt.sign(
          { id: admin.id, usuario: admin.usuario },
          this.jwtSecret,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login exitoso',
          token,
          usuario: admin.usuario
        });

      } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
          error: 'Error interno del servidor' 
        });
      }
    });

    // 📝 RUTAS DE INFORMES
    this.app.post('/api/informes', async (req, res) => {
      try {
        const {
          nombre,
          apellido,
          tiene_organizaciones,
          organizaciones,
          tiene_unidades,
          unidades,
          futuros_elderes,
          trabajo_futuros_elderes,
          reunion_presidencia,
          entrevistas_ministracion,
          informe_detallado
        } = req.body;

        // Validaciones básicas
        if (!nombre || !apellido) {
          return res.status(400).json({ 
            error: 'Nombre y apellido son obligatorios' 
          });
        }

        // Validación condicional: informe detallado obligatorio si tiene unidades
        if (tiene_unidades && !informe_detallado?.trim()) {
          return res.status(400).json({ 
            error: 'El informe detallado es obligatorio cuando tiene unidades asignadas' 
          });
        }

        const informeData = {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          tiene_organizaciones: !!tiene_organizaciones,
          organizaciones: organizaciones || [],
          tiene_unidades: !!tiene_unidades,
          unidades: unidades || [],
          futuros_elderes: futuros_elderes || [],
          trabajo_futuros_elderes: !!trabajo_futuros_elderes,
          reunion_presidencia: !!reunion_presidencia,
          entrevistas_ministracion: !!entrevistas_ministracion,
          informe_detallado: informe_detallado?.trim() || ''
        };

        const nuevoInforme = await this.db.createInforme(informeData);
        
        res.status(201).json({
          message: 'Informe creado exitosamente',
          informe: nuevoInforme
        });

      } catch (error) {
        console.error('Error creando informe:', error);
        res.status(500).json({ 
          error: 'Error interno del servidor' 
        });
      }
    });

    // 📊 RUTAS DE ADMINISTRACIÓN (requieren autenticación)
    this.app.get('/api/admin/informes', authenticateToken, async (req, res) => {
      try {
        const informes = await this.db.getAllInformes();
        res.json({ informes });
      } catch (error) {
        console.error('Error obteniendo informes:', error);
        res.status(500).json({ 
          error: 'Error interno del servidor' 
        });
      }
    });

    this.app.get('/api/admin/informes/agrupados', authenticateToken, async (req, res) => {
      try {
        const informesAgrupados = await this.db.getInformesByPerson();
        res.json({ informes: informesAgrupados });
      } catch (error) {
        console.error('Error obteniendo informes agrupados:', error);
        res.status(500).json({ 
          error: 'Error interno del servidor' 
        });
      }
    });

    this.app.get('/api/admin/informes/filtrar', authenticateToken, async (req, res) => {
      try {
        const { fecha_inicio, fecha_fin, organizacion, unidad } = req.query;
        
        const filtros = {};
        if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
        if (fecha_fin) filtros.fecha_fin = fecha_fin;
        if (organizacion) filtros.organizacion = organizacion;
        if (unidad) filtros.unidad = unidad;

        const informes = await this.db.getInformesByFilter(filtros);
        res.json({ informes });
      } catch (error) {
        console.error('Error filtrando informes:', error);
        res.status(500).json({ 
          error: 'Error interno del servidor' 
        });
      }
    });

    // 🏠 RUTAS DE PÁGINAS
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });

    this.app.get('/formulario', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/formulario.html'));
    });

    this.app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/admin.html'));
    });

    // ❌ RUTA 404
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Ruta no encontrada' 
      });
    });

    // ⚠️ MANEJO DE ERRORES
    this.app.use((error, req, res, next) => {
      console.error('Error no manejado:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    });
  }

  async initializeDatabase() {
    try {
      await this.db.connect();
      console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando la base de datos:', error);
      process.exit(1);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`
🚀 Servidor iniciado correctamente
📍 Puerto: ${this.port}
🌐 URL: http://localhost:${this.port}
📝 Formulario: http://localhost:${this.port}/formulario
👨‍💼 Admin: http://localhost:${this.port}/admin
      `);
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Inicializar servidor
const server = new Server();
server.start();

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close();
  process.exit(0);
});

module.exports = Server;