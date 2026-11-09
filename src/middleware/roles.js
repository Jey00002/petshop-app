const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !req.user.rol) return res.status(403).json({ mensaje: '403 Forbidden' });
    const userRoleNorm = normalize(req.user.rol);
    const allowed = roles.some(r => normalize(r) === userRoleNorm);
    if (!allowed) return res.status(403).json({ mensaje: '403 Forbidden: Sin permisos' });
    next();
};

module.exports = { requireRole };
