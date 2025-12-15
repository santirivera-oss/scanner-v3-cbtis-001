// ========================================
// 🎭 GESTIÓN DE RECONOCIMIENTO FACIAL - ADMIN
// Keyon Access v2.5
// ========================================

// Estado del módulo
let registrosFaciales = [];
let paginaActualFacial = 0;
const REGISTROS_POR_PAGINA = 15;

// ========================
// 📊 CARGAR ESTADÍSTICAS
// ========================

/**
 * Carga las estadísticas de reconocimiento facial
 */
async function cargarEstadisticasFaciales() {
  try {
    const alumnosSnap = await db.collection('alumnos').get();
    
    let total = 0;
    let verificados = 0;
    let pendientes = 0;
    
    alumnosSnap.forEach(doc => {
      const data = doc.data();
      if (data.reconocimientoFacial?.activo) {
        total++;
        if (data.reconocimientoFacial.verificado) {
          verificados++;
        } else {
          pendientes++;
        }
      }
    });
    
    // Contar usos de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const usosSnap = await db.collection('logs_facial')
      .where('timestamp', '>=', hoy)
      .get();
    
    const usosHoy = usosSnap.size;
    
    // Actualizar UI
    document.getElementById('facial-stat-total').textContent = total;
    document.getElementById('facial-stat-verificados').textContent = verificados;
    document.getElementById('facial-stat-pendientes').textContent = pendientes;
    document.getElementById('facial-stat-usos-hoy').textContent = usosHoy;
    
  } catch (error) {
    console.error('Error cargando estadísticas faciales:', error);
  }
}

// ========================
// 📋 CARGAR REGISTROS
// ========================

/**
 * Carga la lista de registros faciales
 */
async function cargarRegistrosFaciales() {
  const tabla = document.getElementById('tabla-registros-faciales');
  tabla.innerHTML = `
    <tr>
      <td colspan="7" class="p-8 text-center text-text-muted">
        <span class="text-4xl block mb-2 animate-spin">🔄</span>
        Cargando registros...
      </td>
    </tr>
  `;
  
  try {
    const busqueda = document.getElementById('facial-buscar').value.toLowerCase();
    const filtroEstado = document.getElementById('facial-filtro-estado').value;
    
    const alumnosSnap = await db.collection('alumnos').get();
    
    registrosFaciales = [];
    
    alumnosSnap.forEach(doc => {
      const data = doc.data();
      const tieneFacial = data.reconocimientoFacial?.activo || false;
      const verificado = data.reconocimientoFacial?.verificado || false;
      
      // Determinar estado
      let estado = 'sin-registro';
      if (tieneFacial && verificado) {
        estado = 'verificado';
      } else if (tieneFacial && !verificado) {
        estado = 'pendiente';
      }
      
      // Filtrar por estado
      if (filtroEstado !== 'todos' && filtroEstado !== estado) {
        return;
      }
      
      // Filtrar por búsqueda
      const nombreCompleto = `${data.nombre} ${data.apellidos || ''}`.toLowerCase();
      const control = (data.control || doc.id).toLowerCase();
      
      if (busqueda && !nombreCompleto.includes(busqueda) && !control.includes(busqueda)) {
        return;
      }
      
      registrosFaciales.push({
        id: doc.id,
        nombre: data.nombre,
        apellidos: data.apellidos || '',
        control: data.control || doc.id,
        grado: data.grado || '-',
        grupo: data.grupo || '-',
        estado: estado,
        fechaRegistro: data.reconocimientoFacial?.fechaRegistro?.toDate?.() || null,
        fechaVerificacion: data.reconocimientoFacial?.fechaVerificacion?.toDate?.() || null,
        registradoPor: data.reconocimientoFacial?.registradoPor || null,
        numFotos: data.reconocimientoFacial?.numFotos || 0
      });
    });
    
    // Ordenar: pendientes primero, luego verificados, luego sin registro
    registrosFaciales.sort((a, b) => {
      const orden = { 'pendiente': 0, 'verificado': 1, 'sin-registro': 2 };
      return orden[a.estado] - orden[b.estado];
    });
    
    // Renderizar
    renderizarTablaFaciales();
    cargarEstadisticasFaciales();
    
  } catch (error) {
    console.error('Error cargando registros faciales:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-red-400">
          <span class="text-4xl block mb-2">❌</span>
          Error cargando registros: ${error.message}
        </td>
      </tr>
    `;
  }
}

/**
 * Renderiza la tabla de registros faciales
 */
function renderizarTablaFaciales() {
  const tabla = document.getElementById('tabla-registros-faciales');
  const inicio = paginaActualFacial * REGISTROS_POR_PAGINA;
  const fin = inicio + REGISTROS_POR_PAGINA;
  const registrosPagina = registrosFaciales.slice(inicio, fin);
  
  if (registrosPagina.length === 0) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-text-muted">
          <span class="text-4xl block mb-2">📭</span>
          No se encontraron registros
        </td>
      </tr>
    `;
    return;
  }
  
  tabla.innerHTML = registrosPagina.map(r => {
    const estadoBadge = {
      'verificado': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">✅ Verificado</span>',
      'pendiente': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">⏳ Pendiente</span>',
      'sin-registro': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">❌ Sin registro</span>'
    };
    
    const fechaRegistro = r.fechaRegistro 
      ? r.fechaRegistro.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
    
    const fechaVerificacion = r.fechaVerificacion
      ? r.fechaVerificacion.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
    
    return `
      <tr class="hover:bg-surface-light/30 transition-colors">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
              ${r.nombre.charAt(0)}
            </div>
            <div>
              <p class="font-medium text-text-main">${r.nombre} ${r.apellidos}</p>
            </div>
          </div>
        </td>
        <td class="p-4 text-text-muted">${r.control}</td>
        <td class="p-4 text-text-muted">${r.grado}° ${r.grupo}</td>
        <td class="p-4">${estadoBadge[r.estado]}</td>
        <td class="p-4 text-text-muted text-sm">${fechaRegistro}</td>
        <td class="p-4 text-text-muted text-sm">${fechaVerificacion}</td>
        <td class="p-4">
          <div class="flex items-center justify-center gap-2">
            ${r.estado === 'sin-registro' ? `
              <button onclick="registrarFacialAlumno('${r.id}')" class="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all" title="Registrar">
                📸
              </button>
            ` : ''}
            ${r.estado !== 'sin-registro' ? `
              <button onclick="verDetalleFacial('${r.id}')" class="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all" title="Ver detalles">
                👁️
              </button>
              <button onclick="editarFacial('${r.id}')" class="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all" title="Editar">
                ✏️
              </button>
              <button onclick="eliminarFacial('${r.id}')" class="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all" title="Eliminar">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  // Actualizar info de paginación
  const totalPaginas = Math.ceil(registrosFaciales.length / REGISTROS_POR_PAGINA);
  document.getElementById('facial-info-paginacion').textContent = 
    `Mostrando ${inicio + 1}-${Math.min(fin, registrosFaciales.length)} de ${registrosFaciales.length} registros`;
  
  document.getElementById('btn-facial-anterior').disabled = paginaActualFacial === 0;
  document.getElementById('btn-facial-siguiente').disabled = paginaActualFacial >= totalPaginas - 1;
}

/**
 * Página anterior
 */
function paginaAnteriorFacial() {
  if (paginaActualFacial > 0) {
    paginaActualFacial--;
    renderizarTablaFaciales();
  }
}

/**
 * Página siguiente
 */
function paginaSiguienteFacial() {
  const totalPaginas = Math.ceil(registrosFaciales.length / REGISTROS_POR_PAGINA);
  if (paginaActualFacial < totalPaginas - 1) {
    paginaActualFacial++;
    renderizarTablaFaciales();
  }
}

// ========================
// 📸 REGISTRO FACIAL (ADMIN)
// ========================

/**
 * Abre modal para seleccionar alumno y registrar facial
 */
async function abrirRegistroFacialAdmin() {
  // Crear modal de selección de alumno
  const modal = document.createElement('div');
  modal.id = 'modal-seleccionar-alumno-facial';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; -webkit-overflow-scrolling:touch;';
  modal.innerHTML = `
    <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
      <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
        <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9;">
          📸 Nuevo Registro Facial
        </h3>
        <button onclick="cerrarModalSeleccionAlumno()" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer;">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="max-width:500px; margin:0 auto; width:100%;">
        <div style="background:rgba(51,65,85,0.5); border-radius:12px; padding:16px; margin-bottom:16px;">
          <p style="color:#94a3b8; font-size:14px; margin-bottom:12px;">Buscar alumno sin registro facial:</p>
          <input type="text" id="buscar-alumno-facial" placeholder="🔍 Nombre o número de control..."
                 style="width:100%; padding:12px; border-radius:8px; background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.3); color:#f1f5f9; font-size:14px;"
                 oninput="buscarAlumnoParaFacial(this.value)">
        </div>
        
        <div id="lista-alumnos-sin-facial" style="max-height:400px; overflow-y:auto;">
          <div style="text-align:center; padding:32px; color:#94a3b8;">
            <span style="font-size:32px; display:block; margin-bottom:8px;">🔍</span>
            Escribe para buscar alumnos
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Focus en el input
  setTimeout(() => {
    document.getElementById('buscar-alumno-facial')?.focus();
  }, 100);
}

/**
 * Cierra modal de selección de alumno
 */
function cerrarModalSeleccionAlumno() {
  document.body.style.overflow = '';
  document.getElementById('modal-seleccionar-alumno-facial')?.remove();
}

/**
 * Busca alumnos sin registro facial
 */
async function buscarAlumnoParaFacial(termino) {
  const lista = document.getElementById('lista-alumnos-sin-facial');
  
  if (termino.length < 2) {
    lista.innerHTML = `
      <div style="text-align:center; padding:32px; color:#94a3b8;">
        <span style="font-size:32px; display:block; margin-bottom:8px;">🔍</span>
        Escribe al menos 2 caracteres
      </div>
    `;
    return;
  }
  
  lista.innerHTML = `
    <div style="text-align:center; padding:32px; color:#94a3b8;">
      <span style="font-size:32px; display:block; margin-bottom:8px; animation: spin 1s linear infinite;">🔄</span>
      Buscando...
    </div>
  `;
  
  try {
    const alumnosSnap = await db.collection('alumnos').get();
    const resultados = [];
    
    alumnosSnap.forEach(doc => {
      const data = doc.data();
      const nombreCompleto = `${data.nombre} ${data.apellidos || ''}`.toLowerCase();
      const control = (data.control || doc.id).toLowerCase();
      
      if (nombreCompleto.includes(termino.toLowerCase()) || control.includes(termino.toLowerCase())) {
        // Solo mostrar los que NO tienen registro o tienen registro pendiente
        const tieneFacial = data.reconocimientoFacial?.activo || false;
        
        resultados.push({
          id: doc.id,
          nombre: data.nombre,
          apellidos: data.apellidos || '',
          control: data.control || doc.id,
          grado: data.grado || '-',
          grupo: data.grupo || '-',
          tieneFacial: tieneFacial,
          verificado: data.reconocimientoFacial?.verificado || false
        });
      }
    });
    
    if (resultados.length === 0) {
      lista.innerHTML = `
        <div style="text-align:center; padding:32px; color:#94a3b8;">
          <span style="font-size:32px; display:block; margin-bottom:8px;">📭</span>
          No se encontraron alumnos
        </div>
      `;
      return;
    }
    
    lista.innerHTML = resultados.map(a => {
      let estadoText = '';
      let estadoColor = '';
      let boton = '';
      
      if (!a.tieneFacial) {
        estadoText = 'Sin registro';
        estadoColor = '#f87171';
        boton = `<button onclick="registrarFacialAlumno('${a.id}')" style="padding:8px 16px; background:linear-gradient(135deg, #06b6d4, #3b82f6); border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer;">📸 Registrar</button>`;
      } else if (!a.verificado) {
        estadoText = 'Pendiente verificación';
        estadoColor = '#fbbf24';
        boton = `<button onclick="reRegistrarFacialAlumno('${a.id}')" style="padding:8px 16px; background:rgba(251,191,36,0.2); border:1px solid rgba(251,191,36,0.3); border-radius:8px; color:#fbbf24; font-weight:600; cursor:pointer;">🔄 Re-registrar</button>`;
      } else {
        estadoText = 'Verificado';
        estadoColor = '#10b981';
        boton = `<button onclick="reRegistrarFacialAlumno('${a.id}')" style="padding:8px 16px; background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.3); border-radius:8px; color:#10b981; font-weight:600; cursor:pointer;">🔄 Re-registrar</button>`;
      }
      
      return `
        <div style="background:rgba(30,41,59,0.8); border:1px solid rgba(99,102,241,0.2); border-radius:12px; padding:16px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #3b82f6); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:18px;">
              ${a.nombre.charAt(0)}
            </div>
            <div>
              <p style="color:#f1f5f9; font-weight:600;">${a.nombre} ${a.apellidos}</p>
              <p style="color:#94a3b8; font-size:12px;">${a.control} • ${a.grado}° ${a.grupo}</p>
              <p style="color:${estadoColor}; font-size:11px; margin-top:2px;">🎭 ${estadoText}</p>
            </div>
          </div>
          ${boton}
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error buscando alumnos:', error);
    lista.innerHTML = `
      <div style="text-align:center; padding:32px; color:#f87171;">
        <span style="font-size:32px; display:block; margin-bottom:8px;">❌</span>
        Error: ${error.message}
      </div>
    `;
  }
}

/**
 * Registra facial de un alumno específico
 */
async function registrarFacialAlumno(alumnoId) {
  cerrarModalSeleccionAlumno();
  
  try {
    // Cargar datos del alumno
    const alumnoDoc = await db.collection('alumnos').doc(alumnoId).get();
    if (!alumnoDoc.exists) {
      mostrarNotificacion('❌ Alumno no encontrado', 'error');
      return;
    }
    
    const alumno = alumnoDoc.data();
    alumno.id = alumnoId;
    alumno.tipo = 'Alumno';
    
    // Abrir registro facial con el alumno
    abrirRegistroFacialAdmin_Captura(alumno);
    
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('❌ Error cargando alumno', 'error');
  }
}

/**
 * Re-registra facial de un alumno
 */
async function reRegistrarFacialAlumno(alumnoId) {
  if (!confirm('¿Deseas sobrescribir el registro facial existente?')) {
    return;
  }
  registrarFacialAlumno(alumnoId);
}

/**
 * Modal de captura para admin
 */
async function abrirRegistroFacialAdmin_Captura(alumno) {
  // Cargar modelos
  mostrarNotificacion('🎭 Preparando reconocimiento facial...', 'info');
  const cargado = await cargarModelosFaciales();
  if (!cargado) return;
  
  // Variables de captura
  window.__adminRegistroFacial = {
    alumno: alumno,
    fotos: [],
    descriptores: []
  };
  
  const modal = document.createElement('div');
  modal.id = 'modal-registro-facial-admin';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; -webkit-overflow-scrolling:touch;';
  modal.innerHTML = `
    <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
      <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
        <div>
          <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9;">📸 Registro Facial (Admin)</h3>
          <p style="font-size:12px; color:#94a3b8;">Capturando para: ${alumno.nombre} ${alumno.apellidos || ''}</p>
        </div>
        <button onclick="cerrarRegistroFacialAdmin()" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer;">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div style="max-width:450px; margin:0 auto; width:100%;">
        <!-- Info del alumno -->
        <div style="background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); border-radius:12px; padding:16px; margin-bottom:16px; text-align:center;">
          <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #3b82f6); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:24px; margin:0 auto 12px;">
            ${alumno.nombre.charAt(0)}
          </div>
          <p style="color:#f1f5f9; font-weight:600; font-size:18px;">${alumno.nombre} ${alumno.apellidos || ''}</p>
          <p style="color:#94a3b8; font-size:14px;">${alumno.control || alumno.id} • ${alumno.grado || '-'}° ${alumno.grupo || '-'}</p>
        </div>
        
        <!-- Video -->
        <div style="position:relative; background:#000; border-radius:16px; overflow:hidden; margin-bottom:16px; aspect-ratio:4/3;">
          <video id="video-admin-facial" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
          <canvas id="canvas-admin-facial" style="position:absolute; inset:0; width:100%; height:100%;"></canvas>
          <div id="overlay-admin-facial" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7);">
            <div style="text-align:center; color:white;">
              <span style="font-size:40px; display:block; animation: pulse 2s infinite;">📷</span>
              <p style="margin-top:8px;">Iniciando cámara...</p>
            </div>
          </div>
        </div>
        
        <!-- Contador de fotos -->
        <div style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#94a3b8; font-size:14px;">Fotos capturadas:</span>
            <span id="contador-admin-facial" style="color:#22d3ee; font-weight:bold;">0 / 3</span>
          </div>
          <div id="preview-admin-facial" style="display:flex; gap:8px;">
            <div id="preview-admin-0" style="flex:1; aspect-ratio:1; border-radius:8px; background:rgba(51,65,85,0.5); display:flex; align-items:center; justify-content:center;">
              <span style="font-size:24px; opacity:0.3;">1️⃣</span>
            </div>
            <div id="preview-admin-1" style="flex:1; aspect-ratio:1; border-radius:8px; background:rgba(51,65,85,0.5); display:flex; align-items:center; justify-content:center;">
              <span style="font-size:24px; opacity:0.3;">2️⃣</span>
            </div>
            <div id="preview-admin-2" style="flex:1; aspect-ratio:1; border-radius:8px; background:rgba(51,65,85,0.5); display:flex; align-items:center; justify-content:center;">
              <span style="font-size:24px; opacity:0.3;">3️⃣</span>
            </div>
          </div>
        </div>
        
        <!-- Instrucciones -->
        <div id="instrucciones-admin-facial" style="background:rgba(51,65,85,0.5); border-radius:12px; padding:16px; margin-bottom:16px; text-align:center;">
          <p style="color:#94a3b8; font-size:14px; line-height:1.6;">
            <span style="color:#22d3ee;">1.</span> Pide al alumno que mire a la cámara<br>
            <span style="color:#22d3ee;">2.</span> Asegura buena iluminación<br>
            <span style="color:#22d3ee;">3.</span> Presiona capturar cuando esté verde
          </p>
        </div>
        
        <!-- Botones -->
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <button onclick="capturarFotoAdmin()" id="btn-capturar-admin" disabled
                  style="flex:1; padding:14px; background:#06b6d4; border-radius:12px; border:none; color:white; font-weight:600; font-size:16px; cursor:pointer; opacity:0.5;">
            📸 Capturar
          </button>
          <button onclick="guardarRegistroAdmin()" id="btn-guardar-admin"
                  style="flex:1; padding:14px; background:#10b981; border-radius:12px; border:none; color:white; font-weight:600; font-size:16px; cursor:pointer; display:none;">
            ✅ Guardar
          </button>
        </div>
        
        <button onclick="cerrarRegistroFacialAdmin()" style="width:100%; padding:14px; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.3); border-radius:12px; color:#f87171; font-weight:500; font-size:16px; cursor:pointer; margin-bottom:20px;">
          ❌ Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  
  // Iniciar cámara
  iniciarCamaraAdmin();
}

/**
 * Inicia cámara para registro admin
 */
async function iniciarCamaraAdmin() {
  const video = document.getElementById('video-admin-facial');
  const overlay = document.getElementById('overlay-admin-facial');
  const btnCapturar = document.getElementById('btn-capturar-admin');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    
    video.srcObject = stream;
    window.__streamAdminFacial = stream;
    
    video.onloadedmetadata = () => {
      overlay.style.display = 'none';
      btnCapturar.disabled = false;
      btnCapturar.style.opacity = '1';
      
      // Iniciar detección continua
      detectarCaraAdmin();
    };
    
  } catch (error) {
    console.error('Error accediendo a cámara:', error);
    overlay.innerHTML = `
      <div style="text-align:center; color:#f87171;">
        <span style="font-size:40px; display:block;">❌</span>
        <p style="margin-top:8px;">No se pudo acceder a la cámara</p>
        <p style="font-size:12px; margin-top:4px;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Detección continua para admin
 */
async function detectarCaraAdmin() {
  const video = document.getElementById('video-admin-facial');
  const canvas = document.getElementById('canvas-admin-facial');
  
  if (!video || !canvas || !window.__streamAdminFacial) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const opciones = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  
  const detectar = async () => {
    if (!window.__streamAdminFacial) return;
    
    try {
      const deteccion = await faceapi.detectSingleFace(video, opciones)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (deteccion) {
        const box = deteccion.detection.box;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        window.__ultimoDescriptorAdmin = deteccion.descriptor;
        
        const instrucciones = document.getElementById('instrucciones-admin-facial');
        if (instrucciones) {
          instrucciones.innerHTML = `
            <p style="font-size:14px; color:#10b981; text-align:center; font-weight:500;">
              ✅ Cara detectada - ¡Listo para capturar!
            </p>
          `;
        }
      } else {
        window.__ultimoDescriptorAdmin = null;
        
        const instrucciones = document.getElementById('instrucciones-admin-facial');
        if (instrucciones) {
          instrucciones.innerHTML = `
            <p style="font-size:14px; color:#fbbf24; text-align:center;">
              ⚠️ No se detecta cara - Acércate y mira a la cámara
            </p>
          `;
        }
      }
    } catch (e) {
      console.error('Error en detección:', e);
    }
    
    if (window.__streamAdminFacial) {
      requestAnimationFrame(detectar);
    }
  };
  
  detectar();
}

/**
 * Captura foto en modo admin
 */
function capturarFotoAdmin() {
  if (!window.__ultimoDescriptorAdmin) {
    mostrarNotificacion('⚠️ No se detecta cara', 'warning');
    return;
  }
  
  const data = window.__adminRegistroFacial;
  if (data.fotos.length >= 3) {
    mostrarNotificacion('✅ Ya tienes todas las fotos', 'info');
    return;
  }
  
  const video = document.getElementById('video-admin-facial');
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const fotoData = tempCanvas.toDataURL('image/jpeg', 0.8);
  
  data.fotos.push(fotoData);
  data.descriptores.push(Array.from(window.__ultimoDescriptorAdmin));
  
  // Actualizar preview
  const previewDiv = document.getElementById(`preview-admin-${data.fotos.length - 1}`);
  if (previewDiv) {
    previewDiv.innerHTML = `<img src="${fotoData}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
  }
  
  // Actualizar contador
  document.getElementById('contador-admin-facial').textContent = `${data.fotos.length} / 3`;
  
  // Beep
  if (typeof reproducirBeep === 'function') reproducirBeep('success');
  
  // Mostrar botón guardar si ya tiene todas
  if (data.fotos.length >= 3) {
    document.getElementById('btn-capturar-admin').style.display = 'none';
    document.getElementById('btn-guardar-admin').style.display = 'block';
    mostrarNotificacion('✅ Fotos completas, puedes guardar', 'success');
  }
}

/**
 * Guarda el registro facial (admin)
 */
async function guardarRegistroAdmin() {
  const data = window.__adminRegistroFacial;
  
  if (!data || data.descriptores.length < 3) {
    mostrarNotificacion('⚠️ Faltan fotos por capturar', 'warning');
    return;
  }
  
  const btnGuardar = document.getElementById('btn-guardar-admin');
  btnGuardar.disabled = true;
  btnGuardar.innerHTML = '⏳ Guardando...';
  
  try {
    // Calcular descriptor promedio
    const descriptorPromedio = calcularDescriptorPromedio(data.descriptores);
    
    const alumnoId = data.alumno.control || data.alumno.id;
    const adminActual = window.usuarioActual?.nombre || 'Admin';
    
    // Guardar en Firebase
    await db.collection('alumnos').doc(alumnoId).update({
      reconocimientoFacial: {
        activo: true,
        verificado: false, // Pendiente verificación del alumno
        descriptor: descriptorPromedio,
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
        registradoPor: adminActual,
        numFotos: data.descriptores.length
      }
    });
    
    // Log de registro
    await db.collection('logs_facial').add({
      tipo: 'registro_admin',
      alumnoId: alumnoId,
      alumnoNombre: `${data.alumno.nombre} ${data.alumno.apellidos || ''}`,
      registradoPor: adminActual,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarNotificacion('✅ Registro facial guardado - Pendiente verificación del alumno', 'success');
    cerrarRegistroFacialAdmin();
    cargarRegistrosFaciales();
    
  } catch (error) {
    console.error('Error guardando:', error);
    mostrarNotificacion('❌ Error: ' + error.message, 'error');
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = '✅ Guardar';
  }
}

/**
 * Cierra modal de registro admin
 */
function cerrarRegistroFacialAdmin() {
  if (window.__streamAdminFacial) {
    window.__streamAdminFacial.getTracks().forEach(track => track.stop());
    window.__streamAdminFacial = null;
  }
  
  window.__adminRegistroFacial = null;
  window.__ultimoDescriptorAdmin = null;
  
  document.body.style.overflow = '';
  document.getElementById('modal-registro-facial-admin')?.remove();
}

// ========================
// 👁️ VER DETALLE FACIAL
// ========================

/**
 * Muestra detalle de un registro facial
 */
async function verDetalleFacial(alumnoId) {
  try {
    const alumnoDoc = await db.collection('alumnos').doc(alumnoId).get();
    if (!alumnoDoc.exists) {
      mostrarNotificacion('❌ Alumno no encontrado', 'error');
      return;
    }
    
    const alumno = alumnoDoc.data();
    const facial = alumno.reconocimientoFacial || {};
    
    const fechaRegistro = facial.fechaRegistro?.toDate?.()?.toLocaleString('es-MX') || 'No disponible';
    const fechaVerificacion = facial.fechaVerificacion?.toDate?.()?.toLocaleString('es-MX') || 'No verificado';
    
    // Obtener logs de uso
    const logsSnap = await db.collection('logs_facial')
      .where('alumnoId', '==', alumnoId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    let logsHtml = '';
    if (logsSnap.empty) {
      logsHtml = '<p style="color:#94a3b8; text-align:center; padding:16px;">Sin registros de uso</p>';
    } else {
      logsHtml = logsSnap.docs.map(doc => {
        const log = doc.data();
        const fecha = log.timestamp?.toDate?.()?.toLocaleString('es-MX') || '-';
        const tipoIcono = {
          'registro_admin': '📸',
          'verificacion': '✅',
          'asistencia': '📋',
          'entrada_cbtis': '🏫',
          'salida_cbtis': '🚪'
        };
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid rgba(100,116,139,0.2);">
            <span style="font-size:20px;">${tipoIcono[log.tipo] || '📌'}</span>
            <div style="flex:1;">
              <p style="color:#f1f5f9; font-size:14px;">${log.tipo?.replace(/_/g, ' ') || 'Uso'}</p>
              <p style="color:#94a3b8; font-size:12px;">${fecha}</p>
            </div>
          </div>
        `;
      }).join('');
    }
    
    const modal = document.createElement('div');
    modal.id = 'modal-detalle-facial';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto; -webkit-overflow-scrolling:touch;';
    modal.innerHTML = `
      <div style="min-height:100%; padding:16px; display:flex; flex-direction:column;">
        <div style="background:rgba(30,41,59,0.95); border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10;">
          <h3 style="font-size:18px; font-weight:bold; color:#f1f5f9;">👁️ Detalle de Registro Facial</h3>
          <button onclick="this.closest('#modal-detalle-facial').remove(); document.body.style.overflow='';" style="padding:12px; background:#ef4444; border-radius:8px; border:none; cursor:pointer;">
            <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div style="max-width:500px; margin:0 auto; width:100%;">
          <!-- Info del alumno -->
          <div style="background:rgba(30,41,59,0.8); border:1px solid rgba(99,102,241,0.2); border-radius:16px; padding:20px; margin-bottom:16px; text-align:center;">
            <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #3b82f6); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:32px; margin:0 auto 16px;">
              ${alumno.nombre?.charAt(0) || '?'}
            </div>
            <h4 style="color:#f1f5f9; font-size:20px; font-weight:bold;">${alumno.nombre} ${alumno.apellidos || ''}</h4>
            <p style="color:#94a3b8;">${alumno.control || alumnoId} • ${alumno.grado || '-'}° ${alumno.grupo || '-'}</p>
            
            <div style="margin-top:16px; padding:12px; background:${facial.verificado ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)'}; border-radius:8px;">
              <span style="color:${facial.verificado ? '#10b981' : '#fbbf24'}; font-weight:600;">
                ${facial.verificado ? '✅ Verificado' : '⏳ Pendiente verificación'}
              </span>
            </div>
          </div>
          
          <!-- Datos del registro -->
          <div style="background:rgba(30,41,59,0.8); border:1px solid rgba(99,102,241,0.2); border-radius:16px; padding:20px; margin-bottom:16px;">
            <h5 style="color:#f1f5f9; font-weight:600; margin-bottom:16px;">📋 Datos del Registro</h5>
            <div style="display:grid; gap:12px;">
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(51,65,85,0.5); border-radius:8px;">
                <span style="color:#94a3b8;">Registrado por:</span>
                <span style="color:#f1f5f9; font-weight:500;">${facial.registradoPor || 'No disponible'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(51,65,85,0.5); border-radius:8px;">
                <span style="color:#94a3b8;">Fecha registro:</span>
                <span style="color:#f1f5f9; font-weight:500;">${fechaRegistro}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(51,65,85,0.5); border-radius:8px;">
                <span style="color:#94a3b8;">Verificación:</span>
                <span style="color:#f1f5f9; font-weight:500;">${fechaVerificacion}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(51,65,85,0.5); border-radius:8px;">
                <span style="color:#94a3b8;">Fotos capturadas:</span>
                <span style="color:#f1f5f9; font-weight:500;">${facial.numFotos || 0}</span>
              </div>
            </div>
          </div>
          
          <!-- Historial de uso -->
          <div style="background:rgba(30,41,59,0.8); border:1px solid rgba(99,102,241,0.2); border-radius:16px; padding:20px; margin-bottom:16px;">
            <h5 style="color:#f1f5f9; font-weight:600; margin-bottom:16px;">📊 Últimos Usos</h5>
            <div style="max-height:200px; overflow-y:auto;">
              ${logsHtml}
            </div>
          </div>
          
          <!-- Acciones -->
          <div style="display:flex; gap:12px;">
            <button onclick="editarFacial('${alumnoId}'); this.closest('#modal-detalle-facial').remove(); document.body.style.overflow='';" 
                    style="flex:1; padding:14px; background:rgba(251,191,36,0.2); border:1px solid rgba(251,191,36,0.3); border-radius:12px; color:#fbbf24; font-weight:600; cursor:pointer;">
              ✏️ Re-registrar
            </button>
            <button onclick="eliminarFacial('${alumnoId}'); this.closest('#modal-detalle-facial').remove(); document.body.style.overflow='';"
                    style="flex:1; padding:14px; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.3); border-radius:12px; color:#f87171; font-weight:600; cursor:pointer;">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('❌ Error cargando detalles', 'error');
  }
}

// ========================
// ✏️ EDITAR / ELIMINAR
// ========================

/**
 * Edita (re-registra) facial de un alumno
 */
function editarFacial(alumnoId) {
  reRegistrarFacialAlumno(alumnoId);
}

/**
 * Elimina el registro facial de un alumno
 */
async function eliminarFacial(alumnoId) {
  if (!confirm('⚠️ ¿Estás seguro de eliminar este registro facial?\n\nEl alumno deberá ser registrado nuevamente.')) {
    return;
  }
  
  try {
    await db.collection('alumnos').doc(alumnoId).update({
      reconocimientoFacial: firebase.firestore.FieldValue.delete()
    });
    
    // Log
    await db.collection('logs_facial').add({
      tipo: 'eliminacion',
      alumnoId: alumnoId,
      eliminadoPor: window.usuarioActual?.nombre || 'Admin',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    mostrarNotificacion('✅ Registro facial eliminado', 'success');
    cargarRegistrosFaciales();
    
  } catch (error) {
    console.error('Error eliminando:', error);
    mostrarNotificacion('❌ Error: ' + error.message, 'error');
  }
}

// ========================
// 🔄 INICIALIZACIÓN
// ========================

// Observer para cargar datos cuando la sección sea visible
const observerFacialAdmin = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'class') {
      const section = document.getElementById('gestion-facial-admin');
      if (section && !section.classList.contains('hidden')) {
        cargarRegistrosFaciales();
      }
    }
  });
});

// Iniciar observer cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('gestion-facial-admin');
  if (section) {
    observerFacialAdmin.observe(section, { attributes: true });
  }
  
  // Event listener para búsqueda
  const inputBuscar = document.getElementById('facial-buscar');
  if (inputBuscar) {
    inputBuscar.addEventListener('input', () => {
      paginaActualFacial = 0;
      cargarRegistrosFaciales();
    });
  }
  
  // Event listener para filtro
  const selectFiltro = document.getElementById('facial-filtro-estado');
  if (selectFiltro) {
    selectFiltro.addEventListener('change', () => {
      paginaActualFacial = 0;
      cargarRegistrosFaciales();
    });
  }
});

// Exportar funciones globales
window.abrirRegistroFacialAdmin = abrirRegistroFacialAdmin;
window.cargarRegistrosFaciales = cargarRegistrosFaciales;
window.registrarFacialAlumno = registrarFacialAlumno;
window.verDetalleFacial = verDetalleFacial;
window.editarFacial = editarFacial;
window.eliminarFacial = eliminarFacial;
window.paginaAnteriorFacial = paginaAnteriorFacial;
window.paginaSiguienteFacial = paginaSiguienteFacial;
