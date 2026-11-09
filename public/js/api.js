// Inicializar Toasts
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
    if(!tc) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-x-circle' : 'bx-info-circle';
    toast.innerHTML = `<i class='bx ${icon} ${type}' style="font-size:1.5rem;"></i> <span>${msg}</span>`;
    tc.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(),300); }, 3500);
}

function showModal(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.add('active'); 
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.remove('active'); 
}

function normalizeStr(str) {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const config = { ...options, headers: { ...headers, ...options.headers } };
    const response = await fetch(`/api${endpoint}`, config);
    
    if (response.status === 401) {
        logout();
        throw new Error('Sesión expirada. Por favor ingresa nuevamente.');
    }
    
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.mensaje || data.error || 'Error en la petición');
    }
    return data;
}

function checkAuth(allowedRoles) {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    if (allowedRoles) {
        const userNorm = normalizeStr(rol);
        const allowed = allowedRoles.some(r => normalizeStr(r) === userNorm);
        if (!allowed) {
            window.location.href = 'index.html';
            return;
        }
    }
    const userNameSpan = document.getElementById('userName');
    if(userNameSpan) userNameSpan.textContent = localStorage.getItem('nombre');
}

function applyRoles() {
    const rol = localStorage.getItem('rol');
    const userNorm = normalizeStr(rol);
    document.querySelectorAll('[data-role]').forEach(el => {
        const roles = el.getAttribute('data-role').split(',');
        const hasRole = roles.some(r => normalizeStr(r) === userNorm);
        if(!hasRole) el.style.display = 'none';
        else el.style.display = '';
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
