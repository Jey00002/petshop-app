const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

router.post('/entradas', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { id_producto, cantidad, motivo } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`UPDATE producto SET stock = stock + ? WHERE id_producto = ?`, [cantidad, id_producto]);
        await connection.query(`INSERT INTO movimiento_inventario (tipo, cantidad, motivo, fecha, id_producto, id_usuario) VALUES ('entrada', ?, ?, NOW(), ?, ?)`, [cantidad, motivo, id_producto, req.user.id_usuario]);
        
        // Revisar si supera el stock mínimo para resolver alertas
        const [prod] = await connection.query(`SELECT stock, stock_minimo FROM producto WHERE id_producto=?`, [id_producto]);
        if(prod[0].stock > prod[0].stock_minimo) {
            await connection.query(`UPDATE alerta_stock SET estado='resuelta' WHERE id_producto=? AND estado='activa'`, [id_producto]);
        }
        await connection.commit();
        res.json({ mensaje: 'Entrada registrada' });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ mensaje: 'Error' });
    } finally {
        connection.release();
    }
});

router.get('/alertas', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT a.*, p.nombre FROM alerta_stock a JOIN producto p ON a.id_producto = p.id_producto WHERE a.estado = 'activa'`);
        res.json(rows);
    } catch (e) { res.status(500).json({ mensaje: 'Error' }); }
});
module.exports = router;
