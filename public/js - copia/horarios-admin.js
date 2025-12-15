// ========================================
// 📅 HORARIOS ADMIN - INTERFAZ
// Keyon Access System v2.0
// CBTis 001 - Fresnillo, Zacatecas
// ========================================

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  // Observer para cuando se muestre la sección de horarios
  const horariosSection = document.getElementById('horarios-admin');
  if (horariosSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!horariosSection.classList.contains('hidden')) {
            console.log('📅 Sección horarios visible');
            inicializarHorariosAdmin();
          }
        }
      });
    });
    observer.observe(horariosSection, { attributes: true });
  }
  
  // Setup tabs
  setupTabsHorarios();
  
  // Setup filtros
  setupFiltrosHorarios();
});

// ========================
// 🔹 SETUP TABS
// ========================
function setupTabsHorarios() {
  const tabs = document.querySelectorAll('.horarios-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      
      // Remover active de todos los tabs
      tabs.forEach(t => {
        t.classList.remove('active', 'text-primary', 'border-b-2', 'border-primary');
        t.classList.add('text-text-muted');
      });
      
      // Activar tab seleccionado
      tab.classList.add('active', 'text-primary', 'border-b-2', 'border-primary');
      tab.classList.remove('text-text-muted');
      
      // Ocultar todos los contenidos
      document.querySelectorAll('.horarios-tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      // Mostrar contenido seleccionado
      const content = document.getElementById(`tab-${tabId}`);
      if (content) {
        content.classList.remove('hidden');
        
        // Cargar datos según tab
        switch(tabId) {
          case 'profesores':
            cargarTablaProfesores();
            break;
          case 'asignaciones':
            cargarTablaAsignaciones();
            break;
          case 'grupos':
            cargarGridGrupos();
            break;
          case 'materias':
            cargarGridMaterias();
            break;
        }
      }
    });
  });
}

// ========================
// 🔹 SETUP FILTROS
// ========================
function setupFiltrosHorarios() {
  // Búsqueda de profesores
  const buscarProfesor = document.getElementById('buscar-profesor-horarios');
  if (buscarProfesor) {
    buscarProfesor.addEventListener('input', debounce(() => {
      cargarTablaProfesores(buscarProfesor.value);
    }, 300));
  }
  
  // Filtro turno profesor
  const filtroTurno = document.getElementById('filtro-turno-profesor');
  if (filtroTurno) {
    filtroTurno.addEventListener('change', () => {
      const busqueda = document.getElementById('buscar-profesor-horarios')?.value || '';
      cargarTablaProfesores(busqueda, filtroTurno.value);
    });
  }
  
  // Búsqueda de materias
  const buscarMateria = document.getElementById('buscar-materia');
  if (buscarMateria) {
    buscarMateria.addEventListener('input', debounce(() => {
      cargarGridMaterias(buscarMateria.value);
    }, 300));
  }
  
  // Filtro tipo materia
  const filtroTipoMateria = document.getElementById('filtro-tipo-materia');
  if (filtroTipoMateria) {
    filtroTipoMateria.addEventListener('change', () => {
      const busqueda = document.getElementById('buscar-materia')?.value || '';
      cargarGridMaterias(busqueda, filtroTipoMateria.value);
    });
  }
  
  // Filtros de grupos
  const filtroSemestre = document.getElementById('filtro-semestre-grupo');
  const filtroTurnoGrupo = document.getElementById('filtro-turno-grupo');
  
  if (filtroSemestre) {
    filtroSemestre.addEventListener('change', () => cargarGridGrupos());
  }
  if (filtroTurnoGrupo) {
    filtroTurnoGrupo.addEventListener('change', () => cargarGridGrupos());
  }
}

// ========================
// 🔹 INICIALIZAR ADMIN
// ========================
async function inicializarHorariosAdmin() {
  console.log('📅 Inicializando panel de horarios...');
  
  await cargarEstadisticasHorarios();
  await cargarTablaProfesores();
}

// ========================
// 🔹 ESTADÍSTICAS
// ========================
async function cargarEstadisticasHorarios() {
  try {
    // Contar profesores
    const profesoresSnap = await db.collection('profesores').get();
    const totalProfesores = profesoresSnap.size;
    
    // Contar vinculados (tienen iniciales)
    let vinculados = 0;
    profesoresSnap.forEach(doc => {
      const data = doc.data();
      if (data.iniciales || data.gruposArray) {
        vinculados++;
      }
    });
    
    // Contar asignaciones
    const asignacionesSnap = await db.collection('asignaciones')
      .where('activa', '==', true)
      .get();
    const totalAsignaciones = asignacionesSnap.size;
    
    // Actualizar UI
    animarContadorHorarios('horarios-stat-profesores', totalProfesores);
    animarContadorHorarios('horarios-stat-vinculados', vinculados);
    animarContadorHorarios('horarios-stat-asignaciones', totalAsignaciones);
    
    console.log('📊 Estadísticas:', { totalProfesores, vinculados, totalAsignaciones });
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ========================
// 🔹 TABLA DE PROFESORES
// ========================
async function cargarTablaProfesores(busqueda = '', turnoFiltro = '') {
  const tbody = document.getElementById('tabla-profesores-horarios');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-8 text-center text-text-muted">
        <span class="text-3xl block mb-2">⏳</span>
        Cargando profesores...
      </td>
    </tr>
  `;
  
  try {
    const profesores = await obtenerProfesoresDB();
    
    // Filtrar
    let profesoresFiltrados = profesores;
    
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      profesoresFiltrados = profesoresFiltrados.filter(p => 
        (p.nombre || '').toLowerCase().includes(busquedaLower) ||
        (p.apellidos || '').toLowerCase().includes(busquedaLower) ||
        (p.materias || '').toLowerCase().includes(busquedaLower) ||
        (p.iniciales || '').toLowerCase().includes(busquedaLower)
      );
    }
    
    if (turnoFiltro) {
      profesoresFiltrados = profesoresFiltrados.filter(p => 
        (p.turno || p.ultimoTurno || '').toLowerCase() === turnoFiltro.toLowerCase()
      );
    }
    
    if (profesoresFiltrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-text-muted">
            <span class="text-3xl block mb-2">🔍</span>
            No se encontraron profesores
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = '';
    
    profesoresFiltrados.forEach(prof => {
      const iniciales = prof.iniciales || generarIniciales(prof.nombre, prof.apellidos);
      const grupos = prof.gruposArray || parsearGrupos(prof.grupos);
      const turno = prof.turno || prof.ultimoTurno || 'N/A';
      const estaVinculado = prof.iniciales && prof.gruposArray;
      
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border-subtle hover:bg-surface-light/30 transition-colors';
      
      tr.innerHTML = `
        <td class="py-4 pr-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
              ${iniciales}
            </div>
            <div>
              <p class="font-medium text-text-main">${prof.nombre} ${prof.apellidos || ''}</p>
              <p class="text-xs text-text-muted">📱 ${prof.telefono || 'Sin teléfono'}</p>
            </div>
          </div>
        </td>
        <td class="py-4">
          <span class="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm font-mono font-bold">
            ${iniciales}
          </span>
        </td>
        <td class="py-4 text-text-main">${prof.materias || 'N/A'}</td>
        <td class="py-4">
          <div class="flex flex-wrap gap-1">
            ${grupos.length > 0 ? grupos.map(g => `
              <span class="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">${g}</span>
            `).join('') : '<span class="text-text-muted">N/A</span>'}
          </div>
        </td>
        <td class="py-4">
          <span class="px-2 py-1 ${turno === 'Matutino' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'} rounded-lg text-xs">
            ${turno === 'Matutino' ? '🌅' : '🌙'} ${turno}
          </span>
        </td>
        <td class="py-4">
          ${estaVinculado ? `
            <span class="px-2 py-1 bg-success/20 text-success rounded-lg text-xs flex items-center gap-1 w-fit">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Vinculado
            </span>
          ` : `
            <span class="px-2 py-1 bg-warning/20 text-warning rounded-lg text-xs">
              ⏳ Pendiente
            </span>
          `}
        </td>
        <td class="py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="verDetalleProfesor('${prof.id}')" class="p-2 hover:bg-surface-light rounded-lg transition-colors" title="Ver detalle">
              <svg class="w-4 h-4 text-text-muted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button onclick="editarProfesorHorarios('${prof.id}')" class="p-2 hover:bg-surface-light rounded-lg transition-colors" title="Editar">
              <svg class="w-4 h-4 text-text-muted hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            ${!estaVinculado ? `
              <button onclick="vincularProfesorIndividual('${prof.id}')" class="p-2 hover:bg-success/20 rounded-lg transition-colors" title="Vincular">
                <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
  } catch (error) {
    console.error('Error cargando profesores:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-danger">
          <span class="text-3xl block mb-2">⚠️</span>
          Error al cargar profesores
        </td>
      </tr>
    `;
  }
}

// ========================
// 🔹 TABLA DE ASIGNACIONES
// ========================
async function cargarTablaAsignaciones(busqueda = '') {
  const tbody = document.getElementById('tabla-asignaciones');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-text-muted">
        <span class="text-3xl block mb-2">⏳</span>
        Cargando asignaciones...
      </td>
    </tr>
  `;
  
  try {
    const asignacionesSnap = await db.collection('asignaciones')
      .where('activa', '==', true)
      .get();
    
    if (asignacionesSnap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-text-muted">
            <span class="text-3xl block mb-2">📋</span>
            No hay asignaciones creadas
            <br>
            <button onclick="crearAsignacionesUI()" class="mt-4 py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-sm font-medium transition-all">
              + Crear asignaciones automáticas
            </button>
          </td>
        </tr>
      `;
      return;
    }
    
    const asignaciones = [];
    asignacionesSnap.forEach(doc => {
      asignaciones.push({ id: doc.id, ...doc.data() });
    });
    
    // Filtrar si hay búsqueda
    let asignacionesFiltradas = asignaciones;
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      asignacionesFiltradas = asignaciones.filter(a =>
        (a.profesorNombre || '').toLowerCase().includes(busquedaLower) ||
        (a.materiaNombre || '').toLowerCase().includes(busquedaLower) ||
        (a.grupoNombre || '').toLowerCase().includes(busquedaLower)
      );
    }
    
    tbody.innerHTML = '';
    
    asignacionesFiltradas.forEach(asig => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border-subtle hover:bg-surface-light/30 transition-colors';
      
      tr.innerHTML = `
        <td class="py-4">
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 bg-primary/20 text-primary rounded font-mono text-xs">${asig.profesorIniciales || '--'}</span>
            <span class="text-text-main">${asig.profesorNombre || 'N/A'}</span>
          </div>
        </td>
        <td class="py-4 text-text-main">${asig.materiaNombre || 'N/A'}</td>
        <td class="py-4">
          <span class="px-2 py-1 bg-accent/20 text-accent rounded text-sm font-medium">${asig.grupoNombre || 'N/A'}</span>
        </td>
        <td class="py-4">
          <span class="px-2 py-1 ${asig.turno === 'Matutino' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'} rounded text-xs">
            ${asig.turno || 'N/A'}
          </span>
        </td>
        <td class="py-4 text-text-muted text-sm">${asig.cicloEscolar || 'N/A'}</td>
        <td class="py-4 text-right">
          <button onclick="eliminarAsignacion('${asig.id}')" class="p-2 hover:bg-danger/20 rounded-lg transition-colors" title="Eliminar">
            <svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
  } catch (error) {
    console.error('Error cargando asignaciones:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-danger">
          <span class="text-3xl block mb-2">⚠️</span>
          Error al cargar asignaciones
        </td>
      </tr>
    `;
  }
}

// ========================
// 🔹 GRID DE GRUPOS
// ========================
async function cargarGridGrupos() {
  const container = document.getElementById('grid-grupos');
  if (!container) return;
  
  const filtroSemestre = document.getElementById('filtro-semestre-grupo')?.value || '';
  const filtroTurno = document.getElementById('filtro-turno-grupo')?.value || '';
  
  // Obtener todos los grupos
  let grupos = obtenerTodosLosGrupos();
  
  // Filtrar
  if (filtroSemestre) {
    grupos = grupos.filter(g => g.semestre === parseInt(filtroSemestre));
  }
  if (filtroTurno) {
    grupos = grupos.filter(g => g.turno === filtroTurno);
  }
  
  // Contar asignaciones por grupo
  const asignacionesSnap = await db.collection('asignaciones')
    .where('activa', '==', true)
    .get();
  
  const asignacionesPorGrupo = {};
  asignacionesSnap.forEach(doc => {
    const data = doc.data();
    const grupoId = data.grupoId || `${data.semestre}${data.grupo}`;
    asignacionesPorGrupo[grupoId] = (asignacionesPorGrupo[grupoId] || 0) + 1;
  });
  
  container.innerHTML = '';
  
  grupos.forEach(grupo => {
    const asignaciones = asignacionesPorGrupo[grupo.id] || 0;
    const colorBorde = grupo.turno === 'Matutino' ? 'border-warning' : 'border-primary';
    const bgColor = grupo.turno === 'Matutino' ? 'from-warning/10' : 'from-primary/10';
    
    const card = document.createElement('div');
    card.className = `glass rounded-xl p-4 border-l-4 ${colorBorde} hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br ${bgColor} to-transparent`;
    card.onclick = () => verHorarioGrupo(grupo.semestre, grupo.seccion);
    
    card.innerHTML = `
      <div class="text-center">
        <p class="text-2xl font-bold text-text-main">${grupo.nombre}</p>
        <p class="text-xs text-text-muted mt-1">${grupo.turno}</p>
        <div class="mt-3 pt-3 border-t border-border-subtle">
          <p class="text-xs text-text-muted">Asignaciones</p>
          <p class="text-lg font-bold ${asignaciones > 0 ? 'text-success' : 'text-text-muted'}">${asignaciones}</p>
        </div>
        ${grupo.carrera ? `
          <p class="text-xs text-accent mt-2">${grupo.carrera.nombre}</p>
        ` : ''}
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ========================
// 🔹 GRID DE MATERIAS
// ========================
function cargarGridMaterias(busqueda = '', tipoFiltro = '') {
  const container = document.getElementById('grid-materias');
  if (!container) return;
  
  const materias = Object.entries(CATALOGO_MATERIAS);
  
  // Filtrar
  let materiasFiltradas = materias;
  
  if (busqueda) {
    const busquedaLower = busqueda.toLowerCase();
    materiasFiltradas = materiasFiltradas.filter(([clave, m]) =>
      m.nombre.toLowerCase().includes(busquedaLower) ||
      m.abreviatura.toLowerCase().includes(busquedaLower) ||
      clave.toLowerCase().includes(busquedaLower)
    );
  }
  
  if (tipoFiltro) {
    materiasFiltradas = materiasFiltradas.filter(([_, m]) => m.tipo === tipoFiltro);
  }
  
  container.innerHTML = '';
  
  materiasFiltradas.forEach(([clave, materia]) => {
    const colorTipo = materia.tipo === 'basica' ? 'border-success' : 
                      materia.tipo === 'especialidad' ? 'border-accent' : 'border-primary';
    const bgTipo = materia.tipo === 'basica' ? 'bg-success/10' : 
                   materia.tipo === 'especialidad' ? 'bg-accent/10' : 'bg-primary/10';
    
    const card = document.createElement('div');
    card.className = `glass rounded-xl p-4 border-l-4 ${colorTipo} hover:shadow-lg transition-all`;
    
    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <span class="px-2 py-1 ${bgTipo} rounded text-xs font-mono font-bold">${materia.abreviatura}</span>
        <span class="text-xs text-text-muted">${materia.horas}h</span>
      </div>
      <h4 class="font-medium text-text-main text-sm leading-tight">${materia.nombre}</h4>
      <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <span class="px-2 py-0.5 bg-surface-light rounded">Sem ${materia.semestre}°</span>
        <span class="capitalize">${materia.tipo}</span>
      </div>
      ${materia.carrera ? `
        <p class="text-xs text-accent mt-2">📚 ${CARRERAS[materia.carrera]?.nombre || materia.carrera}</p>
      ` : ''}
    `;
    
    container.appendChild(card);
  });
  
  if (materiasFiltradas.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-text-muted">
        <span class="text-3xl block mb-2">🔍</span>
        No se encontraron materias
      </div>
    `;
  }
}

// ========================
// 🔹 ACCIONES
// ========================

// Vincular todos los profesores
async function vincularProfesoresUI() {
  if (!confirm('¿Vincular todos los profesores con el sistema de horarios?\n\nEsto generará iniciales y procesará los grupos de cada profesor.')) {
    return;
  }
  
  mostrarNotificacion('⏳ Vinculando profesores...', 'info');
  
  try {
    const resultado = await vincularTodosProfesores();
    
    mostrarNotificacion(`✅ ${resultado.actualizados} profesores vinculados`, 'success');
    
    // Recargar tabla
    await cargarTablaProfesores();
    await cargarEstadisticasHorarios();
    
  } catch (error) {
    console.error('Error vinculando profesores:', error);
    mostrarNotificacion('❌ Error al vincular profesores', 'error');
  }
}

// Crear todas las asignaciones
async function crearAsignacionesUI() {
  if (!confirm('¿Crear asignaciones automáticas para todos los profesores?\n\nEsto vinculará cada profesor con sus grupos y materias.')) {
    return;
  }
  
  mostrarNotificacion('⏳ Creando asignaciones...', 'info');
  
  try {
    const total = await crearTodasLasAsignaciones();
    
    mostrarNotificacion(`✅ ${total} asignaciones creadas`, 'success');
    
    // Recargar datos
    await cargarTablaAsignaciones();
    await cargarEstadisticasHorarios();
    
  } catch (error) {
    console.error('Error creando asignaciones:', error);
    mostrarNotificacion('❌ Error al crear asignaciones', 'error');
  }
}

// Vincular profesor individual
async function vincularProfesorIndividual(profesorId) {
  mostrarNotificacion('⏳ Vinculando profesor...', 'info');
  
  try {
    // Obtener datos del profesor
    const profDoc = await db.collection('profesores').doc(profesorId).get();
    if (!profDoc.exists) {
      mostrarNotificacion('❌ Profesor no encontrado', 'error');
      return;
    }
    
    const prof = profDoc.data();
    
    // Generar datos
    const iniciales = generarIniciales(prof.nombre, prof.apellidos);
    const gruposArray = parsearGrupos(prof.grupos);
    const materiaInfo = vincularMateria(prof.materias);
    
    let turnoDetectado = prof.turno || prof.ultimoTurno;
    if (!turnoDetectado && gruposArray.length > 0) {
      const primerGrupo = gruposArray[0];
      const letra = primerGrupo.replace(/[0-9°]/g, '').toUpperCase();
      turnoDetectado = obtenerTurnoPorGrupo(letra);
    }
    
    // Actualizar
    await db.collection('profesores').doc(profesorId).update({
      iniciales,
      gruposArray,
      turno: turnoDetectado,
      materiasVinculadas: materiaInfo?.claves || [],
      materiaNombre: materiaInfo?.nombre || prof.materias,
      cicloEscolar: CONFIG_HORARIOS.cicloEscolar,
      actualizadoHorarios: new Date().toISOString()
    });
    
    // Crear asignaciones
    await crearAsignacionesProfesor(profesorId);
    
    mostrarNotificacion(`✅ ${prof.nombre} vinculado correctamente`, 'success');
    
    // Recargar
    await cargarTablaProfesores();
    await cargarEstadisticasHorarios();
    
  } catch (error) {
    console.error('Error vinculando profesor:', error);
    mostrarNotificacion('❌ Error al vincular profesor', 'error');
  }
}

// Ver detalle del profesor
async function verDetalleProfesor(profesorId) {
  try {
    const profDoc = await db.collection('profesores').doc(profesorId).get();
    if (!profDoc.exists) {
      mostrarNotificacion('❌ Profesor no encontrado', 'error');
      return;
    }
    
    const prof = profDoc.data();
    const iniciales = prof.iniciales || generarIniciales(prof.nombre, prof.apellidos);
    const grupos = prof.gruposArray || parsearGrupos(prof.grupos);
    
    // Obtener asignaciones
    const asignacionesSnap = await db.collection('asignaciones')
      .where('profesorId', '==', profesorId)
      .where('activa', '==', true)
      .get();
    
    const asignaciones = [];
    asignacionesSnap.forEach(doc => asignaciones.push(doc.data()));
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'modal-detalle-profesor';
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-in-up">
        <div class="p-6 border-b border-border-subtle">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl">
              ${iniciales}
            </div>
            <div>
              <h3 class="text-xl font-bold text-text-main">${prof.nombre} ${prof.apellidos || ''}</h3>
              <p class="text-text-muted">📱 ${prof.telefono || 'Sin teléfono'}</p>
            </div>
          </div>
        </div>
        
        <div class="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-4">
            <div class="glass rounded-xl p-4">
              <p class="text-text-muted text-sm">Iniciales</p>
              <p class="text-2xl font-bold text-primary font-mono">${iniciales}</p>
            </div>
            <div class="glass rounded-xl p-4">
              <p class="text-text-muted text-sm">Turno</p>
              <p class="text-lg font-bold text-text-main">${prof.turno || prof.ultimoTurno || 'N/A'}</p>
            </div>
          </div>
          
          <div class="glass rounded-xl p-4">
            <p class="text-text-muted text-sm mb-2">Materia</p>
            <p class="text-text-main font-medium">${prof.materias || 'N/A'}</p>
            ${prof.materiasVinculadas?.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${prof.materiasVinculadas.map(m => `
                  <span class="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">${m}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="glass rounded-xl p-4">
            <p class="text-text-muted text-sm mb-2">Grupos</p>
            <div class="flex flex-wrap gap-2">
              ${grupos.length > 0 ? grupos.map(g => `
                <span class="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm font-medium">${g}</span>
              `).join('') : '<span class="text-text-muted">Sin grupos asignados</span>'}
            </div>
          </div>
          
          <div class="glass rounded-xl p-4">
            <p class="text-text-muted text-sm mb-2">Asignaciones (${asignaciones.length})</p>
            ${asignaciones.length > 0 ? `
              <div class="space-y-2 max-h-32 overflow-y-auto">
                ${asignaciones.map(a => `
                  <div class="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span class="text-text-main">${a.grupoNombre}</span>
                    <span class="text-text-muted text-sm">${a.materiaNombre}</span>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-text-muted">Sin asignaciones</p>'}
          </div>
        </div>
        
        <div class="p-4 border-t border-border-subtle flex justify-end gap-3">
          <button onclick="document.getElementById('modal-detalle-profesor').remove()" class="py-2 px-4 bg-surface-light hover:bg-surface rounded-xl text-sm font-medium text-text-main transition-all">
            Cerrar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error viendo detalle:', error);
    mostrarNotificacion('❌ Error al cargar detalles', 'error');
  }
}

// Editar profesor (abre modal)
async function editarProfesorHorarios(profesorId) {
  try {
    const profDoc = await db.collection('profesores').doc(profesorId).get();
    if (!profDoc.exists) {
      mostrarNotificacion('❌ Profesor no encontrado', 'error');
      return;
    }
    
    const prof = profDoc.data();
    
    const modal = document.createElement('div');
    modal.id = 'modal-editar-profesor';
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="glass rounded-2xl w-full max-w-md overflow-hidden animate-slide-in-up">
        <div class="p-6 border-b border-border-subtle">
          <h3 class="text-xl font-bold text-text-main flex items-center gap-2">
            ✏️ Editar Profesor
          </h3>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-text-muted text-sm mb-2">Nombre</label>
            <input type="text" id="edit-prof-nombre" value="${prof.nombre || ''}" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
          </div>
          
          <div>
            <label class="block text-text-muted text-sm mb-2">Apellidos</label>
            <input type="text" id="edit-prof-apellidos" value="${prof.apellidos || ''}" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
          </div>
          
          <div>
            <label class="block text-text-muted text-sm mb-2">Iniciales</label>
            <input type="text" id="edit-prof-iniciales" value="${prof.iniciales || ''}" maxlength="3" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50 font-mono uppercase">
          </div>
          
          <div>
            <label class="block text-text-muted text-sm mb-2">Materia</label>
            <input type="text" id="edit-prof-materia" value="${prof.materias || ''}" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
          </div>
          
          <div>
            <label class="block text-text-muted text-sm mb-2">Grupos (separados por coma)</label>
            <input type="text" id="edit-prof-grupos" value="${prof.grupos || ''}" placeholder="Ej: 5E, 5C, 5F" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
          </div>
          
          <div>
            <label class="block text-text-muted text-sm mb-2">Turno</label>
            <select id="edit-prof-turno" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
              <option value="">Seleccionar...</option>
              <option value="Matutino" ${prof.turno === 'Matutino' ? 'selected' : ''}>Matutino</option>
              <option value="Vespertino" ${prof.turno === 'Vespertino' ? 'selected' : ''}>Vespertino</option>
            </select>
          </div>
        </div>
        
        <div class="p-4 border-t border-border-subtle flex justify-end gap-3">
          <button onclick="document.getElementById('modal-editar-profesor').remove()" class="py-2 px-4 bg-surface-light hover:bg-surface rounded-xl text-sm font-medium text-text-main transition-all">
            Cancelar
          </button>
          <button onclick="guardarEdicionProfesor('${profesorId}')" class="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-all">
            Guardar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error editando profesor:', error);
    mostrarNotificacion('❌ Error al cargar datos', 'error');
  }
}

// Guardar edición de profesor
async function guardarEdicionProfesor(profesorId) {
  const nombre = document.getElementById('edit-prof-nombre')?.value.trim();
  const apellidos = document.getElementById('edit-prof-apellidos')?.value.trim();
  const iniciales = document.getElementById('edit-prof-iniciales')?.value.trim().toUpperCase();
  const materias = document.getElementById('edit-prof-materia')?.value.trim();
  const grupos = document.getElementById('edit-prof-grupos')?.value.trim();
  const turno = document.getElementById('edit-prof-turno')?.value;
  
  if (!nombre) {
    mostrarNotificacion('⚠️ El nombre es obligatorio', 'warning');
    return;
  }
  
  try {
    const gruposArray = parsearGrupos(grupos);
    const materiaInfo = vincularMateria(materias);
    
    await db.collection('profesores').doc(profesorId).update({
      nombre,
      apellidos,
      iniciales: iniciales || generarIniciales(nombre, apellidos),
      materias,
      grupos,
      gruposArray,
      turno,
      materiasVinculadas: materiaInfo?.claves || [],
      materiaNombre: materiaInfo?.nombre || materias,
      actualizado: new Date().toISOString()
    });
    
    document.getElementById('modal-editar-profesor')?.remove();
    mostrarNotificacion('✅ Profesor actualizado', 'success');
    
    await cargarTablaProfesores();
    
  } catch (error) {
    console.error('Error guardando profesor:', error);
    mostrarNotificacion('❌ Error al guardar', 'error');
  }
}

// Eliminar asignación
async function eliminarAsignacion(asignacionId) {
  if (!confirm('¿Eliminar esta asignación?')) return;
  
  try {
    await db.collection('asignaciones').doc(asignacionId).update({
      activa: false,
      eliminado: new Date().toISOString()
    });
    
    mostrarNotificacion('✅ Asignación eliminada', 'success');
    await cargarTablaAsignaciones();
    await cargarEstadisticasHorarios();
    
  } catch (error) {
    console.error('Error eliminando asignación:', error);
    mostrarNotificacion('❌ Error al eliminar', 'error');
  }
}

// Ver horario de grupo
async function verHorarioGrupo(semestre, grupo) {
  mostrarNotificacion('⏳ Cargando horario...', 'info');
  
  const horario = await cargarHorarioGrupo(semestre, grupo);
  
  if (!horario) {
    mostrarNotificacion('ℹ️ Este grupo no tiene horario programado', 'info');
    return;
  }
  
  // Crear modal con horario
  const modal = document.createElement('div');
  modal.id = 'modal-horario-grupo';
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slide-in-up">
      <div class="p-6 border-b border-border-subtle flex items-center justify-between">
        <h3 class="text-xl font-bold text-text-main">📅 Horario ${semestre}°${grupo}</h3>
        <button onclick="document.getElementById('modal-horario-grupo').remove()" class="p-2 hover:bg-surface-light rounded-lg">
          <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-6 overflow-auto" id="container-horario-grupo">
        Cargando...
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Renderizar horario
  renderizarHorarioTabla(horario, 'container-horario-grupo');
}

// ========================
// 🔹 UTILIDADES
// ========================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function animarContadorHorarios(elementId, valorFinal) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const valorInicial = parseInt(element.textContent) || 0;
  const duracion = 800;
  const pasos = 20;
  const incremento = (valorFinal - valorInicial) / pasos;
  let paso = 0;
  
  const intervalo = setInterval(() => {
    paso++;
    element.textContent = Math.round(valorInicial + (incremento * paso));
    
    if (paso >= pasos) {
      element.textContent = valorFinal;
      clearInterval(intervalo);
    }
  }, duracion / pasos);
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.inicializarHorariosAdmin = inicializarHorariosAdmin;
window.cargarTablaProfesores = cargarTablaProfesores;
window.cargarTablaAsignaciones = cargarTablaAsignaciones;
window.cargarGridGrupos = cargarGridGrupos;
window.cargarGridMaterias = cargarGridMaterias;
window.vincularProfesoresUI = vincularProfesoresUI;
window.crearAsignacionesUI = crearAsignacionesUI;
window.vincularProfesorIndividual = vincularProfesorIndividual;
window.verDetalleProfesor = verDetalleProfesor;
window.editarProfesorHorarios = editarProfesorHorarios;
window.guardarEdicionProfesor = guardarEdicionProfesor;
window.eliminarAsignacion = eliminarAsignacion;
window.verHorarioGrupo = verHorarioGrupo;

console.log('📅 Horarios Admin UI cargado');
