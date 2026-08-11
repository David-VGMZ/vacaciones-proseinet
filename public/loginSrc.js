
// Login auth
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const btnEntrar = document.getElementById('btnEntrar');
    const loginError = document.getElementById('login-error');
    btnEntrar.disabled = true;
    btnEntrar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Cargando...';
    loginError.style.display = 'none';

    if (email === '' || password === '') {
        loginError.textContent = 'Por favor, complete todos los campos';
        loginError.style.display = 'block';
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = 'Entrar';
        return;
    }

    if (email === 'gerente.operaciones@proseinet.com' && password === 'Admin123456') {
        window.location.href = '/index.html';
    } else {
        loginError.textContent = 'Correo electrónico o contraseña incorrectos';
        loginError.style.display = 'block';
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = 'Entrar';
    }
});

// Toggle password login
const passwordInput = document.getElementById('login-pass');
const togglePassword = document.getElementById('toggle-password');

togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<i class="fa-solid fa-eye"></i>';
    } else {
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    }
});