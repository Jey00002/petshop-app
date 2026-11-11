const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (RNF09)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rutas de la API REST
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/productos', require('./src/routes/productos.routes'));
app.use('/api/inventario', require('./src/routes/inventario.routes'));
app.use('/api/ventas', require('./src/routes/ventas.routes'));
app.use('/api/caja', require('./src/routes/caja.routes'));
app.use('/api/reniec', require('./src/routes/reniec.routes'));
app.use('/api/reportes', require('./src/routes/reportes.routes'));
app.use('/api/usuarios', require('./src/routes/usuarios.routes'));
app.use('/api/clientes', require('./src/routes/clientes.routes'));
app.use('/api/proveedores', require('./src/routes/proveedores.routes'));

// Middleware de manejo de errores global (RNF09)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        mensaje: 'Ocurrió un error inesperado en el servidor',
        error: process.env.NODE_ENV === 'production' ? null : err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor PetShop Pro escuchando en el puerto ${PORT}`));
