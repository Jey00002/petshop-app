const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Listar proveedores (activos por defecto o todos con ?todos=true)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { todos } = req.query;
        let query = 'SELECT * FROM proveedor';
        if (!todos) {
            query += " WHERE estado = 'activo'";
        }
        query += ' ORDER BY nombre ASC';
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (e) {
        console.error('Error al obtener proveedores:', e);
        res.status(500).json({ mensaje: 'Error al obtener proveedores' });
    }
});

// Registrar nuevo proveedor
router.post('/', verifyToken, requireRole('Administrador', 'Almacén'), async (req, res) => {
    const { nombre, contacto, telefono } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre del proveedor es obligatorio.' });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO proveedor (nombre, contacto, telefono, estado) VALUES (?, ?, ?, 'activo')",
            [nombre.trim(), (contacto || '').trim(), (telefono || '').trim()]
        );
        res.status(201).json({
            ok: true,
            id_proveedor: result.insertId,
            nombre: nombre.trim(),
            mensaje: 'Proveedor registrado exitosamente'
        });
    } catch (e) {
        console.error('Error al registrar proveedor:', e);
        res.status(500).json({ mensaje: 'Error al registrar proveedor' });
    }
});

// Actualizar proveedor
router.put('/:id', verifyToken, requireRole('Administrador', 'Almacén'), async (req, res) => {
    const { id } = req.params;
    const { nombre, contacto, telefono } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre del proveedor es obligatorio.' });
    }

    try {
        await pool.query(
            'UPDATE proveedor SET nombre = ?, contacto = ?, telefono = ? WHERE id_proveedor = ?',
            [nombre.trim(), (contacto || '').trim(), (telefono || '').trim(), id]
        );
        res.json({ ok: true, mensaje: 'Proveedor actualizado correctamente' });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al actualizar proveedor' });
    }
});

// Cambiar estado activo / inactivo
router.patch('/:id/estado', verifyToken, requireRole('Administrador', 'Almacén'), async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ mensaje: "Estado inválido. Use 'activo' o 'inactivo'." });
    }

    try {
        await pool.query('UPDATE proveedor SET estado = ? WHERE id_proveedor = ?', [estado, id]);
        res.json({ ok: true, mensaje: `Proveedor marcado como ${estado}` });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al cambiar estado del proveedor' });
    }
});

module.exports = router;
