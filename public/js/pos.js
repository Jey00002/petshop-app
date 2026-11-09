checkAuth(['Administrador', 'Vendedor']);

let allProducts = [];
let cart = [];
let selectedMethod = 1;
let currentViewer = null;

let currentClient = {
    id_cliente: 1,
    nombre: 'Cliente General',
    documento: '00000000'
};

async function initPOS() {
    try {
        allProducts = await fetchAPI('/productos');
        renderCategories();
        renderGrid(allProducts);
        actualizarDisplayCliente();
    } catch(e) { 
        showToast(e.message, 'error'); 
    }
}

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
    if (cart.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 2rem;"><i class='bx bx-cart'></i><p style="font-size:0.9rem; margin:0;">Carrito vacío</p></div>`;
        document.getElementById('cartCount').innerText = '0 ítems';
        document.getElementById('cartTotal').innerText = 'S/ 0.00';
        const btn = document.getElementById('btnCobrar');
        btn.disabled = true;
        btn.innerHTML = `<i class='bx bx-check-shield'></i> Cobrar S/ 0.00`;
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

    document.getElementById('cartCount').innerText = `${totalItems} ítems`;
    document.getElementById('cartTotal').innerText = `S/ ${total.toFixed(2)}`;
    const btn = document.getElementById('btnCobrar');
    btn.disabled = false;
    btn.innerHTML = `<i class='bx bx-check-shield'></i> Cobrar S/ ${total.toFixed(2)}`;
}

document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedMethod = this.getAttribute('data-id');
    });
});

window.procesarVenta = async () => {
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
        showToast('Venta registrada correctamente', 'success');
        
        // Modal de Comprobante
        document.getElementById('tkNum').innerText = res.comprobante;
        document.getElementById('tkFecha').innerText = new Date().toLocaleString();
        document.getElementById('tkVend').innerText = localStorage.getItem('nombre');
        document.getElementById('tkCliente').innerText = `${currentClient.nombre} (${currentClient.documento || '-'})`;
        
        let tkDetalleHtml = '';
        let tTotal = 0;
        cart.forEach(i => {
            const s = i.cantidad * i.precio; 
            tTotal += s;
            tkDetalleHtml += `<div class="ticket-row"><span>${i.cantidad}x ${i.nombre}</span><span>S/ ${s.toFixed(2)}</span></div>`;
        });
        document.getElementById('tkDetalle').innerHTML = tkDetalleHtml;
        document.getElementById('tkTotal').innerText = `S/ ${tTotal.toFixed(2)}`;
        
        showModal('modalComprobante');
        cart = [];
        renderCart();
        
        // Recargar productos para actualizar stock
        allProducts = await fetchAPI('/productos');
        renderGrid(allProducts);
        
    } catch(e) {
        showToast(e.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = cart.length === 0;
    }
};

window.cerrarComprobante = () => { closeModal('modalComprobante'); };

initPOS();
