const pool = require('../src/db');
const bcrypt = require('bcryptjs');

async function seedProveedor() {
    console.log('--- Iniciando Seed para Rol y Usuario Proveedor ---');
    try {
        // 1. Verificar o crear el Rol 'Proveedor'
        const [roles] = await pool.query(
            "SELECT id_rol, nombre_rol FROM rol WHERE LOWER(nombre_rol) = 'proveedor'"
        );

        let rolId;
        if (roles.length === 0) {
            const [newRol] = await pool.query(
                "INSERT INTO rol (nombre_rol, estado) VALUES ('Proveedor', 'activo')"
            );
            rolId = newRol.insertId;
            console.log(`Rol 'Proveedor' creado con ID: ${rolId}`);
        } else {
            rolId = roles[0].id_rol;
            console.log(`Rol 'Proveedor' ya existente con ID: ${rolId}`);
        }

        // 2. Verificar o crear el Usuario demo con rol 'Proveedor'
        const [usuarios] = await pool.query(
            "SELECT id_usuario, usuario FROM usuario WHERE usuario = 'proveedor'"
        );

        const passwordDemo = 'proveedor123';
        const hashedPassword = await bcrypt.hash(passwordDemo, 10);

        if (usuarios.length === 0) {
            const [newUser] = await pool.query(
                `INSERT INTO usuario (usuario, contrasena, nombre, estado, id_rol, email) 
                 VALUES ('proveedor', ?, 'Distribuidora Animal Pro', 'activo', ?, 'proveedor@petshop.com')`,
                [hashedPassword, rolId]
            );
            console.log(`Usuario demo 'proveedor' creado (ID: ${newUser.insertId}) con contraseña: ${passwordDemo}`);
        } else {
            await pool.query(
                `UPDATE usuario 
                 SET contrasena = ?, id_rol = ?, estado = 'activo' 
                 WHERE id_usuario = ?`,
                [hashedPassword, rolId, usuarios[0].id_usuario]
            );
            console.log(`Usuario 'proveedor' actualizado correctamente con rol Proveedor y contraseña: ${passwordDemo}`);
        }

        // 3. Verificar si existe al menos un registro en la tabla 'proveedor'
        const [provRows] = await pool.query("SELECT id_proveedor FROM proveedor WHERE nombre LIKE '%Distribuidora Animal Pro%'");
        if (provRows.length === 0) {
            await pool.query(
                "INSERT INTO proveedor (nombre, contacto, telefono, estado) VALUES ('Distribuidora Animal Pro', 'proveedor@petshop.com', '987654321', 'activo')"
            );
            console.log("Proveedor comercial 'Distribuidora Animal Pro' registrado en tabla proveedor.");
        }

        console.log('Seed completado con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('Error durante el seed:', error);
        process.exit(1);
    }
}

seedProveedor();
