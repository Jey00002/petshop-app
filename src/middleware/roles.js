const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !req.user.rol) {
        return res.status(403).json({ error: 'Acceso no autorizado: Sin credenciales válidas', mensaje: '403 Forbidden' });
    }
    const userRoleNorm = normalize(req.user.rol);
    const esAdmin = userRoleNorm === 'admin' || userRoleNorm === 'administrador';
    const esProveedor = userRoleNorm === 'proveedor';

    // Regla estricta: Solo admin y proveedor tienen acceso general
    if (!esAdmin && !esProveedor) {
        return res.status(403).json({ 
            error: 'Acceso no autorizado. Solo administradores y proveedores pueden ingresar.',
            mensaje: 'Acceso no autorizado para este rol' 
        });
    }

    if (roles.length > 0) {
        const allowed = roles.some(r => {
            const rNorm = normalize(r);
            return rNorm === userRoleNorm || (rNorm === 'admin' && esAdmin) || (rNorm === 'administrador' && esAdmin);
        });
        if (!allowed) {
            return res.status(403).json({ 
                error: 'Acceso no autorizado para esta acción específica', 
                mensaje: '403 Forbidden: Sin permisos' 
            });
        }
    }
    next();
};

module.exports = { requireRole };
