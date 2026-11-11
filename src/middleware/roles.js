const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !req.user.rol) {
        return res.status(403).json({ error: 'Acceso no autorizado: Sin credenciales válidas', mensaje: '403 Forbidden' });
    }
    const userRoleNorm = normalize(req.user.rol);
    const esAdmin = userRoleNorm === 'admin' || userRoleNorm === 'administrador';
    const esProveedor = userRoleNorm === 'proveedor';
    const esCajero = userRoleNorm === 'vendedor' || userRoleNorm === 'cajero';

    // Regla estricta: Solo admin, proveedor y cajero tienen acceso al sistema
    if (!esAdmin && !esProveedor && !esCajero) {
        return res.status(403).json({ 
            error: 'Acceso no autorizado para este rol.',
            mensaje: 'Acceso no autorizado para este rol' 
        });
    }

    if (roles.length > 0) {
        const allowed = roles.some(r => {
            const rNorm = normalize(r);
            return rNorm === userRoleNorm || 
                   (rNorm === 'admin' && esAdmin) || 
                   (rNorm === 'administrador' && esAdmin) ||
                   ((rNorm === 'vendedor' || rNorm === 'cajero') && esCajero);
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
