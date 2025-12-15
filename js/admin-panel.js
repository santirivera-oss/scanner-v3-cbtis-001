// ========================
// 🎛️ PANEL ADMIN PROFESIONAL - TIEMPO REAL
// ========================

// ========================
// 🔹 VARIABLES GLOBALES
// ========================
let alumnosData = [];
let profesoresData = [];
let filtroActual = "";
let historialAdmin = [];
let statsAnimated = false;

// Referencias a elementos (se inicializan en DOMContentLoaded)
let cardAlumnos, cardProfesores, cardRegistrosHoy, cardClasesActivas;
let usuariosTableBody, registrosTableBody, sesionesTableBody;
let buscarUsuarioInput, filtroFechaInput, filtroSesionesFecha;
let historialListAdmin, exportHistorialBtn;

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎛️ Iniciando Panel Admin Profesional...');
  
  // Obtener referencias a elementos
  cardAlumnos = document.getElementById("card-alumnos");
  cardProfesores = document.getElementById("card-profesores");
  cardRegistrosHoy = document.getElementById("card-registros-hoy");
  cardClasesActivas = document.getElementById("card-clases-activas");
  
  usuariosTableBody = document.querySelector("#usuarios-table tbody");
  registrosTableBody = document.querySelector("#registros-table tbody");
  sesionesTableBody = document.querySelector("#sesiones-table tbody");
  
  buscarUsuarioInput = document.getElementById("buscar-usuario");
  filtroFechaInput = document.getElementById("filtro-fecha");
  filtroSesionesFecha = document.getElementById("filtro-sesiones-fecha");
  historialListAdmin = document.getElementById("historial-list-admin");
  exportHistorialBtn = document.getElementById("export-historial-admin");
  
  // Iniciar listeners en tiempo real
  iniciarListenersTiempoReal();
  
  // Configurar eventos de UI
  configurarEventosUI();
  
  // Cargar datos iniciales
  cargarEstadisticasAdmin();
});

// ========================
// 🔹 LISTENERS EN TIEMPO REAL (FIRESTORE)
// ========================
function iniciarListenersTiempoReal() {
  // Listener de alumnos
  db.collection("alumnos").onSnapshot(snapshot => {
    alumnosData = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        tipo: "Alumno",
        nombre: d.nombre || "",
        apellidos: d.apellidos || "",
        grado: d.grado || "",
        grupo: d.grupo || "",
        control: d.control || "",
        materias: "",
        telefono: d.whatsapp || ""
      };
    });
    actualizarTablaDebounced();
    actualizarContadorAnimado(cardAlumnos, alumnosData.length, '🎓', 'Alumnos');
  });

  // Listener de profesores
  db.collection("profesores").onSnapshot(snapshot => {
    profesoresData = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        tipo: "Profesor",
        nombre: d.nombre || "",
        apellidos: d.apellidos || "",
        grado: "",
        grupo: d.grupos || "",
        control: d.control || "",
        materias: d.materias || "",
        telefono: d.telefono || ""
      };
    });
    actualizarTablaDebounced();
    actualizarContadorAnimado(cardProfesores, profesoresData.length, '👩‍🏫', 'Profesores');
  });

  // Listener de registros de hoy
  const fechaHoy = new Date();
  fechaHoy.setHours(0, 0, 0, 0);
  
  db.collection("registros")
    .where("fecha", ">=", fechaHoy.toISOString())
    .onSnapshot(snapshot => {
      actualizarContadorAnimado(cardRegistrosHoy, snapshot.size, '📋', 'Registros Hoy');
      
      // Actualizar actividad reciente
      const registrosRecientes = [];
      snapshot.forEach(doc => {
        const r = doc.data();
        registrosRecientes.push({
          nombreCompleto: r.nombreCompleto || r.alumno || 'Desconocido',
          tipo: r.tipo || 'N/A',
          hora: r.fecha ? new Date(r.fecha).toLocaleTimeString() : '',
          evento: r.evento || 'registro'
        });
      });
      
      // Ordenar por hora descendente y tomar los últimos 10
      registrosRecientes.sort((a, b) => b.hora.localeCompare(a.hora));
      actualizarActividadReciente(registrosRecientes.slice(0, 15));
    });

  // Listener de clases activas
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  
  db.collection("sesiones")
    .where("inicio", ">=", inicioDia.toISOString())
    .onSnapshot(snapshot => {
      let clasesActivas = 0;
      snapshot.forEach(doc => {
        const sesion = doc.data();
        if (sesion.estado && sesion.estado.toLowerCase().includes('curso')) {
          clasesActivas++;
        }
      });
      actualizarContadorAnimado(cardClasesActivas, clasesActivas, '📚', 'Clases Activas');
    });
}

// ========================
// 🔹 ANIMACIÓN DE CONTADORES
// ========================
function actualizarContadorAnimado(elemento, valorFinal, icono, label) {
  if (!elemento) return;
  
  const valorActual = parseInt(elemento.dataset.valor) || 0;
  elemento.dataset.valor = valorFinal;
  
  // Animación de conteo
  const duracion = 1000;
  const pasos = 30;
  const incremento = (valorFinal - valorActual) / pasos;
  let paso = 0;
  
  const intervalo = setInterval(() => {
    paso++;
    const valorAnimado = Math.round(valorActual + (incremento * paso));
    
    elemento.innerHTML = `
      <div class="card-icon">${icono}</div>
      <div class="card-content">
        <span class="card-value">${valorAnimado}</span>
        <span class="card-label">${label}</span>
      </div>
    `;
    
    if (paso >= pasos) {
      clearInterval(intervalo);
      elemento.innerHTML = `
        <div class="card-icon">${icono}</div>
        <div class="card-content">
          <span class="card-value">${valorFinal}</span>
          <span class="card-label">${label}</span>
        </div>
      `;
      
      // Efecto pulse al actualizar
      elemento.classList.add('pulse-update');
      setTimeout(() => elemento.classList.remove('pulse-update'), 500);
    }
  }, duracion / pasos);
}

// ========================
// 🔹 ACTIVIDAD RECIENTE (FEED EN VIVO)
// ========================
function actualizarActividadReciente(registros) {
  const container = document.getElementById('actividad-reciente-lista');
  if (!container) return;
  
  if (registros.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>No hay actividad reciente</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = registros.map((r, index) => `
    <div class="actividad-item" style="animation-delay: ${index * 0.05}s">
      <div class="actividad-avatar ${r.tipo === 'Alumno' ? 'avatar-alumno' : 'avatar-profesor'}">
        ${r.tipo === 'Alumno' ? '🎓' : '👩‍🏫'}
      </div>
      <div class="actividad-info">
        <span class="actividad-nombre">${r.nombreCompleto}</span>
        <span class="actividad-evento">${r.evento || 'Registro'}</span>
      </div>
      <div class="actividad-hora">${r.hora}</div>
    </div>
  `).join('');
}

// ========================
// 🔹 ESTADÍSTICAS ADMIN
// ========================
async function cargarEstadisticasAdmin() {
  try {
    const alumnosSnap = await db.collection("alumnos").get();
    const profesoresSnap = await db.collection("profesores").get();
    const fechaHoy = new Date().toISOString().split("T")[0];
    const registrosSnap = await db.collection("registros")
      .where("fecha", ">=", fechaHoy)
      .get();

    actualizarContadorAnimado(cardAlumnos, alumnosSnap.size, '🎓', 'Alumnos');
    actualizarContadorAnimado(cardProfesores, profesoresSnap.size, '👩‍🏫', 'Profesores');
    actualizarContadorAnimado(cardRegistrosHoy, registrosSnap.size, '📋', 'Registros Hoy');
  } catch(e) {
    console.error("Error cargando estadísticas:", e);
  }
}

// ========================
// 🔹 TABLA DE USUARIOS
// ========================
let renderTimeout;
function actualizarTablaDebounced() {
  cancelAnimationFrame(renderTimeout);
  renderTimeout = requestAnimationFrame(() => cargarTablaUsuarios(filtroActual));
}

async function cargarTablaUsuarios(filtro = "") {
  filtroActual = filtro.trim().toLowerCase();
  if (!usuariosTableBody) return;
  
  usuariosTableBody.innerHTML = "";
  const usuarios = [...alumnosData, ...profesoresData];

  const filtrados = usuarios.filter(u =>
    `${u.nombre} ${u.apellidos}`.toLowerCase().includes(filtroActual) ||
    u.tipo.toLowerCase().includes(filtroActual) ||
    (u.grado || "").toLowerCase().includes(filtroActual) ||
    (u.grupo || "").toLowerCase().includes(filtroActual) ||
    (u.control || "").toLowerCase().includes(filtroActual) ||
    (u.materias || "").toLowerCase().includes(filtroActual) ||
    (u.telefono || "").toLowerCase().includes(filtroActual)
  );

  if (filtrados.length === 0) {
    usuariosTableBody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-table">
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>No se encontraron usuarios</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtrados.forEach((u, index) => {
    const tr = document.createElement("tr");
    tr.style.animationDelay = `${index * 0.02}s`;
    tr.className = 'table-row-animate';
    tr.innerHTML = `
      <td>
        <div class="user-cell">
          <div class="user-avatar ${u.tipo === 'Alumno' ? 'avatar-alumno' : 'avatar-profesor'}">
            ${(u.nombre || 'U')[0].toUpperCase()}
          </div>
          <span>${u.nombre}</span>
        </div>
      </td>
      <td>${u.apellidos}</td>
      <td><span class="badge ${u.tipo === 'Alumno' ? 'badge-alumno' : 'badge-profesor'}">${u.tipo}</span></td>
      <td>${u.grado || '-'}</td>
      <td>${u.grupo || '-'}</td>
      <td><code>${u.control || '-'}</code></td>
      <td>${u.materias || '-'}</td>
      <td>${u.telefono || '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon btn-qr" onclick="descargarQR('${u.id}', '${u.tipo}')" title="Descargar QR">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button class="btn-icon btn-barcode" onclick="descargarBarcode('${u.id}', '${u.tipo}')" title="Descargar Código">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 5v14M6 5v14M9 5v14M12 5v14M15 5v14M18 5v14M21 5v14"></path>
            </svg>
          </button>
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon btn-edit" onclick='editarUsuario("${u.id}", "${u.tipo}", ${JSON.stringify(u).replace(/'/g, "\\'")})' title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon btn-delete" onclick="eliminarUsuario('${u.id}', '${u.tipo}')" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    usuariosTableBody.appendChild(tr);
  });
}

// ========================
// 🔹 TABLA DE REGISTROS
// ========================
async function cargarTablaRegistros(fechaFiltro = "") {
  if (!registrosTableBody) return;
  registrosTableBody.innerHTML = "";

  let query = db.collection("registros").orderBy("fecha", "desc").limit(100);

  if (fechaFiltro) {
    const inicio = new Date(fechaFiltro);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFiltro);
    fin.setHours(23, 59, 59, 999);
    query = db.collection("registros")
      .where("fecha", ">=", inicio.toISOString())
      .where("fecha", "<=", fin.toISOString())
      .orderBy("fecha", "desc");
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    registrosTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <p>No hay registros para esta fecha</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  snapshot.forEach((doc, index) => {
    const r = doc.data();
    const fecha = r.fecha ? r.fecha.split("T")[0] : "";
    const hora = r.fecha ? new Date(r.fecha).toLocaleTimeString() : "";
    const tr = document.createElement("tr");
    tr.className = 'table-row-animate';
    tr.style.animationDelay = `${index * 0.02}s`;
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${hora}</td>
      <td><span class="badge ${r.tipo === 'Alumno' ? 'badge-alumno' : 'badge-profesor'}">${r.tipo || '-'}</span></td>
      <td>${r.nombreCompleto || r.alumno || '-'}</td>
      <td>${r.profesor || '-'}</td>
      <td><span class="badge badge-evento">${r.evento || 'entrada'}</span></td>
    `;
    registrosTableBody.appendChild(tr);
  });
}

// ========================
// 🔹 TABLA DE SESIONES
// ========================
async function cargarTablaSesiones(fechaFiltro = '') {
  if (!sesionesTableBody) return;
  
  try {
    sesionesTableBody.innerHTML = '';
    let query = db.collection('sesiones').orderBy('inicio', 'desc').limit(50);

    if (fechaFiltro) {
      const inicio = new Date(dateFromInputSafe(fechaFiltro));
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(dateFromInputSafe(fechaFiltro));
      fin.setHours(23, 59, 59, 999);
      query = db.collection('sesiones')
        .where('inicio', '>=', inicio.toISOString())
        .where('inicio', '<=', fin.toISOString())
        .orderBy('inicio', 'desc');
    }

    const snap = await query.get();
    
    if (snap.empty) {
      sesionesTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-table">
            <div class="empty-state">
              <span class="empty-icon">📚</span>
              <p>No hay sesiones registradas</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    snap.forEach((doc, index) => {
      const s = doc.data();
      const inicio = s.inicio ? new Date(s.inicio).toLocaleString() : '';
      const fin = s.fin ? new Date(s.fin).toLocaleString() : '-';
      const numAlumnos = s.alumnos ? Object.keys(s.alumnos).length : 0;
      const esActiva = s.estado && s.estado.toLowerCase().includes('curso');
      
      const tr = document.createElement('tr');
      tr.className = 'table-row-animate';
      tr.style.animationDelay = `${index * 0.02}s`;
      tr.innerHTML = `
        <td><code class="session-id">${s.id ? s.id.slice(-8) : '-'}</code></td>
        <td>${s.profesor ? s.profesor.nombre + ' ' + s.profesor.apellidos : '-'}</td>
        <td><span class="badge badge-aula">${s.aula || '-'}</span></td>
        <td>${s.grado || '-'}° ${s.grupo || ''}</td>
        <td>${inicio}</td>
        <td>${fin}</td>
        <td>
          <div class="alumnos-count">
            <span class="count-number">${numAlumnos}</span>
            <span class="count-label">alumnos</span>
          </div>
        </td>
        <td><span class="badge ${esActiva ? 'badge-activa' : 'badge-finalizada'}">${s.estado || '-'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-view" onclick="verSesion('${s.id}')" title="Ver detalles">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="btn-icon btn-download" onclick="descargarSesion('${s.id}')" title="Descargar Excel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </td>
      `;
      sesionesTableBody.appendChild(tr);
    });
  } catch (e) {
    console.error('cargarTablaSesiones:', e);
  }
}

// ========================
// 🔹 CONFIGURAR EVENTOS UI
// ========================
function configurarEventosUI() {
  // Búsqueda de usuarios
  if (buscarUsuarioInput) {
    buscarUsuarioInput.addEventListener("input", (e) => {
      cargarTablaUsuarios(e.target.value);
    });
  }
  
  // Filtro de fecha registros
  if (filtroFechaInput) {
    filtroFechaInput.addEventListener("change", e => {
      cargarTablaRegistros(e.target.value);
    });
  }
  
  // Filtro de fecha sesiones
  if (filtroSesionesFecha) {
    filtroSesionesFecha.addEventListener('change', e => {
      cargarTablaSesiones(e.target.value);
    });
  }
  
  // Exportar historial
  if (exportHistorialBtn) {
    exportHistorialBtn.addEventListener("click", exportarHistorial);
  }
  
  // Exportar usuarios - buscar por múltiples IDs posibles
  const btnExportUsuarios = document.getElementById("btn-export-usuarios") || 
                            document.getElementById("export-usuarios") ||
                            document.getElementById("btnExportUsuarios");
  if (btnExportUsuarios) {
    btnExportUsuarios.addEventListener("click", exportarUsuariosExcel);
    console.log('✅ Botón exportar usuarios configurado');
  } else {
    console.warn('⚠️ Botón exportar usuarios no encontrado');
  }
  
  // Exportar registros - buscar por múltiples IDs posibles
  const btnExportRegistros = document.getElementById("btn-export-registros") || 
                             document.getElementById("export-registros") ||
                             document.getElementById("btnExportRegistros");
  if (btnExportRegistros) {
    btnExportRegistros.addEventListener("click", exportarRegistrosCSV);
    console.log('✅ Botón exportar registros configurado');
  } else {
    console.warn('⚠️ Botón exportar registros no encontrado');
  }
}

// ========================
// 🔹 ELIMINAR USUARIO
// ========================
async function eliminarUsuario(id, tipo) {
  // Crear modal de confirmación elegante
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-confirm">
      <div class="modal-icon modal-icon-danger">🗑️</div>
      <h3>¿Eliminar usuario?</h3>
      <p>Esta acción no se puede deshacer</p>
      <div class="modal-buttons">
        <button class="btn-cancel" id="btn-cancel-delete">Cancelar</button>
        <button class="btn-danger" id="btn-confirm-delete">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // Animar entrada
  setTimeout(() => overlay.classList.add('show'), 10);
  
  document.getElementById('btn-cancel-delete').onclick = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };
  
  document.getElementById('btn-confirm-delete').onclick = async () => {
    try {
      const coleccion = tipo === "Alumno" ? "alumnos" : "profesores";
      await db.collection(coleccion).doc(id).delete();
      
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
      
      mostrarNotificacion('✅ Usuario eliminado correctamente', 'success');
      cargarEstadisticasAdmin();
    } catch (e) {
      console.error("Error eliminando usuario:", e);
      mostrarNotificacion('❌ Error al eliminar usuario', 'error');
    }
  };
}

// ========================
// 🔹 EDITAR USUARIO
// ========================
function editarUsuario(id, tipo, datos) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-edit">
      <div class="modal-header">
        <h3>✏️ Editar ${tipo}</h3>
        <button class="btn-close-modal" id="btn-close-edit">×</button>
      </div>
      <form id="form-editar-usuario" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" id="edit-nombre" value="${datos.nombre || ''}" required>
          </div>
          <div class="form-group">
            <label>Apellidos</label>
            <input type="text" id="edit-apellidos" value="${datos.apellidos || ''}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Teléfono / WhatsApp</label>
          <input type="text" id="edit-telefono" value="${datos.telefono || ''}">
        </div>
        ${tipo === "Alumno" ? `
          <div class="form-row">
            <div class="form-group">
              <label>Grado</label>
              <input type="text" id="edit-grado" value="${datos.grado || ''}">
            </div>
            <div class="form-group">
              <label>No. Control</label>
              <input type="text" id="edit-control" value="${datos.control || ''}">
            </div>
          </div>
        ` : `
          <div class="form-row">
            <div class="form-group">
              <label>Materias</label>
              <input type="text" id="edit-materias" value="${datos.materias || ''}">
            </div>
            <div class="form-group">
              <label>Grupos</label>
              <input type="text" id="edit-grupos" value="${datos.grupo || ''}">
            </div>
          </div>
        `}
        <div class="modal-buttons">
          <button type="button" class="btn-cancel" id="btn-cancel-edit">Cancelar</button>
          <button type="submit" class="btn-primary">💾 Guardar cambios</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  
  setTimeout(() => overlay.classList.add('show'), 10);
  
  const cerrar = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };
  
  document.getElementById('btn-close-edit').onclick = cerrar;
  document.getElementById('btn-cancel-edit').onclick = cerrar;
  
  document.getElementById('form-editar-usuario').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const coleccion = tipo === "Alumno" ? "alumnos" : "profesores";
      const nuevosDatos = tipo === "Alumno"
        ? {
            nombre: document.getElementById('edit-nombre').value.trim(),
            apellidos: document.getElementById('edit-apellidos').value.trim(),
            whatsapp: document.getElementById('edit-telefono').value.trim(),
            grado: document.getElementById('edit-grado').value.trim(),
            control: document.getElementById('edit-control').value.trim(),
          }
        : {
            nombre: document.getElementById('edit-nombre').value.trim(),
            apellidos: document.getElementById('edit-apellidos').value.trim(),
            telefono: document.getElementById('edit-telefono').value.trim(),
            materias: document.getElementById('edit-materias').value.trim(),
            grupos: document.getElementById('edit-grupos').value.trim(),
          };

      await db.collection(coleccion).doc(id).update(nuevosDatos);
      cerrar();
      mostrarNotificacion('✅ Usuario actualizado correctamente', 'success');
    } catch (err) {
      console.error("Error al actualizar:", err);
      mostrarNotificacion('❌ Error al guardar los cambios', 'error');
    }
  };
}

// ========================
// 🔹 VER SESIÓN (MODAL)
// ========================
async function verSesion(id) {
  try {
    const doc = await db.collection('sesiones').doc(id).get();
    if (!doc.exists) return mostrarNotificacion('Sesión no encontrada', 'error');
    
    const s = doc.data();
    const alumnos = Object.values(s.alumnos || {});
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-session">
        <div class="modal-header">
          <h3>📚 Detalles de Sesión</h3>
          <button class="btn-close-modal" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="session-info">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Profesor</span>
              <span class="info-value">${s.profesor?.nombre || ''} ${s.profesor?.apellidos || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Aula</span>
              <span class="info-value">${s.aula || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Horario</span>
              <span class="info-value">${s.horario || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="info-value badge ${s.estado?.includes('curso') ? 'badge-activa' : 'badge-finalizada'}">${s.estado || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Inicio</span>
              <span class="info-value">${s.inicio ? new Date(s.inicio).toLocaleString() : '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fin</span>
              <span class="info-value">${s.fin ? new Date(s.fin).toLocaleString() : 'En curso'}</span>
            </div>
          </div>
        </div>
        <div class="session-alumnos">
          <h4>👥 Alumnos (${alumnos.length})</h4>
          <div class="alumnos-list">
            ${alumnos.length === 0 ? '<p class="empty-text">No hay alumnos registrados</p>' : 
              alumnos.map(a => `
                <div class="alumno-card">
                  <div class="alumno-header">
                    <span class="alumno-nombre">${a.nombre}</span>
                    <code class="alumno-control">${a.control || '-'}</code>
                  </div>
                  <div class="alumno-eventos">
                    ${(a.eventos || []).map(ev => `
                      <span class="evento-tag">${ev.tipo} - ${new Date(ev.ts).toLocaleTimeString()}</span>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="descargarSesion('${id}'); this.closest('.modal-overlay').remove();">
            📥 Descargar Excel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  } catch (e) {
    console.error('verSesion:', e);
    mostrarNotificacion('Error al cargar sesión', 'error');
  }
}

// ========================
// 🔹 DESCARGAR SESIÓN EXCEL
// ========================
async function descargarSesion(id) {
  try {
    const doc = await db.collection('sesiones').doc(id).get();
    if (!doc.exists) return mostrarNotificacion('Sesión no encontrada', 'error');
    const s = doc.data();

    let html = `
      <html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th { background: #06b6d4; color: white; padding: 12px; border: 1px solid #0891b2; }
        td { border: 1px solid #ddd; padding: 10px; }
        h2 { color: #0f172a; }
        .header-info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      </style></head><body>
      <h2>📚 Reporte de Sesión</h2>
      <div class="header-info">
        <p><strong>ID:</strong> ${s.id}</p>
        <p><strong>Profesor:</strong> ${s.profesor?.nombre || ''} ${s.profesor?.apellidos || ''}</p>
        <p><strong>Aula:</strong> ${s.aula} — <strong>Horario:</strong> ${s.horario}</p>
        <p><strong>Grado/Grupo:</strong> ${s.grado}° ${s.grupo} (${s.turno})</p>
        <p><strong>Inicio:</strong> ${new Date(s.inicio).toLocaleString()}</p>
        <p><strong>Fin:</strong> ${s.fin ? new Date(s.fin).toLocaleString() : 'En curso'}</p>
        <p><strong>Estado:</strong> ${s.estado}</p>
      </div>
      <h3>👥 Lista de Alumnos</h3>
      <table>
        <thead><tr><th>Nombre</th><th>No. Control</th><th>Eventos</th></tr></thead>
        <tbody>
    `;

    Object.values(s.alumnos || {}).forEach(a => {
      const evs = (a.eventos || []).map(ev => `${ev.tipo} @ ${new Date(ev.ts).toLocaleTimeString()}`).join('<br>');
      html += `<tr><td>${a.nombre}</td><td>${a.control || ''}</td><td>${evs}</td></tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Sesion_${id}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    mostrarNotificacion('📥 Sesión descargada', 'success');
  } catch (e) {
    console.error('descargarSesion:', e);
    mostrarNotificacion('Error al descargar', 'error');
  }
}

// ========================
// 🔹 DESCARGAR QR
// ========================
async function descargarQR(docId, tipo) {
  try {
    const coleccion = tipo === "Alumno" ? "alumnos" : "profesores";
    const docSnap = await db.collection(coleccion).doc(docId).get();
    if (!docSnap.exists) throw new Error("Documento no encontrado");
    const data = docSnap.data();

    const payload = JSON.stringify({ tipo, id: docId });
    const tempDiv = document.createElement("div");

    new QRCode(tempDiv, { text: payload, width: 200, height: 200 });
    
    setTimeout(() => {
      const canvas = tempDiv.querySelector("canvas");
      if (!canvas) throw new Error("No se pudo generar el QR");

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `QR_${tipo}_${data.nombre}_${data.apellidos}.png`;
      a.click();
      
      mostrarNotificacion('📱 QR descargado', 'success');
    }, 100);
  } catch (e) {
    console.error(e);
    mostrarNotificacion("Error generando QR: " + e.message, 'error');
  }
}

// ========================
// 🔹 DESCARGAR BARCODE
// ========================
async function descargarBarcode(docId, tipo) {
  try {
    const coleccion = tipo === "Alumno" ? "alumnos" : "profesores";
    const docSnap = await db.collection(coleccion).doc(docId).get();
    if (!docSnap.exists) throw new Error("Documento no encontrado");
    const data = docSnap.data();

    const codigo = tipo === "Alumno" ? data.control : data.telefono;
    if (!codigo) throw new Error("Código vacío");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, codigo, { format: "CODE128", width: 2, height: 50, displayValue: true });

    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Barcode_${tipo}_${data.nombre}_${data.apellidos}.svg`;
    a.click();

    URL.revokeObjectURL(url);
    mostrarNotificacion('📊 Código de barras descargado', 'success');
  } catch (e) {
    console.error("Error generando Barcode:", e);
    mostrarNotificacion("Error: " + e.message, 'error');
  }
}

// ========================
// 🔹 EXPORTAR FUNCIONES
// ========================
function exportarHistorial() {
  if (historialAdmin.length === 0) {
    mostrarNotificacion("No hay historial para exportar", 'warning');
    return;
  }

  let csv = "Hora,Nombre,Tipo\n";
  historialAdmin.forEach(item => {
    csv += `${item.hora},${item.nombreCompleto || ''},${item.tipo || ''}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `historial_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  
  mostrarNotificacion('📥 Historial exportado', 'success');
}

async function exportarUsuariosExcel() {
  try {
    mostrarNotificacion('⏳ Exportando usuarios...', 'info');
    
    const alumnosSnap = await db.collection("alumnos").get();
    const profesoresSnap = await db.collection("profesores").get();

    if (alumnosSnap.empty && profesoresSnap.empty) {
      mostrarNotificacion("No hay usuarios para exportar", 'warning');
      return;
    }

    // Tabla HTML con estilos profesionales (formato original)
    let tabla = `
      <html><head><meta charset="utf-8"></head><body>
      <table border="1" style="border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#06b6d4; color:white; font-weight:bold; text-align:center;">
            <th style="padding:10px;">Nombre</th>
            <th style="padding:10px;">Apellidos</th>
            <th style="padding:10px;">Tipo</th>
            <th style="padding:10px;">Grado / Grupo</th>
            <th style="padding:10px;">Control</th>
            <th style="padding:10px;">Materias</th>
            <th style="padding:10px;">Contacto</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Alumnos
    let index = 0;
    alumnosSnap.forEach((doc) => {
      const d = doc.data();
      const bg = index % 2 === 0 ? "#d1fae5" : "#ecfdf5"; // verde claro
      tabla += `
        <tr style="background-color:${bg}; text-align:center;">
          <td style="padding:8px;">${d.nombre || ''}</td>
          <td style="padding:8px;">${d.apellidos || ''}</td>
          <td style="padding:8px;">Alumno</td>
          <td style="padding:8px;">${d.grado || ''}</td>
          <td style="padding:8px;">${d.control ? "'" + d.control : ''}</td>
          <td style="padding:8px;"></td>
          <td style="padding:8px;">${d.whatsapp || ''}</td>
        </tr>
      `;
      index++;
    });

    // Separador
    tabla += `<tr><td colspan="7" style="height:10px; background-color:#ffffff;"></td></tr>`;

    // Profesores
    index = 0;
    profesoresSnap.forEach((doc) => {
      const d = doc.data();
      const bg = index % 2 === 0 ? "#ede9fe" : "#f5f3ff"; // violeta claro
      tabla += `
        <tr style="background-color:${bg}; text-align:center;">
          <td style="padding:8px;">${d.nombre || ''}</td>
          <td style="padding:8px;">${d.apellidos || ''}</td>
          <td style="padding:8px;">Profesor</td>
          <td style="padding:8px;">${d.grupos || ''}</td>
          <td style="padding:8px;"></td>
          <td style="padding:8px;">${d.materias || ''}</td>
          <td style="padding:8px;">${d.telefono || ''}</td>
        </tr>
      `;
      index++;
    });

    tabla += `</tbody></table></body></html>`;

    // Descargar archivo .xls
    const blob = new Blob([tabla], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `usuarios_${new Date().toISOString().split("T")[0]}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    mostrarNotificacion(`📥 ${alumnosSnap.size + profesoresSnap.size} usuarios exportados`, 'success');
  } catch (e) {
    console.error("Error exportando usuarios:", e);
    mostrarNotificacion("Error al exportar usuarios", 'error');
  }
}

async function exportarRegistrosCSV() {
  try {
    mostrarNotificacion('⏳ Exportando registros...', 'info');
    
    const snapshot = await db.collection("registros").orderBy("fecha", "desc").get();
    
    if (snapshot.empty) {
      mostrarNotificacion("No hay registros para exportar", 'warning');
      return;
    }

    let csv = "Fecha,Hora,Tipo,Nombre Completo,Profesor\n";
    snapshot.forEach(doc => {
      const r = doc.data();
      const fecha = r.fecha ? r.fecha.split("T")[0] : "";
      const hora = r.fecha ? new Date(r.fecha).toLocaleTimeString() : "";
      // Escapar comas en los campos
      const nombre = (r.nombreCompleto || r.alumno || '').replace(/,/g, ' ');
      const profesor = (r.profesor || '').replace(/,/g, ' ');
      csv += `${fecha},${hora},${r.tipo || ''},${nombre},${profesor}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registros_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    mostrarNotificacion(`📥 ${snapshot.size} registros exportados`, 'success');
  } catch (e) {
    console.error("Error exportando registros:", e);
    mostrarNotificacion("Error al exportar registros", 'error');
  }
}

// ========================
// 🔹 NOTIFICACIONES TOAST
// ========================
function mostrarNotificacion(mensaje, tipo = 'info') {
  const container = document.getElementById('toast-container') || crearToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  
  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${iconos[tipo] || iconos.info}</span>
    <span class="toast-message">${mensaje}</span>
  `;
  
  container.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto-cerrar
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function crearToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ========================
// 🔹 HELPERS
// ========================
function dateFromInputSafe(value) {
  if (!value) return new Date();
  return new Date(value + 'T00:00:00');
}

function agregarHistorialAdmin(datos) {
  historialAdmin.unshift({ ...datos, hora: new Date().toLocaleTimeString() });
  if (historialAdmin.length > 50) historialAdmin.pop();
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.cargarTablaUsuarios = cargarTablaUsuarios;
window.cargarTablaRegistros = cargarTablaRegistros;
window.cargarTablaSesiones = cargarTablaSesiones;
window.eliminarUsuario = eliminarUsuario;
window.editarUsuario = editarUsuario;
window.descargarQR = descargarQR;
window.descargarBarcode = descargarBarcode;
window.verSesion = verSesion;
window.descargarSesion = descargarSesion;
window.agregarHistorialAdmin = agregarHistorialAdmin;
window.mostrarNotificacion = mostrarNotificacion;
window.cargarEstadisticasAdmin = cargarEstadisticasAdmin;
