import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Login auth
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const btnEntrar = document.getElementById('btnEntrar');
    const loginError = document.getElementById('login-error');

    btnEntrar.disabled = true;
    btnEntrar.innerHTML = '<span class="spinner-border text-light spinner-border-sm" role="status"></span> Cargando...';
    loginError.style.display = 'none';

    if (email === '' || password === '') {
        mostrarError('Por favor, complete todos los campos');
        return;
    }

    try {
        // Autenticación real con Firebase
        await signInWithEmailAndPassword(auth, email, password);
        // Si es exitoso, redirigimos al inicio
        window.location.href = '/';
    } catch (error) {
        console.error("Error de Firebase:", error.code);
        // Manejo de errores amigable
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            mostrarError('Correo electrónico o contraseña incorrectos');
        } else if (error.code === 'auth/too-many-requests') {
            mostrarError('Demasiados intentos fallidos. Intenta más tarde.');
        } else {
            mostrarError('Ocurrió un error al iniciar sesión.');
        }
    }

    function mostrarError(mensaje) {
        loginError.textContent = mensaje;
        loginError.style.display = 'block';
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = 'Entrar';
    }
});

// Toggle password logic (Mantenemos tu lógica intacta)
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