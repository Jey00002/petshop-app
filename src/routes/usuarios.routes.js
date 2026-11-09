const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Listar roles disponibles
router.get('/roles', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id_rol, nombre_rol FROM rol WHERE estado = 'activo'");
        res.json(rows);
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al obtener roles' });
    }
});

// Listar usuarios
router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id_usuario, u.usuario, u.nombre, u.email, u.estado, u.id_rol, r.nombre_rol 
            FROM usuario u 
            JOIN rol r ON u.id_rol = r.id_rol 
            ORDER BY u.id_usuario ASC
        `);
        res.json(rows);
    } catch (e) { 
        res.status(500).json({ mensaje: 'Error al listar usuarios' }); 
    }
});

// Registrar nuevo usuario
router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { usuario, contrasena, nombre, id_rol, email } = req.body;
    if (!usuario || !contrasena || !nombre || !id_rol) {
        return res.status(400).json({ mensaje: 'Usuario, contraseña, nombre y rol son obligatorios.' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const [exist] = await pool.query('SELECT id_usuario FROM usuario WHERE usuario = ?', [usuario.trim()]);
        if (exist.length > 0) {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso.' });
        }

        const hashed = await bcrypt.hash(contrasena, 10);
        const [result] = await pool.query(
            "INSERT INTO usuario (usuario, contrasena, nombre, id_rol, email, estado) VALUES (?, ?, ?, ?, ?, 'activo')",
            [usuario.trim(), hashed, nombre.trim(), parseInt(id_rol), email ? email.trim() : null]
        );

        res.status(201).json({
            ok: true,
            id_usuario: result.insertId,
            mensaje: 'Usuario registrado exitosamente'
        });
    } catch (e) {
        console.error('Error al crear usuario:', e);
        res.status(500).json({ mensaje: 'Error al registrar el usuario' });
    }
});

// Modificar usuario
router.put('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { id } = req.params;
    const { nombre, id_rol, email, contrasena } = req.body;

    if (!nombre || !id_rol) {
        return res.status(400).json({ mensaje: 'Nombre y rol son requeridos.' });
    }

    try {
        if (contrasena && contrasena.trim().length >= 6) {
            const hashed = await bcrypt.hash(contrasena.trim(), 10);
            await pool.query(
                'UPDATE usuario SET nombre = ?, id_rol = ?, email = ?, contrasena = ? WHERE id_usuario = ?',
                [nombre.trim(), parseInt(id_rol), email ? email.trim() : null, hashed, id]
            );
        } else {
            await pool.query(
                'UPDATE usuario SET nombre = ?, id_rol = ?, email = ? WHERE id_usuario = ?',
                [nombre.trim(), parseInt(id_rol), email ? email.trim() : null, id]
            );
        }
        res.json({ ok: true, mensaje: 'Usuario actualizado exitosamente' });
    } catch (e) {
        console.error('Error al actualizar usuario:', e);
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
});

// Cambiar estado activo / inactivo
router.patch('/:id/estado', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ mensaje: "Estado inválido. Debe ser 'activo' o 'inactivo'." });
    }

    // Prevenir auto-desactivación del propio admin
    if (parseInt(id) === req.user.id_usuario && estado === 'inactivo') {
        return res.status(400).json({ mensaje: 'No puedes desactivar tu propia cuenta en sesión.' });
    }

    try {
        await pool.query('UPDATE usuario SET estado = ? WHERE id_usuario = ?', [estado, id]);
        res.json({ ok: true, mensaje: `Usuario marcado como ${estado}` });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al cambiar estado del usuario' });
    }
});

module.exports = router;
