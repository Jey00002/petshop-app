const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Listar ventas con información consolidada (RF12, RF13)
router.get('/', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, estado } = req.query;
        let query = `
            SELECT v.id_venta, v.fecha_hora, v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   COALESCE(c.documento, '-') as documento_cliente,
                   m.nombre as metodo_pago,
                   cp.serie, cp.numero as numero_comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE 1=1
        `;
        const params = [];
        if (fecha_inicio) {
            query += ' AND DATE(v.fecha_hora) >= ?';
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            query += ' AND DATE(v.fecha_hora) <= ?';
            params.push(fecha_fin);
        }
        if (estado) {
            query += ' AND v.estado = ?';
            params.push(estado);
        }

        query += ' ORDER BY v.fecha_hora DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) { 
        console.error('Error al consultar ventas:', e);
        res.status(500).json({ mensaje: 'Error al obtener historial de ventas' }); 
    }
});

// Obtener detalle de una venta específica (RF12, RF13)
router.get('/:id', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    const { id } = req.params;
    try {
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora, v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   COALESCE(c.documento, '-') as documento_cliente,
                   m.nombre as metodo_pago,
                   cp.serie, cp.numero as numero_comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE v.id_venta = ?
        `, [id]);

        if (ventas.length === 0) {
            return res.status(404).json({ mensaje: 'Venta no encontrada' });
        }

        const [detalles] = await pool.query(`
            SELECT dv.*, p.nombre as nombre_producto, p.codigo_barras
            FROM detalle_venta dv
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE dv.id_venta = ?
        `, [id]);

        res.json({
            venta: ventas[0],
            detalles
        });
    } catch (e) {
        console.error('Error al obtener venta detallada:', e);
        res.status(500).json({ mensaje: 'Error al obtener detalle de venta' });
    }
});

// Registrar venta con validaciones estrictas y transaccionalidad ACID (RF05, RF06, RNF07)
router.post('/', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    const { id_cliente, id_metodo, detalles } = req.body; // detalles: [{id_producto, cantidad, precio_unitario}]
    
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ mensaje: 'Debe incluir al menos un producto en la venta.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let total = 0;
        
        for (let item of detalles) {
            const cant = parseInt(item.cantidad);
            if (isNaN(cant) || cant <= 0) {
                throw new Error(`Cantidad inválida para producto ID ${item.id_producto}`);
            }

            // FOR UPDATE para bloqueo pesimista y evitar sobreventas (RN-06)
            const [prod] = await connection.query(`SELECT stock, stock_minimo FROM producto WHERE id_producto = ? FOR UPDATE`, [item.id_producto]);
            if (!prod[0] || prod[0].stock < cant) {
                throw new Error(`Stock insuficiente para el producto ${item.id_producto}. Disponible: ${prod[0] ? prod[0].stock : 0}`);
            }
            total += cant * parseFloat(item.precio_unitario);
        }

        const clienteId = id_cliente ? parseInt(id_cliente) : 1;
        const metodoId = id_metodo ? parseInt(id_metodo) : 1;

        const [resVenta] = await connection.query(
            `INSERT INTO venta (fecha_hora, total, estado, id_usuario, id_cliente, id_metodo) VALUES (NOW(), ?, 'confirmada', ?, ?, ?)`,
            [total, req.user.id_usuario, clienteId, metodoId]
        );
        const id_venta = resVenta.insertId;

        for (let item of detalles) {
            const cant = parseInt(item.cantidad);
            const pUnit = parseFloat(item.precio_unitario);
            const sub = cant * pUnit;

            await connection.query(
                `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
                [id_venta, item.id_producto, cant, pUnit, sub]
            );
            // RN-07 Disminución automática del stock
            await connection.query(`UPDATE producto SET stock = stock - ? WHERE id_producto = ?`, [cant, item.id_producto]);
            // Kardex movimiento_inventario
            await connection.query(
                `INSERT INTO movimiento_inventario (tipo, cantidad, motivo, fecha, id_producto, id_usuario) VALUES ('salida', ?, 'Venta', NOW(), ?, ?)`,
                [cant, item.id_producto, req.user.id_usuario]
            );

            // RN-02 Alerta de stock mínimo
            const [prodPost] = await connection.query(`SELECT stock, stock_minimo FROM producto WHERE id_producto = ?`, [item.id_producto]);
            if (prodPost[0].stock <= prodPost[0].stock_minimo) {
                await connection.query(`INSERT INTO alerta_stock (fecha, estado, id_producto) VALUES (NOW(), 'activa', ?)`, [item.id_producto]);
            }
        }

        // RN-09 Generación de Comprobante
        const numComp = `001-${String(id_venta).padStart(6, '0')}`;
        await connection.query(`INSERT INTO comprobante (serie, numero, id_venta) VALUES ('F001', ?, ?)`, [numComp, id_venta]);

        await connection.commit();
        res.status(201).json({ mensaje: 'Venta registrada con éxito', id_venta, comprobante: numComp });
    } catch (e) {
        await connection.rollback();
        if (e.message.includes('Stock insuficiente') || e.message.includes('Cantidad inválida')) {
            return res.status(400).json({ mensaje: e.message });
        }
        res.status(500).json({ mensaje: 'Error al procesar la venta', error: e.message });
    } finally {
        connection.release();
    }
});

// Anulación de venta con reversa de stock (RF13, RN-10)
router.post('/:id/anular', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [ventas] = await connection.query(`SELECT estado FROM venta WHERE id_venta = ?`, [id]);
        if (ventas.length === 0) throw new Error('Venta no encontrada');
        if (ventas[0].estado === 'anulada') throw new Error('La venta ya se encuentra anulada');
        
        await connection.query(`UPDATE venta SET estado = 'anulada' WHERE id_venta = ?`, [id]);
        
        const [detalles] = await connection.query(`SELECT id_producto, cantidad FROM detalle_venta WHERE id_venta = ?`, [id]);
        for (let item of detalles) {
            await connection.query(`UPDATE producto SET stock = stock + ? WHERE id_producto = ?`, [item.cantidad, item.id_producto]);
            await connection.query(
                `INSERT INTO movimiento_inventario (tipo, cantidad, motivo, fecha, id_producto, id_usuario) VALUES ('reversa', ?, 'Anulación de venta', NOW(), ?, ?)`,
                [item.cantidad, item.id_producto, req.user.id_usuario]
            );
        }
        await connection.commit();
        res.json({ ok: true, mensaje: 'Venta anulada y existencias restauradas correctamente' });
    } catch (e) {
        await connection.rollback();
        res.status(400).json({ mensaje: e.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
