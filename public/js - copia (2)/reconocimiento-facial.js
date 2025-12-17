// ========================================
// 🎭 SISTEMA DE RECONOCIMIENTO FACIAL
// Keyon Access v2.0
// Usando face-api.js
// ========================================

// Configuración
const FACIAL_CONFIG = {
  modelosPath: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
  umbralReconocimiento: 0.5, // Menor = más estricto (0.4-0.6 recomendado)
  fotosRegistro: 3, // Fotos para registrar cara
  tiempoEntreDetecciones: 1500, // ms entre detecciones para evitar spam
  mostrarLandmarks: true // Mostrar puntos faciales
};

// Estado global
let modelosCargados = false;
let cargandoModelos = false;
let streamActivo = null;
let detectandoCara = false;
let ultimaDeteccion = 0;
let descriptoresUsuarios = {}; // Cache local de descriptores

// ========================
// 🔧 INICIALIZACIÓN
// ========================

/**
 * Carga los modelos de face-api.js
 */
async function cargarModelosFaciales() {
  if (modelosCargados) return true;
  if (cargandoModelos) {
    // Esperar a que termine de cargar
    while (cargandoModelos) {
      await new Promise(r => setTimeout(r, 100));
    }
    return modelosCargados;
  }
  
  cargandoModelos = true;
  console.log('🎭 Cargando modelos de reconocimiento facial...');
  
  try {
    // Verificar que face-api esté disponible
    if (typeof faceapi === 'undefined') {
      throw new Error('face-api.js no está cargado');
    }
    
    // Cargar modelos necesarios
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACIAL_CONFIG.modelosPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACIAL_CONFIG.modelosPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACIAL_CONFIG.modelosPath),
      faceapi.nets.faceExpressionNet.loadFromUri(FACIAL_CONFIG.modelosPath)
    ]);
    
    modelosCargados = true;
    cargandoModelos = false;
    console.log('✅ Modelos faciales cargados correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error cargando modelos faciales:', error);
    cargandoModelos = false;
    mostrarNotificacion('❌ Error cargando reconocimiento facial', 'error');
    return false;
  }
}

// ========================
// 📸 REGISTRO DE CARA
// ========================

/**
 * Abre modal para registrar cara del usuario
 */
async function abrirRegistroFacial(usuario) {
  if (!usuario) {
    mostrarNotificacion('⚠️ No hay usuario seleccionado', 'warning');
    return;
  }
  
  // Cargar modelos si no están
  mostrarNotificacion('🎭 Preparando reconocimiento facial...', 'info');
  const cargado = await cargarModelosFaciales();
  if (!cargado) return;
  
  // Crear modal - IMPORTANTE: overflow-y-auto en el contenedor principal
  const modal = document.createElement('div');
  modal.id = 'modal-registro-facial';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; -webkit-overflow-scrolling:touch;';
  modal.innerHTML = `
    <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
      <!-- Header fijo visualmente -->
      <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
        <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9; display:flex; align-items:center; gap:8px;">
          🎭 Registro Facial
        </h3>
        <button onclick="cerrarRegistroFacial()" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <!-- Contenido -->
      <div style="max-width:400px; margin:0 auto; width:100%;">
        <div style="text-align:center; margin-bottom:16px; padding:12px; background:rgba(51,65,85,0.5); border-radius:12px;">
          <p style="font-size:14px; color:#94a3b8;">Registrando:</p>
          <p style="font-size:18px; font-weight:600; color:#22d3ee;">${usuario.nombre} ${usuario.apellidos || ''}</p>
          <p style="font-size:12px; color:#64748b;">${usuario.tipo} - ${usuario.control || usuario.telefono}</p>
        </div>
        
        <!-- Video -->
        <div style="position:relative; background:#000; border-radius:12px; overflow:hidden; margin-bottom:16px; aspect-ratio:4/3;">
          <video id="video-registro-facial" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
          <canvas id="canvas-registro-facial" style="position:absolute; inset:0; width:100%; height:100%;"></canvas>
          <div id="overlay-registro-facial" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5);">
            <div style="text-align:center; color:white;">
              <span style="font-size:32px; display:block; animation:pulse 2s infinite;">📷</span>
              <p style="margin-top:8px; font-size:14px;">Iniciando cámara...</p>
            </div>
          </div>
        </div>
        
        <!-- Indicador de fotos -->
        <div style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-size:14px; color:#94a3b8;">Fotos capturadas:</span>
            <span id="contador-fotos-facial" style="color:#22d3ee; font-weight:bold;">0 / ${FACIAL_CONFIG.fotosRegistro}</span>
          </div>
          <div id="preview-fotos-facial" style="display:flex; gap:8px;">
            ${Array(FACIAL_CONFIG.fotosRegistro).fill().map((_, i) => `
              <div id="preview-foto-${i}" style="flex:1; aspect-ratio:1; border-radius:8px; background:rgba(51,65,85,0.5); display:flex; align-items:center; justify-content:center;">
                <span style="font-size:20px; opacity:0.3;">📷</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Instrucciones -->
        <div id="instrucciones-facial" style="background:rgba(51,65,85,0.5); border-radius:12px; padding:16px; margin-bottom:16px;">
          <p style="font-size:14px; color:#94a3b8; text-align:center; line-height:1.6;">
            <span style="color:#22d3ee;">1.</span> Mira a la cámara<br>
            <span style="color:#22d3ee;">2.</span> Buena iluminación<br>
            <span style="color:#22d3ee;">3.</span> Presiona capturar cuando esté verde
          </p>
        </div>
        
        <!-- Botones -->
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <button onclick="capturarFotoRegistro()" id="btn-capturar-facial" disabled
                  style="flex:1; padding:14px; background:#06b6d4; border-radius:12px; border:none; color:white; font-weight:600; font-size:16px; cursor:pointer; opacity:0.5;">
            📸 Capturar
          </button>
          <button onclick="guardarRegistroFacial()" id="btn-guardar-facial"
                  style="flex:1; padding:14px; background:#10b981; border-radius:12px; border:none; color:white; font-weight:600; font-size:16px; cursor:pointer; display:none;">
            ✅ Guardar
          </button>
        </div>
        
        <!-- Botón cancelar -->
        <button onclick="cerrarRegistroFacial()" style="width:100%; padding:14px; background:rgba(51,65,85,0.8); border:1px solid rgba(100,116,139,0.3); border-radius:12px; color:#94a3b8; font-weight:500; font-size:16px; cursor:pointer; margin-bottom:20px;">
          ❌ Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
  
  // Guardar referencia del usuario
  window.__usuarioRegistroFacial = usuario;
  window.__fotosRegistroFacial = [];
  window.__descriptoresRegistroFacial = [];
  
  // Iniciar cámara
  await iniciarCamaraRegistro();
}

/**
 * Inicia la cámara para registro
 */
async function iniciarCamaraRegistro() {
  const video = document.getElementById('video-registro-facial');
  const overlay = document.getElementById('overlay-registro-facial');
  const btnCapturar = document.getElementById('btn-capturar-facial');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    
    video.srcObject = stream;
    streamActivo = stream;
    
    video.onloadedmetadata = () => {
      overlay.style.display = 'none';
      btnCapturar.disabled = false;
      btnCapturar.style.opacity = '1';
      btnCapturar.style.cursor = 'pointer';
      
      // Iniciar detección continua
      detectarCaraContinuo('video-registro-facial', 'canvas-registro-facial');
    };
    
  } catch (error) {
    console.error('Error accediendo a cámara:', error);
    overlay.innerHTML = `
      <div style="text-align:center; color:#f87171;">
        <span style="font-size:32px; display:block;">❌</span>
        <p style="margin-top:8px;">No se pudo acceder a la cámara</p>
        <p style="font-size:12px; margin-top:4px;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Detección continua de cara para feedback visual
 */
async function detectarCaraContinuo(videoId, canvasId) {
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  
  if (!video || !canvas || !streamActivo) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  
  const detectar = async () => {
    if (!streamActivo) return;
    
    try {
      const deteccion = await faceapi.detectSingleFace(video, opciones)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (deteccion) {
        // Dibujar recuadro
        const box = deteccion.detection.box;
        const color = '#10b981'; // Verde
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Dibujar landmarks si está habilitado
        if (FACIAL_CONFIG.mostrarLandmarks) {
          const landmarks = deteccion.landmarks;
          ctx.fillStyle = '#06b6d4';
          landmarks.positions.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        
        // Guardar último descriptor detectado
        window.__ultimoDescriptorDetectado = deteccion.descriptor;
        
        // Actualizar instrucciones
        const instrucciones = document.getElementById('instrucciones-facial');
        if (instrucciones) {
          instrucciones.innerHTML = `
            <p style="font-size:14px; color:#10b981; text-align:center; font-weight:500;">
              ✅ Cara detectada - ¡Listo para capturar!
            </p>
          `;
        }
      } else {
        window.__ultimoDescriptorDetectado = null;
        
        const instrucciones = document.getElementById('instrucciones-facial');
        if (instrucciones) {
          instrucciones.innerHTML = `
            <p style="font-size:14px; color:#fbbf24; text-align:center;">
              ⚠️ No se detecta cara - Acércate y mira a la cámara
            </p>
          `;
        }
      }
    } catch (e) {
      console.warn('Error en detección:', e);
    }
    
    // Continuar detectando
    if (streamActivo) {
      requestAnimationFrame(detectar);
    }
  };
  
  detectar();
}

/**
 * Captura una foto para registro
 */
async function capturarFotoRegistro() {
  if (!window.__ultimoDescriptorDetectado) {
    mostrarNotificacion('⚠️ No se detecta cara, acércate a la cámara', 'warning');
    return;
  }
  
  const video = document.getElementById('video-registro-facial');
  const fotosActuales = window.__fotosRegistroFacial.length;
  
  if (fotosActuales >= FACIAL_CONFIG.fotosRegistro) {
    mostrarNotificacion('✅ Ya tienes todas las fotos necesarias', 'info');
    return;
  }
  
  // Capturar frame del video
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const fotoData = tempCanvas.toDataURL('image/jpeg', 0.8);
  
  // Guardar foto y descriptor
  window.__fotosRegistroFacial.push(fotoData);
  window.__descriptoresRegistroFacial.push(Array.from(window.__ultimoDescriptorDetectado));
  
  // Actualizar preview
  const previewDiv = document.getElementById(`preview-foto-${fotosActuales}`);
  if (previewDiv) {
    previewDiv.innerHTML = `<img src="${fotoData}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
  }
  
  // Actualizar contador
  const contador = document.getElementById('contador-fotos-facial');
  contador.textContent = `${fotosActuales + 1} / ${FACIAL_CONFIG.fotosRegistro}`;
  
  // Beep de confirmación
  if (typeof reproducirBeep === 'function') reproducirBeep('success');
  
  // Mostrar botón guardar si ya tiene todas
  if (fotosActuales + 1 >= FACIAL_CONFIG.fotosRegistro) {
    document.getElementById('btn-capturar-facial').style.display = 'none';
    document.getElementById('btn-guardar-facial').style.display = 'block';
    mostrarNotificacion('✅ Fotos completas, puedes guardar', 'success');
  }
}

/**
 * Guarda el registro facial en Firebase
 */
async function guardarRegistroFacial() {
  const usuario = window.__usuarioRegistroFacial;
  const descriptores = window.__descriptoresRegistroFacial;
  
  if (!usuario || descriptores.length < FACIAL_CONFIG.fotosRegistro) {
    mostrarNotificacion('⚠️ Faltan fotos por capturar', 'warning');
    return;
  }
  
  const btnGuardar = document.getElementById('btn-guardar-facial');
  btnGuardar.disabled = true;
  btnGuardar.innerHTML = '<span class="animate-spin">⏳</span> Guardando...';
  
  try {
    // Calcular descriptor promedio (más robusto)
    const descriptorPromedio = calcularDescriptorPromedio(descriptores);
    
    // Determinar ID y colección
    const usuarioId = usuario.control || usuario.telefono;
    const coleccion = usuario.tipo === 'Alumno' ? 'alumnos' : 'profesores';
    
    // Guardar en Firebase
    await db.collection(coleccion).doc(usuarioId).update({
      reconocimientoFacial: {
        activo: true,
        descriptor: descriptorPromedio,
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
        numFotos: descriptores.length
      }
    });
    
    // También guardar en usuarios si existe
    try {
      await db.collection('usuarios').doc(usuarioId).update({
        reconocimientoFacial: {
          activo: true,
          descriptor: descriptorPromedio,
          fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
    } catch (e) {
      // Ignorar si no existe en usuarios
    }
    
    mostrarNotificacion('✅ Reconocimiento facial registrado correctamente', 'success');
    cerrarRegistroFacial();
    
  } catch (error) {
    console.error('Error guardando registro facial:', error);
    mostrarNotificacion('❌ Error guardando: ' + error.message, 'error');
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = '💾 Guardar';
  }
}

/**
 * Calcula el descriptor promedio de varias fotos
 */
function calcularDescriptorPromedio(descriptores) {
  if (descriptores.length === 0) return null;
  if (descriptores.length === 1) return descriptores[0];
  
  const longitud = descriptores[0].length;
  const promedio = new Array(longitud).fill(0);
  
  descriptores.forEach(desc => {
    desc.forEach((val, i) => {
      promedio[i] += val;
    });
  });
  
  return promedio.map(val => val / descriptores.length);
}

/**
 * Cierra el modal de registro
 */
function cerrarRegistroFacial() {
  // Detener cámara
  if (streamActivo) {
    streamActivo.getTracks().forEach(track => track.stop());
    streamActivo = null;
  }
  
  // Limpiar variables
  window.__usuarioRegistroFacial = null;
  window.__fotosRegistroFacial = [];
  window.__descriptoresRegistroFacial = [];
  window.__ultimoDescriptorDetectado = null;
  
  // Restaurar scroll del body
  document.body.style.overflow = '';
  
  // Remover modal
  const modal = document.getElementById('modal-registro-facial');
  if (modal) modal.remove();
}

// ========================
// 🔍 RECONOCIMIENTO / LOGIN
// ========================

/**
 * Inicia el modo de reconocimiento facial para asistencia
 */
async function iniciarReconocimientoFacial(modo = 'asistencia') {
  // Cargar modelos
  mostrarNotificacion('🎭 Iniciando reconocimiento facial...', 'info');
  const cargado = await cargarModelosFaciales();
  if (!cargado) return;
  
  // Cargar descriptores de usuarios
  await cargarDescriptoresUsuarios();
  
  // Verificar si hay usuarios registrados
  const totalUsuarios = Object.keys(descriptoresUsuarios).length;
  if (totalUsuarios === 0) {
    mostrarNotificacion('⚠️ No hay usuarios con reconocimiento facial registrado', 'warning');
  }
  
  // Información de clase activa
  let infoClase = '';
  if (modo === 'asistencia') {
    if (window.claseActiva && window.claseActiva.estado === 'En curso') {
      const numAlumnos = Object.keys(window.claseActiva.alumnos || {}).length;
      infoClase = `
        <div style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:12px; margin-bottom:16px;">
          <p style="color:#10b981; font-weight:500;">✅ Clase activa</p>
          <p style="font-size:12px; color:#94a3b8;">Profesor: ${window.claseActiva.profesor?.nombre || '-'}</p>
          <p style="font-size:12px; color:#94a3b8;">Alumnos registrados: ${numAlumnos}</p>
        </div>
      `;
    } else {
      infoClase = `
        <div style="background:rgba(234,179,8,0.2); border:1px solid rgba(234,179,8,0.3); border-radius:12px; padding:12px; margin-bottom:16px;">
          <p style="color:#fbbf24; font-weight:500;">⚠️ No hay clase activa</p>
          <p style="font-size:12px; color:#94a3b8;">Un profesor debe iniciar la clase primero</p>
        </div>
      `;
    }
  }
  
  // Crear overlay de reconocimiento - CON SCROLL
  const overlay = document.createElement('div');
  overlay.id = 'overlay-reconocimiento-facial';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; -webkit-overflow-scrolling:touch;';
  overlay.innerHTML = `
    <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
      <!-- Header fijo -->
      <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
        <div>
          <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9; display:flex; align-items:center; gap:8px;">
            🎭 Reconocimiento Facial
          </h3>
          <span style="font-size:12px; color:#94a3b8;">${modo === 'cbtis' ? 'Entrada/Salida CBTis' : 'Asistencia en Clase'}</span>
        </div>
        <button onclick="detenerReconocimientoFacial()" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <!-- Contenido -->
      <div style="max-width:600px; margin:0 auto; width:100%;">
        <!-- Info de clase -->
        ${infoClase}
        
        <!-- Contador de usuarios -->
        <div style="background:rgba(51,65,85,0.5); border-radius:12px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:14px; color:#94a3b8;">👥 Usuarios con facial registrado:</span>
          <span style="color:#22d3ee; font-weight:bold;">${totalUsuarios}</span>
        </div>
        
        <!-- Video -->
        <div style="position:relative; background:#000; border-radius:16px; overflow:hidden; margin-bottom:16px; aspect-ratio:4/3;">
          <video id="video-reconocimiento" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
          <canvas id="canvas-reconocimiento" style="position:absolute; inset:0; width:100%; height:100%;"></canvas>
          
          <!-- Estado -->
          <div id="estado-reconocimiento" style="position:absolute; bottom:16px; left:16px; right:16px; background:rgba(0,0,0,0.7); border-radius:12px; padding:12px; text-align:center;">
            <p style="color:white;">📷 Iniciando cámara...</p>
          </div>
        </div>
        
        <!-- Último reconocido -->
        <div id="ultimo-reconocido" style="display:none; background:rgba(30,41,59,0.8); backdrop-filter:blur(10px); border:1px solid rgba(99,102,241,0.2); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="avatar-reconocido" style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg, #10b981, #06b6d4); display:flex; align-items:center; justify-content:center; color:white; font-size:24px; font-weight:bold;">?</div>
            <div style="flex:1;">
              <p id="nombre-reconocido" style="font-size:18px; font-weight:600; color:white;">-</p>
              <p id="info-reconocido" style="color:#94a3b8;">-</p>
            </div>
            <div style="text-align:right;">
              <span style="color:#10b981; font-size:28px;">✅</span>
              <p id="hora-reconocido" style="font-size:12px; color:#94a3b8;">-</p>
            </div>
          </div>
        </div>
        
        <!-- Historial de reconocidos -->
        <div id="historial-reconocidos" style="display:none; background:rgba(30,41,59,0.8); backdrop-filter:blur(10px); border:1px solid rgba(99,102,241,0.2); border-radius:12px; padding:16px; margin-bottom:16px; max-height:150px; overflow-y:auto;">
          <p style="font-size:14px; color:#94a3b8; margin-bottom:8px;">📋 Registrados en esta sesión:</p>
          <div id="lista-reconocidos" style="display:flex; flex-direction:column; gap:4px; font-size:14px;"></div>
        </div>
        
        <!-- Botón alternar a QR -->
        <button onclick="detenerReconocimientoFacial(); if(typeof activarModoCamara === 'function') activarModoCamara();" 
                style="width:100%; padding:14px; background:rgba(51,65,85,0.8); border:1px solid rgba(100,116,139,0.3); border-radius:12px; color:#94a3b8; font-weight:500; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:16px;">
          📱 Cambiar a escáner QR
        </button>
        
        <!-- Botón cancelar -->
        <button onclick="detenerReconocimientoFacial()" style="width:100%; padding:14px; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.3); border-radius:12px; color:#f87171; font-weight:500; font-size:16px; cursor:pointer; margin-bottom:20px;">
          ❌ Cerrar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  // Guardar modo y limpiar historial
  window.__modoReconocimiento = modo;
  window.__historialReconocidos = [];
  
  // Iniciar cámara
  await iniciarCamaraReconocimiento();
}

/**
 * Carga los descriptores de usuarios desde Firebase
 */
async function cargarDescriptoresUsuarios() {
  console.log('📂 Cargando descriptores de usuarios...');
  descriptoresUsuarios = {};
  
  try {
    // Cargar alumnos con reconocimiento facial
    const alumnosSnap = await db.collection('alumnos')
      .where('reconocimientoFacial.activo', '==', true)
      .get();
    
    alumnosSnap.forEach(doc => {
      const data = doc.data();
      if (data.reconocimientoFacial?.descriptor) {
        descriptoresUsuarios[doc.id] = {
          descriptor: new Float32Array(data.reconocimientoFacial.descriptor),
          nombre: data.nombre,
          apellidos: data.apellidos || '',
          tipo: 'Alumno',
          control: data.control,
          grado: data.grado || ''
        };
      }
    });
    
    // Cargar profesores con reconocimiento facial
    const profesoresSnap = await db.collection('profesores')
      .where('reconocimientoFacial.activo', '==', true)
      .get();
    
    profesoresSnap.forEach(doc => {
      const data = doc.data();
      if (data.reconocimientoFacial?.descriptor) {
        descriptoresUsuarios[doc.id] = {
          descriptor: new Float32Array(data.reconocimientoFacial.descriptor),
          nombre: data.nombre,
          apellidos: data.apellidos || '',
          tipo: 'Profesor',
          telefono: data.telefono,
          materias: data.materias || ''
        };
      }
    });
    
    const total = Object.keys(descriptoresUsuarios).length;
    console.log(`✅ ${total} usuarios con reconocimiento facial cargados`);
    
  } catch (error) {
    console.error('Error cargando descriptores:', error);
  }
}

/**
 * Inicia cámara para reconocimiento
 */
async function iniciarCamaraReconocimiento() {
  const video = document.getElementById('video-reconocimiento');
  const estado = document.getElementById('estado-reconocimiento');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    
    video.srcObject = stream;
    streamActivo = stream;
    
    video.onloadedmetadata = () => {
      estado.innerHTML = '<p class="text-accent">🔍 Buscando caras...</p>';
      detectarYReconocer();
    };
    
  } catch (error) {
    console.error('Error accediendo a cámara:', error);
    estado.innerHTML = `<p class="text-red-400">❌ ${error.message}</p>`;
  }
}

/**
 * Loop de detección y reconocimiento
 */
async function detectarYReconocer() {
  const video = document.getElementById('video-reconocimiento');
  const canvas = document.getElementById('canvas-reconocimiento');
  const estado = document.getElementById('estado-reconocimiento');
  
  if (!video || !canvas || !streamActivo) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  
  const reconocer = async () => {
    if (!streamActivo) return;
    
    try {
      const deteccion = await faceapi.detectSingleFace(video, opciones)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (deteccion) {
        const box = deteccion.detection.box;
        
        // Buscar coincidencia
        const resultado = buscarCoincidencia(deteccion.descriptor);
        
        if (resultado) {
          // ✅ Usuario reconocido
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Verificar tiempo desde última detección
          const ahora = Date.now();
          if (ahora - ultimaDeteccion > FACIAL_CONFIG.tiempoEntreDetecciones) {
            ultimaDeteccion = ahora;
            await procesarUsuarioReconocido(resultado);
          }
          
          estado.innerHTML = `<p class="text-success">✅ ${resultado.nombre} reconocido</p>`;
          
        } else {
          // ❓ Cara detectada pero no reconocida
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          estado.innerHTML = '<p class="text-yellow-400">❓ Cara no registrada</p>';
        }
        
      } else {
        estado.innerHTML = '<p class="text-text-muted">🔍 Buscando caras...</p>';
      }
      
    } catch (e) {
      console.warn('Error en reconocimiento:', e);
    }
    
    // Continuar
    if (streamActivo) {
      requestAnimationFrame(reconocer);
    }
  };
  
  reconocer();
}

/**
 * Busca coincidencia en descriptores cargados
 */
function buscarCoincidencia(descriptorDetectado) {
  let mejorCoincidencia = null;
  let menorDistancia = FACIAL_CONFIG.umbralReconocimiento;
  
  for (const [id, usuario] of Object.entries(descriptoresUsuarios)) {
    const distancia = faceapi.euclideanDistance(descriptorDetectado, usuario.descriptor);
    
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      mejorCoincidencia = { id, ...usuario, distancia };
    }
  }
  
  return mejorCoincidencia;
}

// Cache de usuarios ya escaneados en esta sesión
window.__usuariosYaEscaneados = window.__usuariosYaEscaneados || {};

/**
 * Verifica si el usuario ya fue escaneado en esta sesión
 */
function usuarioYaEscaneado(usuario) {
  const id = usuario.control || usuario.telefono || usuario.id;
  return window.__usuariosYaEscaneados[id] === true;
}

/**
 * Marca usuario como escaneado
 */
function marcarUsuarioEscaneado(usuario) {
  const id = usuario.control || usuario.telefono || usuario.id;
  window.__usuariosYaEscaneados[id] = true;
}

/**
 * Limpia la lista de usuarios escaneados (al iniciar nueva sesión/clase)
 */
function limpiarUsuariosEscaneados() {
  window.__usuariosYaEscaneados = {};
}

/**
 * Procesa usuario reconocido
 */
async function procesarUsuarioReconocido(usuario) {
  console.log('✅ Usuario reconocido:', usuario);
  
  // ========== VERIFICAR SI YA FUE ESCANEADO ==========
  const modo = window.__modoReconocimiento || 'asistencia';
  
  // Solo validar duplicados en modo asistencia para alumnos
  if (modo === 'asistencia' && usuario.tipo === 'Alumno') {
    if (usuarioYaEscaneado(usuario)) {
      // Usuario ya escaneado - mostrar mensaje
      if (typeof reproducirBeep === 'function') reproducirBeep('warning');
      
      mostrarNotificacion(`⚠️ ${usuario.nombre} ya fue registrado en esta clase`, 'warning');
      
      // Actualizar estado en overlay
      const estado = document.getElementById('estado-reconocimiento');
      if (estado) {
        estado.innerHTML = `<p class="text-yellow-400">⚠️ ${usuario.nombre} ya está registrado</p>`;
      }
      
      // Mostrar en UI del último reconocido con indicador diferente
      const ultimoDiv = document.getElementById('ultimo-reconocido');
      if (ultimoDiv) {
        ultimoDiv.style.display = 'block';
        ultimoDiv.style.borderColor = 'rgba(234, 179, 8, 0.5)';
        ultimoDiv.style.borderWidth = '2px';
        document.getElementById('avatar-reconocido').textContent = usuario.nombre.charAt(0);
        document.getElementById('nombre-reconocido').textContent = `${usuario.nombre} ${usuario.apellidos || ''}`;
        document.getElementById('info-reconocido').textContent = '⚠️ YA REGISTRADO';
        document.getElementById('hora-reconocido').textContent = new Date().toLocaleTimeString();
      }
      
      return; // No procesar de nuevo
    }
  }
  
  // ========== PROCESAR USUARIO NUEVO ==========
  
  // Beep de éxito
  if (typeof reproducirBeep === 'function') reproducirBeep('success');
  
  // Actualizar UI del overlay
  const ultimoDiv = document.getElementById('ultimo-reconocido');
  if (ultimoDiv) {
    ultimoDiv.style.display = 'block';
    ultimoDiv.style.borderColor = 'rgba(99, 102, 241, 0.2)';
    ultimoDiv.style.borderWidth = '1px';
    document.getElementById('avatar-reconocido').textContent = usuario.nombre.charAt(0);
    document.getElementById('nombre-reconocido').textContent = `${usuario.nombre} ${usuario.apellidos || ''}`;
    document.getElementById('info-reconocido').textContent = 
      usuario.tipo === 'Alumno' ? `${usuario.tipo} - ${usuario.grado}` : `${usuario.tipo}`;
    document.getElementById('hora-reconocido').textContent = new Date().toLocaleTimeString();
  }
  
  // Agregar al historial de la sesión
  agregarAlHistorialReconocidos(usuario);
  
  // Crear objeto usuario completo
  const usuarioCompleto = {
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    tipo: usuario.tipo,
    control: usuario.control || '',
    telefono: usuario.telefono || '',
    grado: usuario.grado || '',
    materias: usuario.materias || ''
  };
  
  if (modo === 'cbtis' && typeof registrarIngresoCBTis === 'function') {
    // Modo entrada/salida escuela
    await registrarIngresoCBTis(usuarioCompleto, window.modoCBTis || 'Ingreso', 'Facial');
    mostrarNotificacion(`✅ ${usuario.nombre} - ${window.modoCBTis || 'Ingreso'} registrado`, 'success');
    
  } else if (modo === 'asistencia') {
    // Modo asistencia en clase
    
    if (usuario.tipo === 'Profesor') {
      // PROFESOR: Iniciar clase
      console.log('👨‍🏫 Profesor reconocido, iniciando clase...');
      
      // Limpiar usuarios escaneados al iniciar nueva clase
      limpiarUsuariosEscaneados();
      
      window.profesorRegistrado = usuarioCompleto;
      
      if (typeof iniciarSesionClase === 'function') {
        await iniciarSesionClase(usuarioCompleto);
        mostrarNotificacion(`👨‍🏫 Clase iniciada por ${usuario.nombre}`, 'success');
        
        // Actualizar estado en el overlay
        const estado = document.getElementById('estado-reconocimiento');
        if (estado) {
          estado.innerHTML = `
            <p class="text-success font-medium">👨‍🏫 Clase iniciada</p>
            <p class="text-xs text-text-muted mt-1">Ahora los alumnos pueden registrarse</p>
          `;
        }
      }
      
      if (typeof actualizarAviso === 'function') {
        actualizarAviso(`👨‍🏫 Bienvenido ${usuario.nombre}. Clase iniciada.`, 'success');
      }
      
    } else if (usuario.tipo === 'Alumno') {
      // ALUMNO: Registrar en clase
      
      // Verificar que haya clase activa
      if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
        mostrarNotificacion('⚠️ No hay clase activa. El profesor debe iniciar primero.', 'warning');
        
        const estado = document.getElementById('estado-reconocimiento');
        if (estado) {
          estado.innerHTML = `<p class="text-yellow-400">⚠️ No hay clase activa</p>`;
        }
        return;
      }
      
      console.log('🎓 Alumno reconocido, registrando en clase...');
      
      if (typeof registrarEventoAlumnoEnSesion === 'function') {
        await registrarEventoAlumnoEnSesion(usuarioCompleto, 'entrada');
        
        // ✅ MARCAR COMO YA ESCANEADO
        marcarUsuarioEscaneado(usuario);
        
        mostrarNotificacion(`✅ ${usuario.nombre} registrado en clase`, 'success');
        
        // Mostrar en mini overlay si existe
        if (typeof mostrarMiniAlumno === 'function') {
          mostrarMiniAlumno(`${usuario.nombre} ${usuario.apellidos} (${new Date().toLocaleTimeString()}) 🎭`);
        }
      } else if (typeof procesarUsuarioEscaneado === 'function') {
        // Fallback al procesador general
        await procesarUsuarioEscaneado(usuarioCompleto);
        
        // ✅ MARCAR COMO YA ESCANEADO
        marcarUsuarioEscaneado(usuario);
      }
      
      if (typeof actualizarAviso === 'function') {
        actualizarAviso(`✅ ${usuario.nombre} registrado`, 'success');
      }
    }
  }
}

/**
 * Agrega usuario al historial de reconocidos en la sesión actual
 */
function agregarAlHistorialReconocidos(usuario) {
  if (!window.__historialReconocidos) {
    window.__historialReconocidos = [];
  }
  
  // Verificar si ya está en el historial
  const yaRegistrado = window.__historialReconocidos.find(u => 
    (u.control && u.control === usuario.control) || 
    (u.telefono && u.telefono === usuario.telefono)
  );
  
  if (!yaRegistrado) {
    window.__historialReconocidos.push({
      ...usuario,
      hora: new Date().toLocaleTimeString()
    });
  }
  
  // Actualizar UI del historial
  const historialDiv = document.getElementById('historial-reconocidos');
  const listaDiv = document.getElementById('lista-reconocidos');
  
  if (historialDiv && listaDiv && window.__historialReconocidos.length > 0) {
    historialDiv.style.display = 'block';
    
    listaDiv.innerHTML = window.__historialReconocidos.map(u => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(100,116,139,0.2);">
        <span style="color:#f1f5f9;">${u.tipo === 'Profesor' ? '👨‍🏫' : '🎓'} ${u.nombre} ${u.apellidos || ''}</span>
        <span style="font-size:12px; color:#94a3b8;">${u.hora}</span>
      </div>
    `).join('');
  }
}

/**
 * Detiene el reconocimiento facial
 */
function detenerReconocimientoFacial() {
  // Detener cámara
  if (streamActivo) {
    streamActivo.getTracks().forEach(track => track.stop());
    streamActivo = null;
  }
  
  // Restaurar scroll del body
  document.body.style.overflow = '';
  
  // Remover overlay
  const overlay = document.getElementById('overlay-reconocimiento-facial');
  if (overlay) overlay.remove();
  
  window.__modoReconocimiento = null;
}

// ========================
// 🔧 UTILIDADES
// ========================

/**
 * Verifica si un usuario tiene reconocimiento facial activo
 */
async function tieneReconocimientoFacial(usuarioId, tipo = 'Alumno') {
  try {
    const coleccion = tipo === 'Alumno' ? 'alumnos' : 'profesores';
    const doc = await db.collection(coleccion).doc(usuarioId).get();
    
    if (doc.exists) {
      const data = doc.data();
      return data.reconocimientoFacial?.activo === true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Elimina el registro facial de un usuario
 */
async function eliminarRegistroFacial(usuarioId, tipo = 'Alumno') {
  try {
    const coleccion = tipo === 'Alumno' ? 'alumnos' : 'profesores';
    await db.collection(coleccion).doc(usuarioId).update({
      reconocimientoFacial: firebase.firestore.FieldValue.delete()
    });
    
    mostrarNotificacion('✅ Registro facial eliminado', 'success');
    return true;
  } catch (error) {
    console.error('Error eliminando registro facial:', error);
    mostrarNotificacion('❌ Error eliminando registro', 'error');
    return false;
  }
}

// ========================
// 🔹 EXPORTS
// ========================
window.cargarModelosFaciales = cargarModelosFaciales;
window.abrirRegistroFacial = abrirRegistroFacial;
window.cerrarRegistroFacial = cerrarRegistroFacial;
window.capturarFotoRegistro = capturarFotoRegistro;
window.guardarRegistroFacial = guardarRegistroFacial;
window.iniciarReconocimientoFacial = iniciarReconocimientoFacial;
window.detenerReconocimientoFacial = detenerReconocimientoFacial;
window.tieneReconocimientoFacial = tieneReconocimientoFacial;
window.limpiarUsuariosEscaneados = limpiarUsuariosEscaneados;
window.eliminarRegistroFacial = eliminarRegistroFacial;

// Funciones helper para el usuario actual
window.registrarMiCara = function() {
  const usuario = window.usuarioActual;
  if (!usuario) {
    mostrarNotificacion('⚠️ Debes iniciar sesión primero', 'warning');
    return;
  }
  abrirRegistroFacial(usuario);
};

window.registrarCaraProfesor = function() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Profesor') {
    mostrarNotificacion('⚠️ Debes iniciar sesión como profesor', 'warning');
    return;
  }
  abrirRegistroFacial(usuario);
};

window.eliminarMiCara = async function() {
  const usuario = window.usuarioActual;
  if (!usuario) return;
  
  if (confirm('¿Estás seguro de eliminar tu registro facial?')) {
    const id = usuario.control || usuario.telefono;
    await eliminarRegistroFacial(id, usuario.tipo);
    actualizarEstadoFacialUI();
  }
};

// Actualizar UI del estado facial
window.actualizarEstadoFacialUI = async function() {
  const usuario = window.usuarioActual;
  if (!usuario) return;
  
  const id = usuario.control || usuario.telefono;
  const tiene = await tieneReconocimientoFacial(id, usuario.tipo);
  
  // Para alumno
  const textoEl = document.getElementById('facial-estado-texto');
  const btnRegistrar = document.getElementById('btn-registrar-cara');
  const btnEliminar = document.getElementById('btn-eliminar-cara');
  
  if (textoEl) {
    if (tiene) {
      textoEl.textContent = '✅ Registrado';
      textoEl.className = 'text-sm text-success';
    } else {
      textoEl.textContent = '⚠️ No registrado';
      textoEl.className = 'text-sm text-yellow-400';
    }
  }
  
  if (btnRegistrar) {
    btnRegistrar.textContent = tiene ? '🔄 Actualizar registro' : '📸 Registrar mi cara';
  }
  
  if (btnEliminar) {
    btnEliminar.classList.toggle('hidden', !tiene);
  }
  
  // Para profesor
  const estadoProfesor = document.getElementById('facial-estado-profesor');
  const btnProfesor = document.getElementById('btn-registrar-cara-profesor');
  
  if (estadoProfesor) {
    if (tiene) {
      estadoProfesor.textContent = '✅ Registrado';
      estadoProfesor.className = 'text-sm text-success';
    } else {
      estadoProfesor.textContent = '⚠️ No registrado';
      estadoProfesor.className = 'text-sm text-yellow-400';
    }
  }
  
  if (btnProfesor) {
    btnProfesor.innerHTML = tiene 
      ? '🔄 Actualizar registro' 
      : '📸 Registrar mi cara';
  }
};

// Auto-actualizar cuando se abre configuración (alumno o profesor)
document.addEventListener('DOMContentLoaded', () => {
  // Observer para config alumno
  const configSection = document.getElementById('config-alumno');
  if (configSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !configSection.classList.contains('hidden')) {
          actualizarEstadoFacialUI();
        }
      });
    });
    observer.observe(configSection, { attributes: true });
  }
  
  // Observer para generador QR profesor (donde está el botón de facial)
  const qrProfesor = document.getElementById('generador-qr-profesor');
  if (qrProfesor) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !qrProfesor.classList.contains('hidden')) {
          actualizarEstadoFacialUI();
        }
      });
    });
    observer.observe(qrProfesor, { attributes: true });
  }
});

console.log('🎭 Sistema de Reconocimiento Facial cargado');

// ========================
// 🎓 FUNCIONES PARA ALUMNO (VERIFICACIÓN)
// ========================

/**
 * Actualiza la UI de estado facial para ALUMNO (nuevo sistema)
 */
window.actualizarEstadoFacialAlumno = async function() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') return;
  
  const usuarioId = usuario.control || usuario.id;
  
  try {
    const doc = await db.collection('alumnos').doc(usuarioId).get();
    
    const iconoEstado = document.getElementById('facial-icono-estado');
    const textoEstado = document.getElementById('facial-estado-texto');
    const infoRegistro = document.getElementById('facial-info-registro');
    const btnVerificar = document.getElementById('btn-verificar-cara');
    const msgVerificado = document.getElementById('facial-verificado-msg');
    const msgSinRegistro = document.getElementById('facial-sin-registro-msg');
    
    // Ocultar todo primero
    if (infoRegistro) infoRegistro.classList.add('hidden');
    if (btnVerificar) btnVerificar.classList.add('hidden');
    if (msgVerificado) msgVerificado.classList.add('hidden');
    if (msgSinRegistro) msgSinRegistro.classList.add('hidden');
    
    if (!doc.exists || !doc.data().reconocimientoFacial?.activo) {
      // Sin registro
      if (iconoEstado) iconoEstado.textContent = '❌';
      if (textoEstado) {
        textoEstado.textContent = 'Sin registro facial';
        textoEstado.style.color = '#f87171';
      }
      if (msgSinRegistro) msgSinRegistro.classList.remove('hidden');
      return;
    }
    
    const facial = doc.data().reconocimientoFacial;
    
    // Mostrar info del registro
    if (infoRegistro) {
      infoRegistro.classList.remove('hidden');
      const regPor = document.getElementById('facial-registrado-por');
      const fechaReg = document.getElementById('facial-fecha-registro');
      const fechaVer = document.getElementById('facial-fecha-verificacion');
      
      if (regPor) regPor.textContent = facial.registradoPor || 'Admin';
      if (fechaReg) fechaReg.textContent = facial.fechaRegistro?.toDate?.()?.toLocaleDateString('es-MX') || '-';
      if (fechaVer) fechaVer.textContent = facial.fechaVerificacion?.toDate?.()?.toLocaleDateString('es-MX') || 'Pendiente';
    }
    
    if (facial.verificado) {
      // Verificado
      if (iconoEstado) iconoEstado.textContent = '✅';
      if (textoEstado) {
        textoEstado.textContent = 'Registro verificado';
        textoEstado.style.color = '#10b981';
      }
      if (msgVerificado) msgVerificado.classList.remove('hidden');
    } else {
      // Pendiente verificación
      if (iconoEstado) iconoEstado.textContent = '⏳';
      if (textoEstado) {
        textoEstado.textContent = 'Pendiente verificación';
        textoEstado.style.color = '#fbbf24';
      }
      if (btnVerificar) btnVerificar.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error verificando estado facial alumno:', error);
  }
};

/**
 * Verificación facial del alumno
 */
window.verificarMiRegistroFacial = async function() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') {
    mostrarNotificacion('⚠️ Solo alumnos pueden verificar su registro', 'warning');
    return;
  }
  
  mostrarNotificacion('🎭 Preparando verificación...', 'info');
  const cargado = await cargarModelosFaciales();
  if (!cargado) return;
  
  const usuarioId = usuario.control || usuario.id;
  const doc = await db.collection('alumnos').doc(usuarioId).get();
  
  if (!doc.exists || !doc.data().reconocimientoFacial?.descriptor) {
    mostrarNotificacion('❌ No hay registro facial para verificar', 'error');
    return;
  }
  
  const descriptorGuardado = new Float32Array(doc.data().reconocimientoFacial.descriptor);
  
  const modal = document.createElement('div');
  modal.id = 'modal-verificar-facial';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto;';
  modal.innerHTML = `
    <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
      <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
        <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9;">✅ Verificar mi Registro</h3>
        <button onclick="cerrarVerificacionFacial()" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer;">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="max-width:400px; margin:0 auto; width:100%;">
        <div style="background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); border-radius:12px; padding:16px; margin-bottom:16px; text-align:center;">
          <p style="color:#94a3b8; font-size:14px;">Mira a la cámara para verificar que eres tú.</p>
        </div>
        
        <div style="position:relative; background:#000; border-radius:16px; overflow:hidden; margin-bottom:16px; aspect-ratio:4/3;">
          <video id="video-verificar-facial" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
          <canvas id="canvas-verificar-facial" style="position:absolute; inset:0; width:100%; height:100%;"></canvas>
          <div id="overlay-verificar-facial" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7);">
            <div style="text-align:center; color:white;">
              <span style="font-size:40px; display:block;">📷</span>
              <p style="margin-top:8px;">Iniciando cámara...</p>
            </div>
          </div>
        </div>
        
        <div id="estado-verificacion" style="background:rgba(51,65,85,0.5); border-radius:12px; padding:16px; margin-bottom:16px; text-align:center;">
          <p style="color:#94a3b8; font-size:14px;">Esperando detección...</p>
        </div>
        
        <button onclick="cerrarVerificacionFacial()" style="width:100%; padding:14px; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.3); border-radius:12px; color:#f87171; font-weight:500; cursor:pointer;">
          ❌ Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  window.__descriptorVerificar = descriptorGuardado;
  window.__usuarioVerificar = usuario;
  
  // Iniciar cámara
  try {
    const video = document.getElementById('video-verificar-facial');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    
    video.srcObject = stream;
    window.__streamVerificar = stream;
    
    video.onloadedmetadata = () => {
      document.getElementById('overlay-verificar-facial').style.display = 'none';
      loopVerificacion();
    };
  } catch (error) {
    console.error('Error cámara:', error);
    document.getElementById('overlay-verificar-facial').innerHTML = `
      <div style="text-align:center; color:#f87171;">
        <span style="font-size:40px;">❌</span>
        <p>Error accediendo a la cámara</p>
      </div>
    `;
  }
};

/**
 * Loop de verificación
 */
async function loopVerificacion() {
  const video = document.getElementById('video-verificar-facial');
  const canvas = document.getElementById('canvas-verificar-facial');
  const estadoDiv = document.getElementById('estado-verificacion');
  
  if (!video || !canvas || !window.__streamVerificar) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  
  const detectar = async () => {
    if (!window.__streamVerificar) return;
    
    try {
      const deteccion = await faceapi.detectSingleFace(video, opciones)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (deteccion) {
        const box = deteccion.detection.box;
        const distancia = faceapi.euclideanDistance(deteccion.descriptor, window.__descriptorVerificar);
        const coincide = distancia < FACIAL_CONFIG.umbralReconocimiento;
        
        ctx.strokeStyle = coincide ? '#10b981' : '#f87171';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        if (coincide) {
          // ¡Verificación exitosa!
          if (typeof reproducirBeep === 'function') reproducirBeep('success');
          
          estadoDiv.innerHTML = `
            <p style="color:#10b981; font-size:16px; font-weight:600;">✅ ¡Verificación exitosa!</p>
            <p style="color:#94a3b8; font-size:12px;">Guardando...</p>
          `;
          
          // Guardar verificación
          const usuarioId = window.__usuarioVerificar.control || window.__usuarioVerificar.id;
          await db.collection('alumnos').doc(usuarioId).update({
            'reconocimientoFacial.verificado': true,
            'reconocimientoFacial.fechaVerificacion': firebase.firestore.FieldValue.serverTimestamp()
          });
          
          await db.collection('logs_facial').add({
            tipo: 'verificacion',
            alumnoId: usuarioId,
            alumnoNombre: `${window.__usuarioVerificar.nombre} ${window.__usuarioVerificar.apellidos || ''}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          mostrarNotificacion('✅ ¡Registro facial verificado!', 'success');
          
          setTimeout(() => {
            cerrarVerificacionFacial();
            actualizarEstadoFacialAlumno();
          }, 1500);
          
          return; // Detener loop
        } else {
          estadoDiv.innerHTML = `
            <p style="color:#fbbf24; font-size:14px;">⚠️ Cara detectada pero no coincide</p>
            <p style="color:#94a3b8; font-size:12px;">Asegúrate de ser la misma persona registrada</p>
          `;
        }
      } else {
        estadoDiv.innerHTML = `<p style="color:#94a3b8; font-size:14px;">🔍 Buscando cara...</p>`;
      }
    } catch (e) {
      console.error('Error detección:', e);
    }
    
    if (window.__streamVerificar) {
      requestAnimationFrame(detectar);
    }
  };
  
  detectar();
}

/**
 * Cierra modal de verificación
 */
window.cerrarVerificacionFacial = function() {
  if (window.__streamVerificar) {
    window.__streamVerificar.getTracks().forEach(track => track.stop());
    window.__streamVerificar = null;
  }
  
  window.__descriptorVerificar = null;
  window.__usuarioVerificar = null;
  
  document.body.style.overflow = '';
  document.getElementById('modal-verificar-facial')?.remove();
};

// Auto-actualizar cuando se abre config-alumno
document.addEventListener('DOMContentLoaded', () => {
  const configSection = document.getElementById('config-alumno');
  if (configSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !configSection.classList.contains('hidden')) {
          if (window.usuarioActual?.tipo === 'Alumno') {
            actualizarEstadoFacialAlumno();
          }
        }
      });
    });
    observer.observe(configSection, { attributes: true });
  }
});
