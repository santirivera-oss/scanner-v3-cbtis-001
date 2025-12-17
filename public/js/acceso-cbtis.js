// accesos-cbtis.js
// Módulo: Control de acceso CBTis (ingreso / salida)
// Versión: Enterprise v2.0 (Tactile Glass UI + Logic Hardening)
// Requiere: db (Firestore compat), actualizarAviso(), reproducirBeep(), mostrarOverlayTipo()

/* -------------------------
   Estado global y carga
   ------------------------- */
window.modoCBTis = null; // 'Ingreso' | 'Salida' | null
window.ingresosCBTis = window.ingresosCBTis || []; // cache local
window.ultimoEscaneoCache = {}; // MEJORA: Cache para Debounce (evitar doble registro)

/* -------------------------
   Crear Panel CBTis (Ingreso / Salida)
   ------------------------- */
function initPanelCBTis(containerId = null) {
  if (document.getElementById("panel-cbtis")) return;

  const cont = containerId ? document.getElementById(containerId) : document.body;
  if (!cont) return;

  const panel = document.createElement("div");
  panel.id = "panel-cbtis";
  // Estilos inline básicos para estructura (el diseño visual viene del CSS global)
  panel.style.cssText = "padding:15px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:15px; background:rgba(15,23,42,0.6); border-radius:12px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px);";

  panel.innerHTML = `
    <strong style="margin-right:8px; color:#e2e8f0;">🏫 CBTis Accesos</strong>
    <button id="btn-cbtis-ingreso" style="padding:8px 14px; background:#10b981; color:#fff; border-radius:8px; border:none; cursor:pointer; font-weight:600;">🔓 Ingreso</button>
    <button id="btn-cbtis-salida" style="padding:8px 14px; background:#ef4444; color:#fff; border-radius:8px; border:none; cursor:pointer; font-weight:600;">🚪 Salida</button>
    <button id="btn-cbtis-facial" style="padding:8px 14px; background:#8b5cf6; color:#fff; border-radius:8px; border:none; cursor:pointer; font-weight:600;">🎭 Facial</button>
    <button id="btn-cbtis-cerrar" style="padding:8px 14px; background:#475569; color:#fff; border-radius:8px; border:none; cursor:pointer;">❌ Salir modo</button>
    <span id="modo-actual-cbtis" style="margin-left:10px; font-weight:bold; color:#94a3b8;">Modo: Inactivo</span>
  `;

  cont.prepend(panel);

  // Listeners de botones
  document.getElementById("btn-cbtis-ingreso").addEventListener("click", () => setModoCBTis("Ingreso"));
  document.getElementById("btn-cbtis-salida").addEventListener("click", () => setModoCBTis("Salida"));
  document.getElementById("btn-cbtis-cerrar").addEventListener("click", () => setModoCBTis(null));
  
  // Botón de reconocimiento facial
  document.getElementById("btn-cbtis-facial").addEventListener("click", () => {
    if (!window.modoCBTis) {
      actualizarAviso("⚠️ Primero selecciona Ingreso o Salida", "warning");
      return;
    }
    if (typeof iniciarReconocimientoFacial === 'function') {
      iniciarReconocimientoFacial('cbtis');
    } else {
      actualizarAviso("⚠️ Módulo de reconocimiento facial no cargado", "error");
    }
  });

  actualizarAviso("🏫 Panel CBTis inicializado", "success");
}

/* -------------------------
   Cambiar modo (Ingreso/Salida)
   ------------------------- */
function setModoCBTis(modo) {
  window.modoCBTis = modo;
  const indicador = document.getElementById("modo-actual-cbtis");
  
  if (indicador) {
    if (!modo) {
      indicador.textContent = "Modo: Inactivo";
      indicador.style.color = "#94a3b8";
    } else {
      indicador.textContent = `Modo: ${modo.toUpperCase()}`;
      indicador.style.color = modo === "Ingreso" ? "#34d399" : "#f87171";
    }
  }
  
  if (modo) {
    actualizarAviso(`Modo activo: ${modo}`, "success");
  } else {
    actualizarAviso("Modo CBTis desactivado", "info");
  }
}

/* -------------------------
   🎭 MODO KIOSCO CBTis - RECONOCIMIENTO FACIAL DEDICADO
   ------------------------- */
let kioscoCBTisActivo = false;
let streamKioscoCBTis = null;
let ultimoRegistroCBTis = {}; // { identificador: { timestamp, tipo } }

/**
 * Abre el modo kiosco CBTis a pantalla completa
 * Solo reconocimiento facial para entrada/salida
 */
async function abrirKioscoCBTis() {
  if (kioscoCBTisActivo) return;
  
  // Cargar modelos faciales
  if (typeof cargarModelosFaciales === 'function') {
    mostrarNotificacion('🎭 Cargando sistema de reconocimiento...', 'info');
    const cargado = await cargarModelosFaciales();
    if (!cargado) {
      mostrarNotificacion('❌ No se pudo cargar el reconocimiento facial', 'error');
      return;
    }
  }
  
  // Cargar descriptores de usuarios
  if (typeof cargarDescriptoresUsuarios === 'function') {
    await cargarDescriptoresUsuarios();
  }
  
  kioscoCBTisActivo = true;
  
  // Crear overlay a pantalla completa
  const overlay = document.createElement('div');
  overlay.id = 'kiosco-cbtis';
  overlay.className = 'fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-[9999] flex flex-col';
  overlay.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between p-4 bg-black/30 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <span class="text-3xl animate-pulse">🏫</span>
        <div>
          <h1 class="text-xl font-bold text-white">CBTis 001 - Control de Acceso</h1>
          <p class="text-sm text-slate-400">Sistema de Reconocimiento Facial</p>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <!-- Estadísticas en vivo -->
        <div class="flex gap-4">
          <div class="text-center">
            <p class="text-xs text-slate-400">Ingresos Hoy</p>
            <p class="text-2xl font-bold text-emerald-400" id="kiosco-stat-ingresos">0</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-slate-400">Salidas Hoy</p>
            <p class="text-2xl font-bold text-red-400" id="kiosco-stat-salidas">0</p>
          </div>
        </div>
        <div class="h-12 w-px bg-slate-600"></div>
        <div id="kiosco-fecha-hora" class="text-right">
          <p class="text-2xl font-bold text-white" id="kiosco-hora">--:--:--</p>
          <p class="text-sm text-slate-400" id="kiosco-fecha">-- de --- de ----</p>
        </div>
        <button onclick="cerrarKioscoCBTis()" class="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-all group">
          <svg class="w-6 h-6 text-red-400 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="flex-1 flex items-center justify-center p-4 gap-6">
      <!-- Video Panel -->
      <div class="flex-1 max-w-2xl">
        <div class="relative bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-cyan-500/20" style="aspect-ratio: 4/3;">
          <video id="video-kiosco-cbtis" autoplay muted playsinline class="w-full h-full object-cover"></video>
          <canvas id="canvas-kiosco-cbtis" class="absolute inset-0 w-full h-full"></canvas>
          
          <!-- Grid de ayuda visual -->
          <div class="absolute inset-0 pointer-events-none">
            <div class="absolute inset-[20%] border-2 border-cyan-500/30 rounded-full"></div>
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4">
              <div class="w-full h-full border-2 border-cyan-400 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <!-- Overlay de estado -->
          <div id="kiosco-estado" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
            <div class="flex items-center justify-center gap-3">
              <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p class="text-white text-xl text-center" id="kiosco-estado-texto">📷 Iniciando cámara...</p>
            </div>
          </div>
          
          <!-- Indicador de modo -->
          <div id="kiosco-modo-indicador" class="absolute top-4 left-4 px-4 py-2 rounded-xl text-white font-bold text-lg shadow-lg">
            Selecciona modo
          </div>
          
          <!-- FPS Counter -->
          <div class="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs text-slate-400">
            FPS: <span id="kiosco-fps">0</span>
          </div>
        </div>
        
        <!-- Botones de modo -->
        <div class="flex gap-4 mt-6">
          <button onclick="setModoKiosco('Ingreso')" id="btn-kiosco-ingreso" 
                  class="flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-emerald-600 hover:bg-emerald-500 border-4 border-transparent hover:scale-105 active:scale-95">
            <div class="flex items-center justify-center gap-2">
              <span class="text-2xl">🔓</span>
              <span>ENTRADA</span>
            </div>
          </button>
          <button onclick="setModoKiosco('Salida')" id="btn-kiosco-salida"
                  class="flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-red-600 hover:bg-red-500 border-4 border-transparent hover:scale-105 active:scale-95">
            <div class="flex items-center justify-center gap-2">
              <span class="text-2xl">🚪</span>
              <span>SALIDA</span>
            </div>
          </button>
        </div>
        
        <!-- Instrucciones -->
        <div class="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <p class="text-cyan-300 text-sm text-center">
            💡 Coloca tu rostro dentro del círculo y espera el reconocimiento automático
          </p>
        </div>
      </div>
      
      <!-- Panel lateral - Últimos registros -->
      <div class="w-80 h-full max-h-[600px] bg-white/5 backdrop-blur-sm rounded-3xl p-4 flex flex-col border border-white/10">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            📋 Últimos Registros
          </h3>
          <span id="kiosco-contador" class="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-semibold">0</span>
        </div>
        <div id="kiosco-lista-registros" class="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          <div class="flex flex-col items-center justify-center h-full text-slate-500">
            <span class="text-4xl mb-2">📋</span>
            <p class="text-center">Sin registros aún</p>
          </div>
        </div>
        <button onclick="limpiarListaKiosco()" class="mt-4 w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all">
          🗑️ Limpiar Lista
        </button>
      </div>
    </div>
    
    <!-- Banner de éxito (animación) -->
    <div id="kiosco-banner-exito" class="hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-600 via-green-500 to-cyan-600 p-6 transform translate-y-full transition-all duration-500 shadow-2xl">
      <div class="max-w-4xl mx-auto flex items-center gap-6">
        <div class="relative">
          <div class="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
          <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold" id="kiosco-avatar">
            ?
          </div>
        </div>
        <div class="flex-1">
          <p class="text-3xl font-bold text-white" id="kiosco-nombre">---</p>
          <p class="text-xl text-white/80" id="kiosco-info">---</p>
        </div>
        <div class="text-right">
          <p class="text-6xl font-bold text-white animate-bounce">✅</p>
          <p class="text-white/80 text-lg" id="kiosco-hora-registro">--:--</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  // Iniciar reloj
  actualizarRelojKiosco();
  window.__intervalRelojKiosco = setInterval(actualizarRelojKiosco, 1000);
  
  // Cargar estadísticas iniciales
  cargarEstadisticasKiosco();
  
  // Actualizar estadísticas cada 30 segundos
  window.__intervalStatsKiosco = setInterval(cargarEstadisticasKiosco, 30000);
  
  // Iniciar cámara
  await iniciarCamaraKiosco();
  
  // Por defecto modo Ingreso
  setModoKiosco('Ingreso');
}

/**
 * Actualiza el reloj del kiosco
 */
function actualizarRelojKiosco() {
  const ahora = new Date();
  const horaEl = document.getElementById('kiosco-hora');
  const fechaEl = document.getElementById('kiosco-fecha');
  
  if (horaEl) {
    horaEl.textContent = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (fechaEl) {
    fechaEl.textContent = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}

/**
 * Cambia el modo del kiosco (Ingreso/Salida)
 */
function setModoKiosco(modo) {
  window.modoCBTis = modo;
  
  const indicador = document.getElementById('kiosco-modo-indicador');
  const btnIngreso = document.getElementById('btn-kiosco-ingreso');
  const btnSalida = document.getElementById('btn-kiosco-salida');
  
  if (indicador) {
    if (modo === 'Ingreso') {
      indicador.textContent = '🔓 MODO ENTRADA';
      indicador.className = 'absolute top-4 left-4 px-4 py-2 rounded-xl text-white font-bold text-lg bg-emerald-500';
    } else {
      indicador.textContent = '🚪 MODO SALIDA';
      indicador.className = 'absolute top-4 left-4 px-4 py-2 rounded-xl text-white font-bold text-lg bg-red-500';
    }
  }
  
  if (btnIngreso) {
    btnIngreso.className = modo === 'Ingreso' 
      ? 'flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-emerald-600 border-4 border-emerald-300 shadow-lg shadow-emerald-500/50'
      : 'flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-emerald-600/50 hover:bg-emerald-600 border-4 border-transparent';
  }
  
  if (btnSalida) {
    btnSalida.className = modo === 'Salida'
      ? 'flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-red-600 border-4 border-red-300 shadow-lg shadow-red-500/50'
      : 'flex-1 py-4 rounded-2xl text-white font-bold text-xl transition-all bg-red-600/50 hover:bg-red-600 border-4 border-transparent';
  }
}

/**
 * Inicia la cámara del kiosco
 */
async function iniciarCamaraKiosco() {
  const video = document.getElementById('video-kiosco-cbtis');
  const estado = document.getElementById('kiosco-estado-texto');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    
    video.srcObject = stream;
    streamKioscoCBTis = stream;
    
    video.onloadedmetadata = () => {
      estado.textContent = '🔍 Buscando caras...';
      detectarCaraKiosco();
    };
    
  } catch (error) {
    console.error('Error cámara kiosco:', error);
    estado.textContent = '❌ Error accediendo a la cámara';
  }
}

/**
 * Loop de detección facial en kiosco
 */
let ultimaDeteccionKiosco = 0;
const TIEMPO_ENTRE_DETECCIONES_KIOSCO = 2000;

async function detectarCaraKiosco() {
  if (!kioscoCBTisActivo || !streamKioscoCBTis) return;
  
  const video = document.getElementById('video-kiosco-cbtis');
  const canvas = document.getElementById('canvas-kiosco-cbtis');
  const estado = document.getElementById('kiosco-estado-texto');
  
  if (!video || !canvas || !faceapi) {
    requestAnimationFrame(detectarCaraKiosco);
    return;
  }
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  
  const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  
  try {
    const deteccion = await faceapi.detectSingleFace(video, opciones)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (deteccion) {
      const box = deteccion.detection.box;
      
      // Buscar coincidencia
      const resultado = buscarCoincidenciaKiosco(deteccion.descriptor);
      
      if (resultado) {
        // ✅ Usuario reconocido
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Verificar tiempo desde última detección
        const ahora = Date.now();
        if (ahora - ultimaDeteccionKiosco > TIEMPO_ENTRE_DETECCIONES_KIOSCO) {
          ultimaDeteccionKiosco = ahora;
          await procesarRegistroKiosco(resultado);
        }
        
        estado.textContent = `✅ ${resultado.nombre} reconocido`;
        estado.className = 'text-emerald-400 text-xl text-center';
        
      } else {
        // ❓ Cara no reconocida
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        estado.textContent = '❓ Cara no registrada en el sistema';
        estado.className = 'text-yellow-400 text-xl text-center';
      }
      
    } else {
      estado.textContent = '🔍 Acércate a la cámara...';
      estado.className = 'text-white text-xl text-center';
    }
    
  } catch (e) {
    console.warn('Error detección kiosco:', e);
  }
  
  if (kioscoCBTisActivo) {
    requestAnimationFrame(detectarCaraKiosco);
  }
}

/**
 * Busca coincidencia en descriptores (usa la función del módulo facial)
 */
function buscarCoincidenciaKiosco(descriptor) {
  if (typeof descriptoresUsuarios === 'undefined' || !descriptoresUsuarios) return null;
  
  let mejorCoincidencia = null;
  let menorDistancia = 0.5; // Umbral
  
  for (const [id, usuario] of Object.entries(descriptoresUsuarios)) {
    const distancia = faceapi.euclideanDistance(descriptor, usuario.descriptor);
    
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      mejorCoincidencia = { id, ...usuario, distancia };
    }
  }
  
  return mejorCoincidencia;
}

/**
 * Procesa el registro en el kiosco
 */
async function procesarRegistroKiosco(usuario) {
  const modo = window.modoCBTis || 'Ingreso';
  
  // Crear objeto de usuario completo
  const datosUsuario = {
    nombre: usuario.nombre,
    apellidos: usuario.apellidos || '',
    tipo: usuario.tipo,
    control: usuario.control || '',
    telefono: usuario.telefono || '',
    grado: usuario.grado || '',
    grupo: usuario.grupo || ''
  };
  
  // Registrar en Firestore con modo correcto
  await registrarIngresoCBTis(datosUsuario, modo, 'facial');
  
  // Mostrar animación de éxito
  mostrarExitoKiosco(usuario, modo);
  
  // Agregar a lista de registros
  agregarRegistroListaKiosco(usuario, modo);
  
  // Reproducir sonido
  if (typeof reproducirBeep === 'function') reproducirBeep('success');
}

/**
 * Agrega registro a la lista del kiosco
 */
function agregarRegistroListaKiosco(usuario, modo) {
  const lista = document.getElementById('kiosco-lista-registros');
  const contador = document.getElementById('kiosco-contador');
  
  if (!lista) return;
  
  // Limpiar mensaje inicial
  if (lista.querySelector('.text-slate-500')) {
    lista.innerHTML = '';
  }
  
  const iniciales = (usuario.nombre + ' ' + (usuario.apellidos || '')).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const iconoTipo = usuario.tipo === 'Alumno' ? '🎓' : '👨‍🏫';
  const iconoRegistro = modo === 'Ingreso' ? '🔓' : '🚪';
  const colorRegistro = modo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400';
  const bgGradient = usuario.tipo === 'Alumno' ? 'from-cyan-600 to-blue-700' : 'from-purple-600 to-pink-700';
  const bgCard = modo === 'Ingreso' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30';
  
  const item = document.createElement('div');
  item.className = `p-3 rounded-xl border ${bgCard} backdrop-blur-sm hover:scale-[1.02] transition-all duration-200`;
  item.style.animation = 'slideInRight 0.3s ease-out';
  item.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
        ${iniciales}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-medium text-sm truncate">${usuario.nombre} ${usuario.apellidos || ''}</p>
        <div class="flex items-center gap-2 text-xs mt-1">
          <span class="text-slate-300">${iconoTipo}</span>
          <span class="${colorRegistro} font-semibold">${iconoRegistro} ${modo}</span>
          <span class="text-slate-400">•</span>
          <span class="text-slate-400">${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    </div>
  `;
  
  lista.prepend(item);
  
  // Actualizar contador con animación
  if (contador) {
    const count = lista.children.length;
    contador.textContent = count;
    contador.classList.add('scale-125');
    setTimeout(() => contador.classList.remove('scale-125'), 200);
  }
  
  // Limitar a 20 items
  while (lista.children.length > 20) {
    lista.removeChild(lista.lastChild);
  }
}

/**
 * Muestra una alerta visual en el kiosco
 */
function mostrarAlertaKiosco(titulo, mensaje, tipo = 'info') {
  const alertaExistente = document.getElementById('kiosco-alerta-temp');
  if (alertaExistente) alertaExistente.remove();
  
  const colorMap = {
    'success': 'from-emerald-600 to-green-600',
    'warning': 'from-yellow-600 to-orange-600',
    'error': 'from-red-600 to-pink-600',
    'info': 'from-blue-600 to-cyan-600'
  };
  
  const iconMap = {
    'success': '✅',
    'warning': '⏳',
    'error': '❌',
    'info': 'ℹ️'
  };
  
  const alerta = document.createElement('div');
  alerta.id = 'kiosco-alerta-temp';
  alerta.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000]';
  alerta.style.animation = 'bounceIn 0.5s ease-out';
  alerta.innerHTML = `
    <div class="bg-gradient-to-r ${colorMap[tipo]} px-8 py-4 rounded-2xl shadow-2xl border-2 border-white/20">
      <div class="flex items-center gap-4">
        <span class="text-4xl">${iconMap[tipo]}</span>
        <div>
          <p class="text-white font-bold text-xl">${titulo}</p>
          <p class="text-white/90">${mensaje}</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('kiosco-cbtis')?.appendChild(alerta);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    alerta.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => alerta.remove(), 300);
  }, 3000);
}

/**
 * Cierra el kiosco CBTis
 */
function cerrarKioscoCBTis() {
  kioscoCBTisActivo = false;
  
  // Detener cámara
  if (streamKioscoCBTis) {
    streamKioscoCBTis.getTracks().forEach(track => track.stop());
    streamKioscoCBTis = null;
  }
  
  // Detener intervalos
  if (window.__intervalRelojKiosco) {
    clearInterval(window.__intervalRelojKiosco);
  }
  if (window.__intervalStatsKiosco) {
    clearInterval(window.__intervalStatsKiosco);
  }
  
  // Remover overlay
  const overlay = document.getElementById('kiosco-cbtis');
  if (overlay) overlay.remove();
  
  // Restaurar scroll
  document.body.style.overflow = '';
  
  window.modoCBTis = null;
}

// Exports
window.abrirKioscoCBTis = abrirKioscoCBTis;
window.cerrarKioscoCBTis = cerrarKioscoCBTis;
window.cerrarKioscoCBTis = cerrarKioscoCBTis;
window.setModoKiosco = setModoKiosco;

/* -------------------------
   Registrar ingreso/salida (Firestore + UI + Validaciones)
   ------------------------- */
async function registrarIngresoCBTis(datosUsuario, tipoRegistro = "Ingreso", modoEscaneo = "facial") {
  try {
    // 1. MEJORA: Validación de datos crítica
    if (!datosUsuario || typeof datosUsuario !== 'object') {
      throw new Error("Datos de usuario inválidos o vacíos.");
    }
    
    // Normalizar identificador
    const identificador = (datosUsuario.control || datosUsuario.identificador || datosUsuario.telefono || datosUsuario.uid || "").toString().trim();
    const nombreCompleto = `${(datosUsuario.nombre || "").toString()} ${(datosUsuario.apellidos || "").toString()}`.trim();

    if (!identificador || !nombreCompleto) {
      reproducirBeep("error");
      actualizarAviso("⚠️ Datos incompletos en el QR (falta ID o Nombre)", "error");
      return;
    }

    // 2. MEJORA CRÍTICA: Prevención de duplicados exactos (mismo tipo de registro)
    const ahoraTs = Date.now();
    const ultimoRegistro = ultimoRegistroCBTis[identificador];
    
    // Si el último registro fue del MISMO TIPO en los últimos 30 segundos, bloquear
    if (ultimoRegistro && 
        ultimoRegistro.tipo === tipoRegistro && 
        (ahoraTs - ultimoRegistro.timestamp) < 30000) {
      const segundosRestantes = Math.ceil((30000 - (ahoraTs - ultimoRegistro.timestamp)) / 1000);
      console.warn(`⏳ Registro duplicado bloqueado para ${identificador}. Espera ${segundosRestantes}s`);
      
      if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion(`⏳ ${nombreCompleto} ya registró ${tipoRegistro}. Espera ${segundosRestantes}s`, 'warning');
      }
      
      // Mostrar alerta visual en kiosco
      if (kioscoCBTisActivo) {
        mostrarAlertaKiosco('⏳ Ya registrado', `Espera ${segundosRestantes} segundos`, 'warning');
      }
      
      return; // Salir sin registrar
    }

    // 3. MEJORA: Manejo de Fechas (Zona Horaria Local Explícita)
    const fechaObj = new Date();
    // Formato ISO local 'YYYY-MM-DD'
    const fechaLocal = fechaObj.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
    const horaLocal = fechaObj.toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Normalizar modo (siempre lowercase)
    const modoNormalizado = modoEscaneo.toLowerCase();

    const registro = {
      tipoPersona: (datosUsuario.tipo || "Alumno").toString(),
      nombre: nombreCompleto,
      identificador: identificador,
      aula: datosUsuario.aula || datosUsuario.grupo || "General",
      tipoRegistro, // 'Ingreso' o 'Salida'
      fecha: fechaLocal,
      hora: horaLocal,
      modo: modoNormalizado, // 'facial', 'qr', 'barcode'
      timestamp: fechaObj.toISOString(),
      fotoUrl: datosUsuario.fotoUrl || null
    };

    // 4. Guardar en Firestore
    await db.collection("ingresos_cbtis").add(registro);
    
    // Actualizar caché de último registro
    ultimoRegistroCBTis[identificador] = {
      timestamp: ahoraTs,
      tipo: tipoRegistro
    };
    
    // Actualizar caché local
    window.ingresosCBTis.unshift(registro);
    if (window.ingresosCBTis.length > 200) window.ingresosCBTis.pop();

    // 5. MEJORA: Lógica 'Salida sin Entrada' (Verificación asíncrona no bloqueante)
    if (tipoRegistro === "Salida") {
       verificarEntradaPrevia(identificador, fechaLocal).then(tieneEntrada => {
         if (!tieneEntrada) console.warn("⚠️ Salida registrada sin entrada previa hoy.");
       });
    }

    // 6. UI y Feedback
    reproducirBeep("success");
    actualizarAviso(`✅ ${tipoRegistro} exitoso: ${registro.nombre}`, "success");
    
    // Mostrar el Overlay Premium
    mostrarOverlayIngresoSalida(registro);

    // Hook opcional para historial administrativo
    if (typeof agregarHistorialAdmin === "function") {
      agregarHistorialAdmin({ nombreCompleto: registro.nombre, tipo: registro.tipoPersona, accion: tipoRegistro });
    }

    return registro;

  } catch (err) {
    console.error("❌ Error en registrarIngresoCBTis:", err);
    reproducirBeep("error");
    actualizarAviso("❌ Error al guardar registro. Verifica tu conexión.", "error");
  }
}

// Función auxiliar para verificar entrada (No bloqueante)
async function verificarEntradaPrevia(id, fecha) {
  try {
    const snap = await db.collection("ingresos_cbtis")
      .where("identificador", "==", id)
      .where("fecha", "==", fecha)
      .where("tipoRegistro", "==", "Ingreso")
      .limit(1)
      .get();
    return !snap.empty;
  } catch (e) { return true; } // Si falla, asumimos true para no alarmar
}

/* -------------------------
   Overlay visual (UI Tactile Glass)
   ------------------------- */
(function(){
  // Frases dinámicas
  const frasesIngreso = [
    "Hoy es un gran día para aprender algo nuevo 🌟",
    "Bienvenido: que tu curiosidad te guíe hoy 🚀",
    "Tu talento transforma el aula — hazlo brillar 💫",
    "Aporta, pregunta, crece. ¡Qué tengas excelente clase!",
    "El éxito es la suma de pequeños esfuerzos 📚"
  ];
  const frasesSalida = [
    "Que tengas una tarde excelente — descansa y recarga ⚡",
    "Buen trabajo hoy, mañana será otra oportunidad ✨",
    "Gracias por tu asistencia — ¡nos vemos pronto! 👋",
    "Descansa bien y sigue aprendiendo cada día.",
    "El esfuerzo de hoy es el éxito de mañana 🌙"
  ];

  // MEJORA: Selector de voz más robusto
  function obtenerVozPreferida() {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    
    // Prioridad: Voces en español de Google o Microsoft (suelen ser mejores)
    const prioridades = ['Google español', 'Microsoft Sabina', 'Mexico', 'Spanish', 'es-MX', 'es-ES'];
    
    for (const pref of prioridades) {
      const found = voices.find(v => v.name.includes(pref) || v.lang.includes(pref));
      if (found) return found;
    }
    return voices.find(v => v.lang.startsWith('es')) || voices[0];
  }

  // Función principal del Overlay
  window.mostrarOverlayIngresoSalida = function(registro = {}, opts = {}) {
    const duration = opts.duration || 7000; // Tiempo visible
    const vozActiva = (typeof opts.voz === 'boolean') ? opts.voz : true;
    const logoCBTis = opts.logoCBTis || 'assets/CBTIS501.png'; // Placeholder
    
    // Callback al cerrar
    const onClose = typeof opts.onClose === 'function' ? opts.onClose : null;

    // Limpieza previa
    const prev = document.getElementById("overlay-ingreso");
    if (prev) prev.remove();

    // Crear elemento
    const ov = document.createElement("div");
    ov.id = "overlay-ingreso"; // ID vinculado al CSS Tactile Glass
    ov.setAttribute('role','dialog');

    // Datos
    const tipoReg = (registro.tipoRegistro || 'Ingreso');
    const esSalida = tipoReg.toLowerCase().includes('salida');
    const name = registro.nombre || 'Usuario';
    const role = registro.tipoPersona || 'Estudiante';
    const iden = registro.identificador || '';
    const aula = registro.aula || 'Campus';
    
    // Fecha/Hora
    const d = new Date();
    const horaTxt = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Frase aleatoria
    const frasePool = esSalida ? frasesSalida : frasesIngreso;
    const frase = frasePool[Math.floor(Math.random() * frasePool.length)];
    const saludo = esSalida ? "¡Hasta pronto!" : "¡Bienvenido!";

    // Imagen por defecto (Avatar genérico si no hay foto real)
    const avatarUrl = registro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=38bdf8&color=fff&size=128`;

    // MEJORA: Estructura HTML coincidente con CSS Tactile Glass
    ov.innerHTML = `
      <div class="ov-left">
        <img src="${avatarUrl}" alt="Avatar" onerror="this.src='assets/default-user.png'">
      </div>
      <div class="ov-body">
        <div class="ov-greet">${saludo}</div>
        <div class="ov-name">${name}</div>
        <div class="ov-meta">
          <span class="badge">${role}</span>
          <span>• ${iden}</span>
          <span>• ${aula}</span>
        </div>
        <div class="ov-quote">"${frase}"</div>
        <div class="ov-actions">
          <button id="ov-btn-close" style="background: rgba(255,255,255,0.1); color: #94a3b8;">Cerrar</button>
          <button id="ov-btn-ok" class="ov-ok">${esSalida ? '¡Nos vemos!' : '¡Adelante!'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);

    // Animación de entrada (necesita un pequeño delay para activar transición CSS)
    requestAnimationFrame(()=> {
      ov.classList.add('show');
    });

    // Lógica de cierre
    function cerrar(reason = 'auto') {
      ov.classList.remove('show');
      setTimeout(()=> {
        try { ov.remove(); } catch(e){}
        if (onClose) onClose(reason);
      }, 400); // Coincide con transición CSS
    }

    ov.querySelector('#ov-btn-close').addEventListener('click', ()=> cerrar('manual'));
    ov.querySelector('#ov-btn-ok').addEventListener('click', ()=> cerrar('ok'));

    // Auto-cierre
    const timeoutId = setTimeout(()=> cerrar('auto'), duration);

    // MEJORA: Lógica de Voz (TTS) protegida
    if (vozActiva && 'speechSynthesis' in window) {
      const speak = () => {
        try {
          // Cancelar lecturas anteriores
          speechSynthesis.cancel(); 
          
          const texto = esSalida 
            ? `Hasta luego ${name.split(' ')[0]}. ${frase}` 
            : `Bienvenido ${name.split(' ')[0]}. ${frase}`;

          const ut = new SpeechSynthesisUtterance(texto);
          const voz = obtenerVozPreferida();
          if (voz) ut.voice = voz;
          
          ut.rate = 1.0; // Velocidad normal
          ut.pitch = 1.05; // Tono ligeramente amable
          ut.volume = 1.0;
          
          speechSynthesis.speak(ut);
        } catch(e) {
          console.warn("Error TTS:", e);
        }
      };
      
      // A veces las voces no cargan inmediatamente en Chrome
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = speak;
      } else {
        speak();
      }
    }

    return { close: () => { clearTimeout(timeoutId); cerrar('programmatic'); } };
  };
})();

/* -------------------------
   Exportar EXCEL (Mejorado con filtro Timezone)
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnExportar = document.getElementById("btnExportarAccesos");
  const inputFecha = document.getElementById("filtroFechaAccesos");

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      const fecha = inputFecha ? inputFecha.value : '';
      exportarAccesosCBTisExcel(fecha);
    });
  }
});

async function exportarAccesosCBTisExcel(fechaFiltro = '') {
  try {
    let q = db.collection('ingresos_cbtis').orderBy('timestamp', 'desc');

    // Filtro de fecha respetando zona horaria local
    if (fechaFiltro) {
      // Crear fechas inicio y fin en hora local
      const inicio = new Date(`${fechaFiltro}T00:00:00`);
      const fin = new Date(`${fechaFiltro}T23:59:59`);
      
      // Firestore necesita ISO String, pero ajustado a la zona horaria
      q = db.collection('ingresos_cbtis')
        .where('timestamp', '>=', inicio.toISOString())
        .where('timestamp', '<=', fin.toISOString())
        .orderBy('timestamp', 'desc');
    }

    const snap = await q.get();
    if (snap.empty) {
      actualizarAviso("⚠️ No hay registros para exportar en este periodo", "warning");
      return;
    }

    const registros = snap.docs.map(doc => doc.data());

    // Agrupación inteligente
    const grupos = {
      alumnosIngreso: registros.filter(r => r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Ingreso"),
      alumnosSalida: registros.filter(r => r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Salida"),
      profIngreso: registros.filter(r => !r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Ingreso"),
      profSalida: registros.filter(r => !r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Salida")
    };

    const wb = XLSX.utils.book_new();

    function crearHoja(datos, titulo) {
      if (!datos.length) return null;
      const data = datos.map(d => ({
        "Nombre": d.nombre,
        "ID / Control": d.identificador,
        "Rol": d.tipoPersona,
        "Fecha": d.fecha,
        "Hora": d.hora,
        "Aula": d.aula || "N/A",
        "Modo": d.modo
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      // Ajuste automático de anchos (básico)
      const wscols = Object.keys(data[0]).map(k => ({wch: 20}));
      ws['!cols'] = wscols;
      return ws;
    }

    const hojas = [
      ["Alumnos Entrada", grupos.alumnosIngreso],
      ["Alumnos Salida", grupos.alumnosSalida],
      ["Personal Entrada", grupos.profIngreso],
      ["Personal Salida", grupos.profSalida]
    ];

    let exportado = false;
    hojas.forEach(([nombre, data]) => {
      const ws = crearHoja(data);
      if (ws) {
        XLSX.utils.book_append_sheet(wb, ws, nombre);
        exportado = true;
      }
    });

    if (!exportado) {
      actualizarAviso("⚠️ Datos encontrados pero no clasificables", "warning");
      return;
    }

    const fileName = `Reporte_Accesos_${fechaFiltro || "Total"}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    actualizarAviso("✅ Reporte Excel generado correctamente", "success");

  } catch (err) {
    console.error("Error Exportar:", err);
    actualizarAviso("❌ Error al generar Excel", "error");
  }
}

/* -------------------------
   Inicialización Global
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnCBTis = document.getElementById("btnPanelCBTis");
  if (btnCBTis) {
    btnCBTis.addEventListener("click", () => InitPanelCBTis());
  }
});

function InitPanelCBTis() {
  initPanelCBTis();
  console.log("🚀 Sistema CBTis Access V2 Loaded");
}

// ========================
// 🔹 FUNCIONES NUEVAS - MEJORAS KIOSCO
// ========================

/**
 * Carga estadísticas en tiempo real del kiosco
 */
async function cargarEstadisticasKiosco() {
  try {
    const hoy = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).split('/').reverse().join('-');
    
    const snapshot = await db.collection('ingresos_cbtis')
      .where('fecha', '==', hoy)
      .get();
    
    let ingresos = 0;
    let salidas = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.tipoRegistro === 'Ingreso') ingresos++;
      else if (data.tipoRegistro === 'Salida') salidas++;
    });
    
    // Actualizar UI
    const statIngresos = document.getElementById('kiosco-stat-ingresos');
    const statSalidas = document.getElementById('kiosco-stat-salidas');
    
    if (statIngresos) {
      statIngresos.textContent = ingresos;
      statIngresos.classList.add('scale-110');
      setTimeout(() => statIngresos.classList.remove('scale-110'), 200);
    }
    if (statSalidas) {
      statSalidas.textContent = salidas;
      statSalidas.classList.add('scale-110');
      setTimeout(() => statSalidas.classList.remove('scale-110'), 200);
    }
    
  } catch (error) {
    console.error('Error cargando estadísticas kiosco:', error);
  }
}

/**
 * Limpia la lista de registros del kiosco
 */
function limpiarListaKiosco() {
  const lista = document.getElementById('kiosco-lista-registros');
  const contador = document.getElementById('kiosco-contador');
  
  if (lista) {
    lista.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-slate-500">
        <span class="text-4xl mb-2">📋</span>
        <p class="text-center">Sin registros aún</p>
      </div>
    `;
  }
  
  if (contador) {
    contador.textContent = '0';
  }
}

/**
 * Actualiza el banner de éxito (reemplazo de kiosco-ultimo-reconocido)
 */
function mostrarExitoKiosco(usuario, modo) {
  const banner = document.getElementById('kiosco-banner-exito');
  const avatar = document.getElementById('kiosco-avatar');
  const nombre = document.getElementById('kiosco-nombre');
  const info = document.getElementById('kiosco-info');
  const hora = document.getElementById('kiosco-hora-registro');
  
  if (!banner) return;
  
  // Configurar contenido
  const iniciales = (usuario.nombre?.charAt(0) || '?') + (usuario.apellidos?.charAt(0) || '');
  const tipoTexto = usuario.tipo === 'Alumno' 
    ? `🎓 ${usuario.grado || ''}° ${usuario.grupo || ''} • ${usuario.control || ''}`
    : `👨‍🏫 Profesor • ${usuario.telefono || ''}`;
  
  if (avatar) avatar.textContent = iniciales.toUpperCase();
  if (nombre) nombre.textContent = `${usuario.nombre || ''} ${usuario.apellidos || ''}`;
  if (info) info.textContent = tipoTexto;
  if (hora) hora.textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  
  // Cambiar color según modo
  if (modo === 'Ingreso') {
    banner.className = 'fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-600 via-green-500 to-cyan-600 p-6 shadow-2xl';
  } else {
    banner.className = 'fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-600 via-pink-500 to-orange-600 p-6 shadow-2xl';
  }
  
  // Mostrar con animación
  banner.classList.remove('hidden');
  banner.style.transform = 'translateY(0)';
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.classList.add('hidden'), 500);
  }, 3000);
  
  // Actualizar estadísticas
  cargarEstadisticasKiosco();
}

// Exponer funciones (Legacy Support)
window.setModoCBTis = setModoCBTis;
window.initPanelCBTis = initPanelCBTis;
window.registrarIngresoCBTis = registrarIngresoCBTis;
window.exportarAccesosCBTisExcel = exportarAccesosCBTisExcel;
window.InitPanelCBTis = InitPanelCBTis;
window.cargarEstadisticasKiosco = cargarEstadisticasKiosco;
window.limpiarListaKiosco = limpiarListaKiosco;