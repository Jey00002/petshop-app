const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Reporte de ventas diarias consolidado (RF07)
router.get('/diario', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora, v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   m.nombre as metodo_pago,
                   cp.numero as comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE DATE(v.fecha_hora) = CURDATE() AND v.estado = 'confirmada'
            ORDER BY v.fecha_hora DESC
        `);

        // Desglose por método de pago
        const [metodos] = await pool.query(`
            SELECT COALESCE(m.nombre, 'Otros') as metodo, COUNT(v.id_venta) as transacciones, SUM(v.total) as total
            FROM venta v
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            WHERE DATE(v.fecha_hora) = CURDATE() AND v.estado = 'confirmada'
            GROUP BY m.nombre
        `);

        // Top 5 productos del día
        const [topProductos] = await pool.query(`
            SELECT p.nombre, SUM(dv.cantidad) as total_unidades, SUM(dv.subtotal) as total_recaudado
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE DATE(v.fecha_hora) = CURDATE() AND v.estado = 'confirmada'
            GROUP BY p.id_producto, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 5
        `);

        const totalRecaudado = ventas.reduce((acc, v) => acc + Number(v.total), 0);

        res.json({
            fecha: new Date().toISOString().split('T')[0],
            total_ventas: ventas.length,
            total_ingresos: totalRecaudado,
            ventas,
            metodos,
            top_productos: topProductos
        });
    } catch (e) {
        console.error('Error al generar reporte diario:', e);
        res.status(500).json({ mensaje: 'Error al generar reporte de ventas diarias' });
    }
});

// Reporte por rango de fechas personalizado (RF07)
router.get('/rango', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) {
        return res.status(400).json({ mensaje: 'Fechas de inicio y fin son obligatorias (YYYY-MM-DD)' });
    }

    try {
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora, v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   m.nombre as metodo_pago,
                   cp.numero as comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE DATE(v.fecha_hora) BETWEEN ? AND ? AND v.estado = 'confirmada'
            ORDER BY v.fecha_hora DESC
        `, [inicio, fin]);

        const totalRecaudado = ventas.reduce((acc, v) => acc + Number(v.total), 0);

        res.json({
            rango: { inicio, fin },
            total_ventas: ventas.length,
            total_ingresos: totalRecaudado,
            ventas
        });
    } catch (e) {
        console.error('Error al generar reporte por rango:', e);
        res.status(500).json({ mensaje: 'Error al generar reporte por rango de fechas' });
    }
});

module.exports = router;
