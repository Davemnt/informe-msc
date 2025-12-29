const sqlite3 = require("sqlite3").verbose();

/**
 * Database class for managing SQLite operations
 */
class Database {
  /**
   * Constructor
   */
  constructor() {
    this.db = null;
  }

  /**
   * Update a question
   * @param {Object} params - Question parameters
   * @return {Promise} Promise with updated question
   */
  updatePregunta({id, texto, tipo, orden, activa}) {
    return new Promise((resolve, reject) => {
      const query =
        "UPDATE preguntas SET texto = ?, tipo = ?, orden = ?, " +
        "activa = ? WHERE id = ?";
      this.db.run(query, [texto, tipo, orden, activa, id], (err) => {
        if (err) reject(err);
        else resolve({id, texto, tipo, orden, activa});
      });
    });
  }

  /**
   * Delete a question
   * @param {number} id - Question ID
   * @return {Promise} Promise with deleted question ID
   */
  deletePregunta(id) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM preguntas WHERE id = ?";
      this.db.run(query, [id], (err) => {
        if (err) reject(err);
        else resolve({id});
      });
    });
  }

  /**
   * Connect to database
    * @return {Promise} Promise resolving when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = __dirname + "/informes.db";
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Error al conectar con la base de datos:", err);
          reject(err);
        } else {
          console.log("✅ Conectado a la base de datos SQLite");
          this.initializeTables().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * Initialize database tables
   * @return {Promise} Promise resolving when tables are created
   */
  initializeTables() {
    return new Promise((resolve, reject) => {
      const createAdminTable =
        "CREATE TABLE IF NOT EXISTS administradores (\n" +
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "  usuario TEXT UNIQUE NOT NULL,\n" +
        "  password TEXT NOT NULL,\n" +
        "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n" +
        ")";
      const createInformesTable =
        "CREATE TABLE IF NOT EXISTS informes (\n" +
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "  nombre TEXT NOT NULL,\n" +
        "  apellido TEXT NOT NULL,\n" +
        "  fecha_informe DATETIME DEFAULT CURRENT_TIMESTAMP,\n" +
        "  tiene_organizaciones BOOLEAN DEFAULT 0,\n" +
        "  organizaciones TEXT,\n" +
        "  tiene_unidades BOOLEAN DEFAULT 0,\n" +
        "  unidades TEXT,\n" +
        "  futuros_elderes TEXT,\n" +
        "  trabajo_futuros_elderes BOOLEAN DEFAULT 0,\n" +
        "  reunion_presidencia BOOLEAN DEFAULT 0,\n" +
        "  entrevistas_ministracion BOOLEAN DEFAULT 0,\n" +
        "  informe_detallado TEXT,\n" +
        "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n" +
        ")";
      const createPreguntasTable =
        "CREATE TABLE IF NOT EXISTS preguntas (\n" +
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "  texto TEXT NOT NULL,\n" +
        "  tipo TEXT DEFAULT \"texto\",\n" +
        "  orden INTEGER DEFAULT 0,\n" +
        "  activa BOOLEAN DEFAULT 1,\n" +
        "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n" +
        ")";
      this.db.serialize(() => {
        this.db.run(createAdminTable, (err) => {
          if (err) {
            console.error("Error creando tabla administradores:", err);
            reject(err);
            return;
          }
        });
        this.db.run(createInformesTable, (err) => {
          if (err) {
            console.error("Error creando tabla informes:", err);
            reject(err);
            return;
          }
        });
        this.db.run(createPreguntasTable, (err) => {
          if (err) {
            console.error("Error creando tabla preguntas:", err);
            reject(err);
            return;
          }
        });
        const insertAdmin =
          "INSERT OR IGNORE INTO administradores (usuario, password) " +
          "VALUES (?, ?)";
        const bcrypt = require("bcryptjs");
        const defaultPassword = bcrypt.hashSync("admin123", 10);
        this.db.run(insertAdmin, ["admin", defaultPassword], (err) => {
          if (err) {
            console.error("Error insertando admin por defecto:", err);
          } else {
            console.log(
                "✅ Admin por defecto creado " +
                "(usuario: admin, password: admin123)",
            );
          }
          resolve();
        });
      });
    });
  }

  /**
   * Create a new informe
   * @param {Object} data - Informe data
   * @return {Promise} Promise with created informe
   */
  createInforme(data) {
    return new Promise((resolve, reject) => {
      const query =
        "INSERT INTO informes (nombre, apellido, tiene_organizaciones, " +
        "organizaciones, tiene_unidades, unidades, futuros_elderes, " +
        "trabajo_futuros_elderes, reunion_presidencia, " +
        "entrevistas_ministracion, informe_detallado) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
        data.informe_detallado || "",
      ];
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          // `this.lastID` is provided by sqlite3 in this callback context.
          // eslint-disable-next-line no-invalid-this
          resolve({id: this.lastID, ...data});
        }
      });
    });
  }

  /**
   * Get all informes
    * @return {Promise} Promise with array of informes
   */
  getAllInformes() {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT * FROM informes ORDER BY created_at DESC";
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const informes = rows.map((row) => ({
            ...row,
            organizaciones: JSON.parse(row.organizaciones || "[]"),
            unidades: JSON.parse(row.unidades || "[]"),
            futuros_elderes: JSON.parse(row.futuros_elderes || "[]"),
            tiene_organizaciones: row.tiene_organizaciones === 1,
            tiene_unidades: row.tiene_unidades === 1,
            trabajo_futuros_elderes: row.trabajo_futuros_elderes === 1,
            reunion_presidencia: row.reunion_presidencia === 1,
            entrevistas_ministracion: row.entrevistas_ministracion === 1,
          }));
          resolve(informes);
        }
      });
    });
  }

  /**
   * Get informes grouped by person
   * @return {Promise} Promise with grouped informes
   */
  getInformesByPerson() {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT nombre || ' ' || apellido as persona, " +
        "COUNT(*) as total_informes, " +
        "MAX(fecha_informe) as ultimo_informe, " +
        "MIN(fecha_informe) as primer_informe, " +
        "GROUP_CONCAT(id) as ids_informes " +
        "FROM informes " +
        "GROUP BY LOWER(nombre), LOWER(apellido) " +
        "ORDER BY ultimo_informe DESC";
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get filtered informes
   * @param {Object} filtros - Filter parameters
    * @return {Promise} Promise with filtered informes
   */
  getInformesByFilter(filtros) {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM informes WHERE 1=1";
      const params = [];
      if (filtros.fecha_inicio) {
        query += " AND date(fecha_informe) >= date(?)";
        params.push(filtros.fecha_inicio);
      }
      if (filtros.fecha_fin) {
        query += " AND date(fecha_informe) <= date(?)";
        params.push(filtros.fecha_fin);
      }
      if (filtros.organizacion) {
        query += " AND organizaciones LIKE ?";
        params.push(`%${filtros.organizacion}%`);
      }
      if (filtros.unidad) {
        query += " AND unidades LIKE ?";
        params.push(`%${filtros.unidad}%`);
      }
      query += " ORDER BY created_at DESC";
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const informes = rows.map((row) => ({
            ...row,
            organizaciones: JSON.parse(row.organizaciones || "[]"),
            unidades: JSON.parse(row.unidades || "[]"),
            futuros_elderes: JSON.parse(row.futuros_elderes || "[]"),
            tiene_organizaciones: row.tiene_organizaciones === 1,
            tiene_unidades: row.tiene_unidades === 1,
            trabajo_futuros_elderes: row.trabajo_futuros_elderes === 1,
            reunion_presidencia: row.reunion_presidencia === 1,
            entrevistas_ministracion: row.entrevistas_ministracion === 1,
          }));
          resolve(informes);
        }
      });
    });
  }

  /**
   * Get admin by username
   * @param {string} username - Username to search
   * @return {Promise} Promise with admin data
   */
  getAdminByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM administradores WHERE usuario = ?";
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = Database;


