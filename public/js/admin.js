checkAuth(['Administrador']);

let chartBar = null;
let chartDoughnut = null;
let chartSemanal = null;
let rolesList = [];
let reporteDiarioData = null;
let reporteSemanalData = null;
let currentReportSubTab = 'diario';

// Helper para fecha local en formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper para badge de métodos de pago
function renderMetodoBadge(metodo) {
    const m = (metodo || 'Efectivo').toLowerCase();
    if (m.includes('yape')) {
        return `<span class="badge" style="background:#f3e8ff; color:#7e22ce; font-weight:700;"><i class='bx bx-qr-scan'></i> Yape</span>`;
    } else if (m.includes('tarjeta')) {
        return `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;"><i class='bx bx-credit-card'></i> Tarjeta</span>`;
    }
    return `<span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700;"><i class='bx bx-money'></i> Efectivo</span>`;
}

// Control de Pestañas Principales
window.switchAdminTab = (tabId) => {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });

    const target = document.getElementById(tabId);
    if (target) target.style.display = 'block';

    if (tabId === 'tabDashboard') {
        document.getElementById('btnTabDashboard').classList.replace('btn-outline', 'btn-primary');
        initDashboard();
    } else if (tabId === 'tabHistorial') {
        document.getElementById('btnTabHistorial').classList.replace('btn-outline', 'btn-primary');
        cargarHistorialVentas();
    } else if (tabId === 'tabUsuarios') {
        document.getElementById('btnTabUsuarios').classList.replace('btn-outline', 'btn-primary');
        cargarUsuarios();
    } else if (tabId === 'tabReportes') {
        document.getElementById('btnTabReportes').classList.replace('btn-outline', 'btn-primary');
        if (currentReportSubTab === 'semanal') {
            cargarReporteSemanal();
        } else {
            cargarReporteDiario();
        }
    } else if (tabId === 'tabCajas') {
        document.getElementById('btnTabCajas').classList.replace('btn-outline', 'btn-primary');
        cargarHistorialCajas();
    }
};

// Control de Sub-Pestañas en Reportes (Diario vs Semanal)
window.switchReportSubTab = (sub) => {
    currentReportSubTab = sub;
    const btnDiario = document.getElementById('btnSubReporteDiario');
    const btnSemanal = document.getElementById('btnSubReporteSemanal');
    const contDiario = document.getElementById('subReporteDiario');
    const contSemanal = document.getElementById('subReporteSemanal');

    if (sub === 'diario') {
        btnDiario.className = 'btn btn-primary';
        btnSemanal.className = 'btn btn-outline';
        contDiario.style.display = 'block';
        contSemanal.style.display = 'none';
        cargarReporteDiario();
    } else {
        btnDiario.className = 'btn btn-outline';
        btnSemanal.className = 'btn btn-primary';
        contDiario.style.display = 'none';
        contSemanal.style.display = 'block';
        cargarReporteSemanal();
    }
};

// ==========================================
// 1. DASHBOARD
// ==========================================
async function initDashboard() {
    try {
        const [ventas, productos, alertas] = await Promise.all([
            fetchAPI('/ventas'),
            fetchAPI('/productos?todos=true'),
            fetchAPI('/inventario/alertas')
        ]);
        
        const hoyStr = new Date().toDateString();
        const ventasHoy = ventas.filter(v => new Date(v.fecha_hora).toDateString() === hoyStr && v.estado === 'confirmada');
        
        document.getElementById('kpiVentas').innerText = ventasHoy.length;
        document.getElementById('kpiProductos').innerText = productos.filter(p => p.estado === 'activo').length;
        document.getElementById('kpiAlertas').innerText = alertas.length;
        const total = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0);
        document.getElementById('kpiIngresos').innerText = `S/ ${total.toFixed(2)}`;
        
        renderCharts(ventas, productos);
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function renderCharts(ventas, productos) {
    const labels = [];
    const dataVentas = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('es-ES', { weekday:'short' }));
        const daily = ventas.filter(v => new Date(v.fecha_hora).toDateString() === d.toDateString() && v.estado === 'confirmada');
        dataVentas.push(daily.reduce((a,b) => a + Number(b.total), 0));
    }
    
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Ventas (S/)', data: dataVentas, backgroundColor: '#0f766e', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const cats = {};
    productos.forEach(p => { const c = p.nombre_categoria || 'Sin Categoría'; cats[c] = (cats[c]||0) + 1; });
    
    if (chartDoughnut) chartDoughnut.destroy();
    chartDoughnut = new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#0f766e', '#f97316', '#3b82f6', '#f43f5e', '#8b5cf6', '#10b981'] }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%' }
    });
}

// ==========================================
// 2. HISTORIAL DE VENTAS (RF12, RF13)
// Con desglose de Subtotal, IGV (18%) y Método de Pago
// ==========================================
window.cargarHistorialVentas = async () => {
    const tbody = document.getElementById('tablaHistorialVentas');
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando ventas...</p></td></tr>`;

    const inicio = document.getElementById('filtroFechaInicio').value;
    const fin = document.getElementById('filtroFechaFin').value;
    const estado = document.getElementById('filtroEstadoVenta').value;

    let query = '';
    const params = [];
    if (inicio) params.push(`fecha_inicio=${inicio}`);
    if (fin) params.push(`fecha_fin=${fin}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) query = '?' + params.join('&');

    try {
        const ventas = await fetchAPI(`/ventas${query}`);
        if (ventas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="empty-state"><i class='bx bx-receipt'></i><p>No se encontraron registros de ventas.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = ventas.map(v => {
            const esConfirmada = v.estado === 'confirmada';
            const estadoBadge = esConfirmada ? '<span class="badge ok">Confirmada</span>' : '<span class="badge agotado">Anulada</span>';
            const anularBtn = esConfirmada ? `
                <button class="btn btn-ghost" style="color:var(--danger); padding:4px 6px; font-size:0.75rem;" onclick="anularVenta(${v.id_venta})" title="Anular venta y restaurar stock">
                    <i class='bx bx-x-circle'></i> Anular
                </button>
            ` : '';

            const sub = v.subtotal != null ? parseFloat(v.subtotal) : (parseFloat(v.total) / 1.18);
            const igv = v.igv != null ? parseFloat(v.igv) : (parseFloat(v.total) - sub);

            return `
            <tr>
                <td><b>#${v.id_venta}</b></td>
                <td><span style="font-weight:600; font-size:0.85rem;">${v.numero_comprobante || 'Ticket-' + v.id_venta}</span></td>
                <td>${new Date(v.fecha_hora).toLocaleString('es-PE')}</td>
                <td>${v.nombre_cliente}</td>
                <td>${v.nombre_vendedor}</td>
                <td>${renderMetodoBadge(v.metodo_pago)}</td>
                <td style="color:#475569;">S/ ${sub.toFixed(2)}</td>
                <td style="color:#64748b; font-size:0.85rem;">S/ ${igv.toFixed(2)}</td>
                <td style="font-weight:700; color:var(--dark);">S/ ${parseFloat(v.total).toFixed(2)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div style="display:flex; gap:4px;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="verDetalleVenta(${v.id_venta})" title="Ver artículos de la venta">
                            <i class='bx bx-search'></i> Detalle
                        </button>
                        ${anularBtn}
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="11" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
};

window.verDetalleVenta = async (id) => {
    try {
        const data = await fetchAPI(`/ventas/${id}`);
        const v = data.venta;
        
        document.getElementById('infoVentaHeader').innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div><strong>Comprobante:</strong> ${v.numero_comprobante || 'Venta #' + v.id_venta}</div>
                <div><strong>Fecha:</strong> ${new Date(v.fecha_hora).toLocaleString('es-PE')}</div>
                <div><strong>Cliente:</strong> ${v.nombre_cliente} (${v.documento_cliente})</div>
                <div><strong>Vendedor:</strong> ${v.nombre_vendedor}</div>
                <div><strong>Método de Pago:</strong> ${renderMetodoBadge(v.metodo_pago)}</div>
                <div><strong>Estado:</strong> <span class="badge ${v.estado === 'confirmada' ? 'ok' : 'agotado'}">${v.estado}</span></div>
            </div>
        `;

        document.getElementById('tablaDetalleItems').innerHTML = data.detalles.map(d => `
            <tr>
                <td>${d.nombre_producto}</td>
                <td>${d.cantidad}</td>
                <td>S/ ${parseFloat(d.precio_unitario).toFixed(2)}</td>
                <td style="font-weight:600;">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
            </tr>
        `).join('');

        const tot = parseFloat(v.total);
        const sub = v.subtotal != null ? parseFloat(v.subtotal) : (tot / 1.18);
        const igv = v.igv != null ? parseFloat(v.igv) : (tot - sub);

        const elSub = document.getElementById('detalleSubtotalVal');
        const elIgv = document.getElementById('detalleIgvVal');
        if (elSub) elSub.innerText = `S/ ${sub.toFixed(2)}`;
        if (elIgv) elIgv.innerText = `S/ ${igv.toFixed(2)}`;
        document.getElementById('detalleTotalVal').innerText = `S/ ${tot.toFixed(2)}`;
        
        showModal('modalDetalleVenta');
    } catch(e) {
        showToast(e.message, 'error');
    }
};

window.anularVenta = async (id) => {
    if (!confirm(`¿Estás seguro de anular la venta #${id}? Las unidades de los productos serán reintegradas al inventario.`)) return;
    try {
        await fetchAPI(`/ventas/${id}/anular`, { method: 'POST' });
        showToast(`Venta #${id} anulada con éxito`, 'success');
        cargarHistorialVentas();
        initDashboard();
    } catch(e) {
        showToast(e.message, 'error');
    }
};

// ==========================================
// 3. GESTIÓN DE USUARIOS Y ROLES (RF14)
// ==========================================
window.cargarUsuarios = async () => {
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando personal...</p></td></tr>`;

    try {
        const [usuarios, roles] = await Promise.all([
            fetchAPI('/usuarios'),
            fetchAPI('/usuarios/roles')
        ]);
        rolesList = roles;

        const selRol = document.getElementById('usrRol');
        if (selRol) {
            selRol.innerHTML = rolesList.map(r => `<option value="${r.id_rol}">${r.nombre_rol}</option>`).join('');
        }

        tbody.innerHTML = usuarios.map(u => {
            const esActivo = u.estado === 'activo';
            const badge = esActivo ? '<span class="badge ok">Activo</span>' : '<span class="badge agotado">Inactivo</span>';
            const cleanName = (u.nombre || '').replace(/'/g, "\\'");
            return `
            <tr>
                <td><b>#${u.id_usuario}</b></td>
                <td><code>${u.usuario}</code></td>
                <td><strong>${u.nombre}</strong></td>
                <td>${u.email || '-'}</td>
                <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${u.nombre_rol}</span></td>
                <td>${badge}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="abrirModalEditarUsuario(${u.id_usuario}, '${u.usuario}', '${cleanName}', '${u.email || ''}', ${u.id_rol})">
                            <i class='bx bx-edit'></i> Editar
                        </button>
                        ${u.usuario === 'admin' ? '' : `
                        <button class="btn btn-ghost" style="padding:4px 6px; font-size:0.75rem; color:${esActivo ? 'var(--danger)' : 'var(--success)'};" 
                                onclick="cambiarEstadoUsuario(${u.id_usuario}, '${esActivo ? 'inactivo' : 'activo'}')">
                            <i class='bx ${esActivo ? 'bx-user-x' : 'bx-user-check'}'></i> ${esActivo ? 'Desactivar' : 'Activar'}
                        </button>
                        `}
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
};

window.abrirModalNuevoUsuario = () => {
    document.getElementById('formUsuario').reset();
    document.getElementById('usrId').value = '';
    document.getElementById('usrUsuario').disabled = false;
    document.getElementById('modalUsuarioTitulo').innerText = 'Registrar Nuevo Usuario';
    document.getElementById('lblUsrPassword').innerText = 'Contraseña (Mínimo 6 caracteres) *';
    document.getElementById('usrPassword').required = true;
    document.getElementById('usrPwdHelp').style.display = 'none';
    showModal('modalUsuario');
};

window.abrirModalEditarUsuario = (id, user, nombre, email, id_rol) => {
    document.getElementById('usrId').value = id;
    document.getElementById('usrUsuario').value = user;
    document.getElementById('usrUsuario').disabled = true;
    document.getElementById('usrNombre').value = nombre;
    document.getElementById('usrEmail').value = email;
    document.getElementById('usrRol').value = id_rol;
    document.getElementById('modalUsuarioTitulo').innerText = `Editar Usuario: ${user}`;
    document.getElementById('lblUsrPassword').innerText = 'Cambiar Contraseña (Opcional)';
    document.getElementById('usrPassword').value = '';
    document.getElementById('usrPassword').required = false;
    document.getElementById('usrPwdHelp').style.display = 'block';
    showModal('modalUsuario');
};

document.getElementById('formUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarUsuario');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Guardando...`;
    btn.disabled = true;

    const id = document.getElementById('usrId').value;
    const isNew = !id;
    const usuario = document.getElementById('usrUsuario').value.trim();
    const nombre = document.getElementById('usrNombre').value.trim();
    const email = document.getElementById('usrEmail').value.trim();
    const id_rol = document.getElementById('usrRol').value;
    const contrasena = document.getElementById('usrPassword').value;

    try {
        if (isNew) {
            await fetchAPI('/usuarios', {
                method: 'POST',
                body: JSON.stringify({ usuario, nombre, email, id_rol, contrasena })
            });
            showToast('Usuario registrado exitosamente con cifrado bcrypt', 'success');
        } else {
            await fetchAPI(`/usuarios/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ nombre, email, id_rol, contrasena: contrasena || undefined })
            });
            showToast('Usuario actualizado exitosamente', 'success');
        }
        closeModal('modalUsuario');
        cargarUsuarios();
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

window.cambiarEstadoUsuario = async (id, estado) => {
    const accion = estado === 'inactivo' ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${accion} a este usuario?`)) return;

    try {
        await fetchAPI(`/usuarios/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        showToast(`Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} con éxito`, 'info');
        cargarUsuarios();
    } catch(e) {
        showToast(e.message, 'error');
    }
};

// ==========================================
// 4. REPORTES: DIARIO Y SEMANAL (RF07)
// Con sincronización por métodos de pago (Yape, Tarjeta, Efectivo) e IGV 18%
// ==========================================

// --- REPORTE DIARIO ---
window.setReporteDiarioHoy = () => {
    const input = document.getElementById('repDiarioFecha');
    if (input) input.value = getLocalDateString();
    cargarReporteDiario();
};

window.cargarReporteDiario = async () => {
    const inputFecha = document.getElementById('repDiarioFecha');
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = getLocalDateString();
    }
    const fecha = inputFecha ? inputFecha.value : getLocalDateString();

    try {
        const data = await fetchAPI(`/reportes/diario?fecha=${fecha}`);
        reporteDiarioData = data;
        
        document.getElementById('reporteFechaTxt').innerText = `Consolidado oficial para el día: ${data.fecha}`;
        document.getElementById('repCantVentas').innerText = data.total_ventas;
        document.getElementById('repSubtotalDiario').innerText = `S/ ${parseFloat(data.total_subtotal || 0).toFixed(2)}`;
        document.getElementById('repIgvDiario').innerText = `S/ ${parseFloat(data.total_igv || 0).toFixed(2)}`;
        document.getElementById('repTotalIngresos').innerText = `S/ ${parseFloat(data.total_ingresos || 0).toFixed(2)}`;

        // Render tarjetas de métodos de pago (Efectivo, Tarjeta, Yape) con IGV 18%
        const metodosBox = document.getElementById('repMetodosPago');
        if (!data.metodos || data.metodos.length === 0) {
            metodosBox.innerHTML = '<span style="font-size:0.85rem; color:#64748b;">No hay transacciones registradas para este día</span>';
        } else {
            metodosBox.innerHTML = data.metodos.map(m => {
                let iconClass = 'bx-money';
                let themeColor = '#0f766e';
                let bgBadge = '#ecfdf5';
                if ((m.metodo || '').toLowerCase().includes('tarjeta')) {
                    iconClass = 'bx-credit-card';
                    themeColor = '#0284c7';
                    bgBadge = '#e0f2fe';
                } else if ((m.metodo || '').toLowerCase().includes('yape')) {
                    iconClass = 'bx-qr-scan';
                    themeColor = '#9333ea';
                    bgBadge = '#f3e8ff';
                }

                return `
                <div style="background:#fff; padding:14px; border-radius:10px; border:1px solid #e2e8f0; border-left:4px solid ${themeColor}; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700; font-size:0.95rem; color:#1e293b; display:flex; align-items:center; gap:6px;">
                            <i class='bx ${iconClass}' style="color:${themeColor}; font-size:1.2rem;"></i> ${m.metodo}
                        </span>
                        <span class="badge" style="background:${bgBadge}; color:${themeColor}; font-weight:700;">${m.transacciones} ops</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span>Op. Gravada:</span>
                        <span style="font-weight:600; color:#334155;">S/ ${parseFloat(m.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span>IGV (18%):</span>
                        <span style="font-weight:600; color:#334155;">S/ ${parseFloat(m.igv || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.95rem; font-weight:800; color:${themeColor}; display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:4px;">
                        <span>Total:</span>
                        <span>S/ ${parseFloat(m.total || 0).toFixed(2)}</span>
                    </div>
                </div>`;
            }).join('');
        }

        // Top 5 Productos
        const tbodyTop = document.getElementById('tablaTopProductos');
        if (!data.top_productos || data.top_productos.length === 0) {
            tbodyTop.innerHTML = `<tr><td colspan="5" class="empty-state">No hay ventas registradas en esta fecha</td></tr>`;
        } else {
            tbodyTop.innerHTML = data.top_productos.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="font-weight:700;">${p.total_unidades} und.</td>
                    <td style="color:#475569;">S/ ${parseFloat(p.subtotal_base || 0).toFixed(2)}</td>
                    <td style="color:#64748b;">S/ ${parseFloat(p.igv_recaudado || 0).toFixed(2)}</td>
                    <td style="font-weight:700; color:var(--primary);">S/ ${parseFloat(p.total_recaudado || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        }

        // Detalle de Ventas del Día
        const tbodyVentas = document.getElementById('tablaVentasDia');
        if (!data.ventas || data.ventas.length === 0) {
            tbodyVentas.innerHTML = `<tr><td colspan="8" class="empty-state">Sin ventas registradas</td></tr>`;
        } else {
            tbodyVentas.innerHTML = data.ventas.map(v => {
                const sub = parseFloat(v.subtotal || 0);
                const igv = parseFloat(v.igv || 0);
                const tot = parseFloat(v.total || 0);
                const hora = new Date(v.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return `
                <tr>
                    <td><b>${v.comprobante || 'Venta #' + v.id_venta}</b></td>
                    <td>${hora}</td>
                    <td>${v.nombre_cliente}</td>
                    <td>${v.nombre_vendedor}</td>
                    <td>${renderMetodoBadge(v.metodo_pago)}</td>
                    <td style="color:#475569;">S/ ${sub.toFixed(2)}</td>
                    <td style="color:#64748b;">S/ ${igv.toFixed(2)}</td>
                    <td style="font-weight:700; color:var(--dark);">S/ ${tot.toFixed(2)}</td>
                </tr>`;
            }).join('');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
};

window.exportarReporteDiarioCSV = () => {
    if (!reporteDiarioData || !reporteDiarioData.ventas || reporteDiarioData.ventas.length === 0) {
        return showToast('No hay datos de ventas disponibles para exportar hoy', 'warning');
    }

    const headers = ['ID Venta', 'Comprobante', 'Fecha y Hora', 'Vendedor', 'Cliente', 'Metodo de Pago', 'Op. Gravada / Subtotal (S/)', 'IGV 18% (S/)', 'Total Facturado (S/)'];
    const rows = reporteDiarioData.ventas.map(v => [
        v.id_venta,
        v.comprobante || ('Ticket-' + v.id_venta),
        `"${new Date(v.fecha_hora).toLocaleString('es-PE')}"`,
        `"${v.nombre_vendedor}"`,
        `"${v.nombre_cliente}"`,
        `"${v.metodo_pago || 'Efectivo'}"`,
        parseFloat(v.subtotal || (v.total / 1.18)).toFixed(2),
        parseFloat(v.igv || (v.total - v.total / 1.18)).toFixed(2),
        parseFloat(v.total).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Diario_${reporteDiarioData.fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte diario exportado a CSV exitosamente', 'success');
};

// --- REPORTE SEMANAL ---
window.setReporteSemanalActual = () => {
    const input = document.getElementById('repSemanalFecha');
    if (input) input.value = getLocalDateString();
    cargarReporteSemanal();
};

window.cargarReporteSemanal = async () => {
    const inputFecha = document.getElementById('repSemanalFecha');
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = getLocalDateString();
    }
    const fecha = inputFecha ? inputFecha.value : getLocalDateString();

    try {
        const data = await fetchAPI(`/reportes/semanal?fecha=${fecha}`);
        reporteSemanalData = data;

        document.getElementById('repSemanaRangoTxt').innerText = `${data.semana_label} (${data.rango.inicio} a ${data.rango.fin})`;
        document.getElementById('repSemanaCantVentas').innerText = data.total_ventas;
        document.getElementById('repSemanaSubtotal').innerText = `S/ ${parseFloat(data.total_subtotal || 0).toFixed(2)}`;
        document.getElementById('repSemanaIgv').innerText = `S/ ${parseFloat(data.total_igv || 0).toFixed(2)}`;
        document.getElementById('repSemanaTotal').innerText = `S/ ${parseFloat(data.total_ingresos || 0).toFixed(2)}`;

        // Render Gráfico de Evolución Semanal
        renderGraficoSemanal(data.desglose_dias);

        // Tabla de Desglose Día por Día
        const tbodyDias = document.getElementById('tablaDesgloseDiasSemana');
        tbodyDias.innerHTML = data.desglose_dias.map(d => `
            <tr>
                <td><strong>${d.dia_nombre}</strong></td>
                <td><code>${d.fecha}</code></td>
                <td><span class="badge ${d.transacciones > 0 ? 'ok' : ''}">${d.transacciones} ops</span></td>
                <td style="color:#475569;">S/ ${parseFloat(d.subtotal).toFixed(2)}</td>
                <td style="color:#64748b;">S/ ${parseFloat(d.igv).toFixed(2)}</td>
                <td style="font-weight:700; color:var(--dark);">S/ ${parseFloat(d.total).toFixed(2)}</td>
            </tr>
        `).join('');

        // Tarjetas Métodos de Pago Semanal
        const metodosBox = document.getElementById('repSemanaMetodosPago');
        if (!data.metodos || data.metodos.length === 0) {
            metodosBox.innerHTML = '<span style="font-size:0.85rem; color:#64748b;">No hay transacciones registradas en esta semana</span>';
        } else {
            metodosBox.innerHTML = data.metodos.map(m => {
                let iconClass = 'bx-money';
                let themeColor = '#0f766e';
                let bgBadge = '#ecfdf5';
                if ((m.metodo || '').toLowerCase().includes('tarjeta')) {
                    iconClass = 'bx-credit-card';
                    themeColor = '#0284c7';
                    bgBadge = '#e0f2fe';
                } else if ((m.metodo || '').toLowerCase().includes('yape')) {
                    iconClass = 'bx-qr-scan';
                    themeColor = '#9333ea';
                    bgBadge = '#f3e8ff';
                }

                return `
                <div style="background:#fff; padding:14px; border-radius:10px; border:1px solid #e2e8f0; border-left:4px solid ${themeColor}; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700; font-size:0.95rem; color:#1e293b; display:flex; align-items:center; gap:6px;">
                            <i class='bx ${iconClass}' style="color:${themeColor}; font-size:1.2rem;"></i> ${m.metodo}
                        </span>
                        <span class="badge" style="background:${bgBadge}; color:${themeColor}; font-weight:700;">${m.transacciones} ops</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span>Op. Gravada:</span>
                        <span style="font-weight:600; color:#334155;">S/ ${parseFloat(m.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span>IGV (18%):</span>
                        <span style="font-weight:600; color:#334155;">S/ ${parseFloat(m.igv || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size:0.95rem; font-weight:800; color:${themeColor}; display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:4px;">
                        <span>Total Semanal:</span>
                        <span>S/ ${parseFloat(m.total || 0).toFixed(2)}</span>
                    </div>
                </div>`;
            }).join('');
        }

        // Top Productos de la Semana
        const tbodyTop = document.getElementById('tablaSemanaTopProductos');
        if (!data.top_productos || data.top_productos.length === 0) {
            tbodyTop.innerHTML = `<tr><td colspan="5" class="empty-state">No hay ventas registradas en esta semana</td></tr>`;
        } else {
            tbodyTop.innerHTML = data.top_productos.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="font-weight:700;">${p.total_unidades} und.</td>
                    <td style="color:#475569;">S/ ${parseFloat(p.subtotal_base || 0).toFixed(2)}</td>
                    <td style="color:#64748b;">S/ ${parseFloat(p.igv_recaudado || 0).toFixed(2)}</td>
                    <td style="font-weight:700; color:var(--primary);">S/ ${parseFloat(p.total_recaudado || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        }

        // Listado de Ventas de la Semana
        const tbodyVentas = document.getElementById('tablaSemanaVentas');
        if (!data.ventas || data.ventas.length === 0) {
            tbodyVentas.innerHTML = `<tr><td colspan="8" class="empty-state">Sin ventas registradas en la semana</td></tr>`;
        } else {
            tbodyVentas.innerHTML = data.ventas.map(v => {
                const sub = parseFloat(v.subtotal || 0);
                const igv = parseFloat(v.igv || 0);
                const tot = parseFloat(v.total || 0);

                return `
                <tr>
                    <td><b>${v.comprobante || 'Venta #' + v.id_venta}</b></td>
                    <td>${new Date(v.fecha_hora).toLocaleString('es-PE')}</td>
                    <td>${v.nombre_cliente}</td>
                    <td>${v.nombre_vendedor}</td>
                    <td>${renderMetodoBadge(v.metodo_pago)}</td>
                    <td style="color:#475569;">S/ ${sub.toFixed(2)}</td>
                    <td style="color:#64748b;">S/ ${igv.toFixed(2)}</td>
                    <td style="font-weight:700; color:var(--dark);">S/ ${tot.toFixed(2)}</td>
                </tr>`;
            }).join('');
        }

    } catch(e) {
        showToast(e.message, 'error');
    }
};

function renderGraficoSemanal(desgloseDias) {
    if (!desgloseDias || desgloseDias.length === 0) return;
    const canvas = document.getElementById('semanalChart');
    if (!canvas) return;

    const labels = desgloseDias.map(d => `${d.dia_nombre} (${d.fecha.slice(5)})`);
    const dataTotales = desgloseDias.map(d => d.total);
    const dataSubtotales = desgloseDias.map(d => d.subtotal);

    if (chartSemanal) chartSemanal.destroy();
    chartSemanal = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Facturado (S/)',
                    data: dataTotales,
                    backgroundColor: '#0f766e',
                    borderRadius: 6
                },
                {
                    label: 'Base Imponible / Subtotal (S/)',
                    data: dataSubtotales,
                    backgroundColor: '#5eead4',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Plus Jakarta Sans', size: 12 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (val) => 'S/ ' + val }
                }
            }
        }
    });
}

window.exportarReporteSemanalCSV = () => {
    if (!reporteSemanalData || !reporteSemanalData.ventas || reporteSemanalData.ventas.length === 0) {
        return showToast('No hay datos de ventas disponibles para exportar esta semana', 'warning');
    }

    const headers = ['ID Venta', 'Comprobante', 'Fecha y Hora', 'Vendedor', 'Cliente', 'Metodo de Pago', 'Op. Gravada / Subtotal (S/)', 'IGV 18% (S/)', 'Total Facturado (S/)'];
    const rows = reporteSemanalData.ventas.map(v => [
        v.id_venta,
        v.comprobante || ('Ticket-' + v.id_venta),
        `"${new Date(v.fecha_hora).toLocaleString('es-PE')}"`,
        `"${v.nombre_vendedor}"`,
        `"${v.nombre_cliente}"`,
        `"${v.metodo_pago || 'Efectivo'}"`,
        parseFloat(v.subtotal || (v.total / 1.18)).toFixed(2),
        parseFloat(v.igv || (v.total - v.total / 1.18)).toFixed(2),
        parseFloat(v.total).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Semanal_${reporteSemanalData.rango.inicio}_a_${reporteSemanalData.rango.fin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte semanal exportado a CSV exitosamente', 'success');
};

// ==========================================
// 5. CONTROL Y GESTIÓN DE CAJAS (ARQUEOS)
// ==========================================
window.cargarHistorialCajas = async () => {
    const tbody = document.getElementById('tablaHistorialCajas');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando turnos de caja...</p></td></tr>`;

    try {
        const cajas = await fetchAPI('/caja/historial');
        if (!cajas || cajas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="empty-state"><i class='bx bx-archive-in'></i><p>No se encontraron registros de turnos de caja.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = cajas.map(c => {
            const esAbierta = c.estado === 'abierta';
            const badgeEstado = esAbierta ? '<span class="badge ok">Abierta</span>' : '<span class="badge">Cerrada</span>';
            const fApertura = new Date(c.fecha_apertura).toLocaleString('es-PE');
            const fCierre = c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-PE') : '<span style="color:#64748b;">Turno en curso</span>';
            
            const dif = c.diferencia != null ? parseFloat(c.diferencia) : null;
            let badgeDif = '-';
            if (dif !== null) {
                if (dif === 0) badgeDif = '<span class="badge ok">Exacto (S/ 0.00)</span>';
                else if (dif > 0) badgeDif = `<span class="badge" style="background:#e0f2fe; color:#0369a1;">+S/ ${dif.toFixed(2)} (Sobrante)</span>`;
                else badgeDif = `<span class="badge agotado">-S/ ${Math.abs(dif).toFixed(2)} (Faltante)</span>`;
            }

            return `
            <tr>
                <td><b>#${c.id_caja}</b></td>
                <td><strong>${c.nombre_usuario}</strong></td>
                <td>${fApertura}</td>
                <td>${fCierre}</td>
                <td style="font-weight:600;">S/ ${parseFloat(c.monto_inicial).toFixed(2)}</td>
                <td style="color:#0f766e; font-weight:600;">S/ ${parseFloat(c.total_ventas_efectivo || 0).toFixed(2)}</td>
                <td style="font-weight:700;">${c.monto_final_esperado != null ? 'S/ ' + parseFloat(c.monto_final_esperado).toFixed(2) : '-'}</td>
                <td style="font-weight:700; color:var(--dark);">${c.monto_final_real != null ? 'S/ ' + parseFloat(c.monto_final_real).toFixed(2) : '-'}</td>
                <td>${badgeDif}</td>
                <td>${badgeEstado}</td>
                <td style="font-size:0.8rem; color:#64748b;">${c.observaciones || '-'}</td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="11" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
};

initDashboard();
