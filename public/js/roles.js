/* ======================================================
    SISTEMA DE LOGIN FUTURISTA + ROLES + CÓDIGOS
====================================================== */
// ================================
// SISTEMA DE VOZ IA GLOBAL
// ================================
function speakIA(text) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-MX";
    utter.rate = 1.05;
    utter.pitch = 1.05;
    utter.volume = 1;

    // Buscar voces buenas (Google/Microsoft)
    const voices = speechSynthesis.getVoices();
    const premium = voices.find(v =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Paulina") ||
        v.name.includes("Luciana")
    );
    if (premium) utter.voice = premium;

    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.speak(utter), 150);
}

// En algunos navegadores las voces cargan tarde
speechSynthesis.onvoiceschanged = () => {};



// =====================
// Mostrar / Cerrar Login
// =====================
function mostrarLogin() {
    const overlay = document.getElementById("overlay-login");
    overlay.classList.add("show");
}
function cerrarLogin() {
    const overlay = document.getElementById("overlay-login");
    overlay.classList.remove("show");
}


// =====================
// Partículas IA (Fondo)
// =====================
const canvas = document.getElementById("login-particles");
const ctx = canvas.getContext("2d");
let particles = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;

for (let i = 0; i < 40; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4
    });
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56,189,248,0.5)";
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });

    requestAnimationFrame(animateParticles);
}
animateParticles();


// ===============================================
// CÓDIGOS ESTÁTICOS POR ROL (Nuevo y Moderno)
// ===============================================
const codigosRol = {
    Alumno: "ALU-001",
    Profesor: "PRO-001",
    Admin: "ADM-001"
};

let rolSeleccionado = null;


// =====================
// LOGIN — Validación
// =====================
document.getElementById("login-btn").onclick = () => {
    let code = document.getElementById("login-code").value.trim();
    if (!code) return alert("Ingresa un código válido");

    if (!rolSeleccionado) return alert("Selecciona un rol primero");

    // Verifica si coincide
    if (code !== codigosRol[rolSeleccionado]) {
        alert("❌ Código incorrecto para el rol " + rolSeleccionado);
        return;
    }

    cerrarLogin();
    abrirPanelRol(rolSeleccionado);
};


// =====================================
// PANTALLA DE BIENVENIDA → SELECCIÓN DE ROL + VOZ IA
// =====================================
document.addEventListener("DOMContentLoaded", () => {

    const overlayBienvenida = document.getElementById("overlay-bienvenida");
    const overlayRol = document.getElementById("overlay-rol");
    const btnContinuar = document.getElementById("btn-continuar-bienvenida");

    if (!overlayBienvenida || !btnContinuar) return;

    // Función de voz IA
    function speakIA(text) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "es-MX";        // español México (más natural)
        utter.pitch = 1.1;           // tono ligeramente más futurista
        utter.rate = 1.00;           // velocidad fluida
        utter.volume = 1;            // volumen completo

        // Buscar voces IA mejores (si el navegador tiene)
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => 
            v.name.includes("Google") || 
            v.name.includes("Microsoft") || 
            v.name.includes("Luciana") ||
            v.name.includes("Paulina")
        );
        if (voice) utter.voice = voice;

        speechSynthesis.speak(utter);
    }

    btnContinuar.addEventListener("click", () => {

        overlayBienvenida.classList.add("hide");

        setTimeout(() => {

            overlayBienvenida.remove();

            if (overlayRol) {
                overlayRol.style.display = "flex";
                overlayRol.classList.add("show");

                // 🎤 ANUNCIO DE VOZ IA
                setTimeout(() => {
                    speakIA("Bienvenido, selecciona tu roll");
                }, 200);
            }

        }, 750);
    });

});




// ======================================
// EFECTOS PREMIUM — FLOTAR / ENTRAR
// ======================================
document.querySelectorAll("section, .card").forEach((el) => {
    el.style.opacity = 0;
    setTimeout(() => {
        el.style.animation = "fadeSlideIn 0.8s var(--ease-elastic) forwards, floatUp 6s ease-in-out infinite";
    }, 200);
});


// ======================================
// SELECCIÓN DE ROL (Nueva lógica)
// ======================================
document.querySelectorAll(".rol-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        rolSeleccionado = btn.dataset.rol;

        // Siempre mostrar login con código
        document.getElementById("overlay-rol").style.display = "none";
        mostrarLogin();
    });
});


// ======================================
// ABRIR PANEL SEGÚN ROL
// ======================================
function abrirPanelRol(rol) {
    panelAlumno.style.display = "none";
    panelProfesor.style.display = "none";
    panelAdmin.style.display = "none";

    if (rol === "Alumno") {
        panelAlumno.style.display = "block";
        speakIA("Bienvenido alumno. Puedes continuar.");
    }

    if (rol === "Profesor") {
        panelProfesor.style.display = "block";
        speakIA("Modo profesor activado. Inicia el escaneo.");
        activarModoCamara();
    }

    if (rol === "Admin") {
        panelAdmin.style.display = "block";
        speakIA("Panel administrativo activado.");
    }
}


