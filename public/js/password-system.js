// ========================================
// 🔐 SISTEMA DE CONTRASEÑAS
// Keyon Access System v2.0
// ========================================

// ========================
// 🔹 VARIABLES
// ========================
let __usuarioTempLogin = null;

// ========================
// 🔹 VERIFICAR CONTRASEÑA DESPUÉS DEL ESCANEO
// ========================

/**
 * Punto de entrada después del escaneo QR/Barcode
 * Verifica si el usuario tiene contraseña y actúa según corresponda
 */
async function verificarPasswordDespuesEscaneo(usuario) {
  console.log('🔐 Verificando contraseña para:', usuario.nombre);
  
  const usuarioId = usuario.control || usuario.telefono || usuario.id;
  const coleccion = usuario.tipo === 'Alumno' ? 'alumnos' : 'profesores';
  
  try {
    // Obtener datos actualizados del usuario
    const doc = await db.collection(coleccion).doc(usuarioId).get();
    
    if (!doc.exists) {
      mostrarNotificacion('❌ Usuario no encontrado en el sistema', 'error');
      return;
    }
    
    const datos = doc.data();
    
    // Combinar datos del escaneo con los de Firebase
    usuario = { 
      ...usuario, 
      ...datos,
      id: usuarioId 
    };
    
    // Verificar si tiene contraseña
    if (!datos.password) {
      // NO tiene contraseña - obligar a crear una
      console.log('🔐 Usuario sin contraseña, mostrando modal de creación');
      mostrarModalCrearPassword(usuario);
    } else {
      // SÍ tiene contraseña - pedir que la ingrese
      console.log('🔐 Usuario con contraseña, solicitando ingreso');
      mostrarModalIngresarPassword(usuario);
    }
    
  } catch (error) {
    console.error('❌ Error verificando contraseña:', error);
    mostrarNotificacion('Error al verificar usuario', 'error');
  }
}

// ========================
// 🔹 MODAL CREAR CONTRASEÑA (Primera vez)
// ========================

function mostrarModalCrearPassword(usuario) {
  // Remover modal existente si hay
  document.getElementById('modal-password')?.remove();
  
  const iniciales = obtenerInicialesPassword(usuario.nombre, usuario.apellidos);
  const colorGradient = usuario.tipo === 'Alumno' 
    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' 
    : 'linear-gradient(135deg, #a855f7, #ec4899)';
  
  const modal = document.createElement('div');
  modal.id = 'modal-password';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.3s ease;
  `;
  
  modal.innerHTML = `
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .password-card { animation: slideUp 0.4s ease; }
      .password-input:focus { border-color: #06b6d4 !important; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2); }
      .password-btn:hover { transform: scale(1.02); }
      .password-btn:active { transform: scale(0.98); }
    </style>
    
    <div class="password-card" style="
      background: linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98));
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 24px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    ">
      <!-- Avatar -->
      <div style="
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: ${colorGradient};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 32px;
        margin: 0 auto 20px;
        box-shadow: 0 10px 30px rgba(6, 182, 212, 0.3);
      ">${iniciales}</div>
      
      <!-- Título -->
      <h2 style="color: #f1f5f9; font-size: 24px; font-weight: bold; margin-bottom: 8px;">
        ¡Bienvenido al Sistema!
      </h2>
      <p style="color: #94a3b8; font-size: 15px; margin-bottom: 4px;">
        ${usuario.nombre} ${usuario.apellidos || ''}
      </p>
      <p style="color: #06b6d4; font-size: 13px; margin-bottom: 24px;">
        ${usuario.tipo} • ${usuario.control || usuario.telefono || ''}
      </p>
      
      <!-- Aviso -->
      <div style="
        background: linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.1));
        border: 1px solid rgba(234,179,8,0.4);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 24px;
      ">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 20px;">🔐</span>
          <span style="color: #fbbf24; font-size: 15px; font-weight: 600;">Primera vez en el sistema</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          Crea una contraseña de <strong style="color: #fbbf24;">4 dígitos</strong> para proteger tu cuenta
        </p>
      </div>
      
      <!-- Formulario -->
      <form id="form-crear-password" style="text-align: left;">
        <div style="margin-bottom: 18px;">
          <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px; font-weight: 500;">
            Nueva contraseña
          </label>
          <input type="password" id="nueva-password" 
                 maxlength="4" 
                 pattern="[0-9]{4}" 
                 inputmode="numeric"
                 autocomplete="new-password"
                 class="password-input"
                 style="
                   width: 100%;
                   padding: 18px;
                   font-size: 28px;
                   text-align: center;
                   letter-spacing: 16px;
                   border-radius: 14px;
                   background: rgba(51,65,85,0.6);
                   border: 2px solid rgba(100,116,139,0.3);
                   color: #f1f5f9;
                   outline: none;
                   transition: all 0.3s;
                   box-sizing: border-box;
                 "
                 placeholder="• • • •"
                 required>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px; font-weight: 500;">
            Confirmar contraseña
          </label>
          <input type="password" id="confirmar-password" 
                 maxlength="4" 
                 pattern="[0-9]{4}" 
                 inputmode="numeric"
                 autocomplete="new-password"
                 class="password-input"
                 style="
                   width: 100%;
                   padding: 18px;
                   font-size: 28px;
                   text-align: center;
                   letter-spacing: 16px;
                   border-radius: 14px;
                   background: rgba(51,65,85,0.6);
                   border: 2px solid rgba(100,116,139,0.3);
                   color: #f1f5f9;
                   outline: none;
                   transition: all 0.3s;
                   box-sizing: border-box;
                 "
                 placeholder="• • • •"
                 required>
        </div>
        
        <p id="error-crear-password" style="
          color: #f87171;
          font-size: 13px;
          margin-bottom: 16px;
          display: none;
          text-align: center;
          padding: 10px;
          background: rgba(248,113,113,0.1);
          border-radius: 8px;
        "></p>
        
        <button type="submit" class="password-btn" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span>✅</span> Crear Contraseña y Entrar
        </button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  __usuarioTempLogin = usuario;
  
  // Focus al primer input
  setTimeout(() => {
    const input = document.getElementById('nueva-password');
    if (input) input.focus();
  }, 100);
  
  // Event listener del formulario
  document.getElementById('form-crear-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    await procesarCrearPassword();
  });
}

// ========================
// 🔹 PROCESAR CREACIÓN DE CONTRASEÑA
// ========================

async function procesarCrearPassword() {
  const password = document.getElementById('nueva-password').value;
  const confirmar = document.getElementById('confirmar-password').value;
  const errorEl = document.getElementById('error-crear-password');
  const btn = document.querySelector('#form-crear-password button[type="submit"]');
  
  // Ocultar error previo
  errorEl.style.display = 'none';
  
  // Validar formato (4 dígitos)
  if (!/^\d{4}$/.test(password)) {
    errorEl.textContent = '❌ La contraseña debe ser exactamente 4 dígitos numéricos';
    errorEl.style.display = 'block';
    document.getElementById('nueva-password').focus();
    return;
  }
  
  // Validar que coincidan
  if (password !== confirmar) {
    errorEl.textContent = '❌ Las contraseñas no coinciden';
    errorEl.style.display = 'block';
    document.getElementById('confirmar-password').value = '';
    document.getElementById('confirmar-password').focus();
    return;
  }
  
  // Deshabilitar botón
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Guardando...';
  
  const usuario = __usuarioTempLogin;
  const usuarioId = usuario.control || usuario.telefono || usuario.id;
  const coleccion = usuario.tipo === 'Alumno' ? 'alumnos' : 'profesores';
  
  try {
    // Crear hash de la contraseña
    const passwordHash = btoa(password + '_keyon_' + usuarioId);
    
    // Guardar en Firebase
    await db.collection(coleccion).doc(usuarioId).update({
      password: passwordHash,
      passwordCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Contraseña creada exitosamente');
    
    // Cerrar modal
    document.getElementById('modal-password')?.remove();
    __usuarioTempLogin = null;
    
    // Reproducir sonido de éxito
    if (typeof reproducirBeep === 'function') {
      reproducirBeep('success');
    }
    
    // Mostrar notificación
    mostrarNotificacion('✅ Contraseña creada correctamente', 'success');
    
    // Proceder con el login
    if (typeof loginExitoso === 'function') {
      await loginExitoso(usuario);
    }
    
  } catch (error) {
    console.error('❌ Error creando contraseña:', error);
    btn.disabled = false;
    btn.innerHTML = '<span>✅</span> Crear Contraseña y Entrar';
    errorEl.textContent = '❌ Error al guardar. Intenta de nuevo.';
    errorEl.style.display = 'block';
  }
}

// ========================
// 🔹 MODAL INGRESAR CONTRASEÑA
// ========================

function mostrarModalIngresarPassword(usuario) {
  // Remover modal existente si hay
  document.getElementById('modal-password')?.remove();
  
  const iniciales = obtenerInicialesPassword(usuario.nombre, usuario.apellidos);
  const colorGradient = usuario.tipo === 'Alumno' 
    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' 
    : 'linear-gradient(135deg, #a855f7, #ec4899)';
  
  const modal = document.createElement('div');
  modal.id = 'modal-password';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.3s ease;
  `;
  
  modal.innerHTML = `
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
      .password-card { animation: slideUp 0.4s ease; }
      .password-input:focus { border-color: #06b6d4 !important; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2); }
      .password-btn:hover { transform: scale(1.02); }
      .password-btn:active { transform: scale(0.98); }
      .shake { animation: shake 0.5s ease; }
    </style>
    
    <div class="password-card" style="
      background: linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98));
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 24px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    ">
      <!-- Avatar -->
      <div style="
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: ${colorGradient};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 32px;
        margin: 0 auto 20px;
        box-shadow: 0 10px 30px ${usuario.tipo === 'Alumno' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)'};
      ">${iniciales}</div>
      
      <!-- Título -->
      <h2 style="color: #f1f5f9; font-size: 24px; font-weight: bold; margin-bottom: 8px;">
        ¡Hola de nuevo!
      </h2>
      <p style="color: #94a3b8; font-size: 15px; margin-bottom: 4px;">
        ${usuario.nombre} ${usuario.apellidos || ''}
      </p>
      <p style="color: ${usuario.tipo === 'Alumno' ? '#06b6d4' : '#a855f7'}; font-size: 13px; margin-bottom: 28px;">
        ${usuario.tipo} • ${usuario.control || usuario.telefono || ''}
      </p>
      
      <!-- Formulario -->
      <form id="form-ingresar-password" style="text-align: left;">
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px; font-weight: 500; text-align: center;">
            Ingresa tu contraseña
          </label>
          <input type="password" id="input-password" 
                 maxlength="4" 
                 pattern="[0-9]{4}" 
                 inputmode="numeric"
                 autocomplete="current-password"
                 class="password-input"
                 style="
                   width: 100%;
                   padding: 20px;
                   font-size: 32px;
                   text-align: center;
                   letter-spacing: 20px;
                   border-radius: 14px;
                   background: rgba(51,65,85,0.6);
                   border: 2px solid rgba(100,116,139,0.3);
                   color: #f1f5f9;
                   outline: none;
                   transition: all 0.3s;
                   box-sizing: border-box;
                 "
                 placeholder="• • • •"
                 required>
        </div>
        
        <p id="error-ingresar-password" style="
          color: #f87171;
          font-size: 13px;
          margin-bottom: 16px;
          display: none;
          text-align: center;
          padding: 10px;
          background: rgba(248,113,113,0.1);
          border-radius: 8px;
        "></p>
        
        <button type="submit" class="password-btn" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, ${usuario.tipo === 'Alumno' ? '#06b6d4, #3b82f6' : '#a855f7, #ec4899'});
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span>🔓</span> Ingresar
        </button>
        
        <button type="button" onclick="cancelarIngresoPassword()" style="
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(100,116,139,0.4);
          border-radius: 14px;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        ">
          ← Volver a escanear
        </button>
      </form>
      
      <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
        ¿Olvidaste tu contraseña? Contacta al administrador
      </p>
    </div>
  `;
  
  document.body.appendChild(modal);
  __usuarioTempLogin = usuario;
  
  // Focus al input
  setTimeout(() => {
    const input = document.getElementById('input-password');
    if (input) input.focus();
  }, 100);
  
  // Event listener del formulario
  document.getElementById('form-ingresar-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    await procesarIngresarPassword();
  });
}

// ========================
// 🔹 PROCESAR INGRESO DE CONTRASEÑA
// ========================

async function procesarIngresarPassword() {
  const password = document.getElementById('input-password').value;
  const errorEl = document.getElementById('error-ingresar-password');
  const btn = document.querySelector('#form-ingresar-password button[type="submit"]');
  const card = document.querySelector('.password-card');
  
  const usuario = __usuarioTempLogin;
  const usuarioId = usuario.control || usuario.telefono || usuario.id;
  
  // Crear hash de la contraseña ingresada
  const passwordHash = btoa(password + '_keyon_' + usuarioId);
  
  // Verificar contraseña
  if (passwordHash === usuario.password) {
    // ✅ Contraseña correcta
    btn.disabled = true;
    btn.innerHTML = '<span>✅</span> Accediendo...';
    
    // Cerrar modal
    document.getElementById('modal-password')?.remove();
    __usuarioTempLogin = null;
    
    // Reproducir sonido de éxito
    if (typeof reproducirBeep === 'function') {
      reproducirBeep('success');
    }
    
    // Proceder con el login
    if (typeof loginExitoso === 'function') {
      await loginExitoso(usuario);
    }
    
  } else {
    // ❌ Contraseña incorrecta
    errorEl.textContent = '❌ Contraseña incorrecta';
    errorEl.style.display = 'block';
    
    // Efecto shake
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 500);
    
    // Reproducir sonido de error
    if (typeof reproducirBeep === 'function') {
      reproducirBeep('error');
    }
    
    // Limpiar y enfocar
    document.getElementById('input-password').value = '';
    document.getElementById('input-password').focus();
  }
}

// ========================
// 🔹 CANCELAR INGRESO
// ========================

function cancelarIngresoPassword() {
  document.getElementById('modal-password')?.remove();
  __usuarioTempLogin = null;
  
  // Reactivar escáner si existe la función
  if (typeof modoEscaneoLogin !== 'undefined' && modoEscaneoLogin === 'camara') {
    if (typeof activarCamaraLogin === 'function') {
      activarCamaraLogin();
    }
  }
}

// ========================
// 🔹 UTILIDADES
// ========================

function obtenerInicialesPassword(nombre, apellidos) {
  let iniciales = '';
  if (nombre) iniciales += nombre.charAt(0).toUpperCase();
  if (apellidos) iniciales += apellidos.split(' ')[0].charAt(0).toUpperCase();
  return iniciales || '??';
}

// ========================
// 🔑 ADMINISTRACIÓN DE CONTRASEÑAS
// ========================

/**
 * Abre el modal de gestión de contraseñas (Admin)
 */
function abrirGestionContrasenas() {
  const modal = document.createElement('div');
  modal.id = 'modal-gestion-passwords';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 99999;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  `;
  
  modal.innerHTML = `
    <div style="min-height: 100%; padding: 16px; display: flex; flex-direction: column;">
      <!-- Header sticky -->
      <div style="
        background: linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.95));
        border: 1px solid rgba(234,179,8,0.3);
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 10;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">🔑</span>
          <div>
            <h3 style="font-size: 18px; font-weight: bold; color: #f1f5f9; margin: 0;">Gestión de Contraseñas</h3>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Restablecer contraseñas de usuarios</p>
          </div>
        </div>
        <button onclick="cerrarGestionContrasenas()" style="
          padding: 12px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <!-- Contenido -->
      <div style="max-width: 600px; margin: 0 auto; width: 100%;">
        <!-- Aviso -->
        <div style="
          background: linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.1));
          border: 1px solid rgba(234,179,8,0.4);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 20px;
        ">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 24px;">⚠️</span>
            <div>
              <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">
                Acción administrativa
              </p>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                Al restablecer una contraseña, el usuario deberá crear una nueva la próxima vez que ingrese al sistema.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Búsqueda -->
        <div style="
          background: rgba(51,65,85,0.4);
          border: 1px solid rgba(100,116,139,0.2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        ">
          <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 10px; font-weight: 500;">
            🔍 Buscar usuario
          </label>
          <input type="text" id="buscar-usuario-password" 
                 placeholder="Nombre, número de control o teléfono..."
                 oninput="buscarUsuarioPassword(this.value)"
                 style="
                   width: 100%;
                   padding: 14px 16px;
                   border-radius: 12px;
                   background: rgba(30,41,59,0.8);
                   border: 1px solid rgba(100,116,139,0.3);
                   color: #f1f5f9;
                   font-size: 15px;
                   outline: none;
                   box-sizing: border-box;
                 ">
        </div>
        
        <!-- Estadísticas rápidas -->
        <div id="stats-passwords" style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        ">
          <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #10b981; font-size: 24px; font-weight: bold; margin: 0;" id="stat-con-password">-</p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Con contraseña</p>
          </div>
          <div style="background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #fbbf24; font-size: 24px; font-weight: bold; margin: 0;" id="stat-sin-password">-</p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Sin contraseña</p>
          </div>
          <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #6366f1; font-size: 24px; font-weight: bold; margin: 0;" id="stat-total-usuarios">-</p>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Total usuarios</p>
          </div>
        </div>
        
        <!-- Lista de resultados -->
        <div id="lista-usuarios-password" style="max-height: 50vh; overflow-y: auto;">
          <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
            <span style="font-size: 48px; display: block; margin-bottom: 12px;">🔍</span>
            <p style="margin: 0;">Escribe para buscar usuarios</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Cargar estadísticas
  cargarEstadisticasPasswords();
  
  // Focus al input
  setTimeout(() => document.getElementById('buscar-usuario-password')?.focus(), 100);
}

/**
 * Cierra el modal de gestión de contraseñas
 */
function cerrarGestionContrasenas() {
  document.body.style.overflow = '';
  document.getElementById('modal-gestion-passwords')?.remove();
}

/**
 * Carga estadísticas de contraseñas
 */
async function cargarEstadisticasPasswords() {
  try {
    let conPassword = 0;
    let sinPassword = 0;
    
    // Contar alumnos
    const alumnosSnap = await db.collection('alumnos').get();
    alumnosSnap.forEach(doc => {
      if (doc.data().password) conPassword++;
      else sinPassword++;
    });
    
    // Contar profesores
    const profesoresSnap = await db.collection('profesores').get();
    profesoresSnap.forEach(doc => {
      if (doc.data().password) conPassword++;
      else sinPassword++;
    });
    
    // Actualizar UI
    document.getElementById('stat-con-password').textContent = conPassword;
    document.getElementById('stat-sin-password').textContent = sinPassword;
    document.getElementById('stat-total-usuarios').textContent = conPassword + sinPassword;
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

/**
 * Busca usuarios para restablecer contraseña
 */
async function buscarUsuarioPassword(termino) {
  const lista = document.getElementById('lista-usuarios-password');
  
  if (termino.length < 2) {
    lista.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
        <span style="font-size: 48px; display: block; margin-bottom: 12px;">🔍</span>
        <p style="margin: 0;">Escribe al menos 2 caracteres</p>
      </div>
    `;
    return;
  }
  
  lista.innerHTML = `
    <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
      <span style="font-size: 48px; display: block; margin-bottom: 12px;">⏳</span>
      <p style="margin: 0;">Buscando...</p>
    </div>
  `;
  
  try {
    const resultados = [];
    const terminoLower = termino.toLowerCase();
    
    // Buscar en alumnos
    const alumnosSnap = await db.collection('alumnos').get();
    alumnosSnap.forEach(doc => {
      const data = doc.data();
      const nombreCompleto = `${data.nombre || ''} ${data.apellidos || ''}`.toLowerCase();
      const control = (data.control || doc.id).toLowerCase();
      
      if (nombreCompleto.includes(terminoLower) || control.includes(terminoLower)) {
        resultados.push({
          id: doc.id,
          nombre: data.nombre || 'Sin nombre',
          apellidos: data.apellidos || '',
          identificador: data.control || doc.id,
          tipo: 'Alumno',
          tienePassword: !!data.password,
          coleccion: 'alumnos',
          grado: data.grado || '',
          grupo: data.grupo || ''
        });
      }
    });
    
    // Buscar en profesores
    const profesoresSnap = await db.collection('profesores').get();
    profesoresSnap.forEach(doc => {
      const data = doc.data();
      const nombreCompleto = `${data.nombre || ''} ${data.apellidos || ''}`.toLowerCase();
      const telefono = (data.telefono || doc.id).toLowerCase();
      
      if (nombreCompleto.includes(terminoLower) || telefono.includes(terminoLower)) {
        resultados.push({
          id: doc.id,
          nombre: data.nombre || 'Sin nombre',
          apellidos: data.apellidos || '',
          identificador: data.telefono || doc.id,
          tipo: 'Profesor',
          tienePassword: !!data.password,
          coleccion: 'profesores'
        });
      }
    });
    
    if (resultados.length === 0) {
      lista.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <span style="font-size: 48px; display: block; margin-bottom: 12px;">📭</span>
          <p style="margin: 0;">No se encontraron usuarios</p>
        </div>
      `;
      return;
    }
    
    // Renderizar resultados
    lista.innerHTML = resultados.map(u => {
      const iniciales = (u.nombre.charAt(0) + (u.apellidos.charAt(0) || '')).toUpperCase();
      const gradientColor = u.tipo === 'Alumno' ? '#06b6d4, #3b82f6' : '#a855f7, #ec4899';
      const extraInfo = u.tipo === 'Alumno' && u.grado ? ` • ${u.grado}° ${u.grupo}` : '';
      
      return `
        <div style="
          background: rgba(30,41,59,0.6);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        ">
          <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: linear-gradient(135deg, ${gradientColor});
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
              flex-shrink: 0;
            ">${iniciales}</div>
            <div style="min-width: 0; flex: 1;">
              <p style="color: #f1f5f9; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${u.nombre} ${u.apellidos}
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 2px 0 0 0;">
                ${u.tipo} • ${u.identificador}${extraInfo}
              </p>
              <p style="color: ${u.tienePassword ? '#10b981' : '#fbbf24'}; font-size: 11px; margin: 4px 0 0 0;">
                ${u.tienePassword ? '🔐 Con contraseña' : '⚠️ Sin contraseña'}
              </p>
            </div>
          </div>
          ${u.tienePassword ? `
            <button onclick="confirmarRestablecerPassword('${u.coleccion}', '${u.id}', '${u.nombre} ${u.apellidos}')" style="
              padding: 10px 16px;
              background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.2));
              border: 1px solid rgba(239,68,68,0.4);
              border-radius: 10px;
              color: #f87171;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.3s;
            ">
              🔄 Restablecer
            </button>
          ` : `
            <span style="color: #64748b; font-size: 12px; white-space: nowrap;">Sin contraseña</span>
          `}
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    lista.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #f87171;">
        <span style="font-size: 48px; display: block; margin-bottom: 12px;">❌</span>
        <p style="margin: 0;">Error al buscar: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Muestra confirmación para restablecer contraseña
 */
function confirmarRestablecerPassword(coleccion, userId, nombreCompleto) {
  const confirmar = confirm(
    `⚠️ ¿Restablecer la contraseña de ${nombreCompleto}?\n\n` +
    `El usuario deberá crear una nueva contraseña la próxima vez que ingrese al sistema.\n\n` +
    `Esta acción no se puede deshacer.`
  );
  
  if (confirmar) {
    restablecerPassword(coleccion, userId, nombreCompleto);
  }
}

/**
 * Restablece la contraseña de un usuario
 */
async function restablecerPassword(coleccion, userId, nombreCompleto) {
  try {
    await db.collection(coleccion).doc(userId).update({
      password: firebase.firestore.FieldValue.delete(),
      passwordResetAt: firebase.firestore.FieldValue.serverTimestamp(),
      passwordResetBy: window.usuarioActual?.nombre || 'Administrador'
    });
    
    mostrarNotificacion(`✅ Contraseña de ${nombreCompleto} restablecida`, 'success');
    
    // Actualizar búsqueda
    const input = document.getElementById('buscar-usuario-password');
    if (input && input.value) {
      buscarUsuarioPassword(input.value);
    }
    
    // Actualizar estadísticas
    cargarEstadisticasPasswords();
    
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    mostrarNotificacion('❌ Error al restablecer contraseña', 'error');
  }
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.verificarPasswordDespuesEscaneo = verificarPasswordDespuesEscaneo;
window.mostrarModalCrearPassword = mostrarModalCrearPassword;
window.mostrarModalIngresarPassword = mostrarModalIngresarPassword;
window.cancelarIngresoPassword = cancelarIngresoPassword;
window.abrirGestionContrasenas = abrirGestionContrasenas;
window.cerrarGestionContrasenas = cerrarGestionContrasenas;
window.buscarUsuarioPassword = buscarUsuarioPassword;
window.confirmarRestablecerPassword = confirmarRestablecerPassword;
window.restablecerPassword = restablecerPassword;
window.cargarEstadisticasPasswordsSeccion = cargarEstadisticasPasswordsSeccion;

// ========================
// 🔹 CARGAR ESTADÍSTICAS EN SECCIÓN HTML
// ========================

async function cargarEstadisticasPasswordsSeccion() {
  try {
    let conPassword = 0;
    let sinPassword = 0;
    
    // Contar alumnos
    const alumnosSnap = await db.collection('alumnos').get();
    alumnosSnap.forEach(doc => {
      if (doc.data().password) conPassword++;
      else sinPassword++;
    });
    
    // Contar profesores
    const profesoresSnap = await db.collection('profesores').get();
    profesoresSnap.forEach(doc => {
      if (doc.data().password) conPassword++;
      else sinPassword++;
    });
    
    // Actualizar UI de la sección
    const statCon = document.getElementById('gestion-stat-con-password');
    const statSin = document.getElementById('gestion-stat-sin-password');
    const statTotal = document.getElementById('gestion-stat-total');
    
    if (statCon) statCon.textContent = conPassword;
    if (statSin) statSin.textContent = sinPassword;
    if (statTotal) statTotal.textContent = conPassword + sinPassword;
    
    console.log('📊 Estadísticas de contraseñas cargadas');
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// Cargar estadísticas cuando se muestra la sección
const observerContrasenas = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const section = document.getElementById('gestion-contrasenas');
      if (section && !section.classList.contains('hidden')) {
        cargarEstadisticasPasswordsSeccion();
      }
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('gestion-contrasenas');
  if (section) {
    observerContrasenas.observe(section, { attributes: true });
  }
});
