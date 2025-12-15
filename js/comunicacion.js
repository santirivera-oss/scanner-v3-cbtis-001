// ========================================
// 💬 SISTEMA DE COMUNICACIÓN
// Keyon Access System v2.0
// ========================================

// Variables globales
let chatActivo = null;
let listenerMensajes = null;
let listenerAvisos = null;

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  // Observer para comunicación alumno
  observarSeccion('comunicacion-alumno', () => {
    console.log('💬 Comunicación alumno visible');
    cargarAvisosAlumno();
    cargarChatsAlumno();
  });
  
  // Observer para comunicación profesor
  observarSeccion('comunicacion-profesor', () => {
    console.log('💬 Comunicación profesor visible');
    cargarMisAvisos();
    cargarChatsProfesor();
    cargarAvisosInstitucionales();
    cargarGruposProfesor();
  });
  
  // Observer para comunicación admin
  observarSeccion('comunicacion-admin', () => {
    console.log('💬 Comunicación admin visible');
    cargarTodosAvisos();
    cargarChatsAdmin();
    cargarEstadisticasComunicacion();
  });
  
  // Filtro de avisos admin
  const filtroAdmin = document.getElementById('filtro-avisos-admin');
  if (filtroAdmin) {
    filtroAdmin.addEventListener('change', () => cargarTodosAvisos(filtroAdmin.value));
  }
});

function observarSeccion(id, callback) {
  const seccion = document.getElementById(id);
  if (seccion) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!seccion.classList.contains('hidden')) {
            callback();
          }
        }
      });
    });
    observer.observe(seccion, { attributes: true });
  }
}

// ========================
// 🔹 AVISOS - ALUMNO
// ========================
async function cargarAvisosAlumno() {
  const container = document.getElementById('lista-avisos-alumno');
  if (!container) return;
  
  const alumno = window.usuarioActual;
  if (!alumno) return;
  
  container.innerHTML = `
    <div class="text-center py-8">
      <span class="text-4xl animate-pulse">⏳</span>
      <p class="text-sm text-text-muted mt-2">Cargando avisos...</p>
    </div>
  `;
  
  try {
    // Escuchar avisos en tiempo real
    if (listenerAvisos) listenerAvisos();
    
    listenerAvisos = db.collection('avisos')
      .orderBy('fecha', 'desc')
      .limit(50)
      .onSnapshot((snapshot) => {
        const avisos = [];
        snapshot.forEach(doc => {
          const aviso = doc.data();
          aviso._id = doc.id;
          
          // Filtrar avisos para este alumno
          const dest = aviso.destinatarios;
          if (dest === 'todos' || 
              dest === 'alumnos' || 
              dest === alumno.grado ||
              (aviso.tipo === 'institucional')) {
            avisos.push(aviso);
          }
        });
        
        renderizarAvisosAlumno(avisos);
      });
    
  } catch (error) {
    console.error('Error cargando avisos:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-danger">
        <span class="text-4xl">⚠️</span>
        <p class="text-sm mt-2">Error al cargar avisos</p>
      </div>
    `;
  }
}

function renderizarAvisosAlumno(avisos) {
  const container = document.getElementById('lista-avisos-alumno');
  if (!container) return;
  
  if (avisos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-text-muted">
        <span class="text-5xl block mb-3 opacity-30">📢</span>
        <p>No hay avisos por el momento</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  avisos.forEach(aviso => {
    const fecha = aviso.fecha?.toDate ? aviso.fecha.toDate() : new Date(aviso.fecha);
    const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    const esInstitucional = aviso.tipo === 'institucional';
    const esImportante = aviso.importante;
    
    const div = document.createElement('div');
    div.className = `p-4 rounded-xl transition-all ${esImportante ? 'bg-danger/10 border border-danger/30' : 'bg-surface-light/50 hover:bg-surface-light'}`;
    div.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full ${esInstitucional ? 'bg-gradient-to-br from-warning to-danger' : 'bg-gradient-to-br from-primary to-accent'} flex items-center justify-center text-white flex-shrink-0">
          ${esInstitucional ? '🏫' : '👨‍🏫'}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold text-text-main">${aviso.titulo}</span>
            ${esImportante ? '<span class="px-2 py-0.5 bg-danger text-white text-xs rounded-full">Urgente</span>' : ''}
          </div>
          <p class="text-sm text-text-muted mb-2">${aviso.mensaje}</p>
          <div class="flex items-center gap-3 text-xs text-text-muted">
            <span>${esInstitucional ? 'Institución' : aviso.autorNombre || 'Profesor'}</span>
            <span>•</span>
            <span>${fechaStr} ${horaStr}</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function filtrarAvisos(tipo) {
  // Actualizar botones activos
  document.querySelectorAll('.filtro-aviso').forEach(btn => {
    btn.classList.remove('active', 'bg-primary/20', 'text-primary');
    btn.classList.add('bg-surface-light', 'text-text-muted');
  });
  event.target.classList.add('active', 'bg-primary/20', 'text-primary');
  event.target.classList.remove('bg-surface-light', 'text-text-muted');
  
  // Filtrar avisos
  const container = document.getElementById('lista-avisos-alumno');
  const avisos = container.querySelectorAll(':scope > div');
  
  avisos.forEach(aviso => {
    if (tipo === 'todos') {
      aviso.style.display = '';
    } else if (tipo === 'institucional') {
      aviso.style.display = aviso.innerHTML.includes('🏫') ? '' : 'none';
    } else if (tipo === 'profesor') {
      aviso.style.display = aviso.innerHTML.includes('👨‍🏫') ? '' : 'none';
    }
  });
}

// ========================
// 🔹 AVISOS - PROFESOR
// ========================
async function cargarGruposProfesor() {
  const select = document.getElementById('aviso-destinatarios');
  if (!select) return;
  
  // Por ahora usamos grupos estáticos, pero se podría cargar de Firebase
  // TODO: Cargar grupos del profesor desde Firebase
}

async function publicarAviso() {
  const titulo = document.getElementById('aviso-titulo')?.value.trim();
  const mensaje = document.getElementById('aviso-mensaje')?.value.trim();
  const destinatarios = document.getElementById('aviso-destinatarios')?.value;
  const importante = document.getElementById('aviso-importante')?.checked;
  
  if (!titulo || !mensaje || !destinatarios) {
    mostrarNotificacion('Completa todos los campos', 'warning');
    return;
  }
  
  const profesor = window.usuarioActual;
  if (!profesor) {
    mostrarNotificacion('No hay sesión activa', 'error');
    return;
  }
  
  try {
    await db.collection('avisos').add({
      titulo,
      mensaje,
      destinatarios,
      importante,
      tipo: 'profesor',
      autorId: profesor.id || profesor.control,
      autorNombre: `${profesor.nombre} ${profesor.apellidos}`.trim(),
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      leidos: []
    });
    
    // 🔔 ENVIAR NOTIFICACIONES A LOS DESTINATARIOS
    try {
      if (typeof notificarGrupo === 'function' && destinatarios) {
        // Parsear destinatarios (formato: "3A" o "todos")
        if (destinatarios === 'todos') {
          // Notificar a todos los alumnos - se haría con enviarNotificacionMasiva
          console.log('📢 Aviso para todos los alumnos');
        } else {
          // Parsear grado y grupo (ej: "3A" → grado 3, grupo A)
          const match = destinatarios.match(/(\d+)([A-Z])/i);
          if (match) {
            const grado = match[1];
            const grupo = match[2].toUpperCase();
            await notificarGrupo(grado, grupo, {
              title: importante ? '🚨 ' + titulo : '📢 ' + titulo,
              body: mensaje.substring(0, 100),
              tipo: 'alerta',
              data: { tipo: 'aviso' }
            });
            console.log('🔔 Notificación enviada al grupo:', destinatarios);
          }
        }
      }
    } catch (notifError) {
      console.warn('No se pudieron enviar notificaciones:', notifError);
    }
    
    // Limpiar formulario
    document.getElementById('aviso-titulo').value = '';
    document.getElementById('aviso-mensaje').value = '';
    document.getElementById('aviso-destinatarios').value = '';
    document.getElementById('aviso-importante').checked = false;
    
    mostrarNotificacion('✅ Aviso publicado', 'success');
    cargarMisAvisos();
    
  } catch (error) {
    console.error('Error publicando aviso:', error);
    mostrarNotificacion('Error al publicar', 'error');
  }
}

async function cargarMisAvisos() {
  const container = document.getElementById('lista-mis-avisos');
  if (!container) return;
  
  const profesor = window.usuarioActual;
  if (!profesor) return;
  
  try {
    // Consulta simple sin ordenar (evita índice compuesto)
    const snapshot = await db.collection('avisos')
      .where('autorId', '==', profesor.id || profesor.control)
      .get();
    
    const avisos = [];
    snapshot.forEach(doc => {
      avisos.push({ _id: doc.id, ...doc.data() });
    });
    
    // Ordenar en JavaScript
    avisos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
      return fechaB - fechaA;
    });
    
    // Limitar a 20
    const avisosLimitados = avisos.slice(0, 20);
    
    document.getElementById('contador-mis-avisos').textContent = `${avisosLimitados.length} avisos`;
    
    if (avisosLimitados.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">📢</span>
          <p class="text-sm">No has publicado avisos</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    avisosLimitados.forEach(aviso => {
      const fecha = aviso.fecha?.toDate ? aviso.fecha.toDate() : new Date(aviso.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      
      const div = document.createElement('div');
      div.className = 'p-3 bg-surface-light/50 rounded-xl hover:bg-surface-light transition-all';
      div.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-text-main text-sm truncate">${aviso.titulo}</p>
            <p class="text-xs text-text-muted truncate">${aviso.mensaje}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-text-muted">${fechaStr}</span>
              <span class="px-2 py-0.5 text-xs rounded ${aviso.importante ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'}">${aviso.destinatarios}</span>
            </div>
          </div>
          <button onclick="eliminarAviso('${aviso._id}')" class="p-1 text-text-muted hover:text-danger transition-all" title="Eliminar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error cargando mis avisos:', error);
  }
}

async function eliminarAviso(avisoId) {
  if (!confirm('¿Eliminar este aviso?')) return;
  
  try {
    await db.collection('avisos').doc(avisoId).delete();
    mostrarNotificacion('Aviso eliminado', 'success');
    cargarMisAvisos();
  } catch (error) {
    console.error('Error eliminando:', error);
    mostrarNotificacion('Error al eliminar', 'error');
  }
}

async function cargarAvisosInstitucionales() {
  const container = document.getElementById('lista-avisos-institucionales-profesor');
  if (!container) return;
  
  try {
    // Consulta simple sin ordenar (evita índice compuesto)
    const snapshot = await db.collection('avisos')
      .where('tipo', '==', 'institucional')
      .get();
    
    if (snapshot.empty) {
      container.innerHTML = `
        <div class="text-center py-6 text-text-muted">
          <span class="text-3xl block mb-2 opacity-30">🏫</span>
          <p class="text-xs">Sin avisos de la institución</p>
        </div>
      `;
      return;
    }
    
    // Ordenar en JavaScript
    const avisos = [];
    snapshot.forEach(doc => {
      avisos.push({ _id: doc.id, ...doc.data() });
    });
    
    avisos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
      return fechaB - fechaA;
    });
    
    // Limitar a 10
    const avisosLimitados = avisos.slice(0, 10);
    
    container.innerHTML = '';
    
    avisosLimitados.forEach(aviso => {
      const fecha = aviso.fecha?.toDate ? aviso.fecha.toDate() : new Date(aviso.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      
      const div = document.createElement('div');
      div.className = `p-3 rounded-xl ${aviso.importante ? 'bg-danger/10 border border-danger/30' : 'bg-surface-light/50'}`;
      div.innerHTML = `
        <p class="font-medium text-text-main text-sm">${aviso.titulo}</p>
        <p class="text-xs text-text-muted mt-1 line-clamp-2">${aviso.mensaje}</p>
        <span class="text-xs text-text-muted">${fechaStr}</span>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error cargando avisos institucionales:', error);
  }
}

// ========================
// 🔹 AVISOS - ADMIN
// ========================
async function publicarAvisoInstitucional() {
  const titulo = document.getElementById('aviso-admin-titulo')?.value.trim();
  const mensaje = document.getElementById('aviso-admin-mensaje')?.value.trim();
  const destinatarios = document.getElementById('aviso-admin-destinatarios')?.value;
  const importante = document.getElementById('aviso-admin-importante')?.checked;
  const notificar = document.getElementById('aviso-admin-notificar')?.checked;
  
  if (!titulo || !mensaje) {
    mostrarNotificacion('Completa todos los campos', 'warning');
    return;
  }
  
  try {
    await db.collection('avisos').add({
      titulo,
      mensaje,
      destinatarios,
      importante,
      notificar,
      tipo: 'institucional',
      autorNombre: 'Administración',
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      leidos: []
    });
    
    // Limpiar formulario
    document.getElementById('aviso-admin-titulo').value = '';
    document.getElementById('aviso-admin-mensaje').value = '';
    document.getElementById('aviso-admin-importante').checked = false;
    
    mostrarNotificacion('✅ Aviso institucional publicado', 'success');
    cargarTodosAvisos();
    cargarEstadisticasComunicacion();
    
  } catch (error) {
    console.error('Error publicando:', error);
    mostrarNotificacion('Error al publicar', 'error');
  }
}

async function cargarTodosAvisos(filtro = 'todos') {
  const container = document.getElementById('lista-todos-avisos-admin');
  if (!container) return;
  
  try {
    let snapshot;
    
    // Consultas simples sin orderBy para evitar índices compuestos
    if (filtro === 'institucional') {
      snapshot = await db.collection('avisos').where('tipo', '==', 'institucional').get();
    } else if (filtro === 'profesor') {
      snapshot = await db.collection('avisos').where('tipo', '==', 'profesor').get();
    } else {
      snapshot = await db.collection('avisos').get();
    }
    
    if (snapshot.empty) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">📢</span>
          <p class="text-sm">No hay avisos publicados</p>
        </div>
      `;
      return;
    }
    
    // Ordenar en JavaScript
    const avisos = [];
    snapshot.forEach(doc => {
      avisos.push({ _id: doc.id, ...doc.data() });
    });
    
    avisos.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
      return fechaB - fechaA;
    });
    
    // Limitar a 50
    const avisosLimitados = avisos.slice(0, 50);
    
    container.innerHTML = '';
    
    avisosLimitados.forEach(aviso => {
      const fecha = aviso.fecha?.toDate ? aviso.fecha.toDate() : new Date(aviso.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      
      const esInstitucional = aviso.tipo === 'institucional';
      
      const div = document.createElement('div');
      div.className = `p-4 rounded-xl ${aviso.importante ? 'bg-danger/10 border border-danger/30' : 'bg-surface-light/50'} hover:bg-surface-light transition-all`;
      div.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${esInstitucional ? 'bg-gradient-to-br from-warning to-danger' : 'bg-gradient-to-br from-primary to-accent'} flex items-center justify-center text-white flex-shrink-0">
            ${esInstitucional ? '🏫' : '👨‍🏫'}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-text-main">${aviso.titulo}</span>
              ${aviso.importante ? '<span class="px-2 py-0.5 bg-danger text-white text-xs rounded-full">Urgente</span>' : ''}
              <span class="px-2 py-0.5 bg-surface-light text-text-muted text-xs rounded-full">${aviso.destinatarios}</span>
            </div>
            <p class="text-sm text-text-muted mb-2">${aviso.mensaje}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-text-muted">${aviso.autorNombre || 'Anónimo'} • ${fechaStr}</span>
              <button onclick="eliminarAvisoAdmin('${aviso._id}')" class="text-xs text-danger hover:underline">Eliminar</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error cargando avisos:', error);
  }
}

async function eliminarAvisoAdmin(avisoId) {
  if (!confirm('¿Eliminar este aviso?')) return;
  
  try {
    await db.collection('avisos').doc(avisoId).delete();
    mostrarNotificacion('Aviso eliminado', 'success');
    cargarTodosAvisos();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function cargarEstadisticasComunicacion() {
  try {
    // Avisos del mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const avisosSnap = await db.collection('avisos')
      .where('fecha', '>=', inicioMes)
      .get();
    
    document.getElementById('stat-avisos-mes').textContent = avisosSnap.size;
    
    // Chats activos
    const chatsSnap = await db.collection('chats').get();
    document.getElementById('stat-chats-activos').textContent = chatsSnap.size;
    
    // Mensajes de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let mensajesHoy = 0;
    const chatsData = await db.collection('chats').get();
    for (const chatDoc of chatsData.docs) {
      const mensajesSnap = await db.collection('chats').doc(chatDoc.id)
        .collection('mensajes')
        .where('fecha', '>=', hoy)
        .get();
      mensajesHoy += mensajesSnap.size;
    }
    
    document.getElementById('stat-mensajes-hoy').textContent = mensajesHoy;
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ========================
// 🔹 CHAT - FUNCIONES COMUNES
// ========================
async function buscarNuevoChat(tipoUsuario) {
  // Crear modal de búsqueda
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
  modal.id = 'modal-nuevo-chat';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  let destinatariosTipo = '';
  if (tipoUsuario === 'alumno') {
    destinatariosTipo = 'Profesor';
  } else if (tipoUsuario === 'profesor') {
    destinatariosTipo = 'Alumno';
  }
  
  modal.innerHTML = `
    <div class="bg-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-border-subtle">
      <div class="p-6 border-b border-border-subtle">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-text-main">💬 Nuevo Chat</h3>
          <button onclick="document.getElementById('modal-nuevo-chat').remove()" class="p-2 hover:bg-surface-light rounded-lg">
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        <div class="mb-4">
          <label class="block text-text-muted text-sm mb-2">Buscar ${destinatariosTipo}</label>
          <input type="text" id="buscar-usuario-chat" placeholder="Nombre o número de control..."
                 class="w-full p-3 rounded-xl bg-surface-light border border-border-subtle text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
                 oninput="buscarUsuariosChat('${tipoUsuario}', this.value)">
        </div>
        
        <div id="resultados-busqueda-chat" class="space-y-2 max-h-[300px] overflow-y-auto">
          <p class="text-center text-text-muted text-sm py-4">Escribe para buscar...</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('buscar-usuario-chat').focus();
}

async function buscarUsuariosChat(tipoUsuario, query) {
  const container = document.getElementById('resultados-busqueda-chat');
  if (!container || query.length < 2) {
    container.innerHTML = '<p class="text-center text-text-muted text-sm py-4">Escribe al menos 2 caracteres...</p>';
    return;
  }
  
  container.innerHTML = '<p class="text-center text-text-muted text-sm py-4">🔍 Buscando...</p>';
  
  try {
    // Determinar qué tipo de usuario buscar
    let tipoBuscar = tipoUsuario === 'alumno' ? 'Profesor' : 'Alumno';
    
    // Cargar usuarios de ambas colecciones según el tipo
    const queryLower = query.toLowerCase();
    const usuarios = [];
    
    if (tipoBuscar === 'Profesor' || tipoUsuario === 'admin') {
      // Buscar en profesores
      const profSnapshot = await db.collection('profesores').get();
      profSnapshot.forEach(doc => {
        const u = doc.data();
        u._id = doc.id;
        u.tipo = 'Profesor';
        const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.toLowerCase();
        const control = (u.control || '').toLowerCase();
        const telefono = (u.telefono || '').toLowerCase();
        
        if (nombreCompleto.includes(queryLower) || 
            control.includes(queryLower) || 
            telefono.includes(queryLower)) {
          usuarios.push(u);
        }
      });
    }
    
    if (tipoBuscar === 'Alumno' || tipoUsuario === 'admin') {
      // Buscar en alumnos
      const alumnSnapshot = await db.collection('alumnos').get();
      alumnSnapshot.forEach(doc => {
        const u = doc.data();
        u._id = doc.id;
        u.tipo = 'Alumno';
        const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.toLowerCase();
        const control = (u.control || '').toLowerCase();
        const grado = (u.grado || '').toLowerCase();
        
        if (nombreCompleto.includes(queryLower) || 
            control.includes(queryLower) || 
            grado.includes(queryLower)) {
          usuarios.push(u);
        }
      });
    }
    
    // También buscar en la colección 'usuarios' por si acaso
    try {
      const usuariosSnapshot = await db.collection('usuarios').get();
      usuariosSnapshot.forEach(doc => {
        const u = doc.data();
        u._id = doc.id;
        
        // Evitar duplicados
        const yaExiste = usuarios.some(existing => 
          existing.control === u.control || existing._id === u._id
        );
        
        if (yaExiste) return;
        
        // Filtrar por tipo si no es admin
        if (tipoUsuario !== 'admin' && u.tipo !== tipoBuscar) return;
        
        const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.toLowerCase();
        const control = (u.control || '').toLowerCase();
        
        if (nombreCompleto.includes(queryLower) || control.includes(queryLower)) {
          usuarios.push(u);
        }
      });
    } catch (e) {
      // Colección usuarios puede no existir
    }
    
    // Limitar resultados
    const resultados = usuarios.slice(0, 15);
    
    if (resultados.length === 0) {
      container.innerHTML = '<p class="text-center text-text-muted text-sm py-4">No se encontraron resultados</p>';
      return;
    }
    
    container.innerHTML = '';
    
    resultados.forEach(u => {
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 p-3 bg-surface-light/50 rounded-xl hover:bg-surface-light cursor-pointer transition-all';
      div.onclick = () => iniciarChat(u);
      
      const inicial1 = (u.nombre || 'U').charAt(0).toUpperCase();
      const inicial2 = (u.apellidos || '').charAt(0).toUpperCase();
      const gradiente = u.tipo === 'Profesor' ? 'from-accent to-primary' : 'from-primary to-accent';
      
      div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br ${gradiente} flex items-center justify-center text-white font-bold">
          ${inicial1}${inicial2}
        </div>
        <div class="flex-1">
          <p class="font-medium text-text-main">${u.nombre || ''} ${u.apellidos || ''}</p>
          <p class="text-xs text-text-muted">${u.tipo}${u.grado ? ' • ' + u.grado : ''}${u.control ? ' • ' + u.control : ''}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full ${u.tipo === 'Profesor' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}">${u.tipo === 'Profesor' ? '👨‍🏫' : '👨‍🎓'}</span>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    container.innerHTML = '<p class="text-center text-danger text-sm py-4">Error al buscar</p>';
  }
}

async function iniciarChat(destinatario) {
  const usuario = window.usuarioActual;
  if (!usuario) return;
  
  // Cerrar modal de búsqueda
  document.getElementById('modal-nuevo-chat')?.remove();
  
  // Crear ID único del chat (ordenado alfabéticamente)
  const ids = [usuario.id || usuario.control, destinatario._id || destinatario.control].sort();
  const chatId = `chat_${ids[0]}_${ids[1]}`;
  
  try {
    // Verificar si el chat existe
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    
    if (!chatDoc.exists) {
      // Crear nuevo chat
      await chatRef.set({
        participantes: [
          { id: usuario.id || usuario.control, nombre: `${usuario.nombre} ${usuario.apellidos}`.trim(), tipo: usuario.tipo },
          { id: destinatario._id || destinatario.control, nombre: `${destinatario.nombre} ${destinatario.apellidos}`.trim(), tipo: destinatario.tipo }
        ],
        creado: firebase.firestore.FieldValue.serverTimestamp(),
        ultimoMensaje: null,
        ultimaActividad: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Abrir ventana de chat
    abrirVentanaChat(chatId, destinatario);
    
  } catch (error) {
    console.error('Error iniciando chat:', error);
    mostrarNotificacion('Error al iniciar chat', 'error');
  }
}

function abrirVentanaChat(chatId, destinatario) {
  // Cerrar chat anterior si existe
  document.getElementById('ventana-chat')?.remove();
  if (listenerMensajes) listenerMensajes();
  
  chatActivo = chatId;
  
  const ventana = document.createElement('div');
  ventana.id = 'ventana-chat';
  ventana.className = 'fixed bottom-4 right-4 w-[380px] h-[500px] bg-surface rounded-2xl shadow-2xl border border-border-subtle flex flex-col z-[55000] overflow-hidden';
  
  ventana.innerHTML = `
    <!-- Header -->
    <div class="p-4 border-b border-border-subtle bg-surface-light/50 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
        ${(destinatario.nombre || 'U').charAt(0)}${(destinatario.apellidos || '').charAt(0)}
      </div>
      <div class="flex-1">
        <p class="font-semibold text-text-main">${destinatario.nombre} ${destinatario.apellidos}</p>
        <p class="text-xs text-text-muted">${destinatario.tipo}</p>
      </div>
      <button onclick="cerrarVentanaChat()" class="p-2 hover:bg-surface-light rounded-lg transition-all">
        <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    
    <!-- Mensajes -->
    <div id="mensajes-chat" class="flex-1 p-4 overflow-y-auto space-y-3">
      <div class="text-center py-8">
        <span class="text-4xl animate-pulse">💬</span>
        <p class="text-sm text-text-muted mt-2">Cargando mensajes...</p>
      </div>
    </div>
    
    <!-- Input -->
    <div class="p-4 border-t border-border-subtle bg-surface-light/30">
      <div class="flex gap-2">
        <input type="text" id="input-mensaje-chat" placeholder="Escribe un mensaje..."
               class="flex-1 p-3 rounded-xl bg-surface-light border border-border-subtle text-text-main placeholder-text-muted focus:outline-none focus:border-primary"
               onkeypress="if(event.key === 'Enter') enviarMensaje()">
        <button onclick="enviarMensaje()" class="p-3 btn-primary rounded-xl text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(ventana);
  
  // Cargar mensajes en tiempo real
  cargarMensajesChat(chatId);
  
  // Focus en input
  document.getElementById('input-mensaje-chat')?.focus();
}

function cerrarVentanaChat() {
  document.getElementById('ventana-chat')?.remove();
  if (listenerMensajes) {
    listenerMensajes();
    listenerMensajes = null;
  }
  chatActivo = null;
}

function cargarMensajesChat(chatId) {
  const container = document.getElementById('mensajes-chat');
  if (!container) return;
  
  const usuario = window.usuarioActual;
  const miId = usuario.id || usuario.control;
  
  listenerMensajes = db.collection('chats').doc(chatId)
    .collection('mensajes')
    .orderBy('fecha', 'asc')
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = `
          <div class="text-center py-8">
            <span class="text-4xl opacity-30">💬</span>
            <p class="text-sm text-text-muted mt-2">Inicia la conversación</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = '';
      
      snapshot.forEach(doc => {
        const msg = doc.data();
        msg._id = doc.id;
        const esMio = msg.autorId === miId;
        const fecha = msg.fecha?.toDate ? msg.fecha.toDate() : new Date(msg.fecha);
        const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        const div = document.createElement('div');
        div.className = `flex ${esMio ? 'justify-end' : 'justify-start'} group`;
        div.id = `msg-${msg._id}`;
        
        // Verificar si es mensaje eliminado
        if (msg.eliminado) {
          div.innerHTML = `
            <div class="max-w-[80%] bg-surface-light/50 rounded-2xl px-4 py-2 ${esMio ? 'rounded-br-md' : 'rounded-bl-md'} italic">
              <p class="text-sm text-text-muted">🚫 Mensaje eliminado</p>
              <p class="text-xs text-text-muted/50 text-right mt-1">${horaStr}</p>
            </div>
          `;
          container.appendChild(div);
          return;
        }
        
        // Construir HTML del mensaje con respuesta si existe
        let respuestaHTML = '';
        if (msg.respuestaA) {
          respuestaHTML = `
            <div class="mb-2 p-2 rounded-lg ${esMio ? 'bg-white/10' : 'bg-black/10'} border-l-2 ${esMio ? 'border-white/30' : 'border-primary/50'} cursor-pointer" onclick="scrollToMessage('${msg.respuestaA.id}')">
              <p class="text-xs font-medium ${esMio ? 'text-white/70' : 'text-primary'}">${msg.respuestaA.autorNombre || 'Usuario'}</p>
              <p class="text-xs ${esMio ? 'text-white/60' : 'text-text-muted'} truncate">${msg.respuestaA.texto || ''}</p>
            </div>
          `;
        }
        
        div.innerHTML = `
          <!-- Opciones del mensaje (aparecen en hover) -->
          <div class="hidden group-hover:flex items-center gap-1 ${esMio ? 'order-first mr-2' : 'order-last ml-2'}">
            <button onclick="responderMensaje('${msg._id}', '${msg.texto.replace(/'/g, "\\'")}', '${msg.autorNombre || 'Usuario'}')" 
                    class="p-1.5 rounded-full bg-surface-light/80 hover:bg-surface-light text-text-muted hover:text-primary transition-all" title="Responder">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
            </button>
            ${esMio ? `
            <button onclick="eliminarMensaje('${msg._id}')" 
                    class="p-1.5 rounded-full bg-surface-light/80 hover:bg-danger/20 text-text-muted hover:text-danger transition-all" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
            ` : ''}
          </div>
          
          <!-- Burbuja del mensaje -->
          <div class="max-w-[80%] ${esMio ? 'bg-primary text-white' : 'bg-surface-light text-text-main'} rounded-2xl px-4 py-2 ${esMio ? 'rounded-br-md' : 'rounded-bl-md'}">
            ${respuestaHTML}
            <p class="text-sm break-words">${msg.texto}</p>
            <div class="flex items-center justify-end gap-1 mt-1">
              <p class="text-xs ${esMio ? 'text-white/70' : 'text-text-muted'}">${horaStr}</p>
              ${esMio ? `<span class="text-xs ${msg.leido ? 'text-blue-300' : 'text-white/50'}">✓✓</span>` : ''}
            </div>
          </div>
        `;
        container.appendChild(div);
      });
      
      // Scroll al final
      container.scrollTop = container.scrollHeight;
    });
}

// Variable para almacenar el mensaje al que se está respondiendo
let mensajeRespondiendo = null;

function responderMensaje(msgId, texto, autorNombre) {
  mensajeRespondiendo = {
    id: msgId,
    texto: texto.substring(0, 100) + (texto.length > 100 ? '...' : ''),
    autorNombre: autorNombre
  };
  
  // Mostrar preview de respuesta
  mostrarPreviewRespuesta();
  
  // Focus en input
  document.getElementById('input-mensaje-chat')?.focus();
}

function mostrarPreviewRespuesta() {
  // Remover preview anterior si existe
  document.getElementById('preview-respuesta')?.remove();
  
  if (!mensajeRespondiendo) return;
  
  const inputContainer = document.querySelector('#ventana-chat .border-t');
  if (!inputContainer) return;
  
  const preview = document.createElement('div');
  preview.id = 'preview-respuesta';
  preview.className = 'px-4 py-2 bg-surface-light/50 border-b border-border-subtle flex items-center gap-2';
  preview.innerHTML = `
    <div class="w-1 h-10 bg-primary rounded-full"></div>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-medium text-primary">${mensajeRespondiendo.autorNombre}</p>
      <p class="text-xs text-text-muted truncate">${mensajeRespondiendo.texto}</p>
    </div>
    <button onclick="cancelarRespuesta()" class="p-1 hover:bg-surface-light rounded-full transition-all">
      <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;
  
  inputContainer.insertBefore(preview, inputContainer.firstChild);
}

function cancelarRespuesta() {
  mensajeRespondiendo = null;
  document.getElementById('preview-respuesta')?.remove();
}

function scrollToMessage(msgId) {
  const msgElement = document.getElementById(`msg-${msgId}`);
  if (msgElement) {
    msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight temporal
    msgElement.classList.add('bg-primary/10');
    setTimeout(() => {
      msgElement.classList.remove('bg-primary/10');
    }, 2000);
  }
}

async function eliminarMensaje(msgId) {
  if (!chatActivo || !msgId) return;
  
  // Confirmación
  if (!confirm('¿Eliminar este mensaje?')) return;
  
  try {
    // Marcar como eliminado (no borramos físicamente para mantener el contexto)
    await db.collection('chats').doc(chatActivo)
      .collection('mensajes').doc(msgId)
      .update({
        eliminado: true,
        textoOriginal: firebase.firestore.FieldValue.delete(),
        texto: 'Mensaje eliminado'
      });
    
    mostrarNotificacion('Mensaje eliminado', 'success');
    
  } catch (error) {
    console.error('Error eliminando mensaje:', error);
    mostrarNotificacion('Error al eliminar', 'error');
  }
}

async function enviarMensaje() {
  const input = document.getElementById('input-mensaje-chat');
  const texto = input?.value.trim();
  
  if (!texto || !chatActivo) return;
  
  const usuario = window.usuarioActual;
  if (!usuario) return;
  
  try {
    // Preparar datos del mensaje
    const mensajeData = {
      texto,
      autorId: usuario.id || usuario.control,
      autorNombre: `${usuario.nombre} ${usuario.apellidos}`.trim(),
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      leido: false
    };
    
    // Agregar info de respuesta si existe
    if (mensajeRespondiendo) {
      mensajeData.respuestaA = {
        id: mensajeRespondiendo.id,
        texto: mensajeRespondiendo.texto,
        autorNombre: mensajeRespondiendo.autorNombre
      };
    }
    
    // Agregar mensaje
    await db.collection('chats').doc(chatActivo)
      .collection('mensajes')
      .add(mensajeData);
    
    // Actualizar último mensaje del chat
    await db.collection('chats').doc(chatActivo).update({
      ultimoMensaje: texto,
      ultimaActividad: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // 🔔 ENVIAR NOTIFICACIÓN AL DESTINATARIO
    try {
      const chatDoc = await db.collection('chats').doc(chatActivo).get();
      const chatData = chatDoc.data();
      if (chatData && chatData.participantes && Array.isArray(chatData.participantes)) {
        // Encontrar el otro participante
        const miId = String(usuario.id || usuario.control || usuario.telefono || '');
        
        // Los participantes pueden ser strings o objetos {id, nombre, tipo}
        const otroParticipante = chatData.participantes.find(p => {
          const pId = typeof p === 'object' ? String(p.id || p.control || p.telefono || '') : String(p);
          return pId !== miId;
        });
        
        // Extraer el ID del participante
        let destinatarioId = null;
        if (otroParticipante) {
          if (typeof otroParticipante === 'object') {
            destinatarioId = String(otroParticipante.id || otroParticipante.control || otroParticipante.telefono || '');
          } else {
            destinatarioId = String(otroParticipante);
          }
        }
        
        if (destinatarioId && destinatarioId !== '' && typeof enviarNotificacionAUsuario === 'function') {
          await enviarNotificacionAUsuario(destinatarioId, {
            title: `💬 Mensaje de ${usuario.nombre}`,
            body: texto.substring(0, 100),
            tipo: 'mensaje',
            data: { chatId: chatActivo }
          });
          console.log('🔔 Notificación enviada a:', destinatarioId);
        }
      }
    } catch (notifError) {
      console.warn('No se pudo enviar notificación:', notifError);
    }
    
    // Limpiar input y respuesta
    input.value = '';
    cancelarRespuesta();
    
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    mostrarNotificacion('Error al enviar', 'error');
  }
}

// ========================
// 🔹 LISTA DE CHATS
// ========================
async function cargarChatsAlumno() {
  cargarListaChats('lista-chats-alumno');
}

async function cargarChatsProfesor() {
  cargarListaChats('lista-chats-profesor');
}

async function cargarChatsAdmin() {
  cargarListaChats('lista-chats-admin', true);
}

async function cargarListaChats(containerId, esAdmin = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const usuario = window.usuarioActual;
  if (!usuario && !esAdmin) return;
  
  const miId = usuario?.id || usuario?.control;
  
  try {
    let query;
    if (esAdmin) {
      query = db.collection('chats').orderBy('ultimaActividad', 'desc').limit(20);
    } else {
      // Buscar chats donde el usuario es participante
      query = db.collection('chats').orderBy('ultimaActividad', 'desc').limit(50);
    }
    
    const snapshot = await query.get();
    
    const chats = [];
    snapshot.forEach(doc => {
      const chat = doc.data();
      chat._id = doc.id;
      
      if (esAdmin) {
        chats.push(chat);
      } else {
        // Verificar si el usuario es participante
        const esParticipante = chat.participantes?.some(p => p.id === miId);
        if (esParticipante) {
          chats.push(chat);
        }
      }
    });
    
    if (chats.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">💬</span>
          <p class="text-sm">No tienes conversaciones</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    chats.forEach(chat => {
      // Obtener el otro participante
      let otroParticipante = chat.participantes?.find(p => p.id !== miId) || chat.participantes?.[0];
      if (esAdmin && chat.participantes?.length >= 2) {
        otroParticipante = { nombre: `${chat.participantes[0].nombre} ↔ ${chat.participantes[1].nombre}` };
      }
      
      const fecha = chat.ultimaActividad?.toDate ? chat.ultimaActividad.toDate() : new Date();
      const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 p-3 bg-surface-light/30 rounded-xl hover:bg-surface-light cursor-pointer transition-all';
      div.onclick = () => {
        if (esAdmin) return; // Admin solo ve, no chatea
        const destinatario = chat.participantes?.find(p => p.id !== miId);
        if (destinatario) abrirVentanaChat(chat._id, destinatario);
      };
      
      div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold flex-shrink-0">
          ${(otroParticipante?.nombre || 'C').charAt(0)}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-text-main text-sm truncate">${otroParticipante?.nombre || 'Chat'}</p>
          <p class="text-xs text-text-muted truncate">${chat.ultimoMensaje || 'Sin mensajes'}</p>
        </div>
        <span class="text-xs text-text-muted flex-shrink-0">${fechaStr}</span>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error cargando chats:', error);
  }
}

// ========================
// 🔹 UTILIDADES
// ========================
function mostrarNotificacion(mensaje, tipo = 'info') {
  if (typeof window.mostrarNotificacion === 'function') {
    window.mostrarNotificacion(mensaje, tipo);
  } else {
    console.log(`[${tipo}] ${mensaje}`);
  }
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.cargarAvisosAlumno = cargarAvisosAlumno;
window.filtrarAvisos = filtrarAvisos;
window.publicarAviso = publicarAviso;
window.cargarMisAvisos = cargarMisAvisos;
window.eliminarAviso = eliminarAviso;
window.publicarAvisoInstitucional = publicarAvisoInstitucional;
window.cargarTodosAvisos = cargarTodosAvisos;
window.eliminarAvisoAdmin = eliminarAvisoAdmin;
window.buscarNuevoChat = buscarNuevoChat;
window.buscarUsuariosChat = buscarUsuariosChat;
window.iniciarChat = iniciarChat;
window.abrirVentanaChat = abrirVentanaChat;
window.cerrarVentanaChat = cerrarVentanaChat;
window.enviarMensaje = enviarMensaje;
window.responderMensaje = responderMensaje;
window.cancelarRespuesta = cancelarRespuesta;
window.eliminarMensaje = eliminarMensaje;
window.scrollToMessage = scrollToMessage;
