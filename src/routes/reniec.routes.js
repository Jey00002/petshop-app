const express = require('express');
const router = express.Router();

// GET /api/reniec/dni/:numero
router.get('/dni/:numero', async (req, res) => {
    const { numero } = req.params;

    // 1. Validar que tenga exactamente 8 dígitos numéricos
    if (!numero || !/^\d{8}$/.test(numero.trim())) {
        return res.status(400).json({
            success: false,
            mensaje: 'El DNI debe contener exactamente 8 dígitos numéricos.'
        });
    }

    const dni = numero.trim();
    const token = process.env.RENIEC_TOKEN;

    try {
        let response;
        let data;

        // Si existe un token configurado en .env o Render, usar API v2 con autenticación
        if (token) {
            response = await fetch(`https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Referer': 'https://apis.net.pe'
                }
            });
            if (response.ok) {
                data = await response.json();
            }
        }

        // Fallback al endpoint v1 público si no hay token o falló v2
        if (!data) {
            response = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`);
            if (response.ok) {
                data = await response.json();
            }
        }

        if (!data || (!data.nombres && !data.nombre)) {
            return res.status(404).json({
                success: false,
                mensaje: 'DNI no encontrado en los registros de RENIEC.'
            });
        }

        const nombres = (data.nombres || '').trim();
        const apellidoPaterno = (data.apellidoPaterno || '').trim();
        const apellidoMaterno = (data.apellidoMaterno || '').trim();
        
        let nombreCompleto = '';
        if (apellidoPaterno || apellidoMaterno) {
            nombreCompleto = `${apellidoPaterno} ${apellidoMaterno}, ${nombres}`.trim();
        } else {
            nombreCompleto = data.nombre || nombres;
        }

        return res.json({
            success: true,
            data: {
                nombres,
                apellidoPaterno,
                apellidoMaterno,
                nombreCompleto
            }
        });
    } catch (error) {
        console.error('Error al consultar RENIEC:', error.message);
        return res.status(502).json({
            success: false,
            mensaje: 'No se pudo consultar el DNI. Por favor, ingrese los datos manualmente.'
        });
    }
});

module.exports = router;
