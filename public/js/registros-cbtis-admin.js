// ========================================
// 📊 PANEL DE REGISTROS CBTIS - ADMIN
// Keyon Access System v2.0
// ========================================

let registrosCBTisCache = [];
let usuariosTotales = { alumnos: [], profesores: [] };

// ========================
// 🔹 CARGAR REGISTROS CBTIS
// ========================
async function cargarRegistrosCBTis() {
  try {
    const hoy = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).split('/').reverse().join('-');
    
    // Obtener registros de hoy
    const snapshot = await db.collection('ingresos_cbtis')
      .where('fecha', '==', hoy)
      .orderBy('timestamp', 'desc')
      .get();
    
    registrosCBTisCache = [];
    snapshot.forEach(doc => {
      registrosCBTisCache.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ ${registrosCBTisCache.length} registros CBTis cargados`);
    renderizarRegistrosCBTis();
    actualizarEstadisticasCBTis();
    
  } catch (error) {
    console.error('Error cargando registros CBTis:', error);
    mostrarNotificacion('Error al cargar registros', 'error');
  }
}

// ========================
// 🔹 RENDERIZAR TABLA DE REGISTROS
// ========================
function renderizarRegistrosCBTis() {
  const tbody = document.getElementById('tabla-registros-cbtis');
  if (!tbody) return;
  
  if (registrosCBTisCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-text-muted">
          <div class="flex flex-col items-center gap-3">
            <span class="text-4xl">📭</span>
            <p>No hay registros de hoy</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = registrosCBTisCache.map((reg, index) => {
    const tipoColor = reg.tipoPersona === 'Alumno' ? 'text-cyan-400' : 'text-purple-400';
    const tipoIcon = reg.tipoPersona === 'Alumno' ? '🎓' : '👨‍🏫';
    const registroColor = reg.tipoRegistro === 'Ingreso' ? 'text-success' : 'text-danger';
    const registroIcon = reg.tipoRegistro === 'Ingreso' ? '🔓' : '🚪';
    
    // Normalizar y mostrar el modo correctamente
    const modoLower = (reg.modo || 'qr').toLowerCase();
    let modoIcon = '📷';
    let modoTexto = 'QR';
    
    if (modoLower === 'facial') {
      modoIcon = '🎭';
      modoTexto = 'Facial';
    } else if (modoLower === 'barcode') {
      modoIcon = '📱';
      modoTexto = 'Barcode';
    }
    
    return `
      <tr class="hover:bg-surface-light/30 transition-colors">
        <td class="py-4 px-4">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light/50 text-sm">
            ${index + 1}
          </span>
        </td>
        <td class="py-4 px-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br ${reg.tipoPersona === 'Alumno' ? 'from-cyan-500 to-blue-600' : 'from-purple-500 to-pink-600'} flex items-center justify-center text-white font-bold">
              ${reg.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p class="font-medium text-text-main">${reg.nombre}</p>
              <p class="text-xs text-text-muted">${reg.identificador}</p>
            </div>
          </div>
        </td>
        <td class="py-4 px-4">
          <span class="inline-flex items-center gap-1 ${tipoColor}">
            ${tipoIcon} ${reg.tipoPersona}
          </span>
        </td>
        <td class="py-4 px-4">
          <span class="inline-flex items-center gap-1 font-semibold ${registroColor}">
            ${registroIcon} ${reg.tipoRegistro}
          </span>
        </td>
        <td class="py-4 px-4">
          <span class="text-text-muted">${reg.hora}</span>
        </td>
        <td class="py-4 px-4">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light/50 text-xs">
            ${modoIcon} ${modoTexto}
          </span>
        </td>
        <td class="py-4 px-4">
          <button onclick="verDetallesRegistroCBTis('${reg.id}')" 
                  class="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm transition-all">
            👁️ Ver
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ========================
// 🔹 VER DETALLES DE REGISTRO
// ========================
function verDetallesRegistroCBTis(registroId) {
  const registro = registrosCBTisCache.find(r => r.id === registroId);
  if (!registro) return;
  
  // Normalizar modo
  const modoLower = (registro.modo || 'qr').toLowerCase();
  let modoIcono = '📷';
  let modoTexto = 'QR';
  
  if (modoLower === 'facial') {
    modoIcono = '🎭';
    modoTexto = 'Reconocimiento Facial';
  } else if (modoLower === 'barcode') {
    modoIcono = '📱';
    modoTexto = 'Código de Barras';
  }
  
  const modal = document.createElement('div');
  modal.id = 'modal-detalle-registro';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;';
  
  modal.innerHTML = `
    <div style="background:rgba(30,41,59,0.98); border:1px solid rgba(99,102,241,0.3); border-radius:24px; padding:32px; max-width:500px; width:100%;">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-text-main">📋 Detalle del Registro</h3>
        <button onclick="cerrarModalDetalleRegistro()" class="w-8 h-8 flex items-center justify-center rounded-lg bg-danger/20 hover:bg-danger/30 text-danger transition-all">
          ✕
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="flex items-center gap-4 p-4 rounded-xl bg-surface-light/30">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br ${registro.tipoPersona === 'Alumno' ? 'from-cyan-500 to-blue-600' : 'from-purple-500 to-pink-600'} flex items-center justify-center text-white font-bold text-2xl">
            ${registro.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div>
            <p class="font-bold text-lg text-text-main">${registro.nombre}</p>
            <p class="text-text-muted">${registro.tipoPersona} • ${registro.identificador}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-surface-light/20">
            <p class="text-text-muted text-sm mb-1">Tipo de Registro</p>
            <p class="font-semibold ${registro.tipoRegistro === 'Ingreso' ? 'text-success' : 'text-danger'}">
              ${registro.tipoRegistro === 'Ingreso' ? '🔓' : '🚪'} ${registro.tipoRegistro}
            </p>
          </div>
          
          <div class="p-4 rounded-xl bg-surface-light/20">
            <p class="text-text-muted text-sm mb-1">Método</p>
            <p class="font-semibold text-text-main">
              ${modoIcono} ${modoTexto}
            </p>
          </div>
          
          <div class="p-4 rounded-xl bg-surface-light/20">
            <p class="text-text-muted text-sm mb-1">Fecha</p>
            <p class="font-semibold text-text-main">${registro.fecha}</p>
          </div>
          
          <div class="p-4 rounded-xl bg-surface-light/20">
            <p class="text-text-muted text-sm mb-1">Hora</p>
            <p class="font-semibold text-text-main">${registro.hora}</p>
          </div>
        </div>
        
        ${registro.aula ? `
          <div class="p-4 rounded-xl bg-surface-light/20">
            <p class="text-text-muted text-sm mb-1">Aula/Grupo</p>
            <p class="font-semibold text-text-main">${registro.aula}</p>
          </div>
        ` : ''}
      </div>
      
      <button onclick="cerrarModalDetalleRegistro()" class="w-full mt-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-medium transition-all">
        Cerrar
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function cerrarModalDetalleRegistro() {
  document.getElementById('modal-detalle-registro')?.remove();
}

// ========================
// 🔹 ACTUALIZAR ESTADÍSTICAS
// ========================
async function actualizarEstadisticasCBTis() {
  // Estadísticas básicas de hoy
  const totalRegistros = registrosCBTisCache.length;
  const ingresos = registrosCBTisCache.filter(r => r.tipoRegistro === 'Ingreso').length;
  const salidas = registrosCBTisCache.filter(r => r.tipoRegistro === 'Salida').length;
  
  // Alumnos y profesores únicos
  const alumnosUnicos = new Set(
    registrosCBTisCache.filter(r => r.tipoPersona === 'Alumno').map(r => r.identificador)
  );
  const profesoresUnicos = new Set(
    registrosCBTisCache.filter(r => r.tipoPersona === 'Profesor').map(r => r.identificador)
  );
  
  // Actualizar UI
  const statTotal = document.getElementById('stat-cbtis-total');
  const statIngresos = document.getElementById('stat-cbtis-ingresos');
  const statSalidas = document.getElementById('stat-cbtis-salidas');
  const statAlumnos = document.getElementById('stat-cbtis-alumnos');
  const statProfesores = document.getElementById('stat-cbtis-profesores');
  
  if (statTotal) statTotal.textContent = totalRegistros;
  if (statIngresos) statIngresos.textContent = ingresos;
  if (statSalidas) statSalidas.textContent = salidas;
  if (statAlumnos) statAlumnos.textContent = alumnosUnicos.size;
  if (statProfesores) statProfesores.textContent = profesoresUnicos.size;
}

// ========================
// 🔹 ANÁLISIS DE ASISTENCIA (Quién entró y quién no)
// ========================
async function analizarAsistenciaCBTis() {
  try {
    mostrarNotificacion('📊 Analizando asistencia...', 'info');
    
    // Cargar todos los usuarios
    const [alumnosSnap, profesoresSnap] = await Promise.all([
      db.collection('alumnos').get(),
      db.collection('profesores').get()
    ]);
    
    const todosAlumnos = [];
    alumnosSnap.forEach(doc => {
      todosAlumnos.push({
        id: doc.id,
        nombre: doc.data().nombre || 'Sin nombre',
        apellidos: doc.data().apellidos || '',
        control: doc.data().control || doc.id,
        grado: doc.data().grado || '',
        grupo: doc.data().grupo || '',
        tipo: 'Alumno'
      });
    });
    
    const todosProfesores = [];
    profesoresSnap.forEach(doc => {
      todosProfesores.push({
        id: doc.id,
        nombre: doc.data().nombre || 'Sin nombre',
        apellidos: doc.data().apellidos || '',
        telefono: doc.data().telefono || doc.id,
        tipo: 'Profesor'
      });
    });
    
    // Identificar quiénes ingresaron hoy
    const hoy = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).split('/').reverse().join('-');
    
    const registrosHoy = await db.collection('ingresos_cbtis')
      .where('fecha', '==', hoy)
      .where('tipoRegistro', '==', 'Ingreso')
      .get();
    
    const ingresosHoy = new Set();
    registrosHoy.forEach(doc => {
      ingresosHoy.add(doc.data().identificador);
    });
    
    // Separar quién entró y quién no
    const alumnosEntraron = todosAlumnos.filter(a => ingresosHoy.has(a.control));
    const alumnosNoEntraron = todosAlumnos.filter(a => !ingresosHoy.has(a.control));
    
    const profesoresEntraron = todosProfesores.filter(p => ingresosHoy.has(p.telefono));
    const profesoresNoEntraron = todosProfesores.filter(p => !ingresosHoy.has(p.telefono));
    
    // Mostrar resultados
    mostrarModalAnalisisAsistencia({
      alumnosEntraron,
      alumnosNoEntraron,
      profesoresEntraron,
      profesoresNoEntraron,
      fecha: hoy
    });
    
  } catch (error) {
    console.error('Error analizando asistencia:', error);
    mostrarNotificacion('Error al analizar asistencia', 'error');
  }
}

// ========================
// 🔹 MODAL DE ANÁLISIS DE ASISTENCIA
// ========================
function mostrarModalAnalisisAsistencia(datos) {
  const modal = document.createElement('div');
  modal.id = 'modal-analisis-asistencia';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; overflow-y:auto;';
  
  modal.innerHTML = `
    <div style="min-height:100%; padding:16px;">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 p-4 glass rounded-2xl">
          <div>
            <h2 class="text-2xl font-bold text-text-main">📊 Análisis de Asistencia</h2>
            <p class="text-text-muted">Fecha: ${datos.fecha}</p>
          </div>
          <button onclick="cerrarModalAnalisisAsistencia()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-danger/20 hover:bg-danger/30 text-danger transition-all">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <!-- Estadísticas Generales -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="glass rounded-2xl p-5 border-l-4 border-success">
            <p class="text-text-muted text-sm">Alumnos Presentes</p>
            <p class="text-3xl font-bold text-success">${datos.alumnosEntraron.length}</p>
          </div>
          <div class="glass rounded-2xl p-5 border-l-4 border-danger">
            <p class="text-text-muted text-sm">Alumnos Ausentes</p>
            <p class="text-3xl font-bold text-danger">${datos.alumnosNoEntraron.length}</p>
          </div>
          <div class="glass rounded-2xl p-5 border-l-4 border-success">
            <p class="text-text-muted text-sm">Profesores Presentes</p>
            <p class="text-3xl font-bold text-success">${datos.profesoresEntraron.length}</p>
          </div>
          <div class="glass rounded-2xl p-5 border-l-4 border-danger">
            <p class="text-text-muted text-sm">Profesores Ausentes</p>
            <p class="text-3xl font-bold text-danger">${datos.profesoresNoEntraron.length}</p>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="glass rounded-2xl p-6">
          <div class="flex gap-2 mb-6 overflow-x-auto">
            <button onclick="cambiarTabAsistencia('alumnos-si')" class="tab-asistencia px-6 py-3 rounded-xl font-medium transition-all bg-success/20 text-success" data-tab="alumnos-si">
              ✅ Alumnos Presentes (${datos.alumnosEntraron.length})
            </button>
            <button onclick="cambiarTabAsistencia('alumnos-no')" class="tab-asistencia px-6 py-3 rounded-xl font-medium transition-all text-text-muted hover:text-text-main" data-tab="alumnos-no">
              ❌ Alumnos Ausentes (${datos.alumnosNoEntraron.length})
            </button>
            <button onclick="cambiarTabAsistencia('profesores-si')" class="tab-asistencia px-6 py-3 rounded-xl font-medium transition-all text-text-muted hover:text-text-main" data-tab="profesores-si">
              ✅ Profesores Presentes (${datos.profesoresEntraron.length})
            </button>
            <button onclick="cambiarTabAsistencia('profesores-no')" class="tab-asistencia px-6 py-3 rounded-xl font-medium transition-all text-text-muted hover:text-text-main" data-tab="profesores-no">
              ❌ Profesores Ausentes (${datos.profesoresNoEntraron.length})
            </button>
          </div>
          
          <!-- Contenido de tabs -->
          <div id="tab-alumnos-si" class="tab-content-asistencia">
            ${renderizarListaUsuarios(datos.alumnosEntraron, 'Alumno', true)}
          </div>
          <div id="tab-alumnos-no" class="tab-content-asistencia hidden">
            ${renderizarListaUsuarios(datos.alumnosNoEntraron, 'Alumno', false)}
          </div>
          <div id="tab-profesores-si" class="tab-content-asistencia hidden">
            ${renderizarListaUsuarios(datos.profesoresEntraron, 'Profesor', true)}
          </div>
          <div id="tab-profesores-no" class="tab-content-asistencia hidden">
            ${renderizarListaUsuarios(datos.profesoresNoEntraron, 'Profesor', false)}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function renderizarListaUsuarios(usuarios, tipo, presente) {
  if (usuarios.length === 0) {
    return `
      <div class="text-center py-12 text-text-muted">
        <span class="text-6xl block mb-4">${presente ? '🎉' : '😔'}</span>
        <p>${presente ? 'Nadie ha ingresado aún' : 'Todos están presentes'}</p>
      </div>
    `;
  }
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${usuarios.map(u => {
        const iniciales = (u.nombre.charAt(0) + (u.apellidos?.charAt(0) || '')).toUpperCase();
        const gradiente = tipo === 'Alumno' ? 'from-cyan-500 to-blue-600' : 'from-purple-500 to-pink-600';
        const identificador = tipo === 'Alumno' ? u.control : u.telefono;
        const extra = tipo === 'Alumno' ? `${u.grado}° ${u.grupo}` : '';
        
        return `
          <div class="p-4 rounded-xl bg-surface-light/30 hover:bg-surface-light/50 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br ${gradiente} flex items-center justify-center text-white font-bold flex-shrink-0">
                ${iniciales}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-text-main truncate">${u.nombre} ${u.apellidos}</p>
                <p class="text-xs text-text-muted truncate">${identificador}</p>
                ${extra ? `<p class="text-xs text-text-muted">${extra}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function cambiarTabAsistencia(tabId) {
  // Ocultar todos los contenidos
  document.querySelectorAll('.tab-content-asistencia').forEach(tab => {
    tab.classList.add('hidden');
  });
  
  // Desactivar todos los botones
  document.querySelectorAll('.tab-asistencia').forEach(btn => {
    btn.classList.remove('bg-success/20', 'text-success', 'bg-danger/20', 'text-danger', 'bg-primary/20', 'text-primary');
    btn.classList.add('text-text-muted');
  });
  
  // Mostrar contenido seleccionado
  document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
  
  // Activar botón seleccionado
  const btnActivo = document.querySelector(`[data-tab="${tabId}"]`);
  if (btnActivo) {
    btnActivo.classList.remove('text-text-muted');
    if (tabId.includes('-si')) {
      btnActivo.classList.add('bg-success/20', 'text-success');
    } else {
      btnActivo.classList.add('bg-danger/20', 'text-danger');
    }
  }
}

function cerrarModalAnalisisAsistencia() {
  document.body.style.overflow = '';
  document.getElementById('modal-analisis-asistencia')?.remove();
}

// ========================
// 🔹 FILTRAR REGISTROS
// ========================
function filtrarRegistrosCBTis(termino) {
  const tbody = document.getElementById('tabla-registros-cbtis');
  if (!tbody) return;
  
  const registrosFiltrados = termino.length < 2 
    ? registrosCBTisCache 
    : registrosCBTisCache.filter(r => 
        r.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        r.identificador.toLowerCase().includes(termino.toLowerCase())
      );
  
  if (registrosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-text-muted">
          <p>No se encontraron resultados para "${termino}"</p>
        </td>
      </tr>
    `;
    return;
  }
  
  // Renderizar con los filtrados temporalmente
  const tempCache = registrosCBTisCache;
  registrosCBTisCache = registrosFiltrados;
  renderizarRegistrosCBTis();
  registrosCBTisCache = tempCache;
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.cargarRegistrosCBTis = cargarRegistrosCBTis;
window.verDetallesRegistroCBTis = verDetallesRegistroCBTis;
window.cerrarModalDetalleRegistro = cerrarModalDetalleRegistro;
window.analizarAsistenciaCBTis = analizarAsistenciaCBTis;
window.cerrarModalAnalisisAsistencia = cerrarModalAnalisisAsistencia;
window.cambiarTabAsistencia = cambiarTabAsistencia;
window.filtrarRegistrosCBTis = filtrarRegistrosCBTis;

// Auto-cargar cuando se muestra la sección
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const section = document.getElementById('registros-cbtis-admin');
        if (section && !section.classList.contains('hidden')) {
          cargarRegistrosCBTis();
        }
      }
    });
  });
  
  const section = document.getElementById('registros-cbtis-admin');
  if (section) {
    observer.observe(section, { attributes: true });
  }
});
