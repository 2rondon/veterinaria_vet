const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'veterinaria_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Middleware de Autenticación
function requireAuth(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

// Rutas de Autenticación
app.get('/login', (req, res) => res.render('login', { msg: null }));
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard?section=dashboard');
        } else {
            res.render('login', { msg: 'Credenciales incorrectas' });
        }
    });
});

app.get('/register', (req, res) => res.render('register', { msg: null }));
app.post('/register', (req, res) => {
    const { nombre, email, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)", [nombre, email, hash, role], (err) => {
        if (err) return res.render('register', { msg: 'El correo ya está registrado.' });
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Ruta Maestra del Dashboard (Carga dinámica de secciones)
app.get('/dashboard', requireAuth, (req, res) => {
    const section = req.query.section || 'dashboard';
    const user = req.session.user;

    // Consultas consolidadas para armar los módulos
    db.all("SELECT * FROM usuarios WHERE role = 'veterinario'", (err, vets) => {
        db.all("SELECT * FROM mascotas", (err, mascotas) => {
            db.all(`SELECT citas.*, mascotas.nombre as mascota, usuarios.nombre as veterinario 
                    FROM citas 
                    JOIN mascotas ON citas.mascota_id = mascotas.id 
                    JOIN usuarios ON citas.veterinario_id = usuarios.id`, (err, citas) => {
                db.all(`SELECT recetas.*, mascotas.nombre as mascota, usuarios.nombre as veterinario 
                        FROM recetas 
                        JOIN mascotas ON recetas.mascota_id = mascotas.id 
                        JOIN usuarios ON recetas.veterinario_id = usuarios.id`, (err, recetas) => {
                    
                    res.render('dashboard', {
                        user,
                        section,
                        vets,
                        mascotas,
                        citas,
                        recetas,
                        stats: { vets: vets.length, pets: mascotas.length, appointments: citas.length, recipes: recetas.length }
                    });
                });
            });
        });
    });
});

// Procesamiento de Formularios CRUD
app.post('/mascotas/add', requireAuth, (req, res) => {
    const { nombre, especie, raza, edad, dueno } = req.body;
    db.run("INSERT INTO mascotas (nombre, especie, raza, edad, dueno) VALUES (?, ?, ?, ?, ?)", [nombre, especie, raza, edad, dueno], () => {
        res.redirect('/dashboard?section=mascotas');
    });
});

app.post('/citas/add', requireAuth, (req, res) => {
    const { mascota_id, veterinario_id, fecha, hora, motivo } = req.body;
    db.run("INSERT INTO citas (mascota_id, veterinario_id, fecha, hora, motivo) VALUES (?, ?, ?, ?, ?)", [mascota_id, veterinario_id, fecha, hora, motivo], () => {
        res.redirect('/dashboard?section=citas');
    });
});

app.post('/recetas/add', requireAuth, (req, res) => {
    const { mascota_id, diagnostico, medicamentos } = req.body;
    const fecha = new Date().toLocaleDateString();
    db.run("INSERT INTO recetas (mascota_id, veterinario_id, diagnostico, medicamentos, fecha) VALUES (?, ?, ?, ?, ?)", [mascota_id, req.session.user.id, diagnostico, medicamentos, fecha], () => {
        res.redirect('/dashboard?section=recipes');
    });
});

// Redirección inicial
app.get('*', (req, res) => res.redirect('/login'));

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));