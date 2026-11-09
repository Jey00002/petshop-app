# Sistema PetShop

## Requisitos previos
- Node.js (v14 o superior)
- MySQL Server en ejecución (con la base de datos `petshop` importada).

## Instalación
1. Clona el proyecto y entra en la carpeta.
2. Ejecuta `npm install` para instalar dependencias.
3. Configura las variables de entorno en el archivo `.env` según tu base de datos local.
4. (Opcional) Asegúrate de tener datos iniciales de usuarios con contraseñas en SHA256, ej. `caja123` -> `SHA2('caja123', 256)`.

## Ejecución
Ejecuta:
```bash
npm start
```
El servidor correrá en `http://localhost:3000`.

## Accesos
- Administrador -> `admin.html`
- Vendedor -> `pos.html`
- Almacén -> `almacen.html`
