checkAuth(['Administrador', 'Vendedor']);

let allProducts = [];
let cart = [];
let selectedMethod = 1;
let currentViewer = null;
let cajaActual = null;
let resumenCajaCache = null;

let currentClient = {
    id_cliente: 1,
    nombre: 'Cliente General',
    documento: '00000000'
};

async function initPOS() {
    try {
        const [productos] = await Promise.all([
            fetchAPI('/productos'),
            verificarEstadoCaja(true)
        ]);
        allProducts = productos;
        renderCategories();
        renderGrid(allProducts);
        actualizarDisplayCliente();
    } catch(e) { 
        showToast(e.message, 'error'); 
    }
}

// ==========================================
// CONTROL DE CAJA: APERTURA Y CIERRE (ARQUEO)
// ==========================================
async function verificarEstadoCaja(autoOpenModal = false) {
    const chip = document.getElementById('cajaStatusChip');
    const actions = document.getElementById('cajaActionsBox');
    const banner = document.getElementById('bannerCajaCerrada');

    try {
        const res = await fetchAPI('/caja/estado');
        if (res.abierta && res.caja) {
            cajaActual = res.caja;
            if (banner) banner.style.display = 'none';

            if (chip) {
                chip.innerHTML = `
                    <span class="badge ok" style="font-size:0.82rem; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;">
                        <i class='bx bx-lock-open-alt'></i> Caja Abierta (#${cajaActual.id_caja})
                    </span>
                    <span style="font-size:0.8rem; color:#475569; font-weight:600; display:none; @media(min-width:600px){display:inline};">
                        Fondo: S/ ${parseFloat(cajaActual.monto_inicial).toFixed(2)} | Esperado Ef.: S/ ${parseFloat(cajaActual.monto_esperado_efectivo).toFixed(2)}
                    </span>
                `;
            }

            if (actions) {
                const rolActual = (localStorage.getItem('rol') || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                const esCajero = rolActual === 'vendedor' || rolActual === 'cajero';

                let btnCerrarHtml = '';
                if (esCajero) {
                    btnCerrarHtml = `
                        <button type="button" class="btn btn-outline" style="border-color:#ef4444; color:#ef4444; padding:6px 12px; font-size:0.82rem; font-weight:700;" onclick="abrirModalCierre()" title="Cerrar turno y realizar arqueo">
                            <i class='bx bx-archive-in'></i> Cerrar Caja
                        </button>
                    `;
                } else {
                    btnCerrarHtml = `
                        <span class="badge" style="background:#f1f5f9; color:#64748b; font-size:0.75rem; padding:6px 10px; display:inline-flex; align-items:center; gap:4px;" title="Cierre exclusivo para el cajero">
                            <i class='bx bx-shield-quarter'></i> Cierre exclusivo de Cajero
                        </span>
                    `;
                }

                actions.innerHTML = `
                    <button type="button" class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem; font-weight:600;" onclick="abrirModalCorteParcial()" title="Arqueo X en vivo sin cerrar la caja">
                        <i class='bx bx-calculator'></i> Corte Parcial
                    </button>
                    <button type="button" class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem; font-weight:600;" onclick="abrirModalCierresDelDia()" title="Ver turnos y cierres del día">
                        <i class='bx bx-history'></i> Cierres del Día
                    </button>
                    ${btnCerrarHtml}
                `;
            }
        } else {
            cajaActual = null;
            if (banner) banner.style.display = 'flex';

            if (chip) {
                chip.innerHTML = `
                    <span class="badge agotado" style="font-size:0.82rem; padding:5px 12px; display:inline-flex; align-items:center; gap:5px;">
                        <i class='bx bx-lock-alt'></i> Caja Cerrada
                    </span>
                `;
            }

            if (actions) {
                actions.innerHTML = `
                    <button type="button" class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem; font-weight:600;" onclick="abrirModalCierresDelDia()" title="Ver turnos y cierres del día">
                        <i class='bx bx-history'></i> Cierres del Día
                    </button>
                    <button type="button" class="btn btn-primary" style="padding:6px 14px; font-size:0.82rem; font-weight:700;" onclick="abrirModalApertura()">
                        <i class='bx bx-key'></i> Abrir Caja
                    </button>
                `;
            }

            if (autoOpenModal) {
                setTimeout(() => abrirModalApertura(), 400);
            }
        }
        renderCart();
    } catch (e) {
        console.error('Error al verificar caja:', e);
    }
}

window.abrirModalApertura = () => {
    document.getElementById('apCajeroNombre').innerText = localStorage.getItem('nombre') || 'Vendedor en Turno';
    document.getElementById('apFechaHora').innerText = new Date().toLocaleString('es-PE');
    const input = document.getElementById('apMontoInicial');
    input.value = '0.00';
    showModal('modalAperturaCaja');
    setTimeout(() => { input.focus(); input.select(); }, 200);
};

document.getElementById('formAperturaCaja').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmarApertura');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Abriendo...`;
    btn.disabled = true;

    const monto_inicial = document.getElementById('apMontoInicial').value;

    try {
        const res = await fetchAPI('/caja/abrir', {
            method: 'POST',
            body: JSON.stringify({ monto_inicial })
        });
        showToast(res.mensaje || 'Caja abierta correctamente', 'success');
        closeModal('modalAperturaCaja');
        await verificarEstadoCaja();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

window.abrirModalCierre = async () => {
    const rolActual = (localStorage.getItem('rol') || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (rolActual !== 'vendedor' && rolActual !== 'cajero') {
        showToast('Acceso no autorizado: Solo el cajero puede realizar el cierre de caja.', 'error');
        return;
    }
    try {
        const data = await fetchAPI('/caja/resumen');
        resumenCajaCache = data;

        document.getElementById('cieCajeroNombre').innerText = data.nombre_cajero;
        document.getElementById('cieNumTurno').innerText = `Turno #${data.id_caja}`;
        document.getElementById('cieFechaApertura').innerText = new Date(data.fecha_apertura).toLocaleString('es-PE');
        document.getElementById('cieMontoInicialTxt').innerText = `S/ ${parseFloat(data.monto_inicial).toFixed(2)}`;
        document.getElementById('cieVentasEfectivoTxt').innerText = `S/ ${parseFloat(data.ventas_efectivo).toFixed(2)}`;
        document.getElementById('cieVentasTarjetaTxt').innerText = `S/ ${parseFloat(data.ventas_tarjeta).toFixed(2)}`;
        document.getElementById('cieVentasYapeTxt').innerText = `S/ ${parseFloat(data.ventas_yape).toFixed(2)}`;
        document.getElementById('cieCantVentasTxt').innerText = data.cantidad_ventas;
        document.getElementById('cieTotalFacturadoTxt').innerText = `S/ ${parseFloat(data.total_ventas).toFixed(2)}`;
        document.getElementById('cieEsperadoEfectivoTxt').innerText = `S/ ${parseFloat(data.monto_esperado_efectivo).toFixed(2)}`;

        const inputReal = document.getElementById('cieMontoReal');
        inputReal.value = '';
        document.getElementById('cieObservaciones').value = '';
        actualizarDiferenciaCierre();

        showModal('modalCierreCaja');
        setTimeout(() => inputReal.focus(), 200);
    } catch (e) {
        showToast(e.message, 'error');
    }
};

function actualizarDiferenciaCierre() {
    if (!resumenCajaCache) return;
    const inputReal = document.getElementById('cieMontoReal');
    const box = document.getElementById('cieDiferenciaBox');
    const valor = parseFloat(inputReal.value);

    if (isNaN(valor)) {
        box.innerHTML = `<span style="color:#64748b;">Ingrese el dinero contado para calcular la diferencia de cuadre.</span>`;
        return;
    }

    const esperado = parseFloat(resumenCajaCache.monto_esperado_efectivo);
    const dif = parseFloat((valor - esperado).toFixed(2));

    if (dif === 0) {
        box.innerHTML = `<span style="color:#16a34a; font-weight:700;"><i class='bx bx-check-circle'></i> Cuadre Exacto (Diferencia: S/ 0.00)</span>`;
    } else if (dif > 0) {
        box.innerHTML = `<span style="color:#16a34a; font-weight:700;"><i class='bx bx-plus-circle'></i> Sobrante: +S/ ${dif.toFixed(2)}</span>`;
    } else {
        box.innerHTML = `<span style="color:#dc2626; font-weight:700;"><i class='bx bx-error-circle'></i> Faltante: -S/ ${Math.abs(dif).toFixed(2)}</span>`;
    }
}

document.getElementById('cieMontoReal').addEventListener('input', actualizarDiferenciaCierre);

document.getElementById('formCierreCaja').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm('¿Estás seguro de cerrar la caja y culminar el turno actual?')) return;

    const btn = document.getElementById('btnConfirmarCierre');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Cerrando...`;
    btn.disabled = true;

    const monto_final_real = document.getElementById('cieMontoReal').value;
    const observaciones = document.getElementById('cieObservaciones').value;

    try {
        const res = await fetchAPI('/caja/cerrar', {
            method: 'POST',
            body: JSON.stringify({ monto_final_real, observaciones })
        });
        showToast(res.mensaje || 'Caja cerrada exitosamente', 'success');
        closeModal('modalCierreCaja');

        // Mostrar ticket de arqueo de caja
        const a = res.arqueo;
        document.getElementById('arqNum').innerText = `#${a.id_caja}`;
        document.getElementById('arqCajero').innerText = a.cajero;
        document.getElementById('arqApertura').innerText = new Date(a.fecha_apertura).toLocaleString('es-PE');
        document.getElementById('arqCierre').innerText = new Date(a.fecha_cierre).toLocaleString('es-PE');
        document.getElementById('arqFondo').innerText = `S/ ${parseFloat(a.monto_inicial).toFixed(2)}`;
        document.getElementById('arqVentasEf').innerText = `S/ ${parseFloat(a.ventas_efectivo).toFixed(2)}`;
        document.getElementById('arqVentasTj').innerText = `S/ ${parseFloat(a.ventas_tarjeta).toFixed(2)}`;
        document.getElementById('arqVentasYp').innerText = `S/ ${parseFloat(a.ventas_yape).toFixed(2)}`;
        document.getElementById('arqTotalVentas').innerText = `S/ ${parseFloat(a.total_ventas).toFixed(2)} (${a.cantidad_ventas} ops)`;
        document.getElementById('arqEsperado').innerText = `S/ ${parseFloat(a.monto_final_esperado).toFixed(2)}`;
        document.getElementById('arqReal').innerText = `S/ ${parseFloat(a.monto_final_real).toFixed(2)}`;
        document.getElementById('arqDiferencia').innerText = `S/ ${parseFloat(a.diferencia).toFixed(2)}`;
        document.getElementById('arqEstadoCuadre').innerText = a.estado_cuadre;

        const obsRow = document.getElementById('arqObsRow');
        if (a.observaciones && a.observaciones.trim()) {
            document.getElementById('arqObsTxt').innerText = a.observaciones;
            obsRow.style.display = 'block';
        } else {
            obsRow.style.display = 'none';
        }

        showModal('modalArqueoTicket');
        await verificarEstadoCaja();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

window.imprimirArqueo = () => {
    window.print();
};

// ==========================================
// CORTE PARCIAL EN VIVO (ARQUEO X) DURANTE EL DÍA
// ==========================================
window.abrirModalCorteParcial = async () => {
    try {
        const cp = await fetchAPI('/caja/corte-parcial');

        document.getElementById('cpCajeroNombre').innerText = cp.nombre_cajero;
        document.getElementById('cpNumTurno').innerText = `Turno #${cp.id_caja}`;
        document.getElementById('cpFechaApertura').innerText = new Date(cp.fecha_apertura).toLocaleString('es-PE');
        document.getElementById('cpFechaCorte').innerText = new Date(cp.fecha_corte).toLocaleString('es-PE');
        document.getElementById('cpMontoInicial').innerText = `S/ ${parseFloat(cp.monto_inicial).toFixed(2)}`;
        document.getElementById('cpVentasEf').innerText = `S/ ${parseFloat(cp.ventas_efectivo).toFixed(2)}`;
        document.getElementById('cpVentasTj').innerText = `S/ ${parseFloat(cp.ventas_tarjeta).toFixed(2)}`;
        document.getElementById('cpVentasYp').innerText = `S/ ${parseFloat(cp.ventas_yape).toFixed(2)}`;
        document.getElementById('cpCantVentas').innerText = cp.cantidad_ventas;
        document.getElementById('cpTotalVentas').innerText = `S/ ${parseFloat(cp.total_ventas).toFixed(2)}`;
        document.getElementById('cpEsperadoEf').innerText = `S/ ${parseFloat(cp.monto_esperado_efectivo).toFixed(2)}`;

        // Rellenar ticket para impresión térmica
        document.getElementById('prCpNum').innerText = `#${cp.id_caja}`;
        document.getElementById('prCpCajero').innerText = cp.nombre_cajero;
        document.getElementById('prCpApertura').innerText = new Date(cp.fecha_apertura).toLocaleString('es-PE');
        document.getElementById('prCpHora').innerText = new Date(cp.fecha_corte).toLocaleString('es-PE');
        document.getElementById('prCpFondo').innerText = `S/ ${parseFloat(cp.monto_inicial).toFixed(2)}`;
        document.getElementById('prCpEf').innerText = `S/ ${parseFloat(cp.ventas_efectivo).toFixed(2)}`;
        document.getElementById('prCpTj').innerText = `S/ ${parseFloat(cp.ventas_tarjeta).toFixed(2)}`;
        document.getElementById('prCpYp').innerText = `S/ ${parseFloat(cp.ventas_yape).toFixed(2)}`;
        document.getElementById('prCpTotal').innerText = `S/ ${parseFloat(cp.total_ventas).toFixed(2)} (${cp.cantidad_ventas} ops)`;
        document.getElementById('prCpEsperado').innerText = `S/ ${parseFloat(cp.monto_esperado_efectivo).toFixed(2)}`;

        showModal('modalCorteParcial');
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.imprimirCorteParcial = () => {
    window.print();
};

// ==========================================
// CIERRES Y TURNOS DEL DÍA (HISTORIAL Y CONSULTA)
// ==========================================
let turnosDiaCache = [];

window.abrirModalCierresDelDia = async () => {
    const inputFecha = document.getElementById('fechaCierresDiaInput');
    if (inputFecha && !inputFecha.value) {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        inputFecha.value = `${year}-${month}-${day}`;
    }
    showModal('modalCierresDelDia');
    await cargarCierresDelDia();
};

window.cargarCierresDelDia = async () => {
    const inputFecha = document.getElementById('fechaCierresDiaInput');
    const fecha = inputFecha ? inputFecha.value : '';
    const tbody = document.getElementById('tablaCierresDelDiaBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748b;"><div class="spinner" style="margin:0 auto 8px;"></div> Cargando turnos del día...</td></tr>`;

    try {
        const url = fecha ? `/caja/cierres-del-dia?fecha=${encodeURIComponent(fecha)}` : '/caja/cierres-del-dia';
        const res = await fetchAPI(url);
        turnosDiaCache = res.turnos || [];

        // Rellenar KPIs
        const elTurnos = document.getElementById('kpiDiaTurnos');
        const elTurnosSub = document.getElementById('kpiDiaTurnosSub');
        const elEf = document.getElementById('kpiDiaEfectivo');
        const elDig = document.getElementById('kpiDiaDigital');
        const elTot = document.getElementById('kpiDiaTotal');
        const elCant = document.getElementById('kpiDiaCantVentas');

        if (elTurnos) elTurnos.innerText = res.total_turnos;
        if (elTurnosSub) elTurnosSub.innerText = `${res.turnos_cerrados} turno(s) cerrado(s)`;
        if (elEf) elEf.innerText = `S/ ${parseFloat(res.resumen_dia?.total_ventas_efectivo || 0).toFixed(2)}`;
        if (elDig) elDig.innerText = `S/ ${(parseFloat(res.resumen_dia?.total_ventas_tarjeta || 0) + parseFloat(res.resumen_dia?.total_ventas_yape || 0)).toFixed(2)}`;
        if (elTot) elTot.innerText = `S/ ${parseFloat(res.resumen_dia?.total_ventas || 0).toFixed(2)}`;
        if (elCant) elCant.innerText = `${res.resumen_dia?.cantidad_ventas || 0} venta(s) realizadas`;

        if (turnosDiaCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center; padding:30px; color:#94a3b8;">
                        <i class='bx bx-info-circle' style="font-size:1.8rem; display:block; margin-bottom:6px;"></i>
                        No se registraron turnos de caja en esta fecha.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = turnosDiaCache.map(t => {
            const esAbierta = t.estado === 'abierta';
            const dif = parseFloat(t.diferencia || 0);
            let badgeDif = '<span style="color:#94a3b8;">-</span>';
            if (!esAbierta) {
                if (dif === 0) badgeDif = `<span class="badge ok" style="padding:2px 6px; font-size:0.75rem;">Exacto</span>`;
                else if (dif > 0) badgeDif = `<span class="badge" style="background:#e0f2fe; color:#0369a1; padding:2px 6px; font-size:0.75rem;">+S/ ${dif.toFixed(2)}</span>`;
                else badgeDif = `<span class="badge agotado" style="padding:2px 6px; font-size:0.75rem;">-S/ ${Math.abs(dif).toFixed(2)}</span>`;
            }

            const horaApertura = new Date(t.fecha_apertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            const horaCierre = t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'En curso';

            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px 10px; font-weight:700;">#${t.id_caja}</td>
                    <td style="padding:8px 10px;">${t.nombre_usuario || 'Cajero'}</td>
                    <td style="padding:8px 10px; font-size:0.78rem; color:#475569;">${horaApertura} - ${horaCierre}</td>
                    <td style="padding:8px 10px; text-align:right;">S/ ${parseFloat(t.monto_inicial || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:600; color:#0f766e;">S/ ${parseFloat(t.total_ventas_efectivo || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:700;">S/ ${parseFloat(t.total_ventas || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:600;">${esAbierta ? '<em style="color:#0284c7;">En curso</em>' : 'S/ ' + parseFloat(t.monto_final_real || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:center;">${badgeDif}</td>
                    <td style="padding:8px 10px; text-align:center;">
                        <span class="badge ${esAbierta ? 'ok' : ''}" style="padding:3px 8px; font-size:0.75rem;">
                            ${esAbierta ? '<i class="bx bx-play-circle"></i> Abierta' : '<i class="bx bx-check"></i> Cerrada'}
                        </span>
                    </td>
                    <td style="padding:8px 10px; text-align:center;">
                        ${!esAbierta ? `
                            <button type="button" class="btn btn-outline" style="padding:3px 8px; font-size:0.75rem;" onclick="reimprimirTicketTurno(${t.id_caja})" title="Ver y reimprimir comprobante de arqueo">
                                <i class='bx bx-receipt'></i> Ticket
                            </button>
                        ` : `
                            <button type="button" class="btn btn-outline" style="padding:3px 8px; font-size:0.75rem;" onclick="abrirModalCorteParcial()" title="Ver corte parcial en vivo">
                                <i class='bx bx-calculator'></i> Corte
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#ef4444;">Error al cargar turnos: ${e.message}</td></tr>`;
    }
};

window.reimprimirTicketTurno = (id_caja) => {
    const t = turnosDiaCache.find(item => item.id_caja === id_caja);
    if (!t) {
        showToast('No se encontró la información del turno', 'error');
        return;
    }

    document.getElementById('arqNum').innerText = `#${t.id_caja}`;
    document.getElementById('arqCajero').innerText = t.nombre_usuario || 'Cajero';
    document.getElementById('arqApertura').innerText = new Date(t.fecha_apertura).toLocaleString('es-PE');
    document.getElementById('arqCierre').innerText = t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleString('es-PE') : '-';
    document.getElementById('arqFondo').innerText = `S/ ${parseFloat(t.monto_inicial || 0).toFixed(2)}`;
    document.getElementById('arqVentasEf').innerText = `S/ ${parseFloat(t.total_ventas_efectivo || 0).toFixed(2)}`;
    document.getElementById('arqVentasTj').innerText = `S/ ${parseFloat(t.total_ventas_tarjeta || 0).toFixed(2)}`;
    document.getElementById('arqVentasYp').innerText = `S/ ${parseFloat(t.total_ventas_yape || 0).toFixed(2)}`;
    document.getElementById('arqTotalVentas').innerText = `S/ ${parseFloat(t.total_ventas || 0).toFixed(2)} (${t.cantidad_ventas || 0} ops)`;
    document.getElementById('arqEsperado').innerText = `S/ ${parseFloat(t.monto_final_esperado || 0).toFixed(2)}`;
    document.getElementById('arqReal').innerText = `S/ ${parseFloat(t.monto_final_real || 0).toFixed(2)}`;
    const dif = parseFloat(t.diferencia || 0);
    document.getElementById('arqDiferencia').innerText = `S/ ${dif.toFixed(2)}`;

    let estadoCuadre = 'Exacto';
    if (dif > 0) estadoCuadre = `Sobrante (+S/ ${dif.toFixed(2)})`;
    else if (dif < 0) estadoCuadre = `Faltante (-S/ ${Math.abs(dif).toFixed(2)})`;
    document.getElementById('arqEstadoCuadre').innerText = estadoCuadre;

    const obsRow = document.getElementById('arqObsRow');
    if (t.observaciones && t.observaciones.trim()) {
        document.getElementById('arqObsTxt').innerText = t.observaciones;
        obsRow.style.display = 'block';
    } else {
        obsRow.style.display = 'none';
    }

    showModal('modalArqueoTicket');
};

function actualizarDisplayCliente() {
    const el = document.getElementById('selectedClientDisplay');
    if (el) {
        el.innerText = `${currentClient.nombre} (${currentClient.documento || 'Sin doc'})`;
    }
}

// Modal y búsqueda de clientes (RF11)
window.abrirModalCliente = () => {
    document.getElementById('inputBuscarCliente').value = '';
    document.getElementById('listaResultadosClientes').style.display = 'none';
    document.getElementById('formNuevoClientePOS').reset();
    showModal('modalCliente');
};

window.seleccionarClienteGeneral = () => {
    currentClient = { id_cliente: 1, nombre: 'Cliente General', documento: '00000000' };
    actualizarDisplayCliente();
    closeModal('modalCliente');
    showToast('Cliente General seleccionado', 'info');
};

window.buscarClientesPOS = async () => {
    const q = document.getElementById('inputBuscarCliente').value.trim();
    const contenedor = document.getElementById('listaResultadosClientes');
    contenedor.innerHTML = '<div style="padding:8px; font-size:0.8rem; color:#64748b;"><i class="bx bx-loader-alt bx-spin"></i> Buscando...</div>';
    contenedor.style.display = 'block';

    try {
        const clientes = await fetchAPI(`/clientes?q=${encodeURIComponent(q)}`);
        if (clientes.length === 0) {
            contenedor.innerHTML = '<div style="padding:8px; font-size:0.8rem; color:#64748b;">No se encontraron clientes. Regístralo abajo.</div>';
            return;
        }

        contenedor.innerHTML = clientes.map(c => `
            <div style="padding:6px 10px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-size:0.82rem; display:flex; justify-content:space-between; align-items:center;"
                 onclick="asignarCliente(${c.id_cliente}, '${c.nombre.replace(/'/g, "\\'")}', '${c.documento}')"
                 onmouseover="this.style.background='#f0fdfa'" onmouseout="this.style.background='#fff'">
                <div>
                    <strong>${c.nombre}</strong>
                    <div style="font-size:0.75rem; color:#64748b;">Doc: ${c.documento}</div>
                </div>
                <button type="button" class="btn btn-outline" style="padding:2px 6px; font-size:0.72rem;">Elegir</button>
            </div>
        `).join('');
    } catch (e) {
        contenedor.innerHTML = `<div style="padding:8px; font-size:0.8rem; color:red;">${e.message}</div>`;
    }
};

window.asignarCliente = (id, nombre, documento) => {
    currentClient = { id_cliente: id, nombre, documento };
    actualizarDisplayCliente();
    closeModal('modalCliente');
    showToast(`Cliente asignado: ${nombre}`, 'success');
};

document.getElementById('formNuevoClientePOS').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarCliPOS');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Guardando...`;
    btn.disabled = true;

    const documento = document.getElementById('cliNuevoDoc').value.trim();
    const nombre = document.getElementById('cliNuevoNombre').value.trim();
    const contacto = document.getElementById('cliNuevoContacto').value.trim();

    try {
        const res = await fetchAPI('/clientes', {
            method: 'POST',
            body: JSON.stringify({ documento, nombre, contacto })
        });
        currentClient = { id_cliente: res.id_cliente, nombre: res.nombre, documento: res.documento };
        actualizarDisplayCliente();
        closeModal('modalCliente');
        showToast('Cliente registrado y asignado exitosamente', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

// Autocompletado de DNI con RENIEC al escribir exactamente 8 dígitos
const inputDniDoc = document.getElementById('cliNuevoDoc');
if (inputDniDoc) {
    let reniecDebounce = null;
    inputDniDoc.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const loader = document.getElementById('reniecLoading');

        if (reniecDebounce) clearTimeout(reniecDebounce);

        // Si el usuario escribe exactamente 8 dígitos numéricos
        if (val.length === 8 && /^\d{8}$/.test(val)) {
            if (loader) loader.style.display = 'block';

            reniecDebounce = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/reniec/dni/${val}`);
                    const data = await res.json();

                    if (data.success && data.data && data.data.nombreCompleto) {
                        const inputNom = document.getElementById('cliNuevoNombre');
                        if (inputNom) inputNom.value = data.data.nombreCompleto;
                        showToast(`DNI verificado con RENIEC: ${data.data.nombreCompleto}`, 'success');
                    } else {
                        showToast('No se pudo consultar el DNI. Por favor, ingrese los datos manualmente.', 'warning');
                    }
                } catch (err) {
                    console.warn('Fallo consulta RENIEC:', err);
                    showToast('No se pudo consultar el DNI. Por favor, ingrese los datos manualmente.', 'warning');
                } finally {
                    if (loader) loader.style.display = 'none';
                }
            }, 300);
        } else {
            if (loader) loader.style.display = 'none';
        }
    });
}

// Visualizador profesional con Viewer.js
window.verImagen = (event, imgUrl, prodName) => {
    if (event) event.stopPropagation();
    
    const container = document.getElementById('imageGalleryViewer');
    container.innerHTML = `<img src="${imgUrl}" alt="${prodName}" style="display:none;">`;
    
    if (currentViewer) {
        currentViewer.destroy();
    }
    
    const imgEl = container.querySelector('img');
    currentViewer = new Viewer(imgEl, {
        inline: false,
        button: true,
        navbar: false,
        title: [1, (image, imageData) => `${prodName} - Galería PetShop Pro`],
        toolbar: {
            zoomIn: 1,
            zoomOut: 1,
            oneToOne: 1,
            reset: 1,
            rotateLeft: 1,
            rotateRight: 1,
            flipHorizontal: 1,
        },
        hidden: function () {
            if (currentViewer) {
                currentViewer.destroy();
                currentViewer = null;
            }
        }
    });
    currentViewer.show();
};

function renderCategories() {
    const cats = new Set(allProducts.map(p => p.nombre_categoria || 'Otros'));
    const filterContainer = document.getElementById('catFilters');
    let html = `<button class="filter-chip active" onclick="filterCat('all', this)">Todas</button>`;
    cats.forEach(c => {
        html += `<button class="filter-chip" onclick="filterCat('${c}', this)">${c}</button>`;
    });
    filterContainer.innerHTML = html;
}

window.filterCat = (cat, btn) => {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = cat === 'all' ? allProducts : allProducts.filter(p => (p.nombre_categoria || 'Otros') === cat);
    renderGrid(filtered);
};

document.getElementById('searchProd').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        (p.codigo_barras && p.codigo_barras.includes(q))
    );
    renderGrid(filtered);
});

function renderGrid(products) {
    const grid = document.getElementById('prodGrid');
    if (products.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class='bx bx-search'></i><p>No se encontraron productos disponibles</p></div>`;
        return;
    }
    grid.innerHTML = products.map(p => {
        const disabled = p.stock <= 0 ? 'disabled' : '';
        const imgUrl = p.imagen_url || '/img/productos/alimento-premium.jpg';
        const cat = p.nombre_categoria || 'General';
        const cleanName = (p.nombre || '').replace(/'/g, "\\'");
        
        return `
        <div class="prod-card ${disabled}" onclick="addToCart(${p.id_producto})">
            <div class="prod-img-wrap">
                <button type="button" class="btn-zoom-img" onclick="verImagen(event, '${imgUrl}', '${cleanName}')" title="Inspeccionar imagen en HD">
                    <i class='bx bx-zoom-in'></i>
                </button>
                <div class="prod-badge">${getBadgeStock(p.stock, p.stock_minimo)}</div>
                <img src="${imgUrl}" alt="${p.nombre}" class="prod-img" loading="lazy" onerror="this.src='/img/productos/alimento-premium.jpg'">
            </div>
            <div class="prod-content">
                <div class="prod-cat-tag">${cat}</div>
                <div class="prod-name" title="${p.nombre}">${p.nombre}</div>
                <div class="prod-price-stock-row">
                    <div class="prod-price">S/ ${parseFloat(p.precio).toFixed(2)}</div>
                    <div class="prod-stock-info">Stock: ${p.stock}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.addToCart = (id) => {
    if (!cajaActual) {
        showToast('Debes abrir la caja antes de registrar ventas', 'warning');
        abrirModalApertura();
        return;
    }

    const prod = allProducts.find(p => p.id_producto === id);
    if (!prod || prod.stock <= 0) return showToast('Producto agotado', 'warning');
    
    const exist = cart.find(i => i.id_producto === id);
    if (exist) {
        if (exist.cantidad >= prod.stock) return showToast('Stock máximo alcanzado', 'warning');
        exist.cantidad++;
    } else {
        cart.push({ ...prod, cantidad: 1 });
    }
    renderCart();
};

window.updateQty = (id, delta) => {
    const item = cart.find(i => i.id_producto === id);
    if (!item) return;
    const prod = allProducts.find(p => p.id_producto === id);
    const newQ = item.cantidad + delta;
    
    if (newQ <= 0) { 
        cart = cart.filter(i => i.id_producto !== id); 
    } else if (prod && newQ > prod.stock) { 
        showToast('No hay suficiente stock disponible', 'warning'); 
    } else { 
        item.cantidad = newQ; 
    }
    renderCart();
};

function renderCart() {
    const list = document.getElementById('cartList');
    const elSub = document.getElementById('cartSubtotal');
    const elIgv = document.getElementById('cartIgv');
    const elTot = document.getElementById('cartTotal');
    const elCount = document.getElementById('cartCount');
    const btn = document.getElementById('btnCobrar');

    if (cart.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 2rem;"><i class='bx bx-cart'></i><p style="font-size:0.9rem; margin:0;">Carrito vacío</p></div>`;
        if (elCount) elCount.innerText = '0 ítems';
        if (elSub) elSub.innerText = 'S/ 0.00';
        if (elIgv) elIgv.innerText = 'S/ 0.00';
        if (elTot) elTot.innerText = 'S/ 0.00';
        btn.disabled = true;
        if (!cajaActual) {
            btn.innerHTML = `<i class='bx bx-lock-alt'></i> Abrir Caja para Cobrar`;
        } else {
            btn.innerHTML = `<i class='bx bx-check-shield'></i> Cobrar S/ 0.00`;
        }
        return;
    }

    let total = 0;
    let totalItems = 0;
    list.innerHTML = cart.map(i => {
        const sub = i.precio * i.cantidad;
        total += sub;
        totalItems += i.cantidad;
        const imgUrl = i.imagen_url || '/img/productos/alimento-premium.jpg';
        return `
        <div class="cart-item">
            <img src="${imgUrl}" alt="${i.nombre}" class="cart-item-thumb" onerror="this.src='/img/productos/alimento-premium.jpg'">
            <div class="cart-item-info">
                <div class="cart-item-name" title="${i.nombre}">${i.nombre}</div>
                <div class="cart-item-price">S/ ${parseFloat(i.precio).toFixed(2)} c/u</div>
            </div>
            <div class="stepper">
                <button onclick="updateQty(${i.id_producto}, -1)" title="Disminuir"><i class='bx bx-minus'></i></button>
                <span class="stepper-val">${i.cantidad}</span>
                <button onclick="updateQty(${i.id_producto}, 1)" title="Aumentar"><i class='bx bx-plus'></i></button>
            </div>
            <div class="cart-item-subtotal">S/ ${sub.toFixed(2)}</div>
        </div>`;
    }).join('');

    const totalNum = parseFloat(total.toFixed(2));
    const subtotalNum = parseFloat((totalNum / 1.18).toFixed(2));
    const igvNum = parseFloat((totalNum - subtotalNum).toFixed(2));

    if (elCount) elCount.innerText = `${totalItems} ítems`;
    if (elSub) elSub.innerText = `S/ ${subtotalNum.toFixed(2)}`;
    if (elIgv) elIgv.innerText = `S/ ${igvNum.toFixed(2)}`;
    if (elTot) elTot.innerText = `S/ ${totalNum.toFixed(2)}`;

    if (!cajaActual) {
        btn.disabled = true;
        btn.innerHTML = `<i class='bx bx-lock-alt'></i> Abrir Caja para Cobrar`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class='bx bx-check-shield'></i> Cobrar S/ ${totalNum.toFixed(2)}`;
    }
}

document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedMethod = parseInt(this.getAttribute('data-id')) || 1;
    });
});

window.procesarVenta = async () => {
    if (!cajaActual) {
        showToast('No puedes vender con la caja cerrada. Abre la caja primero.', 'warning');
        abrirModalApertura();
        return;
    }

    if (cart.length === 0) return;
    const btn = document.getElementById('btnCobrar');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Procesando...`;
    btn.disabled = true;

    try {
        const payload = {
            id_cliente: currentClient.id_cliente,
            id_metodo: selectedMethod,
            detalles: cart.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad, precio_unitario: i.precio }))
        };
        const res = await fetchAPI('/ventas', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Venta registrada correctamente con IGV 18%', 'success');
        
        // Modal de Comprobante con desglose de ley (SUNAT / IGV 18%)
        document.getElementById('tkNum').innerText = res.comprobante;
        document.getElementById('tkFecha').innerText = new Date().toLocaleString('es-PE');
        document.getElementById('tkVend').innerText = localStorage.getItem('nombre') || 'Vendedor';
        document.getElementById('tkCliente').innerText = `${currentClient.nombre} (${currentClient.documento || '-'})`;
        
        const nombresMetodos = { 1: 'Efectivo', 2: 'Tarjeta', 3: 'Yape' };
        const metodoTxt = res.metodo_pago || nombresMetodos[selectedMethod] || 'Efectivo';
        const elTkMetodo = document.getElementById('tkMetodo');
        if (elTkMetodo) elTkMetodo.innerText = metodoTxt;

        let tkDetalleHtml = '';
        let tTotal = 0;
        cart.forEach(i => {
            const s = i.cantidad * i.precio; 
            tTotal += s;
            tkDetalleHtml += `<div class="ticket-row"><span>${i.cantidad}x ${i.nombre}</span><span>S/ ${s.toFixed(2)}</span></div>`;
        });
        document.getElementById('tkDetalle').innerHTML = tkDetalleHtml;
        
        const totFinal = res.total != null ? parseFloat(res.total) : tTotal;
        const subFinal = res.subtotal != null ? parseFloat(res.subtotal) : (totFinal / 1.18);
        const igvFinal = res.igv != null ? parseFloat(res.igv) : (totFinal - subFinal);

        const elTkSub = document.getElementById('tkSubtotal');
        const elTkIgv = document.getElementById('tkIgv');
        if (elTkSub) elTkSub.innerText = `S/ ${subFinal.toFixed(2)}`;
        if (elTkIgv) elTkIgv.innerText = `S/ ${igvFinal.toFixed(2)}`;
        document.getElementById('tkTotal').innerText = `S/ ${totFinal.toFixed(2)}`;
        
        showModal('modalComprobante');
        cart = [];
        renderCart();
        
        // Recargar productos para actualizar stock y verificar estado de caja
        allProducts = await fetchAPI('/productos');
        renderGrid(allProducts);
        verificarEstadoCaja();
        
    } catch(e) {
        showToast(e.message, 'error');
        if (e.message.includes('caja se encuentra cerrada')) {
            verificarEstadoCaja();
        }
    } finally {
        btn.innerHTML = ori;
        btn.disabled = cart.length === 0 || !cajaActual;
    }
};

window.cerrarComprobante = () => { closeModal('modalComprobante'); };

initPOS();
