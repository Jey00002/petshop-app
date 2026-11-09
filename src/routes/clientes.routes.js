const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Listar clientes o buscar por término
router.get('/', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        let query = 'SELECT * FROM cliente';
        let params = [];
        if (q && q.trim()) {
            query += ' WHERE documento LIKE ? OR nombre LIKE ?';
            const term = `%${q.trim()}%`;
            params = [term, term];
        }
        query += ' ORDER BY id_cliente ASC LIMIT 100';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) {
        console.error('Error al listar clientes:', e);
        res.status(500).json({ mensaje: 'Error al obtener clientes' });
    }
});

// Obtener cliente por ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cliente WHERE id_cliente = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al obtener cliente' });
    }
});

// Registrar nuevo cliente
router.post('/', verifyToken, async (req, res) => {
    const { documento, nombre, contacto } = req.body;
    if (!documento || !documento.trim() || !nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'Documento y nombre son obligatorios.' });
    }

    try {
        const [exist] = await pool.query('SELECT id_cliente FROM cliente WHERE documento = ?', [documento.trim()]);
        if (exist.length > 0) {
            return res.status(400).json({ mensaje: 'Ya existe un cliente con ese documento/DNI.' });
        }

        const [result] = await pool.query(
            'INSERT INTO cliente (documento, nombre, contacto) VALUES (?, ?, ?)',
            [documento.trim(), nombre.trim(), (contacto || '').trim()]
        );
        res.status(201).json({
            ok: true,
            id_cliente: result.insertId,
            documento: documento.trim(),
            nombre: nombre.trim(),
            mensaje: 'Cliente registrado exitosamente'
        });
    } catch (e) {
        console.error('Error al registrar cliente:', e);
        res.status(500).json({ mensaje: 'Error al registrar cliente' });
    }
});

// Actualizar cliente
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { documento, nombre, contacto } = req.body;

    if (!documento || !documento.trim() || !nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'Documento y nombre son obligatorios.' });
    }

    try {
        const [exist] = await pool.query('SELECT id_cliente FROM cliente WHERE documento = ? AND id_cliente != ?', [documento.trim(), id]);
        if (exist.length > 0) {
            return res.status(400).json({ mensaje: 'Otro cliente ya tiene ese número de documento.' });
        }

        await pool.query(
            'UPDATE cliente SET documento = ?, nombre = ?, contacto = ? WHERE id_cliente = ?',
            [documento.trim(), nombre.trim(), (contacto || '').trim(), id]
        );
        res.json({ ok: true, mensaje: 'Cliente actualizado correctamente' });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al actualizar cliente' });
    }
});

module.exports = router;
