import os

base_path = '/home/jacob/Escritorio/petshop-app/public'

files = {
    "css/style.css": """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --primary: #0f766e;
  --primary-dark: #0d645e;
  --accent: #f97316;
  --dark: #0f172a;
  --bg: #f1f5f9;
  --text: #334155;
  --border: #e2e8f0;
  --radius: 14px;
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
  --sidebar-w: 240px;
}

body {
  font-family: 'Inter', sans-serif;
  margin: 0; padding: 0;
  background-color: var(--bg); color: var(--text);
  overflow-x: hidden;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* Login */
body.login-body { background: linear-gradient(135deg, var(--primary) 0%, var(--dark) 100%); display: flex; justify-content: center; align-items: center; height: 100vh; }
.login-card { background: white; padding: 2.5rem; border-radius: var(--radius); box-shadow: var(--shadow); width: 100%; max-width: 400px; text-align: center; }
.login-card h2 { margin-top: 0; color: var(--dark); font-size: 1.8rem; display: flex; align-items: center; justify-content: center; gap: 8px; }
.login-card input { width: 100%; padding: 12px; margin: 10px 0 20px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; font-family: 'Inter'; }
.login-card input:focus { outline: 2px solid var(--primary); }

/* Layout App */
.layout { display: flex; height: 100vh; overflow: hidden; }

/* Sidebar */
.sidebar {
  width: var(--sidebar-w); background-color: var(--dark); color: white;
  display: flex; flex-direction: column; transition: all 0.3s; z-index: 100;
}
.sidebar .logo {
  padding: 1.5rem; font-size: 1.5rem; font-weight: 700; color: white;
  display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sidebar-menu { list-style: none; padding: 1rem 0; margin: 0; flex: 1; }
.sidebar-menu li a {
  padding: 0.8rem 1.5rem; color: #94a3b8; text-decoration: none;
  display: flex; align-items: center; gap: 12px; font-weight: 500; transition: 0.2s;
}
.sidebar-menu li a:hover, .sidebar-menu li a.active {
  color: white; background: rgba(255,255,255,0.1); border-left: 4px solid var(--primary);
}
.sidebar-menu li a i { font-size: 1.2rem; }

/* Main Content */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar {
  background: white; padding: 1rem 2rem; display: flex; justify-content: space-between;
  align-items: center; border-bottom: 1px solid var(--border);
}
.topbar h2 { margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--dark); }
.user-chip { background: var(--bg); padding: 0.5rem 1rem; border-radius: 20px; display: flex; align-items: center; gap: 10px; font-weight: 500; border: 1px solid var(--border); }
.main-body { padding: 1.5rem; overflow-y: auto; flex: 1; }

/* Stats & Cards */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
.stat { background: white; padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); display: flex; align-items: center; justify-content: space-between; }
.stat-info h4 { margin: 0 0 5px; color: #64748b; font-size: 0.85rem; text-transform: uppercase; }
.stat-info .val { font-size: 1.8rem; font-weight: 700; color: var(--dark); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; }
.stat-icon.primary { background: #ccfbf1; color: var(--primary); }
.stat-icon.accent { background: #ffedd5; color: var(--accent); }
.stat-icon.danger { background: #fee2e2; color: var(--danger); }

.card { background: white; padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.card-header h3 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }

/* Charts */
.charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.chart-container { position: relative; height: 300px; width: 100%; }

/* Buttons */
.btn { padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-family: 'Inter'; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 0.9rem; justify-content: center; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
.btn-accent { background: var(--accent); color: white; }
.btn-accent:hover:not(:disabled) { background: #ea580c; }
.btn-danger { background: var(--danger); color: white; }
.btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg); }
.btn-ghost { background: transparent; color: var(--danger); }
.btn-ghost:hover { background: #fee2e2; }

/* Tables */
.table-responsive { overflow-x: auto; }
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th, td { padding: 12px 15px; border-bottom: 1px solid var(--border); text-align: left; font-size: 0.9rem; }
th { background: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
tbody tr:hover { background-color: var(--bg); }
.empty-state { padding: 3rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 3rem; margin-bottom: 10px; color: #cbd5e1; }

/* Badges */
.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.badge.ok { background-color: #d1fae5; color: #047857; }
.badge.bajo { background-color: #fef3c7; color: #b45309; }
.badge.agotado { background-color: #fee2e2; color: #b91c1c; }

/* POS Pro Specifics */
.pos-layout { display: grid; grid-template-columns: 1fr 350px; gap: 1.5rem; height: calc(100vh - 120px); }
.pos-catalog { display: flex; flex-direction: column; overflow: hidden; }
.pos-filters { display: flex; gap: 10px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; }
.filter-chip { padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: white; cursor: pointer; font-size: 0.85rem; font-weight: 500; white-space: nowrap; transition: 0.2s; }
.filter-chip.active { background: var(--primary); color: white; border-color: var(--primary); }
.pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; overflow-y: auto; padding-right: 5px; padding-bottom: 20px; }
.prod-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; }
.prod-card:hover:not(.disabled) { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,118,110,0.1); }
.prod-card.disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
.prod-icon { font-size: 2.5rem; color: #64748b; margin-bottom: 10px; }
.prod-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.prod-price { color: var(--accent); font-weight: 700; font-size: 1.1rem; }
.prod-badge { position: absolute; top: -8px; right: -8px; }

/* Cart */
.pos-cart { background: white; border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; }
.cart-header { padding: 15px; border-bottom: 1px solid var(--border); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.cart-items { flex: 1; overflow-y: auto; padding: 15px; }
.cart-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border); padding: 10px 0; }
.cart-item-info { flex: 1; }
.cart-item-name { font-weight: 500; font-size: 0.9rem; margin-bottom: 5px; }
.cart-item-price { color: #64748b; font-size: 0.8rem; }
.stepper { display: flex; align-items: center; gap: 10px; background: var(--bg); border-radius: 8px; padding: 2px; }
.stepper button { background: white; border: 1px solid var(--border); border-radius: 6px; width: 28px; height: 28px; display: flex; justify-content: center; align-items: center; cursor: pointer; }
.stepper button:hover { background: #e2e8f0; }
.cart-footer { padding: 15px; background: #f8fafc; border-top: 1px solid var(--border); }
.cart-totals { display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; margin-bottom: 15px; }
.payment-methods { display: flex; gap: 10px; margin-bottom: 15px; }
.pay-btn { flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 500; color: #64748b; }
.pay-btn.active { border-color: var(--primary); background: #f0fdfa; color: var(--primary); }
.pay-btn i { font-size: 1.5rem; }

/* Modals */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.5); display: none; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-overlay.active { display: flex; }
.modal { background: white; padding: 2rem; border-radius: var(--radius); box-shadow: var(--shadow); width: 100%; max-width: 400px; transform: translateY(20px); animation: slideUp 0.3s forwards; }
@keyframes slideUp { to { transform: translateY(0); } }
.modal-header { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--dark); display: flex; justify-content: space-between; align-items: center; }
.modal-close { cursor: pointer; color: #94a3b8; font-size: 1.5rem; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: 500; margin-bottom: 5px; font-size: 0.9rem; color: #475569; }
.form-control { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; font-family: 'Inter'; }
.form-control:focus { outline: 2px solid var(--primary); border-color: transparent; }

/* Comprobante Ticket */
.ticket { background: #fdfdfd; padding: 20px; border: 1px dashed #cbd5e1; font-family: monospace; font-size: 14px; margin-bottom: 20px; color: black; }
.ticket h3 { text-align: center; margin: 0 0 10px; font-family: 'Inter', sans-serif; }
.ticket-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.ticket-divider { border-bottom: 1px dashed #cbd5e1; margin: 10px 0; }

/* Toasts */
#toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
.toast { background: white; border-radius: 8px; padding: 12px 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; animation: slideIn 0.3s ease; border-left: 4px solid var(--primary); }
.toast.success { border-color: var(--success); }
.toast.error { border-color: var(--danger); }
.toast.warning { border-color: var(--warning); }
.toast i.success { color: var(--success); }
.toast i.error { color: var(--danger); }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* Alert Banner */
.alert-banner { background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 12px 20px; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px; font-weight: 500; }

/* Loader */
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media(max-width: 900px) {
  .sidebar { width: 70px; }
  .sidebar-menu li a span { display: none; }
  .sidebar .logo span { display: none; }
  .pos-layout { grid-template-columns: 1fr; height: auto; }
  .charts-grid { grid-template-columns: 1fr; }
}

@media print {
  body * { visibility: hidden; }
  #ticket-print, #ticket-print * { visibility: visible; }
  #ticket-print { position: absolute; left: 0; top: 0; width: 100%; border: none; }
  .modal-overlay { background: white; }
}
""",
    "index.html": """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PetShop - Login</title>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="login-body">
    <div class="login-card">
        <h2>🐶 PetShop</h2>
        <p style="color: #64748b; margin-bottom:20px; font-size: 0.95rem;">Ingresa tus credenciales para acceder</p>
        <form id="loginForm" style="text-align: left;">
            <div class="form-group">
                <label for="usuario">Usuario</label>
                <input type="text" id="usuario" class="form-control" placeholder="Ej. admin" required>
            </div>
            <div class="form-group">
                <label for="contrasena">Contraseña</label>
                <input type="password" id="contrasena" class="form-control" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; padding: 12px; font-size: 1rem;" id="btnSubmit">
                Ingresar <i class='bx bx-right-arrow-alt'></i>
            </button>
        </form>
    </div>
    <script src="js/api.js"></script>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmit');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<div class="spinner"></div>';
            btn.disabled = true;

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
                showToast(error.message, 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>
""",
    "admin.html": """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PetShop - Dashboard</title>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="logo">🐶 <span>PetShop</span></div>
            <ul class="sidebar-menu">
                <li data-role="Administrador"><a href="admin.html" class="active"><i class='bx bxs-dashboard'></i> <span>Dashboard</span></a></li>
                <li data-role="Administrador,Vendedor"><a href="pos.html"><i class='bx bx-cart-alt'></i> <span>Ventas (POS)</span></a></li>
                <li data-role="Administrador,Almacén"><a href="almacen.html"><i class='bx bx-box'></i> <span>Inventario</span></a></li>
            </ul>
        </aside>
        
        <div class="main-content">
            <header class="topbar">
                <h2>Dashboard Administrativo</h2>
                <div class="user-chip">
                    <i class='bx bx-user-circle' style="font-size: 1.2rem; color:var(--primary)"></i>
                    <span id="userName">Admin</span>
                    <button class="btn btn-ghost" onclick="logout()" style="padding: 4px 8px; margin-left:10px;"><i class='bx bx-log-out'></i></button>
                </div>
            </header>
            
            <main class="main-body">
                <div class="stats">
                    <div class="stat">
                        <div class="stat-info"><h4>Ventas del Día</h4><div class="val" id="kpiVentas">0</div></div>
                        <div class="stat-icon primary"><i class='bx bx-shopping-bag'></i></div>
                    </div>
                    <div class="stat">
                        <div class="stat-info"><h4>Ingresos Hoy</h4><div class="val" id="kpiIngresos">S/ 0.00</div></div>
                        <div class="stat-icon primary"><i class='bx bx-money'></i></div>
                    </div>
                    <div class="stat">
                        <div class="stat-info"><h4>Productos Activos</h4><div class="val" id="kpiProductos">0</div></div>
                        <div class="stat-icon accent"><i class='bx bx-package'></i></div>
                    </div>
                    <div class="stat">
                        <div class="stat-info"><h4>Alertas Stock</h4><div class="val" style="color:var(--danger)" id="kpiAlertas">0</div></div>
                        <div class="stat-icon danger"><i class='bx bx-error'></i></div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="card">
                        <div class="card-header"><h3><i class='bx bx-bar-chart-alt-2'></i> Ventas Últimos 7 Días</h3></div>
                        <div class="chart-container"><canvas id="barChart"></canvas></div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3><i class='bx bx-pie-chart-alt-2'></i> Por Categoría</h3></div>
                        <div class="chart-container"><canvas id="doughnutChart"></canvas></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3><i class='bx bx-list-ul'></i> Últimas Ventas Confirmadas</h3>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead><tr><th>ID</th><th>Fecha/Hora</th><th>Total</th><th>Estado</th></tr></thead>
                            <tbody id="tablaReportes">
                                <tr><td colspan="4" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando datos...</p></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    </div>
    <script src="js/api.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
""",
    "pos.html": """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PetShop - Punto de Venta (POS)</title>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="logo">🐶 <span>PetShop</span></div>
            <ul class="sidebar-menu">
                <li data-role="Administrador"><a href="admin.html"><i class='bx bxs-dashboard'></i> <span>Dashboard</span></a></li>
                <li data-role="Administrador,Vendedor"><a href="pos.html" class="active"><i class='bx bx-cart-alt'></i> <span>Ventas (POS)</span></a></li>
                <li data-role="Administrador,Almacén"><a href="almacen.html"><i class='bx bx-box'></i> <span>Inventario</span></a></li>
            </ul>
        </aside>
        
        <div class="main-content">
            <header class="topbar">
                <h2>Punto de Venta</h2>
                <div class="user-chip">
                    <i class='bx bx-user-circle' style="font-size: 1.2rem; color:var(--primary)"></i>
                    <span id="userName">Vendedor</span>
                    <button class="btn btn-ghost" onclick="logout()" style="padding: 4px 8px; margin-left:10px;"><i class='bx bx-log-out'></i></button>
                </div>
            </header>
            
            <main class="main-body" style="padding: 1rem;">
                <div class="pos-layout">
                    <!-- Catálogo -->
                    <div class="pos-catalog">
                        <div class="form-group" style="position:relative; margin-bottom:10px;">
                            <i class='bx bx-search' style="position:absolute; left:12px; top:12px; color:#94a3b8; font-size:1.2rem;"></i>
                            <input type="text" id="searchProd" class="form-control" placeholder="Buscar producto por nombre o código..." style="padding-left: 40px;">
                        </div>
                        <div class="pos-filters" id="catFilters">
                            <button class="filter-chip active" data-cat="all">Todas</button>
                            <!-- Llenado dinámico -->
                        </div>
                        <div class="pos-grid" id="prodGrid">
                            <div class="empty-state" style="grid-column: 1/-1;"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando catálogo...</p></div>
                        </div>
                    </div>
                    
                    <!-- Carrito -->
                    <div class="pos-cart">
                        <div class="cart-header">
                            <span>Resumen de Venta</span>
                            <span class="badge ok" id="cartCount">0 ítems</span>
                        </div>
                        <div class="cart-items" id="cartList">
                            <div class="empty-state" style="padding: 2rem;"><i class='bx bx-cart'></i><p style="font-size:0.9rem; margin:0;">Carrito vacío</p></div>
                        </div>
                        <div class="cart-footer">
                            <div class="cart-totals"><span>Total:</span> <span id="cartTotal">S/ 0.00</span></div>
                            <p style="font-size:0.8rem; color:#64748b; margin: 0 0 10px; font-weight:500;">Método de Pago:</p>
                            <div class="payment-methods" id="payMethods">
                                <button class="pay-btn active" data-id="1"><i class='bx bx-money'></i> Efectivo</button>
                                <button class="pay-btn" data-id="2"><i class='bx bx-credit-card'></i> Tarjeta</button>
                                <button class="pay-btn" data-id="3"><i class='bx bx-qr-scan'></i> Yape/Plin</button>
                            </div>
                            <button class="btn btn-primary" style="width: 100%; padding:15px; font-size: 1.1rem;" id="btnCobrar" onclick="procesarVenta()" disabled>
                                <i class='bx bx-check-shield'></i> Cobrar S/ 0.00
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Modal Comprobante -->
    <div class="modal-overlay" id="modalComprobante">
        <div class="modal" style="max-width: 350px;">
            <div class="modal-header">¡Venta Exitosa! <i class='bx bx-check-circle' style="color:var(--success)"></i></div>
            <div class="ticket" id="ticket-print">
                <h3>🐶 PetShop</h3>
                <div class="ticket-divider"></div>
                <div class="ticket-row"><span>Comprobante:</span> <b id="tkNum"></b></div>
                <div class="ticket-row"><span>Fecha:</span> <span id="tkFecha"></span></div>
                <div class="ticket-row"><span>Vendedor:</span> <span id="tkVend"></span></div>
                <div class="ticket-divider"></div>
                <div id="tkDetalle"></div>
                <div class="ticket-divider"></div>
                <div class="ticket-row" style="font-size:16px; font-weight:bold;"><span>TOTAL:</span> <span id="tkTotal"></span></div>
                <div class="ticket-divider"></div>
                <div style="text-align:center; font-size:12px;">¡Gracias por su compra!</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-outline" style="flex:1;" onclick="window.print()"><i class='bx bx-printer'></i> Imprimir</button>
                <button class="btn btn-primary" style="flex:1;" onclick="cerrarComprobante()"><i class='bx bx-plus'></i> Nueva</button>
            </div>
        </div>
    </div>
    
    <script src="js/api.js"></script>
    <script src="js/pos.js"></script>
</body>
</html>
""",
    "almacen.html": """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PetShop - Almacén e Inventario</title>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="logo">🐶 <span>PetShop</span></div>
            <ul class="sidebar-menu">
                <li data-role="Administrador"><a href="admin.html"><i class='bx bxs-dashboard'></i> <span>Dashboard</span></a></li>
                <li data-role="Administrador,Vendedor"><a href="pos.html"><i class='bx bx-cart-alt'></i> <span>Ventas (POS)</span></a></li>
                <li data-role="Administrador,Almacén"><a href="almacen.html" class="active"><i class='bx bx-box'></i> <span>Inventario</span></a></li>
            </ul>
        </aside>
        
        <div class="main-content">
            <header class="topbar">
                <h2>Control de Inventario</h2>
                <div class="user-chip">
                    <i class='bx bx-user-circle' style="font-size: 1.2rem; color:var(--primary)"></i>
                    <span id="userName">Almacén</span>
                    <button class="btn btn-ghost" onclick="logout()" style="padding: 4px 8px; margin-left:10px;"><i class='bx bx-log-out'></i></button>
                </div>
            </header>
            
            <main class="main-body">
                <div id="bannerAlertas"></div>

                <div class="card">
                    <div class="card-header">
                        <h3><i class='bx bx-package'></i> Inventario General</h3>
                        <div style="position:relative; width: 250px;">
                            <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#94a3b8;"></i>
                            <input type="text" id="searchInv" class="form-control" placeholder="Buscar producto..." style="padding-left: 35px;">
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead><tr><th>ID</th><th>Nombre</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th>Acción</th></tr></thead>
                            <tbody id="tablaProductos">
                                <tr><td colspan="6" class="empty-state"><i class='bx bx-loader-alt bx-spin'></i><p>Cargando datos...</p></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Modal Entrada -->
    <div class="modal-overlay" id="modalEntrada">
        <div class="modal">
            <div class="modal-header">Registrar Entrada <i class='bx bx-x modal-close' onclick="closeModal('modalEntrada')"></i></div>
            <form id="entradaForm">
                <input type="hidden" id="entIdProd">
                <div class="form-group">
                    <label>Producto</label>
                    <input type="text" id="entNombre" class="form-control" readonly style="background:var(--bg);">
                </div>
                <div class="form-group">
                    <label>Cantidad a Ingresar</label>
                    <input type="number" id="entCant" class="form-control" required min="1">
                </div>
                <div class="form-group">
                    <label>Motivo</label>
                    <input type="text" id="entMotivo" class="form-control" value="Compra a proveedor" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top:10px;" id="btnGuardarEntrada">Guardar Entrada</button>
            </form>
        </div>
    </div>

    <script src="js/api.js"></script>
    <script src="js/almacen.js"></script>
</body>
</html>
""",
    "js/api.js": """// Inicializar Toasts
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('toast-container')){
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }
    applyRoles();
});

function showToast(msg, type = 'success') {
    const tc = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-x-circle' : 'bx-info-circle';
    toast.innerHTML = `<i class='bx ${icon} ${type}' style="font-size:1.5rem;"></i> <span>${msg}</span>`;
    tc.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(),300); }, 3000);
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const config = { ...options, headers: { ...headers, ...options.headers } };
    const response = await fetch(`/api${endpoint}`, config);
    
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Sesión expirada o sin permisos');
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
    if(userNameSpan) userNameSpan.textContent = localStorage.getItem('nombre');
}

function applyRoles() {
    const rol = localStorage.getItem('rol');
    document.querySelectorAll('[data-role]').forEach(el => {
        const roles = el.getAttribute('data-role').split(',');
        if(!roles.includes(rol)) el.style.display = 'none';
    });
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function getBadgeStock(stock, minimo) {
    if (stock <= 0) return '<span class="badge agotado"><i class="bx bx-x"></i> Agotado</span>';
    if (stock <= minimo) return '<span class="badge bajo"><i class="bx bx-error-circle"></i> Bajo</span>';
    return '<span class="badge ok"><i class="bx bx-check"></i> OK</span>';
}
""",
    "js/admin.js": """checkAuth(['Administrador']);

async function initDashboard() {
    try {
        const [ventas, productos, alertas] = await Promise.all([
            fetchAPI('/ventas'),
            fetchAPI('/productos'),
            fetchAPI('/inventario/alertas')
        ]);
        
        // Ventas de hoy confirmadas
        const hoyStr = new Date().toDateString();
        const ventasHoy = ventas.filter(v => new Date(v.fecha_hora).toDateString() === hoyStr && v.estado === 'confirmada');
        
        document.getElementById('kpiVentas').innerText = ventasHoy.length;
        document.getElementById('kpiProductos').innerText = productos.length;
        document.getElementById('kpiAlertas').innerText = alertas.length;
        const total = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0);
        document.getElementById('kpiIngresos').innerText = `S/ ${total.toFixed(2)}`;
        
        // Tabla recientes
        const tbodyRep = document.getElementById('tablaReportes');
        if(ventas.length === 0) {
            tbodyRep.innerHTML = `<tr><td colspan="4" class="empty-state"><i class='bx bx-receipt'></i><p>No hay ventas registradas</p></td></tr>`;
        } else {
            tbodyRep.innerHTML = ventas.slice(0,10).map(v => `
                <tr>
                    <td><b>#${v.id_venta}</b></td>
                    <td>${new Date(v.fecha_hora).toLocaleString()}</td>
                    <td style="font-weight:600;">S/ ${v.total}</td>
                    <td>${v.estado==='confirmada'?'<span class="badge ok">Confirmada</span>':'<span class="badge agotado">Anulada</span>'}</td>
                </tr>
            `).join('');
        }

        renderCharts(ventas, productos);
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function renderCharts(ventas, productos) {
    // Preparar Chart 1: Ventas ultimos 7 dias
    const labels = [];
    const dataVentas = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('es-ES', {weekday:'short'}));
        const daily = ventas.filter(v => new Date(v.fecha_hora).toDateString() === d.toDateString() && v.estado === 'confirmada');
        dataVentas.push(daily.reduce((a,b)=>a+Number(b.total),0));
    }
    
    new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Ventas (S/)', data: dataVentas, backgroundColor: '#0f766e', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}} }
    });

    // Preparar Chart 2: Productos por categoría
    const cats = {};
    productos.forEach(p => { const c = p.nombre_categoria || 'Sin Categoría'; cats[c] = (cats[c]||0) + 1; });
    
    new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#0f766e', '#f97316', '#3b82f6', '#f43f5e', '#8b5cf6'] }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
}
initDashboard();
""",
    "js/pos.js": """checkAuth(['Administrador', 'Vendedor']);

let allProducts = [];
let cart = [];
let selectedMethod = 1;

// Mapeo simple de íconos para categorías (simulación visual)
const catIcons = { 'Alimentos': 'bx-bowl-rice', 'Accesorios': 'bx-bone', 'Juguetes': 'bx-tennis-ball', 'Medicinas':'bx-plus-medical', 'default': 'bx-package' };

async function initPOS() {
    try {
        allProducts = await fetchAPI('/productos');
        renderCategories();
        renderGrid(allProducts);
    } catch(e) { showToast(e.message, 'error'); }
}

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
    const filtered = cat === 'all' ? allProducts : allProducts.filter(p => (p.nombre_categoria||'Otros') === cat);
    renderGrid(filtered);
};

document.getElementById('searchProd').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigo_barras && p.codigo_barras.includes(q)));
    renderGrid(filtered);
});

function renderGrid(products) {
    const grid = document.getElementById('prodGrid');
    if(products.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class='bx bx-search'></i><p>No se encontraron productos</p></div>`;
        return;
    }
    grid.innerHTML = products.map(p => {
        const icon = catIcons[p.nombre_categoria] || catIcons['default'];
        const disabled = p.stock <= 0 ? 'disabled' : '';
        return `
        <div class="prod-card ${disabled}" onclick="addToCart(${p.id_producto})">
            <div class="prod-badge">${getBadgeStock(p.stock, p.stock_minimo)}</div>
            <i class='bx ${icon} prod-icon'></i>
            <div class="prod-name" title="${p.nombre}">${p.nombre}</div>
            <div class="prod-price">S/ ${p.precio}</div>
        </div>`;
    }).join('');
}

window.addToCart = (id) => {
    const prod = allProducts.find(p => p.id_producto === id);
    if(prod.stock <= 0) return showToast('Producto agotado', 'warning');
    
    const exist = cart.find(i => i.id_producto === id);
    if(exist) {
        if(exist.cantidad >= prod.stock) return showToast('Stock máximo alcanzado', 'warning');
        exist.cantidad++;
    } else {
        cart.push({ ...prod, cantidad: 1 });
    }
    renderCart();
};

window.updateQty = (id, delta) => {
    const item = cart.find(i => i.id_producto === id);
    if(!item) return;
    const prod = allProducts.find(p => p.id_producto === id);
    const newQ = item.cantidad + delta;
    
    if(newQ <= 0) { cart = cart.filter(i => i.id_producto !== id); }
    else if(newQ > prod.stock) { showToast('No hay suficiente stock', 'warning'); }
    else { item.cantidad = newQ; }
    renderCart();
};

function renderCart() {
    const list = document.getElementById('cartList');
    if(cart.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 2rem;"><i class='bx bx-cart'></i><p>Carrito vacío</p></div>`;
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
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${i.nombre}</div>
                <div class="cart-item-price">S/ ${i.precio} c/u</div>
            </div>
            <div class="stepper">
                <button onclick="updateQty(${i.id_producto}, -1)"><i class='bx bx-minus'></i></button>
                <span style="font-weight:600; font-size:0.9rem; min-width:20px; text-align:center;">${i.cantidad}</span>
                <button onclick="updateQty(${i.id_producto}, 1)"><i class='bx bx-plus'></i></button>
            </div>
            <div style="font-weight:700; width:60px; text-align:right;">S/ ${sub.toFixed(2)}</div>
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
    if(cart.length === 0) return;
    const btn = document.getElementById('btnCobrar');
    const ori = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Procesando...`;
    btn.disabled = true;

    try {
        const payload = {
            id_cliente: 1, // Default por UI rápida
            id_metodo: selectedMethod,
            detalles: cart.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad, precio_unitario: i.precio }))
        };
        const res = await fetchAPI('/ventas', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Venta registrada correctamente');
        
        // Modal de Comprobante
        document.getElementById('tkNum').innerText = res.comprobante;
        document.getElementById('tkFecha').innerText = new Date().toLocaleString();
        document.getElementById('tkVend').innerText = localStorage.getItem('nombre');
        
        let tkDetalleHtml = '';
        let tTotal = 0;
        cart.forEach(i => {
            const s = i.cantidad * i.precio; tTotal+=s;
            tkDetalleHtml += `<div class="ticket-row"><span>${i.cantidad}x ${i.nombre}</span><span>S/${s.toFixed(2)}</span></div>`;
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
""",
    "js/almacen.js": """checkAuth(['Administrador', 'Almacén']);

let allProducts = [];

async function initAlmacen() {
    try {
        const [alertas, productos] = await Promise.all([
            fetchAPI('/inventario/alertas'),
            fetchAPI('/productos')
        ]);
        allProducts = productos;
        
        if(alertas.length > 0) {
            document.getElementById('bannerAlertas').innerHTML = `
                <div class="alert-banner">
                    <i class='bx bx-error' style="font-size:1.5rem;"></i>
                    Atención: Tienes ${alertas.length} producto(s) con stock por debajo del mínimo.
                </div>`;
        } else {
            document.getElementById('bannerAlertas').innerHTML = '';
        }

        renderTable(allProducts);
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function renderTable(products) {
    const tbody = document.getElementById('tablaProductos');
    if(products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class='bx bx-search'></i><p>No se encontraron productos</p></td></tr>`;
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><b>${p.id_producto}</b></td>
            <td>${p.nombre}</td>
            <td style="font-weight:700;">${p.stock}</td>
            <td>${p.stock_minimo}</td>
            <td>${getBadgeStock(p.stock, p.stock_minimo)}</td>
            <td>
                <button class="btn btn-primary" style="padding: 6px 10px; font-size:0.8rem;" onclick="abrirEntrada(${p.id_producto}, '${p.nombre}')">
                    <i class='bx bx-plus'></i> Entrada
                </button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('searchInv').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(q));
    renderTable(filtered);
});

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
        showToast('Entrada registrada exitosamente');
        closeModal('modalEntrada');
        initAlmacen(); // refresh
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = ori;
        btn.disabled = false;
    }
});

initAlmacen();
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_path, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Frontend v2 Commercial applied successfully.")
