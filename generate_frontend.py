import os

base_path = '/home/jacob/Escritorio/petshop-app/public'

files = {
    "css/style.css": """
:root {
  --primary: #0f766e;
  --accent: #f97316;
  --dark: #0f172a;
  --bg: #f1f5f9;
  --text: #334155;
  --border: #e2e8f0;
  --radius: 14px;
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  margin: 0;
  padding: 0;
  background-color: var(--bg);
  color: var(--text);
}

/* Login */
body.login-body {
  background: linear-gradient(135deg, var(--primary) 0%, var(--dark) 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  text-align: center;
}
.login-card h2 { margin-top: 0; color: var(--dark); font-size: 1.8rem; }
.login-card input {
  width: 100%; padding: 12px; margin: 10px 0 20px;
  border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box;
}
.login-card input:focus { outline: 2px solid var(--primary); }

/* Layout App */
header.app {
  background-color: var(--dark);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
header.app h2 { margin: 0; }
.user-chip {
  background: rgba(255,255,255,0.1);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  display: flex; align-items: center; gap: 10px;
}
.user-chip span { font-weight: bold; }

nav.tabs {
  background: white; padding: 10px 2rem;
  border-bottom: 1px solid var(--border);
  display: flex; gap: 10px;
}
nav.tabs button {
  background: transparent; border: none; padding: 10px 20px;
  border-radius: 20px; cursor: pointer; font-weight: 500;
  color: var(--text); transition: background 0.2s;
}
nav.tabs button.active, nav.tabs button:hover {
  background: var(--bg); color: var(--primary); font-weight: bold;
}

main { padding: 2rem; max-width: 1200px; margin: 0 auto; }
section { display: none; }
section.active { display: block; }

/* Stats */
.stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem; margin-bottom: 2rem;
}
.stat {
  background: white; padding: 1.5rem; border-radius: var(--radius);
  box-shadow: var(--shadow); text-align: center;
}
.stat h4 { margin: 0 0 10px; color: var(--text); font-size: 0.9rem; text-transform: uppercase; }
.stat .val { font-size: 2rem; font-weight: bold; color: var(--primary); }

/* Buttons */
.btn {
  padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer;
  font-weight: bold; display: inline-flex; align-items: center; gap: 5px;
  text-decoration: none; font-size: 0.95rem; justify-content: center;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: #0d645e; }
.btn-solid { background: var(--dark); color: white; }
.btn-accent { background: var(--accent); color: white; }
.btn-danger { background: #ef4444; color: white; }
.btn-ghost { background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); }
.btn-ghost:hover { background: rgba(255,255,255,0.1); }

/* Tables */
.card { background: white; padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 1.5rem; }
.toolbar { display: flex; gap: 10px; margin-bottom: 1rem; align-items: center; justify-content: space-between; }
table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; }
th, td { padding: 12px 15px; border-bottom: 1px solid var(--border); text-align: left; }
th { background: var(--primary); color: white; font-weight: 500; }
th:first-child { border-top-left-radius: 8px; }
th:last-child { border-top-right-radius: 8px; }
tbody tr:hover { background-color: var(--bg); }

/* Badges */
.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; color: white; display: inline-block;}
.badge.ok { background-color: #10b981; }
.badge.bajo { background-color: #f59e0b; }
.badge.agotado { background-color: #ef4444; }

/* Alerts */
.alert { color: #ef4444; font-weight: bold; margin-bottom: 15px; font-size: 0.9rem; text-align: center; }
.ok-msg { color: #10b981; font-weight: bold; margin-bottom: 15px; font-size: 0.9rem; text-align: center; }

/* Forms */
form label { font-weight: 500; margin-bottom: 5px; display: inline-block; font-size: 0.9rem; }
form input, form select {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px; width: 100%; box-sizing: border-box;
}
form input:focus { outline: 2px solid var(--primary); }
"""
}

html_files = {
    "index.html": """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login - PetShop</title><link rel="stylesheet" href="css/style.css"></head>
<body class="login-body">
    <div class="login-card">
        <h2>🐶 PetShop</h2>
        <p style="margin-bottom:20px; color:var(--text);">Inicia sesión para continuar</p>
        <div id="error" class="alert"></div>
        <form id="loginForm" style="text-align: left;">
            <label for="usuario">Usuario:</label>
            <input type="text" id="usuario" placeholder="Ej. admin" required>
            <label for="contrasena">Contraseña:</label>
            <input type="password" id="contrasena" placeholder="Tu contraseña" required>
            <button type="submit" class="btn btn-primary" style="width:100%;">Ingresar</button>
        </form>
    </div>
    <script src="js/api.js"></script>
    <script src="js/login.js"></script>
</body>
</html>
""",
    "admin.html": """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin - PetShop</title><link rel="stylesheet" href="css/style.css"></head>
<body>
    <header class="app">
        <h2>🐶 PetShop <span style="font-size:1rem; opacity:0.8; font-weight:normal;">| Administrador</span></h2>
        <div class="user-chip">
            <span id="userName">Admin</span>
            <button class="btn btn-ghost" onclick="logout()">Salir</button>
        </div>
    </header>
    <nav class="tabs">
        <button class="active" data-tab="dashboard" onclick="ver('dashboard')">Dashboard</button>
        <button data-tab="reportes" onclick="ver('reportes')">Reportes</button>
    </nav>
    <main>
        <section id="dashboard" class="active">
            <div class="stats">
                <div class="stat"><h4>Ventas del Día</h4><div class="val" id="statVentasDia">0</div></div>
                <div class="stat"><h4>Productos Activos</h4><div class="val" id="statProdActivos">0</div></div>
                <div class="stat"><h4>Alertas Stock</h4><div class="val" id="statAlertas">0</div></div>
                <div class="stat"><h4>Ingresos Hoy</h4><div class="val" id="statTotalVentas">S/ 0.00</div></div>
            </div>
            <div class="card">
                <h3>Listado de Productos</h3>
                <table>
                    <thead><tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Estado</th></tr></thead>
                    <tbody id="listaProductosDashboard"></tbody>
                </table>
            </div>
        </section>
        <section id="reportes">
            <div class="card">
                <div class="toolbar">
                    <h3 style="margin:0;">Reporte Diario de Ventas</h3>
                    <button class="btn btn-accent" onclick="exportarCSV()">Exportar CSV</button>
                </div>
                <table>
                    <thead><tr><th>ID Venta</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody id="tablaReportes"></tbody>
                </table>
            </div>
        </section>
    </main>
    <script src="js/api.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
""",
    "pos.html": """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>POS - PetShop</title><link rel="stylesheet" href="css/style.css"></head>
<body>
    <header class="app">
        <h2>🐶 PetShop <span style="font-size:1rem; opacity:0.8; font-weight:normal;">| POS (Ventas)</span></h2>
        <div class="user-chip">
            <span id="userName">Vendedor</span>
            <button class="btn btn-ghost" onclick="logout()">Salir</button>
        </div>
    </header>
    <nav class="tabs">
        <button class="active" data-tab="nueva-venta" onclick="ver('nueva-venta')">Nueva Venta</button>
        <button data-tab="historial" onclick="ver('historial')">Historial del Día</button>
    </nav>
    <main>
        <section id="nueva-venta" class="active">
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <h3 style="margin-top:0;">Registrar Venta</h3>
                <div id="mensaje"></div>
                <form id="ventaForm">
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;"><label>ID Cliente</label><input type="number" id="idCliente" value="1"></div>
                        <div style="flex:1;"><label>Método Pago (1-Efe,2-Tarj)</label><input type="number" id="idMetodo" value="1"></div>
                    </div>
                    <div style="border: 1px solid var(--border); padding: 15px; border-radius: 8px; margin-bottom: 15px; background: var(--bg);">
                        <label>ID Producto</label><input type="number" id="idProd" required>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1;"><label>Cantidad</label><input type="number" id="cant" required></div>
                            <div style="flex:1;"><label>Precio Unitario (S/)</label><input type="number" id="precio" step="0.01" required></div>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; padding:12px; font-size:1rem;">Cobrar y Generar Comprobante</button>
                </form>
            </div>
        </section>
        <section id="historial">
            <div class="card">
                <h3 style="margin-top:0;">Ventas de Hoy</h3>
                <table>
                    <thead><tr><th>ID Venta</th><th>Fecha/Hora</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody id="tablaVentas"></tbody>
                </table>
            </div>
        </section>
    </main>
    <script src="js/api.js"></script>
    <script src="js/pos.js"></script>
</body>
</html>
""",
    "almacen.html": """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Almacén - PetShop</title><link rel="stylesheet" href="css/style.css"></head>
<body>
    <header class="app">
        <h2>🐶 PetShop <span style="font-size:1rem; opacity:0.8; font-weight:normal;">| Almacén e Inventario</span></h2>
        <div class="user-chip">
            <span id="userName">Almacenero</span>
            <button class="btn btn-ghost" onclick="logout()">Salir</button>
        </div>
    </header>
    <nav class="tabs">
        <button class="active" data-tab="inventario" onclick="ver('inventario')">Inventario</button>
        <button data-tab="entradas" onclick="ver('entradas')">Registrar Entrada</button>
    </nav>
    <main>
        <section id="inventario" class="active">
            <div class="card" style="margin-bottom:20px;">
                <h3 style="margin-top:0;">Alertas de Stock Pendientes</h3>
                <table>
                    <thead><tr><th>ID Alerta</th><th>Producto</th><th>Fecha</th><th>Estado</th></tr></thead>
                    <tbody id="tablaAlertas"></tbody>
                </table>
            </div>
            <div class="card">
                <div class="toolbar"><h3 style="margin:0;">Inventario General</h3></div>
                <table>
                    <thead><tr><th>ID</th><th>Nombre</th><th>Stock Actual</th><th>Mínimo</th><th>Estado</th></tr></thead>
                    <tbody id="tablaProductos"></tbody>
                </table>
            </div>
        </section>
        <section id="entradas">
            <div class="card" style="max-width: 500px; margin: 0 auto;">
                <h3 style="margin-top:0;">Registrar Entrada de Mercadería</h3>
                <div id="mensaje"></div>
                <form id="entradaForm">
                    <label>ID Producto</label>
                    <input type="number" id="idProd" required>
                    <label>Cantidad (Ingreso)</label>
                    <input type="number" id="cant" required>
                    <label>Motivo</label>
                    <input type="text" id="motivo" value="Compra a proveedor" required>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Registrar Entrada al Inventario</button>
                </form>
            </div>
        </section>
    </main>
    <script src="js/api.js"></script>
    <script src="js/almacen.js"></script>
</body>
</html>
"""
}

js_files = {
    "js/api.js": """async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const config = { ...options, headers: { ...headers, ...options.headers } };
    const response = await fetch(`/api${endpoint}`, config);
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('rol');
        localStorage.removeItem('nombre');
        window.location.href = 'index.html';
        throw new Error('No autorizado');
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || data.error || 'Error en la petición');
    return data;
}

function checkAuth(allowedRoles) {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token) window.location.href = 'index.html';
    if (allowedRoles && !allowedRoles.includes(rol)) {
        window.location.href = 'index.html';
    }
    
    const userNameSpan = document.getElementById('userName');
    if(userNameSpan) {
        userNameSpan.textContent = localStorage.getItem('nombre') + ' (' + rol + ')';
    }
}
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function ver(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById(id);
    if(sec) sec.classList.add('active');
    
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`nav.tabs button[data-tab="${id}"]`);
    if(btn) btn.classList.add('active');
}

function getBadgeStock(stock, minimo) {
    if (stock <= 0) return '<span class="badge agotado">Agotado</span>';
    if (stock <= minimo) return '<span class="badge bajo">Bajo</span>';
    return '<span class="badge ok">OK</span>';
}
""",
    "js/login.js": """document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.mensaje || data.error);
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('nombre', data.nombre);
        
        if(data.rol === 'Administrador') window.location.href = 'admin.html';
        else if(data.rol === 'Vendedor') window.location.href = 'pos.html';
        else if(data.rol === 'Almacén') window.location.href = 'almacen.html';
    } catch (error) {
        document.getElementById('error').innerText = error.message;
    }
});
""",
    "js/admin.js": """checkAuth(['Administrador']);

async function loadDashboard() {
    try {
        const [ventas, productos, alertas] = await Promise.all([
            fetchAPI('/reportes/diario'),
            fetchAPI('/productos'),
            fetchAPI('/inventario/alertas')
        ]);
        
        document.getElementById('statVentasDia').innerText = ventas.length;
        document.getElementById('statProdActivos').innerText = productos.length;
        document.getElementById('statAlertas').innerText = alertas.length;
        
        const total = ventas.reduce((acc, v) => acc + Number(v.total), 0);
        document.getElementById('statTotalVentas').innerText = `S/ ${total.toFixed(2)}`;
        
        const tbody = document.getElementById('listaProductosDashboard');
        tbody.innerHTML = productos.map(p => `
            <tr>
                <td>${p.id_producto}</td>
                <td>${p.nombre}</td>
                <td>S/ ${p.precio}</td>
                <td>${p.stock}</td>
                <td>${getBadgeStock(p.stock, p.stock_minimo)}</td>
            </tr>
        `).join('');

        const tbodyRep = document.getElementById('tablaReportes');
        tbodyRep.innerHTML = ventas.map(v => `
            <tr>
                <td>${v.id_venta}</td>
                <td>${new Date(v.fecha_hora).toLocaleString()}</td>
                <td>S/ ${v.total}</td>
                <td><span class="badge ok">${v.estado}</span></td>
            </tr>
        `).join('');

    } catch(e) {
        console.error(e);
    }
}
function exportarCSV() {
    alert('Funcionalidad de exportación CSV simulada');
}
loadDashboard();
""",
    "js/pos.js": """checkAuth(['Administrador', 'Vendedor']);

document.getElementById('ventaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_cliente = document.getElementById('idCliente').value;
    const id_metodo = document.getElementById('idMetodo').value;
    const id_producto = document.getElementById('idProd').value;
    const cantidad = document.getElementById('cant').value;
    const precio_unitario = document.getElementById('precio').value;
    
    try {
        const payload = {
            id_cliente, id_metodo,
            detalles: [{ id_producto, cantidad, precio_unitario }]
        };
        const res = await fetchAPI('/ventas', { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('mensaje').innerHTML = `<div class="ok-msg">${res.mensaje}. Comprobante: ${res.comprobante}</div>`;
        document.getElementById('ventaForm').reset();
        document.getElementById('idCliente').value = "1";
        document.getElementById('idMetodo').value = "1";
        loadHistorial();
    } catch (error) {
        document.getElementById('mensaje').innerHTML = `<div class="alert">${error.message}</div>`;
    }
});

async function loadHistorial() {
    try {
        const ventas = await fetchAPI('/ventas');
        const ventasHoy = ventas.filter(v => new Date(v.fecha_hora).toDateString() === new Date().toDateString());
        const tbody = document.getElementById('tablaVentas');
        tbody.innerHTML = ventasHoy.map(v => `
            <tr>
                <td>${v.id_venta}</td>
                <td>${new Date(v.fecha_hora).toLocaleTimeString()}</td>
                <td>S/ ${v.total}</td>
                <td>${v.estado === 'confirmada' ? '<span class="badge ok">OK</span>' : '<span class="badge agotado">Anulada</span>'}</td>
                <td>
                    ${v.estado === 'confirmada' ? `<button class="btn btn-danger" onclick="anular(${v.id_venta})">Anular</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch(e) {}
}

async function anular(id) {
    if(confirm('¿Seguro que deseas anular esta venta?')) {
        try {
            await fetchAPI(`/ventas/${id}/anular`, { method: 'POST' });
            loadHistorial();
        } catch(e) { alert(e.message); }
    }
}
loadHistorial();
""",
    "js/almacen.js": """checkAuth(['Administrador', 'Almacén']);

document.getElementById('entradaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_producto = document.getElementById('idProd').value;
    const cantidad = document.getElementById('cant').value;
    const motivo = document.getElementById('motivo').value;
    try {
        const res = await fetchAPI('/inventario/entradas', { method: 'POST', body: JSON.stringify({ id_producto, cantidad, motivo }) });
        document.getElementById('mensaje').innerHTML = `<div class="ok-msg">${res.mensaje}</div>`;
        document.getElementById('entradaForm').reset();
        loadAlmacen();
    } catch (e) {
        document.getElementById('mensaje').innerHTML = `<div class="alert">${e.message}</div>`;
    }
});

async function loadAlmacen() {
    try {
        const [alertas, productos] = await Promise.all([
            fetchAPI('/inventario/alertas'),
            fetchAPI('/productos')
        ]);
        
        document.getElementById('tablaAlertas').innerHTML = alertas.map(a => `
            <tr>
                <td>${a.id_alerta}</td>
                <td>${a.nombre || a.id_producto}</td>
                <td>${new Date(a.fecha).toLocaleString()}</td>
                <td><span class="badge bajo">${a.estado}</span></td>
            </tr>
        `).join('');

        document.getElementById('tablaProductos').innerHTML = productos.map(p => `
            <tr>
                <td>${p.id_producto}</td>
                <td>${p.nombre}</td>
                <td>${p.stock}</td>
                <td>${p.stock_minimo}</td>
                <td>${getBadgeStock(p.stock, p.stock_minimo)}</td>
            </tr>
        `).join('');

    } catch(e) {
        console.error(e);
    }
}
loadAlmacen();
"""
}

all_files = {**files, **html_files, **js_files}

for filepath, content in all_files.items():
    full_path = os.path.join(base_path, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Frontend files rewritten successfully.")
