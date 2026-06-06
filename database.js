const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./veterinaria.db');

db.serialize(() => {
    // TABLA USUARIOS (Roles: admin, veterinario)
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // TABLA MASCOTAS
    db.run(`CREATE TABLE IF NOT EXISTS mascotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        especie TEXT,
        raza TEXT,
        edad INTEGER,
        dueno TEXT
    )`);

    // TABLA CITAS
    db.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        veterinario_id INTEGER,
        fecha TEXT,
        hora TEXT,
        motivo TEXT,
        FOREIGN KEY(mascota_id) REFERENCES mascotas(id),
        FOREIGN KEY(veterinario_id) REFERENCES usuarios(id)
    )`);

    // TABLA RECETAS (Recipes)
    db.run(`CREATE TABLE IF NOT EXISTS recetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        veterinario_id INTEGER,
        diagnostico TEXT,
        medicamentos TEXT,
        fecha TEXT,
        FOREIGN KEY(mascota_id) REFERENCES mascotas(id),
        FOREIGN KEY(veterinario_id) REFERENCES usuarios(id)
    )`);

    // Insertar usuario Admin por defecto si no existe (Password: admin123)
    db.get("SELECT * FROM usuarios WHERE email = 'admin@vet.com'", (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO usuarios (nombre, email, password, role) VALUES ('Administrador General', 'admin@vet.com', ?, 'admin')", [hash]);
            
            const hashVet = bcrypt.hashSync('vet123', 10);
            db.run("INSERT INTO usuarios (nombre, email, password, role) VALUES ('Dr. Carlos Mendoza', 'carlos@vet.com', ?, 'veterinario')", [hashVet]);
        }
    });
});

module.exports = db;