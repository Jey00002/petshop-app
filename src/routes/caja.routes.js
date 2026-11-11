const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Helper para fecha en zona horaria de Perú (UTC-5)
function getPeruDate(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}

// SQL para comparar fechas convirtiendo UTC a hora de Perú dinámicamente
const SQL_FECHA_PERU = (col) => `DATE(DATE_SUB(${col}, INTERVAL (TIMESTAMPDIFF(HOUR, NOW(), UTC_TIMESTAMP()) + 5) HOUR))`;

// 1. Obtener estado actual de la caja para el cajero en sesión o usuario especificado
router.get(['/estado', '/estado/:id_usuario'], verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const targetUserId = req.params.id_usuario ? parseInt(req.params.id_usuario) : req.user.id_usuario;

        const [cajas] = await pool.query(`
            SELECT c.*, u.nombre as nombre_usuario
            FROM caja c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.estado = 'abierta' AND (c.id_usuario = ? OR 1=1)
            ORDER BY CASE WHEN c.id_usuario = ? THEN 0 ELSE 1 END, c.id_caja DESC
            LIMIT 1
        `, [targetUserId, targetUserId]);

        if (cajas.length === 0) {
            return res.json({ abierta: false, caja: null });
        }

        const caja = cajas[0];

        // Calcular ventas acumuladas durante este turno de caja
        const [metricas] = await pool.query(`
            SELECT 
                COUNT(v.id_venta) as cantidad_ventas,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COALESCE(SUM(CASE WHEN v.id_metodo = 1 THEN v.total ELSE 0 END), 0) as ventas_efectivo,
                COALESCE(SUM(CASE WHEN v.id_metodo = 2 THEN v.total ELSE 0 END), 0) as ventas_tarjeta,
                COALESCE(SUM(CASE WHEN v.id_metodo = 3 THEN v.total ELSE 0 END), 0) as ventas_yape
            FROM venta v
            WHERE v.id_caja = ? AND v.estado = 'confirmada'
        `, [caja.id_caja]);

        const m = metricas[0];
        const montoInicial = parseFloat(caja.monto_inicial || 0);
        const ventasEfectivo = parseFloat(m.ventas_efectivo || 0);
        const ventasTarjeta = parseFloat(m.ventas_tarjeta || 0);
        const ventasYape = parseFloat(m.ventas_yape || 0);
        const totalVentas = parseFloat(m.total_ventas || 0);
        const esperadoEfectivo = montoInicial + ventasEfectivo;

        res.json({
            abierta: true,
            caja: {
                id_caja: caja.id_caja,
                id_usuario: caja.id_usuario,
                nombre_usuario: caja.nombre_usuario,
                monto_inicial: montoInicial,
                fecha_apertura: caja.fecha_apertura,
                cantidad_ventas: parseInt(m.cantidad_ventas || 0),
                ventas_efectivo: ventasEfectivo,
                ventas_tarjeta: ventasTarjeta,
                ventas_yape: ventasYape,
                total_ventas: totalVentas,
                monto_esperado_efectivo: parseFloat(esperadoEfectivo.toFixed(2))
            }
        });
    } catch (e) {
        console.error('Error al consultar estado de caja:', e);
        res.status(500).json({ mensaje: 'Error al consultar estado de caja' });
    }
});

// 2. Apertura de caja (inicio de turno durante el día)
router.post(['/abrir', '/apertura'], verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const { monto_inicial, id_usuario } = req.body;
        const montoIni = parseFloat(monto_inicial);
        const targetUserId = id_usuario ? parseInt(id_usuario) : req.user.id_usuario;

        if (isNaN(montoIni) || montoIni < 0) {
            return res.status(400).json({ mensaje: 'El monto inicial debe ser un número válido mayor o igual a 0.' });
        }

        // Verificar si ya existe una caja abierta para este usuario
        const [existentes] = await pool.query(
            `SELECT id_caja FROM caja WHERE estado = 'abierta' AND id_usuario = ?`,
            [targetUserId]
        );

        if (existentes.length > 0) {
            return res.status(400).json({ mensaje: 'Ya tienes una caja abierta. Debes cerrarla antes de abrir una nueva.' });
        }

        const [resultado] = await pool.query(
            `INSERT INTO caja (id_usuario, monto_inicial, fecha_apertura, estado) VALUES (?, ?, NOW(), 'abierta')`,
            [targetUserId, montoIni]
        );

        res.status(201).json({
            success: true,
            mensaje: 'Caja abierta correctamente. ¡Buen turno de ventas!',
            id_caja: resultado.insertId,
            monto_inicial: montoIni,
            fecha_apertura: new Date().toISOString()
        });
    } catch (e) {
        console.error('Error al abrir caja:', e);
        res.status(500).json({ mensaje: 'Error al abrir la caja' });
    }
});

// 3. Resumen en tiempo real para Arqueo / Cierre de Caja
router.get(['/resumen', '/resumen/:id_caja'], verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        let caja = null;

        if (req.params.id_caja) {
            const [cajas] = await pool.query(`
                SELECT c.*, u.nombre as nombre_usuario
                FROM caja c
                JOIN usuario u ON c.id_usuario = u.id_usuario
                WHERE c.id_caja = ?
            `, [parseInt(req.params.id_caja)]);
            if (cajas.length > 0) caja = cajas[0];
        } else {
            const [cajas] = await pool.query(`
                SELECT c.*, u.nombre as nombre_usuario
                FROM caja c
                JOIN usuario u ON c.id_usuario = u.id_usuario
                WHERE c.estado = 'abierta' AND (c.id_usuario = ? OR 1=1)
                ORDER BY CASE WHEN c.id_usuario = ? THEN 0 ELSE 1 END, c.id_caja DESC
                LIMIT 1
            `, [req.user.id_usuario, req.user.id_usuario]);
            if (cajas.length > 0) caja = cajas[0];
        }

        if (!caja) {
            return res.status(400).json({ mensaje: 'No hay ninguna caja abierta actualmente.' });
        }

        const [metricas] = await pool.query(`
            SELECT 
                COUNT(v.id_venta) as cantidad_ventas,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COALESCE(SUM(v.subtotal), 0) as subtotal_ventas,
                COALESCE(SUM(v.igv), 0) as igv_ventas,
                COALESCE(SUM(CASE WHEN v.id_metodo = 1 THEN v.total ELSE 0 END), 0) as ventas_efectivo,
                COALESCE(SUM(CASE WHEN v.id_metodo = 2 THEN v.total ELSE 0 END), 0) as ventas_tarjeta,
                COALESCE(SUM(CASE WHEN v.id_metodo = 3 THEN v.total ELSE 0 END), 0) as ventas_yape
            FROM venta v
            WHERE v.id_caja = ? AND v.estado = 'confirmada'
        `, [caja.id_caja]);

        const m = metricas[0];
        const montoInicial = parseFloat(caja.monto_inicial || 0);
        const ventasEfectivo = parseFloat(m.ventas_efectivo || 0);
        const ventasTarjeta = parseFloat(m.ventas_tarjeta || 0);
        const ventasYape = parseFloat(m.ventas_yape || 0);
        const totalVentas = parseFloat(m.total_ventas || 0);
        const subtotal = parseFloat(m.subtotal_ventas || 0);
        const igv = parseFloat(m.igv_ventas || 0);
        const esperadoEfectivo = montoInicial + ventasEfectivo;

        res.json({
            id_caja: caja.id_caja,
            nombre_cajero: caja.nombre_usuario,
            fecha_apertura: caja.fecha_apertura,
            monto_inicial: montoInicial,
            cantidad_ventas: parseInt(m.cantidad_ventas || 0),
            ventas_efectivo: ventasEfectivo,
            ventas_tarjeta: ventasTarjeta,
            ventas_yape: ventasYape,
            subtotal_ventas: subtotal,
            igv_ventas: igv,
            total_ventas: totalVentas,
            monto_esperado_efectivo: parseFloat(esperadoEfectivo.toFixed(2))
        });
    } catch (e) {
        console.error('Error al generar resumen de caja:', e);
        res.status(500).json({ mensaje: 'Error al generar resumen de caja' });
    }
});

// 4. Corte Parcial en vivo durante el día (Arqueo X sin cerrar la caja)
router.get('/corte-parcial', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const [cajas] = await pool.query(`
            SELECT c.*, u.nombre as nombre_usuario
            FROM caja c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.estado = 'abierta' AND (c.id_usuario = ? OR 1=1)
            ORDER BY CASE WHEN c.id_usuario = ? THEN 0 ELSE 1 END, c.id_caja DESC
            LIMIT 1
        `, [req.user.id_usuario, req.user.id_usuario]);

        if (cajas.length === 0) {
            return res.status(400).json({ mensaje: 'No hay ninguna caja abierta en este momento para realizar un corte parcial.' });
        }

        const caja = cajas[0];

        const [metricas] = await pool.query(`
            SELECT 
                COUNT(v.id_venta) as cantidad_ventas,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COALESCE(SUM(v.subtotal), 0) as subtotal_ventas,
                COALESCE(SUM(v.igv), 0) as igv_ventas,
                COALESCE(SUM(CASE WHEN v.id_metodo = 1 THEN v.total ELSE 0 END), 0) as ventas_efectivo,
                COALESCE(SUM(CASE WHEN v.id_metodo = 2 THEN v.total ELSE 0 END), 0) as ventas_tarjeta,
                COALESCE(SUM(CASE WHEN v.id_metodo = 3 THEN v.total ELSE 0 END), 0) as ventas_yape
            FROM venta v
            WHERE v.id_caja = ? AND v.estado = 'confirmada'
        `, [caja.id_caja]);

        const m = metricas[0];
        const montoInicial = parseFloat(caja.monto_inicial || 0);
        const ventasEfectivo = parseFloat(m.ventas_efectivo || 0);
        const ventasTarjeta = parseFloat(m.ventas_tarjeta || 0);
        const ventasYape = parseFloat(m.ventas_yape || 0);
        const totalVentas = parseFloat(m.total_ventas || 0);
        const esperadoEfectivo = montoInicial + ventasEfectivo;

        res.json({
            tipo_corte: 'Corte Parcial en Vivo (Arqueo X)',
            id_caja: caja.id_caja,
            nombre_cajero: caja.nombre_usuario,
            fecha_apertura: caja.fecha_apertura,
            fecha_corte: new Date().toISOString(),
            monto_inicial: montoInicial,
            cantidad_ventas: parseInt(m.cantidad_ventas || 0),
            ventas_efectivo: ventasEfectivo,
            ventas_tarjeta: ventasTarjeta,
            ventas_yape: ventasYape,
            total_ventas: totalVentas,
            monto_esperado_efectivo: parseFloat(esperadoEfectivo.toFixed(2))
        });
    } catch (e) {
        console.error('Error al obtener corte parcial:', e);
        res.status(500).json({ mensaje: 'Error al generar corte parcial de caja' });
    }
});

// 5. Cierre y Arqueo de Caja (fin de turno durante el día)
router.post(['/cerrar', '/cierre'], verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const montoRealInput = req.body.monto_real !== undefined ? req.body.monto_real : req.body.monto_final_real;
        const { observaciones, id_caja } = req.body;
        const montoReal = parseFloat(montoRealInput);

        if (isNaN(montoReal) || montoReal < 0) {
            return res.status(400).json({ mensaje: 'Debes ingresar el monto real en efectivo contado en caja.' });
        }

        // Buscar caja abierta
        let queryCaja = `
            SELECT c.*, u.nombre as nombre_usuario
            FROM caja c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.estado = 'abierta'
        `;
        let paramsCaja = [];

        if (id_caja) {
            queryCaja += ` AND c.id_caja = ? LIMIT 1 FOR UPDATE`;
            paramsCaja.push(parseInt(id_caja));
        } else {
            queryCaja += ` AND (c.id_usuario = ? OR 1=1)
            ORDER BY CASE WHEN c.id_usuario = ? THEN 0 ELSE 1 END, c.id_caja DESC
            LIMIT 1 FOR UPDATE`;
            paramsCaja.push(req.user.id_usuario, req.user.id_usuario);
        }

        const [cajas] = await connection.query(queryCaja, paramsCaja);

        if (cajas.length === 0) {
            await connection.rollback();
            return res.status(400).json({ mensaje: 'No hay ninguna caja abierta para cerrar.' });
        }

        const caja = cajas[0];

        // Calcular ventas consolidadas del turno
        const [metricas] = await connection.query(`
            SELECT 
                COUNT(v.id_venta) as cantidad_ventas,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COALESCE(SUM(CASE WHEN v.id_metodo = 1 THEN v.total ELSE 0 END), 0) as ventas_efectivo,
                COALESCE(SUM(CASE WHEN v.id_metodo = 2 THEN v.total ELSE 0 END), 0) as ventas_tarjeta,
                COALESCE(SUM(CASE WHEN v.id_metodo = 3 THEN v.total ELSE 0 END), 0) as ventas_yape
            FROM venta v
            WHERE v.id_caja = ? AND v.estado = 'confirmada'
        `, [caja.id_caja]);

        const m = metricas[0];
        const montoInicial = parseFloat(caja.monto_inicial || 0);
        const ventasEfectivo = parseFloat(m.ventas_efectivo || 0);
        const ventasTarjeta = parseFloat(m.ventas_tarjeta || 0);
        const ventasYape = parseFloat(m.ventas_yape || 0);
        const totalVentas = parseFloat(m.total_ventas || 0);
        const cantidadVentas = parseInt(m.cantidad_ventas || 0);

        const esperadoTotal = parseFloat((montoInicial + totalVentas).toFixed(2));
        const esperadoEfectivo = parseFloat((montoInicial + ventasEfectivo).toFixed(2));
        const diferencia = parseFloat((montoReal - esperadoEfectivo).toFixed(2));

        // Actualizar registro de caja a 'cerrada'
        await connection.query(`
            UPDATE caja SET 
                fecha_cierre = NOW(),
                monto_esperado = ?,
                monto_final_esperado = ?,
                monto_real = ?,
                monto_final_real = ?,
                diferencia = ?,
                total_efectivo = ?,
                total_tarjeta = ?,
                total_yape_plin = ?,
                total_ventas_efectivo = ?,
                total_ventas_tarjeta = ?,
                total_ventas_yape = ?,
                total_ventas = ?,
                cantidad_ventas = ?,
                estado = 'cerrada',
                observaciones = ?
            WHERE id_caja = ?
        `, [
            esperadoTotal,
            esperadoEfectivo,
            montoReal,
            montoReal,
            diferencia,
            ventasEfectivo,
            ventasTarjeta,
            ventasYape,
            ventasEfectivo,
            ventasTarjeta,
            ventasYape,
            totalVentas,
            cantidadVentas,
            observaciones || null,
            caja.id_caja
        ]);

        await connection.commit();

        let estadoCuadre = 'Exacto';
        if (diferencia > 0) estadoCuadre = `Sobrante (+S/ ${diferencia.toFixed(2)})`;
        else if (diferencia < 0) estadoCuadre = `Faltante (-S/ ${Math.abs(diferencia).toFixed(2)})`;

        res.json({
            success: true,
            mensaje: 'Caja cerrada y arqueo generado correctamente',
            monto_esperado: esperadoTotal,
            monto_real: montoReal,
            diferencia: diferencia,
            arqueo: {
                id_caja: caja.id_caja,
                cajero: caja.nombre_usuario,
                fecha_apertura: caja.fecha_apertura,
                fecha_cierre: new Date().toISOString(),
                monto_inicial: montoInicial,
                ventas_efectivo: ventasEfectivo,
                ventas_tarjeta: ventasTarjeta,
                ventas_yape: ventasYape,
                total_ventas: totalVentas,
                cantidad_ventas: cantidadVentas,
                monto_esperado: esperadoTotal,
                monto_final_esperado: esperadoEfectivo,
                monto_real: montoReal,
                monto_final_real: montoReal,
                diferencia,
                estado_cuadre: estadoCuadre,
                observaciones: observaciones || ''
            }
        });
    } catch (e) {
        await connection.rollback();
        console.error('Error al cerrar caja:', e);
        res.status(500).json({ mensaje: 'Error al cerrar la caja', error: e.message });
    } finally {
        connection.release();
    }
});

// 6. Consultar todos los cierres y arqueos realizados DURANTE EL DÍA
router.get('/cierres-del-dia', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const fechaTarget = req.query.fecha ? req.query.fecha.trim() : getPeruDate();

        // Buscar todos los turnos que abrieron o cerraron en esta fecha
        const [turnos] = await pool.query(`
            SELECT c.*, u.nombre as nombre_usuario
            FROM caja c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE ${SQL_FECHA_PERU('c.fecha_apertura')} = ? OR ${SQL_FECHA_PERU('c.fecha_cierre')} = ?
            ORDER BY c.id_caja DESC
        `, [fechaTarget, fechaTarget]);

        let totalFondos = 0;
        let totalEf = 0;
        let totalTj = 0;
        let totalYp = 0;
        let totalV = 0;
        let totalCantVentas = 0;
        let totalEsp = 0;
        let totalReal = 0;
        let totalDif = 0;
        let turnosCerrados = 0;

        turnos.forEach(t => {
            totalFondos += parseFloat(t.monto_inicial || 0);
            totalEf += parseFloat(t.total_ventas_efectivo || 0);
            totalTj += parseFloat(t.total_ventas_tarjeta || 0);
            totalYp += parseFloat(t.total_ventas_yape || 0);
            totalV += parseFloat(t.total_ventas || 0);
            totalCantVentas += parseInt(t.cantidad_ventas || 0);
            
            if (t.estado === 'cerrada') {
                turnosCerrados++;
                totalEsp += parseFloat(t.monto_final_esperado || 0);
                totalReal += parseFloat(t.monto_final_real || 0);
                totalDif += parseFloat(t.diferencia || 0);
            }
        });

        res.json({
            fecha: fechaTarget,
            total_turnos: turnos.length,
            turnos_cerrados: turnosCerrados,
            turnos,
            resumen_dia: {
                total_fondos_iniciales: parseFloat(totalFondos.toFixed(2)),
                total_ventas_efectivo: parseFloat(totalEf.toFixed(2)),
                total_ventas_tarjeta: parseFloat(totalTj.toFixed(2)),
                total_ventas_yape: parseFloat(totalYp.toFixed(2)),
                total_ventas: parseFloat(totalV.toFixed(2)),
                total_cantidad_ventas: totalCantVentas,
                total_esperado_efectivo: parseFloat(totalEsp.toFixed(2)),
                total_real_efectivo: parseFloat(totalReal.toFixed(2)),
                total_diferencia: parseFloat(totalDif.toFixed(2))
            }
        });
    } catch (e) {
        console.error('Error al consultar cierres del día:', e);
        res.status(500).json({ mensaje: 'Error al consultar cierres de caja del día' });
    }
});

// 7. Historial de Cajas / Arqueos (para Administrador y control general)
router.get('/historial', verifyToken, requireRole('Administrador', 'Vendedor'), async (req, res) => {
    try {
        const [cajas] = await pool.query(`
            SELECT c.*, u.nombre as nombre_usuario
            FROM caja c
            JOIN usuario u ON c.id_usuario = u.id_usuario
            ORDER BY c.id_caja DESC
            LIMIT 50
        `);
        res.json(cajas);
    } catch (e) {
        console.error('Error al consultar historial de cajas:', e);
        res.status(500).json({ mensaje: 'Error al obtener historial de cajas' });
    }
});

module.exports = router;
