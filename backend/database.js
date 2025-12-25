const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'informes.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error al conectar con la base de datos:', err);
          reject(err);
        } else {
          console.log('✅ Conectado a la base de datos SQLite');
          this.initializeTables().then(resolve).catch(reject);
        }
      });
    });
  }

  initializeTables() {
    return new Promise((resolve, reject) => {
      // Tabla de administradores
      const createAdminTable = `
        CREATE TABLE IF NOT EXISTS administradores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Tabla de informes
      const createInformesTable = `
        CREATE TABLE IF NOT EXISTS informes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          fecha_informe DATETIME DEFAULT CURRENT_TIMESTAMP,
          tiene_organizaciones BOOLEAN DEFAULT 0,
          organizaciones TEXT,
          tiene_unidades BOOLEAN DEFAULT 0,
          unidades TEXT,
          futuros_elderes TEXT,
          trabajo_futuros_elderes BOOLEAN DEFAULT 0,
          reunion_presidencia BOOLEAN DEFAULT 0,
          entrevistas_ministracion BOOLEAN DEFAULT 0,
          informe_detallado TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.serialize(() => {
        this.db.run(createAdminTable, (err) => {
          if (err) {
            console.error('Error creando tabla administradores:', err);
            reject(err);
            return;
          }
        });

        this.db.run(createInformesTable, (err) => {
          if (err) {
            console.error('Error creando tabla informes:', err);
            reject(err);
            return;
          }
        });

        // Insertar admin por defecto
        const insertAdmin = `
          INSERT OR IGNORE INTO administradores (usuario, password) 
          VALUES (?, ?)
        `;
        
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        
        this.db.run(insertAdmin, ['admin', defaultPassword], (err) => {
          if (err) {
            console.error('Error insertando admin por defecto:', err);
          } else {
            console.log('✅ Admin por defecto creado (usuario: admin, password: admin123)');
          }
          resolve();
        });
      });
    });
  }

  // Métodos para informes
  createInforme(data) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO informes (
          nombre, apellido, tiene_organizaciones, organizaciones,
          tiene_unidades, unidades, futuros_elderes, trabajo_futuros_elderes,
          reunion_presidencia, entrevistas_ministracion, informe_detallado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.nombre,
        data.apellido,
        data.tiene_organizaciones ? 1 : 0,
        JSON.stringify(data.organizaciones || []),
        data.tiene_unidades ? 1 : 0,
        JSON.stringify(data.unidades || []),
        JSON.stringify(data.futuros_elderes || []),
        data.trabajo_futuros_elderes ? 1 : 0,
        data.reunion_presidencia ? 1 : 0,
        data.entrevistas_ministracion ? 1 : 0,
        data.informe_detallado || ''
      ];

      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...data });
        }
      });
    });
  }

  getAllInformes() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM informes 
        ORDER BY created_at DESC
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parsear los campos JSON
          const informes = rows.map(row => ({
            ...row,
            organizaciones: JSON.parse(row.organizaciones || '[]'),
            unidades: JSON.parse(row.unidades || '[]'),
            futuros_elderes: JSON.parse(row.futuros_elderes || '[]'),
            tiene_organizaciones: row.tiene_organizaciones === 1,
            tiene_unidades: row.tiene_unidades === 1,
            trabajo_futuros_elderes: row.trabajo_futuros_elderes === 1,
            reunion_presidencia: row.reunion_presidencia === 1,
            entrevistas_ministracion: row.entrevistas_ministracion === 1
          }));
          resolve(informes);
        }
      });
    });
  }

  getInformesByPerson() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          nombre || ' ' || apellido as persona,
          COUNT(*) as total_informes,
          MAX(fecha_informe) as ultimo_informe,
          MIN(fecha_informe) as primer_informe,
          GROUP_CONCAT(id) as ids_informes
        FROM informes 
        GROUP BY LOWER(nombre), LOWER(apellido)
        ORDER BY ultimo_informe DESC
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getInformesByFilter(filtros) {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM informes WHERE 1=1`;
      const params = [];

      if (filtros.fecha_inicio) {
        query += ` AND date(fecha_informe) >= date(?)`;
        params.push(filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        query += ` AND date(fecha_informe) <= date(?)`;
        params.push(filtros.fecha_fin);
      }

      if (filtros.organizacion) {
        query += ` AND organizaciones LIKE ?`;
        params.push(`%${filtros.organizacion}%`);
      }

      if (filtros.unidad) {
        query += ` AND unidades LIKE ?`;
        params.push(`%${filtros.unidad}%`);
      }

      query += ` ORDER BY created_at DESC`;

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const informes = rows.map(row => ({
            ...row,
            organizaciones: JSON.parse(row.organizaciones || '[]'),
            unidades: JSON.parse(row.unidades || '[]'),
            futuros_elderes: JSON.parse(row.futuros_elderes || '[]'),
            tiene_organizaciones: row.tiene_organizaciones === 1,
            tiene_unidades: row.tiene_unidades === 1,
            trabajo_futuros_elderes: row.trabajo_futuros_elderes === 1,
            reunion_presidencia: row.reunion_presidencia === 1,
            entrevistas_ministracion: row.entrevistas_ministracion === 1
          }));
          resolve(informes);
        }
      });
    });
  }

  // Método para autenticación
  getAdminByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM administradores WHERE usuario = ?`;
      
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = Database;