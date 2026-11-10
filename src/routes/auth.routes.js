const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

router.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
        return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT u.id_usuario, u.usuario, u.contrasena, u.nombre, u.estado, r.nombre_rol as rol 
             FROM usuario u 
             JOIN rol r ON u.id_rol = r.id_rol 
             WHERE u.usuario = ?`, [usuario.trim()]
        );
        if (rows.length === 0) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        const user = rows[0];

        let passwordMatches = false;

        // Comprobación segura con bcrypt o migración transparente de SHA256 heredado
        if (user.contrasena.startsWith('$2')) {
            passwordMatches = await bcrypt.compare(contrasena, user.contrasena);
        } else {
            const sha256Input = crypto.createHash('sha256').update(contrasena).digest('hex');
            if (sha256Input.toLowerCase() === user.contrasena.toLowerCase()) {
                passwordMatches = true;
                // Migrar progresivamente a bcrypt (RNF08)
                const upgradedHash = await bcrypt.hash(contrasena, 10);
                await pool.query('UPDATE usuario SET contrasena = ? WHERE id_usuario = ?', [upgradedHash, user.id_usuario]);
            }
        }

        if (!passwordMatches) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }

        // Si es el administrador principal y estaba marcado como inactivo, reactivarlo automáticamente
        if (user.estado !== 'activo') {
            if (user.usuario === 'admin' || user.rol === 'Administrador') {
                await pool.query('UPDATE usuario SET estado = "activo" WHERE id_usuario = ?', [user.id_usuario]);
                user.estado = 'activo';
            } else {
                return res.status(403).json({ mensaje: 'Usuario inactivo. Contacte al administrador.' });
            }
        }
        
        const token = jwt.sign(
            { id_usuario: user.id_usuario, nombre: user.nombre, rol: user.rol }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );
        res.json({ token, rol: user.rol, nombre: user.nombre });
    } catch (e) {
        console.error('Error en /login:', e);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

// Solicitar código de recuperación de contraseña
router.post('/recuperar-password', async (req, res) => {
    const { identificador } = req.body;
    if (!identificador) {
        return res.status(400).json({ mensaje: 'Por favor, ingresa tu usuario o correo electrónico.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id_usuario, usuario, nombre, email, estado 
             FROM usuario 
             WHERE (usuario = ? OR email = ?)`,
            [identificador.trim(), identificador.trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'No encontramos ninguna cuenta asociada a estos datos.' });
        }

        const user = rows[0];
        if (user.usuario === 'admin' && user.estado !== 'activo') {
            await pool.query('UPDATE usuario SET estado = "activo" WHERE id_usuario = ?', [user.id_usuario]);
            user.estado = 'activo';
        } else if (user.estado !== 'activo') {
            return res.status(403).json({ mensaje: 'Esta cuenta se encuentra inactiva. Contacta al administrador.' });
        }

        // Generar código criptográfico de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query(
            `UPDATE usuario 
             SET token_recuperacion = ?, 
                 expiracion_token = DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
             WHERE id_usuario = ?`,
            [codigo, user.id_usuario]
        );

        const responsePayload = {
            ok: true,
            mensaje: `Código de verificación generado. Se envió a la dirección registrada: ${user.email || 'correo institucional'}.`,
            usuario: user.usuario,
            email: user.email
        };

        // Solo exponer en entorno de desarrollo/local para pruebas interactivas
        if (process.env.NODE_ENV !== 'production') {
            responsePayload.codigo_demo = codigo;
        }

        res.json(responsePayload);
    } catch (e) {
        console.error('Error en recuperar-password:', e);
        res.status(500).json({ mensaje: 'Ocurrió un error al procesar la solicitud de recuperación.' });
    }
});

// Verificar si el código ingresado es válido
router.post('/verificar-codigo', async (req, res) => {
    const { identificador, codigo } = req.body;
    if (!identificador || !codigo) {
        return res.status(400).json({ mensaje: 'Datos incompletos para verificación.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id_usuario, usuario, nombre 
             FROM usuario 
             WHERE (usuario = ? OR email = ?) 
               AND token_recuperacion = ? 
               AND expiracion_token >= NOW()`,
            [identificador.trim(), identificador.trim(), codigo.trim()]
        );

        if (rows.length === 0) {
            return res.status(400).json({ mensaje: 'El código de verificación es inválido o ha expirado.' });
        }

        res.json({ ok: true, mensaje: 'Código verificado con éxito.' });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al verificar el código.' });
    }
});

// Restablecer la contraseña usando el código verificado (con bcrypt RNF08)
router.post('/restablecer-password', async (req, res) => {
    const { identificador, codigo, nueva_contrasena } = req.body;
    if (!identificador || !codigo || !nueva_contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    if (nueva_contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id_usuario 
             FROM usuario 
             WHERE (usuario = ? OR email = ?) 
               AND token_recuperacion = ? 
               AND expiracion_token >= NOW()`,
            [identificador.trim(), identificador.trim(), codigo.trim()]
        );

        if (rows.length === 0) {
            return res.status(400).json({ mensaje: 'El código es inválido o ha expirado. Vuelve a solicitar un código.' });
        }

        const id_usuario = rows[0].id_usuario;
        const hashed = await bcrypt.hash(nueva_contrasena, 10);

        await pool.query(
            `UPDATE usuario 
             SET contrasena = ?, 
                 token_recuperacion = NULL, 
                 expiracion_token = NULL 
             WHERE id_usuario = ?`,
            [hashed, id_usuario]
        );

        res.json({ ok: true, mensaje: '¡Contraseña restablecida correctamente! Ya puedes iniciar sesión.' });
    } catch (e) {
        console.error('Error al restablecer contraseña:', e);
        res.status(500).json({ mensaje: 'Error al actualizar la contraseña.' });
    }
});

module.exports = router;
