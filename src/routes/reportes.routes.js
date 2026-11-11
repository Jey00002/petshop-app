const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Helper para obtener la fecha de hoy en Perú (UTC-5) en formato YYYY-MM-DD
function getPeruDate(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}

// Expresión SQL dinámica para sincronizar la fecha a zona horaria de Perú (UTC-5)
// Funciona en cualquier servidor (Aiven, Render, local, UTC o GMT-5)
const SQL_FECHA_PERU = 'DATE(DATE_SUB(v.fecha_hora, INTERVAL (TIMESTAMPDIFF(HOUR, NOW(), UTC_TIMESTAMP()) + 5) HOUR))';

// Helper para obtener el rango lunes-domingo de la semana para una fecha dada
function getWeekRange(dateStr) {
    const baseStr = dateStr || getPeruDate();
    const [y, m, d] = baseStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    // En Date.UTC, getUTCDay: 0 es domingo, 1 es lunes...
    const day = date.getUTCDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;

    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const format = (dt) => {
        const year = dt.getUTCFullYear();
        const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const dayNum = String(dt.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${dayNum}`;
    };

    return {
        inicio: format(monday),
        fin: format(sunday)
    };
}

// ==========================================
// 1. REPORTE DIARIO DE VENTAS (RF07)
// Sincronizado con zona horaria de Perú, desglose de Efectivo/Tarjeta/Yape y cálculo de IGV 18%
// ==========================================
router.get('/diario', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const targetDate = req.query.fecha ? req.query.fecha.trim() : getPeruDate();

        // 1. Listado de ventas del día con comprobante y desglose tributario
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora,
                   ${SQL_FECHA_PERU} as fecha_local,
                   COALESCE(v.subtotal, ROUND(v.total / 1.18, 2)) as subtotal,
                   COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2)) as igv,
                   v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   COALESCE(c.documento, '-') as documento_cliente,
                   COALESCE(m.nombre, 'Efectivo') as metodo_pago,
                   v.id_metodo,
                   cp.numero as comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE ${SQL_FECHA_PERU} = ? AND v.estado = 'confirmada'
            ORDER BY v.fecha_hora DESC
        `, [targetDate]);

        // 2. Desglose garantizado por Método de Pago (Efectivo, Tarjeta, Yape) con IGV 18%
        const [metodos] = await pool.query(`
            SELECT m.id_metodo, m.nombre as metodo,
                   COUNT(v.id_venta) as transacciones,
                   COALESCE(SUM(COALESCE(v.subtotal, ROUND(v.total / 1.18, 2))), 0) as subtotal,
                   COALESCE(SUM(COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2))), 0) as igv,
                   COALESCE(SUM(v.total), 0) as total
            FROM metodo_pago m
            LEFT JOIN venta v ON v.id_metodo = m.id_metodo 
              AND ${SQL_FECHA_PERU} = ?
              AND v.estado = 'confirmada'
            GROUP BY m.id_metodo, m.nombre
            ORDER BY m.id_metodo ASC
        `, [targetDate]);

        // 3. Top 5 productos del día
        const [topProductos] = await pool.query(`
            SELECT p.id_producto, p.nombre,
                   SUM(dv.cantidad) as total_unidades,
                   SUM(dv.subtotal) as total_recaudado,
                   ROUND(SUM(dv.subtotal) / 1.18, 2) as subtotal_base,
                   ROUND(SUM(dv.subtotal) - (SUM(dv.subtotal) / 1.18), 2) as igv_recaudado
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE ${SQL_FECHA_PERU} = ? AND v.estado = 'confirmada'
            GROUP BY p.id_producto, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 5
        `, [targetDate]);

        const totalRecaudado = ventas.reduce((acc, v) => acc + Number(v.total), 0);
        const totalSubtotal = ventas.reduce((acc, v) => acc + Number(v.subtotal), 0);
        const totalIgv = ventas.reduce((acc, v) => acc + Number(v.igv), 0);

        res.json({
            fecha: targetDate,
            total_ventas: ventas.length,
            total_subtotal: parseFloat(totalSubtotal.toFixed(2)),
            total_igv: parseFloat(totalIgv.toFixed(2)),
            total_ingresos: parseFloat(totalRecaudado.toFixed(2)),
            ventas,
            metodos,
            top_productos: topProductos
        });
    } catch (e) {
        console.error('Error al generar reporte diario:', e);
        res.status(500).json({ mensaje: 'Error al generar reporte de ventas diarias' });
    }
});

// ==========================================
// 2. REPORTE SEMANAL DE VENTAS (NUEVO)
// Consolida ventas de la semana (Lunes a Domingo), evolución diaria, Efectivo/Tarjeta/Yape e IGV 18%
// ==========================================
router.get('/semanal', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        let inicio = req.query.inicio;
        let fin = req.query.fin;

        if (!inicio || !fin) {
            const range = getWeekRange(req.query.fecha);
            inicio = range.inicio;
            fin = range.fin;
        }

        // 1. Listado de ventas de la semana
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora,
                   ${SQL_FECHA_PERU} as fecha_local,
                   COALESCE(v.subtotal, ROUND(v.total / 1.18, 2)) as subtotal,
                   COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2)) as igv,
                   v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   COALESCE(c.documento, '-') as documento_cliente,
                   COALESCE(m.nombre, 'Efectivo') as metodo_pago,
                   v.id_metodo,
                   cp.numero as comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE ${SQL_FECHA_PERU} BETWEEN ? AND ? AND v.estado = 'confirmada'
            ORDER BY v.fecha_hora DESC
        `, [inicio, fin]);

        // 2. Desglose por método de pago para toda la semana
        const [metodos] = await pool.query(`
            SELECT m.id_metodo, m.nombre as metodo,
                   COUNT(v.id_venta) as transacciones,
                   COALESCE(SUM(COALESCE(v.subtotal, ROUND(v.total / 1.18, 2))), 0) as subtotal,
                   COALESCE(SUM(COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2))), 0) as igv,
                   COALESCE(SUM(v.total), 0) as total
            FROM metodo_pago m
            LEFT JOIN venta v ON v.id_metodo = m.id_metodo 
              AND ${SQL_FECHA_PERU} BETWEEN ? AND ?
              AND v.estado = 'confirmada'
            GROUP BY m.id_metodo, m.nombre
            ORDER BY m.id_metodo ASC
        `, [inicio, fin]);

        // 3. Generar desglose diario estructurado (Lunes a Domingo)
        const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const [startYear, startMonth, startDay] = inicio.split('-').map(Number);
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));

        const desgloseDias = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setUTCDate(startDate.getUTCDate() + i);
            const curStr = `${currentDay.getUTCFullYear()}-${String(currentDay.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDay.getUTCDate()).padStart(2, '0')}`;
            
            const ventasDia = ventas.filter(v => {
                // v.fecha_local viene como Date o String YYYY-MM-DD
                const fStr = v.fecha_local instanceof Date 
                    ? v.fecha_local.toISOString().split('T')[0] 
                    : String(v.fecha_local).split('T')[0];
                return fStr === curStr;
            });

            const totalDia = ventasDia.reduce((acc, v) => acc + Number(v.total), 0);
            const subtotalDia = ventasDia.reduce((acc, v) => acc + Number(v.subtotal), 0);
            const igvDia = ventasDia.reduce((acc, v) => acc + Number(v.igv), 0);

            desgloseDias.push({
                dia_nombre: nombresDias[i] || `Día ${i + 1}`,
                fecha: curStr,
                transacciones: ventasDia.length,
                subtotal: parseFloat(subtotalDia.toFixed(2)),
                igv: parseFloat(igvDia.toFixed(2)),
                total: parseFloat(totalDia.toFixed(2))
            });
        }

        // 4. Top productos vendidos en la semana
        const [topProductos] = await pool.query(`
            SELECT p.id_producto, p.nombre,
                   SUM(dv.cantidad) as total_unidades,
                   SUM(dv.subtotal) as total_recaudado,
                   ROUND(SUM(dv.subtotal) / 1.18, 2) as subtotal_base,
                   ROUND(SUM(dv.subtotal) - (SUM(dv.subtotal) / 1.18), 2) as igv_recaudado
            FROM detalle_venta dv
            JOIN venta v ON dv.id_venta = v.id_venta
            JOIN producto p ON dv.id_producto = p.id_producto
            WHERE ${SQL_FECHA_PERU} BETWEEN ? AND ? AND v.estado = 'confirmada'
            GROUP BY p.id_producto, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 5
        `, [inicio, fin]);

        const totalRecaudado = ventas.reduce((acc, v) => acc + Number(v.total), 0);
        const totalSubtotal = ventas.reduce((acc, v) => acc + Number(v.subtotal), 0);
        const totalIgv = ventas.reduce((acc, v) => acc + Number(v.igv), 0);

        res.json({
            rango: { inicio, fin },
            semana_label: `Semana del ${inicio} al ${fin}`,
            total_ventas: ventas.length,
            total_subtotal: parseFloat(totalSubtotal.toFixed(2)),
            total_igv: parseFloat(totalIgv.toFixed(2)),
            total_ingresos: parseFloat(totalRecaudado.toFixed(2)),
            desglose_dias: desgloseDias,
            metodos,
            top_productos: topProductos,
            ventas
        });
    } catch (e) {
        console.error('Error al generar reporte semanal:', e);
        res.status(500).json({ mensaje: 'Error al generar reporte de ventas semanal' });
    }
});

// ==========================================
// 3. REPORTE POR RANGO PERSONALIZADO (RF07)
// ==========================================
router.get('/rango', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) {
        return res.status(400).json({ mensaje: 'Fechas de inicio y fin son obligatorias (YYYY-MM-DD)' });
    }

    try {
        const [ventas] = await pool.query(`
            SELECT v.id_venta, v.fecha_hora,
                   ${SQL_FECHA_PERU} as fecha_local,
                   COALESCE(v.subtotal, ROUND(v.total / 1.18, 2)) as subtotal,
                   COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2)) as igv,
                   v.total, v.estado,
                   u.nombre as nombre_vendedor,
                   COALESCE(c.nombre, 'Cliente General') as nombre_cliente,
                   COALESCE(c.documento, '-') as documento_cliente,
                   COALESCE(m.nombre, 'Efectivo') as metodo_pago,
                   v.id_metodo,
                   cp.numero as comprobante
            FROM venta v
            JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            LEFT JOIN metodo_pago m ON v.id_metodo = m.id_metodo
            LEFT JOIN comprobante cp ON v.id_venta = cp.id_venta
            WHERE ${SQL_FECHA_PERU} BETWEEN ? AND ? AND v.estado = 'confirmada'
            ORDER BY v.fecha_hora DESC
        `, [inicio, fin]);

        const [metodos] = await pool.query(`
            SELECT m.id_metodo, m.nombre as metodo,
                   COUNT(v.id_venta) as transacciones,
                   COALESCE(SUM(COALESCE(v.subtotal, ROUND(v.total / 1.18, 2))), 0) as subtotal,
                   COALESCE(SUM(COALESCE(v.igv, ROUND(v.total - ROUND(v.total / 1.18, 2), 2))), 0) as igv,
                   COALESCE(SUM(v.total), 0) as total
            FROM metodo_pago m
            LEFT JOIN venta v ON v.id_metodo = m.id_metodo 
              AND ${SQL_FECHA_PERU} BETWEEN ? AND ?
              AND v.estado = 'confirmada'
            GROUP BY m.id_metodo, m.nombre
            ORDER BY m.id_metodo ASC
        `, [inicio, fin]);

        const totalRecaudado = ventas.reduce((acc, v) => acc + Number(v.total), 0);
        const totalSubtotal = ventas.reduce((acc, v) => acc + Number(v.subtotal), 0);
        const totalIgv = ventas.reduce((acc, v) => acc + Number(v.igv), 0);

        res.json({
            rango: { inicio, fin },
            total_ventas: ventas.length,
            total_subtotal: parseFloat(totalSubtotal.toFixed(2)),
            total_igv: parseFloat(totalIgv.toFixed(2)),
            total_ingresos: parseFloat(totalRecaudado.toFixed(2)),
            metodos,
            ventas
        });
    } catch (e) {
        console.error('Error al generar reporte por rango:', e);
        res.status(500).json({ mensaje: 'Error al generar reporte por rango de fechas' });
    }
});

module.exports = router;
