const mysql = require('mysql2/promise');
require('dotenv').config({ override: true });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') 
        ? { rejectUnauthorized: false } 
        : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`CREATE TABLE IF NOT EXISTS metodo_pago (id_metodo INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(50) NOT NULL)`);
        await connection.query(`
            INSERT INTO metodo_pago (id_metodo, nombre) VALUES 
            (1, 'Efectivo'), (2, 'Tarjeta'), (3, 'Yape')
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        `);
        await connection.query(`CREATE TABLE IF NOT EXISTS comprobante (id_comprobante INT AUTO_INCREMENT PRIMARY KEY, serie VARCHAR(10) NOT NULL, numero VARCHAR(20) NOT NULL, id_venta INT NOT NULL UNIQUE)`);
        try {
            await connection.query(`ALTER TABLE venta ADD COLUMN id_metodo INT`);
            await connection.query(`ALTER TABLE venta ADD CONSTRAINT fk_venta_metodo FOREIGN KEY (id_metodo) REFERENCES metodo_pago(id_metodo)`);
        } catch(e) {}
        try {
            await connection.query(`ALTER TABLE venta ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT '0.00'`);
        } catch(e) {}
        try {
            await connection.query(`ALTER TABLE venta ADD COLUMN igv DECIMAL(10,2) NOT NULL DEFAULT '0.00'`);
        } catch(e) {}
        try {
            await connection.query(`UPDATE venta SET subtotal = ROUND(total / 1.18, 2), igv = ROUND(total - ROUND(total / 1.18, 2), 2) WHERE (subtotal = 0 OR subtotal IS NULL) AND total > 0`);
        } catch(e) {}
        
        // Tabla de gestión de turnos de caja (Apertura y Cierre de Caja)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS caja (
                id_caja INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                monto_inicial DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre DATETIME NULL,
                monto_final_esperado DECIMAL(10,2) NULL,
                monto_final_real DECIMAL(10,2) NULL,
                diferencia DECIMAL(10,2) NULL,
                total_ventas_efectivo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total_ventas_tarjeta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total_ventas_yape DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total_ventas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                cantidad_ventas INT NOT NULL DEFAULT 0,
                estado ENUM('abierta', 'cerrada') NOT NULL DEFAULT 'abierta',
                observaciones TEXT NULL,
                KEY fk_caja_usuario (id_usuario),
                CONSTRAINT fk_caja_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci
        `);
        try {
            await connection.query(`ALTER TABLE venta ADD COLUMN id_caja INT NULL`);
            await connection.query(`ALTER TABLE venta ADD CONSTRAINT fk_venta_caja FOREIGN KEY (id_caja) REFERENCES caja(id_caja)`);
        } catch(e) {}

        await connection.query(`CREATE TABLE IF NOT EXISTS alerta_stock (id_alerta INT AUTO_INCREMENT PRIMARY KEY, fecha DATETIME NOT NULL, estado ENUM('activa', 'resuelta') DEFAULT 'activa', id_producto INT NOT NULL)`);

        // Soporte de recuperación de contraseña en usuario
        try {
            await connection.query(`ALTER TABLE usuario ADD COLUMN email VARCHAR(100) NULL`);
        } catch(e) {}
        try {
            await connection.query(`ALTER TABLE usuario ADD COLUMN token_recuperacion VARCHAR(100) NULL`);
        } catch(e) {}
        try {
            await connection.query(`ALTER TABLE usuario ADD COLUMN expiracion_token DATETIME NULL`);
        } catch(e) {}

        // Asignar emails por defecto para recuperación
        await connection.query(`UPDATE usuario SET email = 'admin@petshop.com' WHERE usuario = 'admin' AND (email IS NULL OR email = '')`);
        await connection.query(`UPDATE usuario SET email = 'caja01@petshop.com' WHERE usuario = 'caja01' AND (email IS NULL OR email = '')`);
        await connection.query(`UPDATE usuario SET email = 'alm01@petshop.com' WHERE usuario = 'alm01' AND (email IS NULL OR email = '')`);

        // Asegurar que el usuario administrador esté siempre activo
        try {
            await connection.query(`UPDATE usuario SET estado = 'activo' WHERE usuario = 'admin' OR id_rol = 1`);
        } catch(e) {}

        // Soporte de imágenes para productos
        try {
            await connection.query(`ALTER TABLE producto ADD COLUMN imagen_url VARCHAR(500) NULL`);
        } catch(e) {}

        // Actualizar imágenes iniciales profesionales de alta calidad
        const defaultImages = [
            { id: 1, img: '/img/productos/alimento-premium.jpg' },
            { id: 2, img: '/img/productos/alimento-cachorro.jpg' },
            { id: 3, img: '/img/productos/juguete.jpg' },
            { id: 4, img: '/img/productos/champu.jpg' },
            { id: 5, img: '/img/productos/correa.jpg' },
            { id: 7, img: '/img/productos/snack-dental.jpg' }
        ];
        for (const item of defaultImages) {
            await connection.query(
                `UPDATE producto SET imagen_url = ? WHERE id_producto = ?`,
                [item.img, item.id]
            );
        }

        // Catálogo expandido de productos por defecto
        const catalogProducts = [
            { codigo: '775008', nombre: 'Cama Ortopédica Memory Foam L', desc: 'Cama acolchada y ergonómica con funda lavable para perros medianos y grandes', precio: 110.00, stock: 8, min: 3, cat: 5, img: '/img/productos/cama-perro.jpg' },
            { codigo: '775009', nombre: 'Rascador Torre para Gato con Hamaca', desc: 'Árbol rascador de 3 niveles con postes de sisal natural y cueva de descanso', precio: 145.00, stock: 6, min: 2, cat: 2, img: '/img/productos/rascador-gato.jpg' },
            { codigo: '775010', nombre: 'Alimento Gatos Esterilizados 7kg', desc: 'Nutrición balanceada sabor salmón con control de peso y bolas de pelo', precio: 98.50, stock: 15, min: 5, cat: 1, img: '/img/productos/alimento-gato.jpg' },
            { codigo: '775011', nombre: 'Arnés Táctico Antitirones', desc: 'Arnés transpirable con reflectantes nocturnos y doble anilla de sujeción', precio: 48.00, stock: 12, min: 4, cat: 5, img: '/img/productos/arnes-perro.jpg' },
            { codigo: '775012', nombre: 'Chompa Térmica Polar Mascotas M', desc: 'Abrigo suave y térmico para invierno con apertura para correa', precio: 35.00, stock: 20, min: 5, cat: 4, img: '/img/productos/ropa-perro.jpg' },
            { codigo: '775013', nombre: 'Transportadora Kennel Plástica', desc: 'Caja de transporte aprobada con puerta metálica y ventilación 360°', precio: 130.00, stock: 7, min: 3, cat: 5, img: '/img/productos/transportadora.jpg' },
            { codigo: '775014', nombre: 'Arena Sanitaria Aglomerante 10kg', desc: 'Bentonita natural de alta absorción y neutralización de olores', precio: 38.00, stock: 25, min: 8, cat: 3, img: '/img/productos/arena-sanitaria.jpg' },
            { codigo: '775015', nombre: 'Cepillo Deslanador Cardina Pro', desc: 'Peine deslanador de púas metálicas protegidas para remover subpelo', precio: 29.90, stock: 14, min: 4, cat: 3, img: '/img/productos/cepillo-mascota.jpg' },
            { codigo: '775016', nombre: 'Pelota Dispensadora de Snacks', desc: 'Pelota de goma interactiva resistente para juego y estimulación cognitiva', precio: 22.00, stock: 18, min: 5, cat: 2, img: '/img/productos/pelota-juguete.jpg' },
            { codigo: '775017', nombre: 'Collar Antipulgas y Garrapatas', desc: 'Protección continua y repelente de hasta 8 meses para perros y cachorros', precio: 55.00, stock: 22, min: 6, cat: 3, img: '/img/productos/collar-antipulgas.jpg' }
        ];

        for (const p of catalogProducts) {
            const [exist] = await connection.query('SELECT id_producto FROM producto WHERE codigo_barras = ? OR nombre = ?', [p.codigo, p.nombre]);
            if (exist.length === 0) {
                const [ins] = await connection.query(
                    'INSERT INTO producto (nombre, descripcion, precio, stock, stock_minimo, codigo_barras, id_categoria, id_proveedor, imagen_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, "activo")',
                    [p.nombre, p.desc, p.precio, p.stock, p.min, p.codigo, p.cat, p.img]
                );
                await connection.query(
                    'INSERT INTO movimiento_inventario (tipo, cantidad, motivo, fecha, id_producto, id_usuario) VALUES ("entrada", ?, "Carga inicial de producto", NOW(), ?, 1)',
                    [p.stock, ins.insertId]
                );
            }
        }

        // Asegurar cliente por defecto
        const [cliGen] = await connection.query('SELECT COUNT(*) as c FROM cliente WHERE id_cliente = 1');
        if (cliGen[0].c === 0) {
            await connection.query("INSERT INTO cliente (id_cliente, documento, nombre, contacto) VALUES (1, '00000000', 'Cliente General', 'Mostrador') ON DUPLICATE KEY UPDATE nombre='Cliente General'");
        }

        // Índices para optimización de rendimiento (RNF06)
        try { await connection.query('CREATE INDEX idx_venta_fechahora_estado ON venta(fecha_hora, estado)'); } catch(e) {}
        try { await connection.query('CREATE INDEX idx_producto_nombre ON producto(nombre)'); } catch(e) {}
        try { await connection.query('CREATE INDEX idx_alerta_estado ON alerta_stock(estado, id_producto)'); } catch(e) {}

        connection.release();
    } catch(e) {
        console.error('Error DB Init:', e.message);
    }
}
initDB();
module.exports = pool;
