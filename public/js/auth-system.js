// ========================================
// 🔐 SISTEMA DE AUTENTICACIÓN POR ESCANEO
// Keyon Access System v2.0
// ========================================

// ========================
// 🔹 VARIABLES GLOBALES
// ========================
let usuarioActual = null;
let html5QrCodeLogin = null;
let modoEscaneoLogin = 'camara'; // 'camara' o 'lector'

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔐 Iniciando sistema de autenticación...');
  
  // Mostrar pantalla de login
  mostrarPantallaLogin();
  
  // Configurar eventos
  configurarEventosAuth();
  
  // Configurar listener para lector físico
  configurarLectorFisicoLogin();
});

// ========================
// 🔹 MOSTRAR PANTALLA LOGIN
// ========================
function mostrarPantallaLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appLayout = document.getElementById('app-layout');
  
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appLayout) appLayout.style.display = 'none';
  
  // Ocultar todos los paneles
  ocultarTodosLosPaneles();
}

// ========================
// 🔹 CONFIGURAR EVENTOS
// ========================
function configurarEventosAuth() {
  // Botón activar cámara
  const btnCamara = document.getElementById('btn-login-camara');
  if (btnCamara) {
    btnCamara.addEventListener('click', () => {
      modoEscaneoLogin = 'camara';
      activarCamaraLogin();
      actualizarBotonesEscaneo('camara');
    });
  }
  
  // Botón activar lector
  const btnLector = document.getElementById('btn-login-lector');
  if (btnLector) {
    btnLector.addEventListener('click', () => {
      modoEscaneoLogin = 'lector';
      activarLectorLogin();
      actualizarBotonesEscaneo('lector');
    });
  }
  
  // Botón acceso admin
  const btnAdmin = document.getElementById('btn-login-admin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', mostrarModalAdminLogin);
  }
  
  // Form login admin
  const formAdmin = document.getElementById('form-admin-login');
  if (formAdmin) {
    formAdmin.addEventListener('submit', (e) => {
      e.preventDefault();
      loginAdmin();
    });
  }
  
  // Cerrar modal admin
  const btnCerrarAdmin = document.getElementById('btn-cerrar-admin-login');
  if (btnCerrarAdmin) {
    btnCerrarAdmin.addEventListener('click', cerrarModalAdminLogin);
  }
  
  // Botones cerrar sesión
  document.querySelectorAll('.btn-cerrar-sesion').forEach(btn => {
    btn.addEventListener('click', cerrarSesion);
  });
}

// ========================
// 🔹 ACTUALIZAR BOTONES ESCANEO
// ========================
function actualizarBotonesEscaneo(modo) {
  const btnCamara = document.getElementById('btn-login-camara');
  const btnLector = document.getElementById('btn-login-lector');
  
  if (modo === 'camara') {
    btnCamara?.classList.add('active');
    btnLector?.classList.remove('active');
  } else {
    btnLector?.classList.add('active');
    btnCamara?.classList.remove('active');
  }
}

// ========================
// 🔹 ACTIVAR CÁMARA LOGIN
// ========================
function activarCamaraLogin() {
  const qrReader = document.getElementById('qr-reader-login');
  const statusEl = document.getElementById('login-scan-status');
  
  if (!qrReader) return;
  
  // Detener cámara si ya estaba activa
  if (html5QrCodeLogin) {
    html5QrCodeLogin.stop().then(() => {
      html5QrCodeLogin.clear();
      iniciarCamaraLogin();
    }).catch(() => {
      iniciarCamaraLogin();
    });
  } else {
    iniciarCamaraLogin();
  }
}

function iniciarCamaraLogin() {
  const qrReader = document.getElementById('qr-reader-login');
  const statusEl = document.getElementById('login-scan-status');
  
  html5QrCodeLogin = new Html5Qrcode("qr-reader-login");
  
  const config = { 
    fps: 15, 
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  };
  
  html5QrCodeLogin.start(
    { facingMode: "environment" },
    config,
    (qrCodeMessage) => {
      // QR detectado
      procesarLoginPorEscaneo(qrCodeMessage);
    },
    (errorMessage) => {
      // Escaneando...
    }
  ).then(() => {
    if (statusEl) statusEl.textContent = '📷 Cámara activa - Escanea tu código';
    qrReader.classList.add('camera-active');
  }).catch(err => {
    console.error("Error al iniciar cámara:", err);
    if (statusEl) statusEl.textContent = '❌ No se pudo iniciar la cámara';
    mostrarNotificacion('Error al iniciar cámara', 'error');
  });
}

// ========================
// 🔹 ACTIVAR LECTOR LOGIN
// ========================
function activarLectorLogin() {
  const qrReader = document.getElementById('qr-reader-login');
  const statusEl = document.getElementById('login-scan-status');
  const inputLector = document.getElementById('input-lector-login');
  
  // Detener cámara si estaba activa
  if (html5QrCodeLogin) {
    html5QrCodeLogin.stop().then(() => {
      html5QrCodeLogin.clear();
      html5QrCodeLogin = null;
    }).catch(() => {
      html5QrCodeLogin = null;
    });
  }
  
  // Mostrar mensaje de lector
  if (qrReader) {
    qrReader.classList.remove('camera-active');
    qrReader.innerHTML = `
      <div class="lector-placeholder">
        <span class="lector-icon">📟</span>
        <p>Lector físico activo</p>
        <p class="text-sm text-text-muted">Escanea tu código de barras</p>
      </div>
    `;
  }
  
  if (statusEl) statusEl.textContent = '📟 Lector activo - Escanea tu código de barras';
  
  // Enfocar input oculto
  if (inputLector) {
    inputLector.style.display = 'block';
    inputLector.focus();
  }
}

// ========================
// 🔹 LISTENER LECTOR FÍSICO
// ========================
function configurarLectorFisicoLogin() {
  const inputLector = document.getElementById('input-lector-login');
  
  if (inputLector) {
    inputLector.addEventListener('input', async (e) => {
      const valor = e.target.value.trim();
      if (!valor) return;
      
      // Procesar después de un pequeño delay (el lector envía caracteres rápido)
      clearTimeout(inputLector._timeout);
      inputLector._timeout = setTimeout(async () => {
        await procesarLoginPorEscaneo(valor);
        e.target.value = '';
      }, 100);
    });
    
    // También escuchar Enter
    inputLector.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const valor = e.target.value.trim();
        if (valor) {
          await procesarLoginPorEscaneo(valor);
          e.target.value = '';
        }
      }
    });
  }
  
  // Listener global para lector (cuando no hay input enfocado)
  let bufferLogin = '';
  let bufferTimeout;
  
  document.addEventListener('keydown', (e) => {
    // Solo procesar si estamos en la pantalla de login
    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen || loginScreen.style.display === 'none') return;
    
    // Ignorar si hay un modal abierto
    const modalAdmin = document.getElementById('modal-admin-login');
    if (modalAdmin && modalAdmin.classList.contains('show')) return;
    
    // Ignorar si el foco está en un input
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    
    // Ignorar teclas de control
    if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control') return;
    
    // Enter = procesar buffer
    if (e.key === 'Enter') {
      if (bufferLogin.trim()) {
        procesarLoginPorEscaneo(bufferLogin.trim());
        bufferLogin = '';
      }
      e.preventDefault();
      return;
    }
    
    // Agregar al buffer
    bufferLogin += e.key;
    
    // Limpiar buffer después de 500ms de inactividad
    clearTimeout(bufferTimeout);
    bufferTimeout = setTimeout(() => {
      bufferLogin = '';
    }, 500);
  });
}

// ========================
// 🔹 PROCESAR LOGIN POR ESCANEO
// ========================
async function procesarLoginPorEscaneo(datosRaw) {
  const statusEl = document.getElementById('login-scan-status');
  
  try {
    if (statusEl) statusEl.textContent = '⏳ Verificando...';
    
    let datos = datosRaw;
    let usuario = null;
    
    console.log("🔍 Código escaneado:", datosRaw);
    
    // ====== NUEVO: Usar decodificador de QR dinámico ======
    if (typeof decodificarCodigo === 'function') {
      const resultado = decodificarCodigo(datosRaw);
      
      if (resultado.valido) {
        console.log("✅ Código dinámico válido:", resultado);
        
        const identificador = resultado.identificador;
        const tipoCodigo = resultado.tipo; // 'alumno', 'profesor' o 'legacy'
        
        // Buscar usuario en Firebase
        if (tipoCodigo === 'alumno' || tipoCodigo === 'legacy') {
          // Buscar en usuarios por control
          let snap = await db.collection('usuarios').where('control', '==', identificador).limit(1).get();
          
          if (snap.empty) {
            // Buscar en alumnos
            const docAlumno = await db.collection('alumnos').doc(identificador).get();
            if (docAlumno.exists) {
              usuario = { id: docAlumno.id, ...docAlumno.data(), tipo: 'Alumno' };
            }
          } else {
            usuario = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
          
          // Si tiene datos en el código, usarlos como fallback
          if (!usuario && resultado.datos?.n) {
            usuario = {
              id: identificador,
              control: identificador,
              nombre: resultado.datos.n || 'Alumno',
              apellidos: resultado.datos.a || '',
              grado: resultado.datos.g || '',
              tipo: 'Alumno'
            };
          }
          
        } else if (tipoCodigo === 'profesor') {
          // Buscar en usuarios por teléfono
          let snap = await db.collection('usuarios').where('telefono', '==', identificador).limit(1).get();
          
          if (snap.empty) {
            // Buscar en profesores
            const docProf = await db.collection('profesores').doc(identificador).get();
            if (docProf.exists) {
              usuario = { id: docProf.id, ...docProf.data(), tipo: 'Profesor' };
            }
          } else {
            usuario = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
          
          if (!usuario && resultado.datos?.n) {
            usuario = {
              id: identificador,
              telefono: identificador,
              nombre: resultado.datos.n || 'Profesor',
              apellidos: resultado.datos.a || '',
              tipo: 'Profesor'
            };
          }
        }
        
        if (usuario) {
          reproducirBeep('success');
          // Verificar contraseña antes de login
          if (typeof verificarPasswordDespuesEscaneo === 'function') {
            await verificarPasswordDespuesEscaneo(usuario);
          } else {
            await loginExitoso(usuario);
          }
          return;
        }
      } else if (resultado.error === 'EXPIRED') {
        throw new Error("⏰ Código expirado. Regenera tu QR.");
      } else if (resultado.error === 'INVALID_HASH') {
        throw new Error("🚫 Código inválido o manipulado.");
      }
      // Si no es válido pero tampoco tiene error específico, continuar con lógica legacy
    }
    
    // ====== LÓGICA LEGACY (compatibilidad) ======
    
    // 1️⃣ Detectar formato (JSON, ID numérico, etc.)
    if (typeof datos === 'string') {
      datos = datos.trim();
      
      // Intentar parsear JSON
      if (datos.startsWith('{') && datos.endsWith('}')) {
        try {
          datos = JSON.parse(datos);
        } catch {
          throw new Error("QR JSON inválido");
        }
      }
    }
    
    // 2️⃣ Si es objeto con id y tipo, buscar en Firebase
    if (datos.id && datos.tipo) {
      const coleccion = datos.tipo === 'Alumno' ? 'alumnos' : 'profesores';
      const snap = await db.collection(coleccion).doc(datos.id).get();
      
      if (!snap.exists) throw new Error("Usuario no encontrado");
      
      usuario = {
        id: snap.id,
        ...snap.data(),
        tipo: datos.tipo
      };
    }
    // 3️⃣ Si es string (número de control o teléfono)
    else if (typeof datos === 'string') {
      // Buscar en alumnos por control
      const docAlumno = await db.collection('alumnos').doc(datos).get();
      if (docAlumno.exists) {
        usuario = {
          id: docAlumno.id,
          ...docAlumno.data(),
          tipo: 'Alumno'
        };
      } else {
        // Buscar en profesores por teléfono
        const docProf = await db.collection('profesores').doc(datos).get();
        if (docProf.exists) {
          usuario = {
            id: docProf.id,
            ...docProf.data(),
            tipo: 'Profesor'
          };
        }
      }
    }
    // 4️⃣ Si datos ya tiene la info completa
    else if (datos.nombre) {
      usuario = {
        id: datos.id || datos.control || datos.telefono || '',
        nombre: datos.nombre,
        apellidos: datos.apellidos || '',
        tipo: datos.tipo || (datos.control ? 'Alumno' : 'Profesor'),
        control: datos.control || '',
        telefono: datos.telefono || datos.whatsapp || '',
        grado: datos.grado || '',
        grupo: datos.grupo || '',
        materias: datos.materias || '',
        grupos: datos.grupos || '',
        whatsapp: datos.whatsapp || ''
      };
    }
    
    if (!usuario) {
      throw new Error("Código no reconocido");
    }
    
    // ✅ Usuario encontrado - Verificar contraseña
    reproducirBeep('success');
    if (typeof verificarPasswordDespuesEscaneo === 'function') {
      await verificarPasswordDespuesEscaneo(usuario);
    } else {
      await loginExitoso(usuario);
    }
    
  } catch (error) {
    console.error("❌ Error en login:", error);
    reproducirBeep('error');
    if (statusEl) statusEl.textContent = `❌ ${error.message || 'Error al verificar'}`;
    mostrarNotificacion(error.message || 'Error al verificar código', 'error');
  }
}

// ========================
// 🔹 LOGIN EXITOSO
// ========================
async function loginExitoso(usuario) {
  console.log("✅ Login exitoso:", usuario);
  
  // Guardar usuario actual
  usuarioActual = usuario;
  window.usuarioActual = usuario;
  
  // Detener cámara de login
  if (html5QrCodeLogin) {
    try {
      await html5QrCodeLogin.stop();
      html5QrCodeLogin.clear();
    } catch (e) {}
    html5QrCodeLogin = null;
  }
  
  // Ocultar pantalla login
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.style.display = 'none';
  
  // Mostrar app layout
  const appLayout = document.getElementById('app-layout');
  if (appLayout) appLayout.style.display = 'flex';
  
  // Configurar perfil en sidebar
  configurarPerfilSidebar(usuario);
  
  // Abrir panel según tipo
  if (usuario.tipo === 'Alumno') {
    abrirPanelAlumno(usuario);
  } else if (usuario.tipo === 'Profesor') {
    abrirPanelProfesor(usuario);
  } else if (usuario.tipo === 'Admin') {
    abrirPanelAdmin(usuario);
  }
  
  // Voz IA
  speakIA(`Bienvenido ${usuario.nombre}`);
  
  // Notificación
  mostrarNotificacion(`¡Bienvenido, ${usuario.nombre}!`, 'success');
}

// ========================
// 🔹 CONFIGURAR PERFIL SIDEBAR
// ========================
function configurarPerfilSidebar(usuario) {
  const avatarEl = document.getElementById('user-avatar');
  const nombreEl = document.getElementById('user-name');
  const rolEl = document.getElementById('user-role');
  
  // Generar iniciales
  const iniciales = obtenerIniciales(usuario.nombre, usuario.apellidos);
  
  if (avatarEl) {
    avatarEl.textContent = iniciales;
    
    // Color según tipo
    avatarEl.className = 'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm';
    if (usuario.tipo === 'Alumno') {
      avatarEl.classList.add('bg-gradient-to-br', 'from-primary', 'to-accent');
    } else if (usuario.tipo === 'Profesor') {
      avatarEl.classList.add('bg-gradient-to-br', 'from-accent', 'to-purple-500');
    } else {
      avatarEl.classList.add('bg-gradient-to-br', 'from-warning', 'to-danger');
    }
  }
  
  if (nombreEl) {
    nombreEl.textContent = `${usuario.nombre} ${usuario.apellidos || ''}`.trim();
  }
  
  if (rolEl) {
    rolEl.textContent = usuario.tipo;
  }
  
  // Configurar navegación según tipo
  configurarNavegacionPorTipo(usuario.tipo);
}

// ========================
// 🔹 OBTENER INICIALES
// ========================
function obtenerIniciales(nombre, apellidos) {
  let iniciales = '';
  
  if (nombre) {
    iniciales += nombre.charAt(0).toUpperCase();
  }
  
  if (apellidos) {
    const primerApellido = apellidos.split(' ')[0];
    iniciales += primerApellido.charAt(0).toUpperCase();
  }
  
  return iniciales || '??';
}

// ========================
// 🔹 CONFIGURAR NAVEGACIÓN POR TIPO
// ========================
function configurarNavegacionPorTipo(tipo) {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    const itemTipo = item.dataset.rol;
    
    if (!itemTipo) {
      // Items sin rol específico (siempre visibles)
      item.style.display = 'flex';
    } else if (itemTipo === tipo || itemTipo === 'todos') {
      item.style.display = 'flex';
    } else if (tipo === 'Admin') {
      // Admin ve todo
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// ========================
// 🔹 ABRIR PANELES
// ========================
function abrirPanelAlumno(usuario) {
  ocultarTodosLosPaneles();
  
  const panel = document.getElementById('panel-alumno');
  if (panel) panel.style.display = 'block';
  
  // Llenar datos del perfil
  llenarPerfilAlumno(usuario);
  
  // Inicializar dashboard del alumno
  setTimeout(() => {
    if (typeof inicializarDashboardAlumno === 'function') {
      console.log('📊 Inicializando dashboard alumno desde login...');
      inicializarDashboardAlumno();
    }
  }, 300);
}

function abrirPanelProfesor(usuario) {
  ocultarTodosLosPaneles();
  
  const panel = document.getElementById('panel-profesor');
  if (panel) panel.style.display = 'block';
  
  // Llenar datos del perfil
  llenarPerfilProfesor(usuario);
  
  // Guardar profesor registrado
  window.profesorRegistrado = usuario;
  
  // Inicializar dashboard del profesor
  setTimeout(() => {
    if (typeof inicializarDashboardProfesor === 'function') {
      console.log('📊 Inicializando dashboard profesor desde login...');
      inicializarDashboardProfesor();
    }
  }, 300);
}

function abrirPanelAdmin(usuario) {
  ocultarTodosLosPaneles();
  
  const panel = document.getElementById('panel-admin');
  if (panel) panel.style.display = 'block';
  
  // Cargar datos admin
  if (typeof cargarEstadisticasAdmin === 'function') {
    cargarEstadisticasAdmin();
  }
}

function ocultarTodosLosPaneles() {
  const paneles = ['panel-alumno', 'panel-profesor', 'panel-admin'];
  paneles.forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.style.display = 'none';
  });
}

// ========================
// 🔹 LLENAR PERFILES
// ========================
function llenarPerfilAlumno(usuario) {
  // ===== HEADER DEL PANEL (parte superior derecha) =====
  const avatarHeader = document.getElementById('alumno-avatar');
  if (avatarHeader) {
    avatarHeader.textContent = obtenerIniciales(usuario.nombre, usuario.apellidos);
  }
  
  const nombreHeader = document.getElementById('alumno-perfil-nombre');
  if (nombreHeader) {
    nombreHeader.textContent = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim() || 'Sin nombre';
  }
  
  const gradoHeader = document.getElementById('alumno-perfil-grado');
  if (gradoHeader) {
    gradoHeader.textContent = `${usuario.grado || '-'}° ${usuario.grupo || '-'} • ${usuario.turno || 'Turno no especificado'}`;
  }
  
  // ===== PERFIL EN CONFIGURACIÓN =====
  // Avatar
  const avatar = document.getElementById('perfil-alumno-avatar');
  if (avatar) {
    avatar.textContent = obtenerIniciales(usuario.nombre, usuario.apellidos);
  }
  
  // Nombre
  const nombre = document.getElementById('perfil-alumno-nombre');
  if (nombre) {
    nombre.textContent = `${usuario.nombre} ${usuario.apellidos || ''}`;
  }
  
  // Datos
  const grado = document.getElementById('perfil-alumno-grado');
  if (grado) grado.textContent = usuario.grado || '-';
  
  const control = document.getElementById('perfil-alumno-control');
  if (control) control.textContent = usuario.control || '-';
  
  const whatsapp = document.getElementById('perfil-alumno-whatsapp');
  if (whatsapp) whatsapp.textContent = usuario.whatsapp || '-';
  
  // Inputs editables
  const inputNombre = document.getElementById('edit-alumno-nombre');
  if (inputNombre) inputNombre.value = usuario.nombre || '';
  
  const inputApellidos = document.getElementById('edit-alumno-apellidos');
  if (inputApellidos) inputApellidos.value = usuario.apellidos || '';
  
  const inputGrado = document.getElementById('edit-alumno-grado');
  if (inputGrado) inputGrado.value = usuario.grado || '';
  
  const inputControl = document.getElementById('edit-alumno-control');
  if (inputControl) inputControl.value = usuario.control || '';
  
  const inputWhatsapp = document.getElementById('edit-alumno-whatsapp');
  if (inputWhatsapp) inputWhatsapp.value = usuario.whatsapp || '';
}

function llenarPerfilProfesor(usuario) {
  // ===== HEADER DEL PANEL (parte superior derecha) =====
  const avatarHeader = document.getElementById('profesor-avatar');
  if (avatarHeader) {
    avatarHeader.textContent = obtenerIniciales(usuario.nombre, usuario.apellidos);
  }
  
  const nombreHeader = document.getElementById('profesor-perfil-nombre');
  if (nombreHeader) {
    nombreHeader.textContent = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim() || 'Sin nombre';
  }
  
  const materiasHeader = document.getElementById('profesor-perfil-materias');
  if (materiasHeader) {
    let materias = usuario.materias || '';
    if (Array.isArray(materias)) {
      materias = materias.join(', ');
    }
    materiasHeader.textContent = materias || 'Sin materias asignadas';
  }
  
  // ===== PERFIL EN CONFIGURACIÓN =====
  // Avatar
  const avatar = document.getElementById('perfil-profesor-avatar');
  if (avatar) {
    avatar.textContent = obtenerIniciales(usuario.nombre, usuario.apellidos);
  }
  
  // Nombre
  const nombre = document.getElementById('perfil-profesor-nombre');
  if (nombre) {
    nombre.textContent = `${usuario.nombre} ${usuario.apellidos || ''}`;
  }
  
  // Datos
  const materias = document.getElementById('perfil-profesor-materias');
  if (materias) materias.textContent = usuario.materias || '-';
  
  const grupos = document.getElementById('perfil-profesor-grupos');
  if (grupos) grupos.textContent = usuario.grupos || '-';
  
  const telefono = document.getElementById('perfil-profesor-telefono');
  if (telefono) telefono.textContent = usuario.telefono || '-';
  
  // Inputs editables
  const inputNombre = document.getElementById('edit-profesor-nombre');
  if (inputNombre) inputNombre.value = usuario.nombre || '';
  
  const inputApellidos = document.getElementById('edit-profesor-apellidos');
  if (inputApellidos) inputApellidos.value = usuario.apellidos || '';
  
  const inputMaterias = document.getElementById('edit-profesor-materias');
  if (inputMaterias) inputMaterias.value = usuario.materias || '';
  
  const inputGrupos = document.getElementById('edit-profesor-grupos');
  if (inputGrupos) inputGrupos.value = usuario.grupos || '';
  
  const inputTelefono = document.getElementById('edit-profesor-telefono');
  if (inputTelefono) inputTelefono.value = usuario.telefono || '';
}

// ========================
// 🔹 LOGIN ADMIN (Firebase Auth)
// ========================
function mostrarModalAdminLogin() {
  const modal = document.getElementById('modal-admin-login');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }
}

function cerrarModalAdminLogin() {
  const modal = document.getElementById('modal-admin-login');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
  }
}

async function loginAdmin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  const btnLogin = document.querySelector('#form-admin-login button[type="submit"]');
  
  if (!email || !password) {
    if (errorEl) errorEl.textContent = 'Completa todos los campos';
    return;
  }
  
  try {
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = 'Verificando...';
    }
    if (errorEl) errorEl.textContent = '';
    
    // Autenticar con Firebase Auth
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    
    console.log("✅ Admin autenticado:", userCredential.user.email);
    
    // Cerrar modal
    cerrarModalAdminLogin();
    
    // Login exitoso como admin
    await loginExitoso({
      id: userCredential.user.uid,
      nombre: 'Administrador',
      apellidos: '',
      tipo: 'Admin',
      email: userCredential.user.email
    });
    
  } catch (error) {
    console.error("❌ Error login admin:", error);
    
    let mensaje = 'Error de autenticación';
    if (error.code === 'auth/user-not-found') {
      mensaje = 'Usuario no encontrado';
    } else if (error.code === 'auth/wrong-password') {
      mensaje = 'Contraseña incorrecta';
    } else if (error.code === 'auth/invalid-email') {
      mensaje = 'Email inválido';
    } else if (error.code === 'auth/too-many-requests') {
      mensaje = 'Demasiados intentos. Intenta más tarde';
    }
    
    if (errorEl) errorEl.textContent = mensaje;
    reproducirBeep('error');
    
  } finally {
    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Ingresar';
    }
  }
}

// ========================
// 🔹 CERRAR SESIÓN
// ========================
async function cerrarSesion() {
  try {
    // Cerrar sesión de Firebase Auth si estaba logueado
    if (firebase.auth().currentUser) {
      await firebase.auth().signOut();
    }
    
    // Detener cámaras activas
    if (html5QrCodeLogin) {
      try {
        await html5QrCodeLogin.stop();
        html5QrCodeLogin.clear();
      } catch (e) {}
      html5QrCodeLogin = null;
    }
    
    if (typeof html5QrCode !== 'undefined' && html5QrCode) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (e) {}
    }
    
    // Limpiar variables
    usuarioActual = null;
    window.usuarioActual = null;
    window.profesorRegistrado = null;
    window.claseActiva = null;
    
    // Volver a pantalla de login
    mostrarPantallaLogin();
    
    // Resetear estado del escáner de login
    const qrReader = document.getElementById('qr-reader-login');
    if (qrReader) {
      qrReader.innerHTML = '';
      qrReader.classList.remove('camera-active');
    }
    
    const statusEl = document.getElementById('login-scan-status');
    if (statusEl) statusEl.textContent = 'Selecciona un método de escaneo';
    
    // Notificación
    mostrarNotificacion('Sesión cerrada', 'info');
    
    console.log('👋 Sesión cerrada');
    
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}

// ========================
// 🔹 GUARDAR PERFIL
// ========================
async function guardarPerfilAlumno() {
  if (!usuarioActual || usuarioActual.tipo !== 'Alumno') return;
  
  try {
    const nuevosDatos = {
      nombre: document.getElementById('edit-alumno-nombre')?.value.trim() || usuarioActual.nombre,
      apellidos: document.getElementById('edit-alumno-apellidos')?.value.trim() || usuarioActual.apellidos,
      grado: document.getElementById('edit-alumno-grado')?.value.trim() || usuarioActual.grado,
      control: document.getElementById('edit-alumno-control')?.value.trim() || usuarioActual.control,
      whatsapp: document.getElementById('edit-alumno-whatsapp')?.value.trim() || usuarioActual.whatsapp,
      tipo: 'Alumno'
    };
    
    // Actualizar en Firebase
    await db.collection('alumnos').doc(usuarioActual.id).update(nuevosDatos);
    
    // Actualizar local
    usuarioActual = { ...usuarioActual, ...nuevosDatos };
    window.usuarioActual = usuarioActual;
    
    // Actualizar UI
    llenarPerfilAlumno(usuarioActual);
    configurarPerfilSidebar(usuarioActual);
    
    mostrarNotificacion('✅ Perfil actualizado', 'success');
    reproducirBeep('success');
    
    // Cerrar modal de edición si existe
    cerrarModalEditarPerfil();
    
  } catch (error) {
    console.error('Error guardando perfil:', error);
    mostrarNotificacion('Error al guardar', 'error');
    reproducirBeep('error');
  }
}

async function guardarPerfilProfesor() {
  if (!usuarioActual || usuarioActual.tipo !== 'Profesor') return;
  
  try {
    const nuevosDatos = {
      nombre: document.getElementById('edit-profesor-nombre')?.value.trim() || usuarioActual.nombre,
      apellidos: document.getElementById('edit-profesor-apellidos')?.value.trim() || usuarioActual.apellidos,
      materias: document.getElementById('edit-profesor-materias')?.value.trim() || usuarioActual.materias,
      grupos: document.getElementById('edit-profesor-grupos')?.value.trim() || usuarioActual.grupos,
      telefono: document.getElementById('edit-profesor-telefono')?.value.trim() || usuarioActual.telefono,
      tipo: 'Profesor'
    };
    
    // Actualizar en Firebase
    await db.collection('profesores').doc(usuarioActual.id).update(nuevosDatos);
    
    // Actualizar local
    usuarioActual = { ...usuarioActual, ...nuevosDatos };
    window.usuarioActual = usuarioActual;
    
    // Actualizar UI
    llenarPerfilProfesor(usuarioActual);
    configurarPerfilSidebar(usuarioActual);
    
    // Actualizar profesorRegistrado si existe
    if (window.profesorRegistrado) {
      window.profesorRegistrado = usuarioActual;
    }
    
    mostrarNotificacion('✅ Perfil actualizado', 'success');
    reproducirBeep('success');
    
    // Cerrar modal de edición si existe
    cerrarModalEditarPerfil();
    
  } catch (error) {
    console.error('Error guardando perfil:', error);
    mostrarNotificacion('Error al guardar', 'error');
    reproducirBeep('error');
  }
}

function cerrarModalEditarPerfil() {
  const modal = document.getElementById('modal-editar-perfil');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
  }
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.procesarLoginPorEscaneo = procesarLoginPorEscaneo;
window.loginExitoso = loginExitoso;
window.cerrarSesion = cerrarSesion;
window.guardarPerfilAlumno = guardarPerfilAlumno;
window.guardarPerfilProfesor = guardarPerfilProfesor;
window.usuarioActual = usuarioActual;
window.mostrarPantallaLogin = mostrarPantallaLogin;
