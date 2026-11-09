checkAuth(['Administrador', 'Almacén', 'Almacen']);

let allProducts = [];
let categoriasList = [];
let proveedoresList = [];
let currentViewer = null;

const presetsFotos = {
    alimento: '/img/productos/alimento-premium.jpg',
    cachorro: '/img/productos/alimento-cachorro.jpg',
    snack: '/img/productos/snack-dental.jpg',
    juguete: '/img/productos/juguete.jpg',
    shampoo: '/img/productos/champu.jpg',
    cama: '/img/productos/cama-perro.jpg',
    correa: '/img/productos/correa.jpg'
};

async function initAlmacen() {
    try {
        const verInactivos = document.getElementById('chkVerInactivos')?.checked ? '?todos=true' : '';
        const [alertas, productos, categorias, proveedores] = await Promise.all([
            fetchAPI('/inventario/alertas'),
            fetchAPI(`/productos${verInactivos}`),
            fetchAPI('/productos/categorias'),
            fetchAPI('/proveedores?todos=true')
        ]);

        allProducts = productos;
        categoriasList = categorias;
        proveedoresList = proveedores;
        
        poblarSelects();

        if (alertas.length > 0) {
            document.getElementById('bannerAlertas').innerHTML = `
                <div class="alert-banner">
                    <i class='bx bx-error-circle' style="font-size:1.5rem;"></i>
                    Atención: Tienes ${alertas.length} producto(s) con stock por debajo del mínimo recomendado.
                </div>`;
        } else {
            document.getElementById('bannerAlertas').innerHTML = '';
        }

        renderTable(allProducts);
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function poblarSelects() {
    // Categorías en Nuevo y Editar
    const selCatNuevo = document.getElementById('npCategoria');
    const selCatEdit = document.getElementById('editCategoria');
    const catHtml = categoriasList.map(c => `<option value="${c.id_categoria}">${c.nombre_categoria}</option>`).join('');
    if (selCatNuevo) selCatNuevo.innerHTML = catHtml || '<option value="1">General</option>';
    if (selCatEdit) selCatEdit.innerHTML = catHtml || '<option value="1">General</option>';

    // Proveedores en Nuevo y Editar
    const selProvNuevo = document.getElementById('npProveedor');
    const selProvEdit = document.getElementById('editProveedor');
    const provHtml = proveedoresList.map(p => `<option value="${p.id_proveedor}">${p.nombre}</option>`).join('');
    if (selProvNuevo) selProvNuevo.innerHTML = provHtml || '<option value="1">Proveedor General</option>';
    if (selProvEdit) selProvEdit.innerHTML = provHtml || '<option value="1">Proveedor General</option>';
}

// Visualizador con Viewer.js
window.verImagen = (imgUrl, prodName) => {
    const container = document.getElementById('almacenViewerContainer');
    container.innerHTML = `<img src="${imgUrl}" alt="${prodName}" style="display:none;">`;
    
    if (currentViewer) currentViewer.destroy();
    
    const imgEl = container.querySelector('img');
    currentViewer = new Viewer(imgEl, {
        inline: false,
        button: true,
        navbar: false,
        title: [1, () => `${prodName} - Almacén PetShop Pro`],
        toolbar: { zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1, rotateLeft: 1, rotateRight: 1, flipHorizontal: 1 },
        hidden: function () {
            if (currentViewer) { currentViewer.destroy(); currentViewer = null; }
        }
    });
    currentViewer.show();
};

function renderTable(products) {
    const tbody = document.getElementById('tablaProductos');
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><i class='bx bx-search'></i><p>No se encontraron productos en el inventario</p></td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const imgUrl = p.imagen_url || '/img/productos/alimento-premium.jpg';
        const cleanName = (p.nombre || '').replace(/'/g, "\\'");
        const cat = p.nombre_categoria || 'General';
        const prov = p.nombre_proveedor || 'Distribuidor';
        const esActivo = p.estado === 'activo';
        const estadoBadge = esActivo ? '<span class="badge ok">Activo</span>' : '<span class="badge agotado">Inactivo</span>';
        
        return `
        <tr style="${!esActivo ? 'opacity:0.6; background:#f8fafc;' : ''}">
            <td><b>#${p.id_producto}</b></td>
            <td>
                <img src="${imgUrl}" alt="${p.nombre}" class="img-thumb-preview" 
                     onclick="verImagen('${imgUrl}', '${cleanName}')"
                     title="Click para ampliar imagen en HD"
                     onerror="this.src='/img/productos/alimento-premium.jpg'">
            </td>
            <td>
                <div style="font-weight:600; color:var(--dark);">${p.nombre}</div>
                <div style="font-size:0.75rem; color:#64748b;">${p.codigo_barras || 'Sin código'}</div>
            </td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${cat}</span></td>
            <td style="font-size:0.82rem; color:#475569;">${prov}</td>
            <td style="font-weight:700; color:var(--dark);">S/ ${parseFloat(p.precio).toFixed(2)}</td>
            <td style="font-weight:800; font-size:1.05rem;">${p.stock}</td>
            <td style="color:#64748b;">${p.stock_minimo}</td>
            <td>${estadoBadge} ${getBadgeStock(p.stock, p.stock_minimo)}</td>
            <td>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button class="btn btn-primary" style="padding: 4px 8px; font-size:0.75rem;" onclick="abrirEntrada(${p.id_producto}, '${cleanName}')" title="Ingreso de stock">
                        <i class='bx bx-plus'></i> Entrada
                    </button>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalEditar(${p.id_producto})" title="Editar producto">
                        <i class='bx bx-edit'></i> Editar
                    </button>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size:0.75rem;" onclick="abrirModalImagen(${p.id_producto}, '${cleanName}', '${imgUrl}')" title="Foto">
                        <i class='bx bx-image-alt'></i>
                    </button>
                    <button class="btn btn-ghost" style="padding: 4px 6px; font-size:0.75rem; color:${esActivo ? 'var(--danger)' : 'var(--success)'};" 
                            onclick="cambiarEstadoProducto(${p.id_producto}, '${esActivo ? 'inactivo' : 'activo'}')" 
                            title="${esActivo ? 'Desactivar producto' : 'Activar producto'}">
                        <i class='bx ${esActivo ? 'bx-hide' : 'bx-show'}'></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('searchInv').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        (p.nombre_categoria && p.nombre_categoria.toLowerCase().includes(q)) ||
        (p.codigo_barras && p.codigo_barras.includes(q))
    );
    renderTable(filtered);
});

// Modal Entrada
window.abrirEntrada = (id, nombre) => {
    document.getElementById('entIdProd').value = id;
    document.getElementById('entNombre').value = nombre;
    document.getElementById('entCant').value = '';
    showModal('modalEntrada');
};

document.getElementById('entradaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarEntrada');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Guardando...`;
    btn.disabled = true;

    const id_producto = document.getElementById('entIdProd').value;
    const cantidad = document.getElementById('entCant').value;
    const motivo = document.getElementById('entMotivo').value;

    try {
        await fetchAPI('/inventario/entradas', { method: 'POST', body: JSON.stringify({ id_producto, cantidad, motivo }) });
        showToast('Entrada de stock registrada exitosamente', 'success');
        closeModal('modalEntrada');
        initAlmacen();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

// Modal Cambiar Foto
window.abrirModalImagen = (id, nombre, currentUrl) => {
    document.getElementById('imgIdProd').value = id;
    document.getElementById('imgProdNombreLabel').innerText = `Foto para: ${nombre}`;
    const input = document.getElementById('imgUrlInput');
    const preview = document.getElementById('imgPreviewModal');
    input.value = currentUrl || '';
    if (currentUrl) {
        preview.src = currentUrl;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
    showModal('modalImagen');
};

document.getElementById('imgUrlInput').addEventListener('input', (e) => {
    const preview = document.getElementById('imgPreviewModal');
    if (e.target.value.trim()) {
        preview.src = e.target.value.trim();
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

document.getElementById('imagenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarImagen');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Guardando...`;
    btn.disabled = true;

    const id_producto = document.getElementById('imgIdProd').value;
    const imagen_url = document.getElementById('imgUrlInput').value.trim();

    try {
        await fetchAPI(`/productos/${id_producto}/imagen`, { method: 'PUT', body: JSON.stringify({ imagen_url }) });
        showToast('Foto del producto actualizada con éxito', 'success');
        closeModal('modalImagen');
        initAlmacen();
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

// Modal Nuevo Producto (RF02, RF10)
window.abrirModalNuevoProducto = () => {
    document.getElementById('nuevoProductoForm').reset();
    document.getElementById('wrapPreviewNuevo').style.display = 'none';
    generarCodigoBarras();
    seleccionarPresetFoto('alimento');
    showModal('modalNuevoProducto');
};

window.generarCodigoBarras = () => {
    const randomCode = '775' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('npCodigo').value = randomCode;
};

window.seleccionarPresetFoto = (tipo) => {
    const url = presetsFotos[tipo] || presetsFotos['alimento'];
    const input = document.getElementById('npImagen');
    const wrap = document.getElementById('wrapPreviewNuevo');
    const img = document.getElementById('imgPreviewNuevo');
    input.value = url;
    img.src = url;
    wrap.style.display = 'block';
};

document.getElementById('nuevoProductoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnCrearProducto');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Registrando...`;
    btn.disabled = true;

    const nombre = document.getElementById('npNombre').value.trim();
    const id_categoria = document.getElementById('npCategoria').value;
    const id_proveedor = document.getElementById('npProveedor').value;
    const precio = parseFloat(document.getElementById('npPrecio').value);
    const stock = parseInt(document.getElementById('npStock').value) || 0;
    const stock_minimo = parseInt(document.getElementById('npStockMinimo').value) || 5;
    const codigo_barras = document.getElementById('npCodigo').value.trim();
    const descripcion = document.getElementById('npDescripcion').value.trim();
    const imagen_url = document.getElementById('npImagen').value.trim();

    try {
        const payload = { nombre, id_categoria, id_proveedor, precio, stock, stock_minimo, codigo_barras, descripcion, imagen_url };
        const res = await fetchAPI('/productos', { method: 'POST', body: JSON.stringify(payload) });
        showToast(res.mensaje || '¡Producto creado con éxito!', 'success');
        closeModal('modalNuevoProducto');
        await initAlmacen();
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

// Modal Editar Producto (RF03)
window.abrirModalEditar = async (id) => {
    try {
        const prod = await fetchAPI(`/productos/${id}`);
        document.getElementById('editIdProd').value = prod.id_producto;
        document.getElementById('editNombre').value = prod.nombre;
        document.getElementById('editCategoria').value = prod.id_categoria;
        document.getElementById('editProveedor').value = prod.id_proveedor || 1;
        document.getElementById('editPrecio').value = prod.precio;
        document.getElementById('editStockMinimo').value = prod.stock_minimo;
        document.getElementById('editCodigo').value = prod.codigo_barras || '';
        document.getElementById('editDescripcion').value = prod.descripcion || '';
        showModal('modalEditarProducto');
    } catch (e) {
        showToast('Error al cargar datos del producto: ' + e.message, 'error');
    }
};

document.getElementById('editarProductoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarEdicion');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Guardando...`;
    btn.disabled = true;

    const id = document.getElementById('editIdProd').value;
    const payload = {
        nombre: document.getElementById('editNombre').value.trim(),
        id_categoria: document.getElementById('editCategoria').value,
        id_proveedor: document.getElementById('editProveedor').value,
        precio: parseFloat(document.getElementById('editPrecio').value),
        stock_minimo: parseInt(document.getElementById('editStockMinimo').value),
        codigo_barras: document.getElementById('editCodigo').value.trim(),
        descripcion: document.getElementById('editDescripcion').value.trim()
    };

    try {
        await fetchAPI(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Producto actualizado correctamente', 'success');
        closeModal('modalEditarProducto');
        initAlmacen();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

// Desactivar / Activar Producto (RF03)
window.cambiarEstadoProducto = async (id, nuevoEstado) => {
    const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este producto?`)) return;

    try {
        await fetchAPI(`/productos/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        showToast(`Producto ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} con éxito`, 'info');
        initAlmacen();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// Gestión de Proveedores (RF10)
window.abrirModalProveedores = async () => {
    showModal('modalProveedores');
    await cargarProveedoresModal();
};

async function cargarProveedoresModal() {
    const tbody = document.getElementById('tablaProveedoresModal');
    try {
        const provs = await fetchAPI('/proveedores?todos=true');
        proveedoresList = provs;
        poblarSelects();
        
        if (provs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay proveedores registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = provs.map(p => `
            <tr>
                <td><b>#${p.id_proveedor}</b></td>
                <td><b>${p.nombre}</b></td>
                <td>${p.contacto || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>
                    <span class="badge ${p.estado === 'activo' ? 'ok' : 'agotado'}">${p.estado}</span>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${e.message}</td></tr>`;
    }
}

document.getElementById('formNuevoProveedor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('provNombre').value.trim();
    const telefono = document.getElementById('provTelefono').value.trim();
    const contacto = document.getElementById('provContacto').value.trim();

    try {
        await fetchAPI('/proveedores', {
            method: 'POST',
            body: JSON.stringify({ nombre, telefono, contacto })
        });
        showToast('Proveedor registrado con éxito', 'success');
        document.getElementById('formNuevoProveedor').reset();
        await cargarProveedoresModal();
        await initAlmacen();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

initAlmacen();
