const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("./database");

const app = express();
const db = new Database();
const jwtSecret = process.env.JWT_SECRET || "sumo-consejo-secret-key-2024";

// Middlewares
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "10mb"}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas solicitudes desde esta IP",
});
app.use("/api", limiter);

/**
 * Authentication middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * @return {void}
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({error: "Token de acceso requerido"});
  }
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({error: "Token inválido"});
    }
    req.user = user;
    next();
  });
};

// 📋 RUTAS DE PREGUNTAS PERSONALIZADAS
app.get("/api/preguntas", async (req, res) => {
  try {
    const preguntas = await db.getPreguntas();
    res.json({preguntas});
  } catch (error) {
    console.error("Error obteniendo preguntas:", error);
    res.status(500).json({error: "Error interno del servidor"});
  }
});

app.post("/api/admin/preguntas", authenticateToken, async (req, res) => {
  try {
    const {texto, tipo, orden, activa} = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({
        error: "El texto de la pregunta es obligatorio",
      });
    }
    const pregunta = await db.createPregunta({
      texto: texto.trim(),
      tipo,
      orden,
      activa,
    });
    res.status(201).json({pregunta});
  } catch (error) {
    console.error("Error creando pregunta:", error);
    res.status(500).json({error: "Error interno del servidor"});
  }
});

app.put("/api/admin/preguntas/:id", authenticateToken, async (req, res) => {
  try {
    const {id} = req.params;
    const {texto, tipo, orden, activa} = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({
        error: "El texto de la pregunta es obligatorio",
      });
    }
    const pregunta = await db.updatePregunta({
      id,
      texto: texto.trim(),
      tipo,
      orden,
      activa,
    });
    res.json({pregunta});
  } catch (error) {
    console.error("Error actualizando pregunta:", error);
    res.status(500).json({error: "Error interno del servidor"});
  }
});

app.delete("/api/admin/preguntas/:id", authenticateToken, async (req, res) => {
  try {
    const {id} = req.params;
    await db.deletePregunta(id);
    res.json({message: "Pregunta eliminada", id});
  } catch (error) {
    console.error("Error eliminando pregunta:", error);
    res.status(500).json({error: "Error interno del servidor"});
  }
});

// 🔐 RUTAS DE AUTENTICACIÓN
app.post("/api/auth/login", async (req, res) => {
  try {
    const {pin} = req.body;
    if (!pin) {
      return res.status(400).json({error: "PIN requerido"});
    }
    // Buscar siempre el usuario 'admin'
    const admin = await db.getAdminByUsername("admin");
    if (!admin) {
      return res.status(401).json({error: "Administrador no encontrado"});
    }
    const passwordValid = await bcrypt.compare(pin, admin.password);
    if (!passwordValid) {
      return res.status(401).json({error: "PIN incorrecto"});
    }
    const token = jwt.sign(
        {id: admin.id, usuario: admin.usuario},
        jwtSecret,
        {expiresIn: "24h"},
    );
    res.json({message: "Login exitoso", token, usuario: admin.usuario});
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({error: "Error interno del servidor"});
  }
});

// ...agrega aquí el resto de tus rutas
// (informes, administración, etc.) igual que antes...

module.exports = app;


