checkAuth(['Administrador']);

let chartBar = null;
let chartDoughnut = null;
let rolesList = [];
let reporteDiarioData = null;

// Control de Pestañas
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
        cargarReporteDiario();
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
// ==========================================
window.cargarHistorialVentas = async () => {
    const tbody = document.getElementById('tablaHistorialVentas');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando ventas...</p></td></tr>`;

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
            tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><i class='bx bx-receipt'></i><p>No se encontraron registros de ventas.</p></td></tr>`;
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

            return `
            <tr>
                <td><b>#${v.id_venta}</b></td>
                <td><span style="font-weight:600; font-size:0.85rem;">${v.numero_comprobante || 'Ticket-' + v.id_venta}</span></td>
                <td>${new Date(v.fecha_hora).toLocaleString()}</td>
                <td>${v.nombre_cliente}</td>
                <td>${v.nombre_vendedor}</td>
                <td>${v.metodo_pago || 'Efectivo'}</td>
                <td style="font-weight:700;">S/ ${parseFloat(v.total).toFixed(2)}</td>
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
        tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
};

window.verDetalleVenta = async (id) => {
    try {
        const data = await fetchAPI(`/ventas/${id}`);
        const v = data.venta;
        
        document.getElementById('infoVentaHeader').innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div><strong>Comprobante:</strong> ${v.numero_comprobante || 'Venta #' + v.id_venta}</div>
                <div><strong>Fecha:</strong> ${new Date(v.fecha_hora).toLocaleString()}</div>
                <div><strong>Cliente:</strong> ${v.nombre_cliente} (${v.documento_cliente})</div>
                <div><strong>Vendedor:</strong> ${v.nombre_vendedor}</div>
                <div><strong>Método de Pago:</strong> ${v.metodo_pago || 'Efectivo'}</div>
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

        document.getElementById('detalleTotalVal').innerText = `S/ ${parseFloat(v.total).toFixed(2)}`;
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
// 4. REPORTES DIARIOS Y EXPORTACIÓN (RF07)
// ==========================================
window.cargarReporteDiario = async () => {
    try {
        const data = await fetchAPI('/reportes/diario');
        reporteDiarioData = data;
        
        document.getElementById('reporteFechaTxt').innerText = `Consolidado para la fecha: ${data.fecha}`;
        document.getElementById('repCantVentas').innerText = data.total_ventas;
        document.getElementById('repTotalIngresos').innerText = `S/ ${parseFloat(data.total_ingresos).toFixed(2)}`;

        const metodosBox = document.getElementById('repMetodosPago');
        if (data.metodos.length === 0) {
            metodosBox.innerHTML = '<span style="font-size:0.85rem; color:#64748b;">No hay transacciones registradas hoy</span>';
        } else {
            metodosBox.innerHTML = data.metodos.map(m => `
                <div style="background:#f8fafc; padding:8px 14px; border-radius:8px; border:1px solid #e2e8f0; font-size:0.85rem;">
                    <strong>${m.metodo}:</strong> S/ ${parseFloat(m.total).toFixed(2)} (${m.transacciones} ops)
                </div>
            `).join('');
        }

        const tbodyTop = document.getElementById('tablaTopProductos');
        if (data.top_productos.length === 0) {
            tbodyTop.innerHTML = `<tr><td colspan="3" class="empty-state">No hay ventas registradas el día de hoy</td></tr>`;
        } else {
            tbodyTop.innerHTML = data.top_productos.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="font-weight:700;">${p.total_unidades} und.</td>
                    <td style="font-weight:700; color:var(--primary);">S/ ${parseFloat(p.total_recaudado).toFixed(2)}</td>
                </tr>
            `).join('');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
};

window.exportarReporteDiarioCSV = () => {
    if (!reporteDiarioData || !reporteDiarioData.ventas || reporteDiarioData.ventas.length === 0) {
        return showToast('No hay datos de ventas disponibles para exportar hoy', 'warning');
    }

    const headers = ['ID Venta', 'Comprobante', 'Fecha y Hora', 'Vendedor', 'Cliente', 'Metodo de Pago', 'Total (S/)'];
    const rows = reporteDiarioData.ventas.map(v => [
        v.id_venta,
        v.comprobante || ('Ticket-' + v.id_venta),
        `"${new Date(v.fecha_hora).toLocaleString()}"`,
        `"${v.nombre_vendedor}"`,
        `"${v.nombre_cliente}"`,
        `"${v.metodo_pago || 'Efectivo'}"`,
        parseFloat(v.total).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Ventas_${reporteDiarioData.fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte diario exportado a CSV exitosamente', 'success');
};

initDashboard();
