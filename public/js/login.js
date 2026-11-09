document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
