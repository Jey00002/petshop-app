const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Listar productos (activos por defecto o todos si query todos=true)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { todos } = req.query;
        let query = `
            SELECT p.*, c.nombre_categoria, pr.nombre as nombre_proveedor 
            FROM producto p 
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria 
            LEFT JOIN proveedor pr ON p.id_proveedor = pr.id_proveedor
        `;
        if (!todos) {
            query += " WHERE p.estado = 'activo'";
        }
        query += ' ORDER BY p.id_producto DESC';
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (e) { 
        res.status(500).json({ mensaje: 'Error al obtener productos' }); 
    }
});

// Listar categorías disponibles
router.get('/categorias', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id_categoria, nombre_categoria FROM categoria WHERE estado = 'activo' ORDER BY nombre_categoria ASC");
        res.json(rows);
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al obtener categorías' });
    }
});

// Crear nueva categoría
router.post('/categorias', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { nombre_categoria } = req.body;
    if (!nombre_categoria || !nombre_categoria.trim()) {
        return res.status(400).json({ mensaje: 'El nombre de la categoría es obligatorio' });
    }
    try {
        const [exist] = await pool.query("SELECT id_categoria, nombre_categoria FROM categoria WHERE LOWER(nombre_categoria) = LOWER(?)", [nombre_categoria.trim()]);
        if (exist.length > 0) {
            return res.json({ ok: true, id_categoria: exist[0].id_categoria, nombre_categoria: exist[0].nombre_categoria, mensaje: 'Categoría ya existente' });
        }
        const [result] = await pool.query("INSERT INTO categoria (nombre_categoria, estado) VALUES (?, 'activo')", [nombre_categoria.trim()]);
        res.status(201).json({ ok: true, id_categoria: result.insertId, nombre_categoria: nombre_categoria.trim(), mensaje: 'Categoría creada' });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al crear categoría' });
    }
});

// Obtener un producto específico por ID (RF03)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, c.nombre_categoria, pr.nombre as nombre_proveedor 
            FROM producto p 
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria 
            LEFT JOIN proveedor pr ON p.id_proveedor = pr.id_proveedor
            WHERE p.id_producto = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
});

// Actualizar imagen del producto
router.put('/:id/imagen', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { id } = req.params;
    const { imagen_url } = req.body;
    try {
        await pool.query('UPDATE producto SET imagen_url = ? WHERE id_producto = ?', [imagen_url, id]);
        res.json({ ok: true, mensaje: 'Imagen de producto actualizada correctamente' });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al actualizar imagen' });
    }
});

// Crear nuevo producto (RF02)
router.post('/', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { nombre, descripcion, precio, stock, stock_minimo, id_categoria, id_proveedor, codigo_barras, imagen_url, nueva_categoria } = req.body;
    
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio.' });
    }
    if (precio === undefined || isNaN(precio) || Number(precio) <= 0) {
        return res.status(400).json({ mensaje: 'El precio debe ser un número mayor a cero.' });
    }
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        let finalCategoriaId = id_categoria;
        
        if (nueva_categoria && nueva_categoria.trim()) {
            const catTrim = nueva_categoria.trim();
            const [exist] = await connection.query("SELECT id_categoria FROM categoria WHERE LOWER(nombre_categoria) = LOWER(?)", [catTrim]);
            if (exist.length > 0) {
                finalCategoriaId = exist[0].id_categoria;
            } else {
                const [insCat] = await connection.query("INSERT INTO categoria (nombre_categoria, estado) VALUES (?, 'activo')", [catTrim]);
                finalCategoriaId = insCat.insertId;
            }
        }
        
        if (!finalCategoriaId) {
            finalCategoriaId = 1; // Default fallback
        }

        const finalProveedorId = id_proveedor ? parseInt(id_proveedor) : 1;
        const finalStock = parseInt(stock) || 0;
        const finalMinimo = parseInt(stock_minimo) || 5;
        const finalCodigo = codigo_barras && codigo_barras.trim() ? codigo_barras.trim() : `775${Date.now().toString().slice(-6)}`;
        let finalImg = imagen_url && imagen_url.trim() ? imagen_url.trim() : '/img/productos/alimento-premium.jpg';
        
        const [result] = await connection.query(`
            INSERT INTO producto (nombre, descripcion, precio, stock, stock_minimo, codigo_barras, id_categoria, id_proveedor, imagen_url, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
        `, [nombre.trim(), descripcion || '', parseFloat(precio), finalStock, finalMinimo, finalCodigo, finalCategoriaId, finalProveedorId, finalImg]);
        
        const newId = result.insertId;
        
        if (finalStock > 0) {
            await connection.query(`
                INSERT INTO movimiento_inventario (tipo, cantidad, motivo, fecha, id_producto, id_usuario)
                VALUES ('entrada', ?, 'Inventario inicial de registro', NOW(), ?, ?)
            `, [finalStock, newId, req.user.id_usuario]);
        }
        
        if (finalStock <= finalMinimo) {
            await connection.query(`
                INSERT INTO alerta_stock (fecha, estado, id_producto)
                VALUES (NOW(), 'activa', ?)
            `, [newId]);
        }
        
        await connection.commit();
        res.status(201).json({ ok: true, mensaje: 'Producto creado exitosamente', id_producto: newId });
    } catch (e) {
        await connection.rollback();
        console.error('Error al registrar producto:', e);
        res.status(500).json({ mensaje: 'Error al registrar el producto en la base de datos' });
    } finally {
        connection.release();
    }
});

// Modificar producto existente (RF03)
router.put('/:id', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock_minimo, id_categoria, id_proveedor, codigo_barras, imagen_url } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio.' });
    }
    if (precio === undefined || isNaN(precio) || Number(precio) <= 0) {
        return res.status(400).json({ mensaje: 'El precio debe ser un número mayor a cero.' });
    }

    try {
        await pool.query(`
            UPDATE producto 
            SET nombre = ?, 
                descripcion = ?, 
                precio = ?, 
                stock_minimo = ?, 
                id_categoria = ?, 
                id_proveedor = ?, 
                codigo_barras = ?, 
                imagen_url = COALESCE(?, imagen_url)
            WHERE id_producto = ?
        `, [
            nombre.trim(),
            descripcion || '',
            parseFloat(precio),
            parseInt(stock_minimo) || 5,
            parseInt(id_categoria) || 1,
            parseInt(id_proveedor) || 1,
            codigo_barras ? codigo_barras.trim() : null,
            imagen_url ? imagen_url.trim() : null,
            id
        ]);

        res.json({ ok: true, mensaje: 'Producto actualizado exitosamente' });
    } catch (e) {
        console.error('Error al actualizar producto:', e);
        res.status(500).json({ mensaje: 'Error al actualizar el producto' });
    }
});

// Desactivar / Activar producto (RF03)
router.patch('/:id/estado', verifyToken, requireRole('Administrador', 'Almacén', 'Proveedor'), async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ mensaje: "Estado inválido. Debe ser 'activo' o 'inactivo'." });
    }

    try {
        await pool.query('UPDATE producto SET estado = ? WHERE id_producto = ?', [estado, id]);
        res.json({ ok: true, mensaje: `Producto cambiado a estado ${estado}` });
    } catch (e) {
        res.status(500).json({ mensaje: 'Error al cambiar estado del producto' });
    }
});

module.exports = router;
