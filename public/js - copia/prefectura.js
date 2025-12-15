// ========================================
// 🛡️ SISTEMA DE PREFECTURA / DISCIPLINA
// Keyon Access System v2.0
// ========================================

// Variables globales
let alumnoSeleccionadoReporte = null;
let alumnoSeleccionadoPrefectura = null;

// Puntos por gravedad
const PUNTOS_GRAVEDAD = {
  leve: -5,
  moderada: -15,
  grave: -30,
  merito_leve: 5,
  merito_moderado: 10,
  merito_alto: 20
};

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  observarSeccionPrefectura('disciplina-alumno', cargarDisciplinaAlumno);
  observarSeccionPrefectura('reportar-profesor', cargarMisReportesProfesor);
  observarSeccionPrefectura('prefectura', cargarDashboardPrefectura);
  
  const filtroDisc = document.getElementById('filtro-disciplina-alumno');
  if (filtroDisc) {
    filtroDisc.addEventListener('change', () => filtrarHistorialDisciplina(filtroDisc.value));
  }
});

function observarSeccionPrefectura(id, callback) {
  const seccion = document.getElementById(id);
  if (seccion) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !seccion.classList.contains('hidden')) {
          callback();
        }
      });
    });
    observer.observe(seccion, { attributes: true });
  }
}

// ========================
// 🔹 DISCIPLINA - ALUMNO
// ========================
async function cargarDisciplinaAlumno() {
  const alumno = window.usuarioActual;
  if (!alumno) return;
  
  try {
    const reportesSnap = await db.collection('reportes')
      .where('alumnoId', '==', alumno.id || alumno.control)
      .get();
    
    let meritos = 0, demeritos = 0;
    const reportes = [];
    
    reportesSnap.forEach(doc => {
      const r = { _id: doc.id, ...doc.data() };
      reportes.push(r);
      if (r.tipo === 'positivo') meritos += Math.abs(r.puntos || 0);
      else demeritos += Math.abs(r.puntos || 0);
    });
    
    const puntosTotal = 100 + meritos - demeritos;
    document.getElementById('alumno-puntos-total').textContent = puntosTotal;
    document.getElementById('alumno-meritos').textContent = meritos;
    document.getElementById('alumno-demeritos').textContent = demeritos;
    
    renderizarHistorialDisciplinaAlumno(reportes);
    cargarCitatoriosAlumno(alumno.id || alumno.control);
  } catch (error) {
    console.error('Error cargando disciplina:', error);
  }
}

function renderizarHistorialDisciplinaAlumno(reportes) {
  const container = document.getElementById('historial-disciplina-alumno');
  if (!container) return;
  
  if (reportes.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-text-muted"><span class="text-5xl block mb-3 opacity-30">🛡️</span><p>No hay reportes</p></div>`;
    return;
  }
  
  reportes.sort((a, b) => {
    const fA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
    const fB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
    return fB - fA;
  });
  
  container.innerHTML = '';
  reportes.forEach(r => {
    const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
    const esPositivo = r.tipo === 'positivo';
    const div = document.createElement('div');
    div.className = `reporte-item p-4 rounded-xl ${esPositivo ? 'bg-success/10 border border-success/30' : 'bg-danger/10 border border-danger/30'}`;
    div.dataset.tipo = r.tipo;
    div.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full ${esPositivo ? 'bg-success' : 'bg-danger'} flex items-center justify-center text-white">${esPositivo ? '⭐' : '⚠️'}</div>
        <div class="flex-1">
          <div class="flex justify-between mb-1">
            <span class="font-medium text-text-main">${r.categoria || 'Sin categoría'}</span>
            <span class="font-bold ${esPositivo ? 'text-success' : 'text-danger'}">${esPositivo ? '+' : ''}${r.puntos || 0} pts</span>
          </div>
          <p class="text-sm text-text-muted">${r.descripcion || ''}</p>
          <p class="text-xs text-text-muted mt-2">📅 ${fecha.toLocaleDateString('es-MX')} • 👤 ${r.reportadoPor || 'Sistema'}</p>
        </div>
      </div>`;
    container.appendChild(div);
  });
}

function filtrarHistorialDisciplina(tipo) {
  document.querySelectorAll('#historial-disciplina-alumno .reporte-item').forEach(item => {
    item.style.display = tipo === 'todos' || item.dataset.tipo === tipo ? '' : 'none';
  });
}

async function cargarCitatoriosAlumno(alumnoId) {
  const container = document.getElementById('citatorios-alumno');
  if (!container) return;
  
  try {
    const snapshot = await db.collection('citatorios')
      .where('alumnoId', '==', alumnoId)
      .where('estado', '==', 'pendiente')
      .get();
    
    if (snapshot.empty) {
      container.innerHTML = `<div class="text-center py-4 text-text-muted"><span class="text-3xl opacity-30">✅</span><p class="text-sm mt-2">Sin citatorios pendientes</p></div>`;
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const c = doc.data();
      const fecha = c.fechaCita?.toDate ? c.fechaCita.toDate() : new Date(c.fechaCita);
      const div = document.createElement('div');
      div.className = 'p-3 bg-warning/10 border border-warning/30 rounded-xl';
      div.innerHTML = `
        <div class="flex items-center gap-2 mb-1"><span class="text-warning">📋</span><span class="font-medium text-text-main text-sm">Cita con padres</span></div>
        <p class="text-xs text-text-muted">${c.motivo || ''}</p>
        <p class="text-xs text-warning mt-2">📅 ${fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================
// 🔹 REPORTES - PROFESOR
// ========================
async function buscarAlumnoReporte(query) {
  const container = document.getElementById('resultados-alumno-reporte');
  if (!container || query.length < 2) { container?.classList.add('hidden'); return; }
  
  try {
    const queryLower = query.toLowerCase();
    const alumnos = [];
    const snapshot = await db.collection('alumnos').get();
    
    snapshot.forEach(doc => {
      const a = { _id: doc.id, ...doc.data() };
      const nombre = `${a.nombre || ''} ${a.apellidos || ''}`.toLowerCase();
      if (nombre.includes(queryLower) || (a.control || '').includes(query)) alumnos.push(a);
    });
    
    container.classList.remove('hidden');
    if (alumnos.length === 0) {
      container.innerHTML = '<p class="p-3 text-text-muted text-sm">No se encontraron alumnos</p>';
      return;
    }
    
    container.innerHTML = '';
    alumnos.slice(0, 10).forEach(a => {
      const div = document.createElement('div');
      div.className = 'p-3 hover:bg-surface-light cursor-pointer flex items-center gap-3';
      div.onclick = () => seleccionarAlumnoReporte(a);
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">${(a.nombre || 'A').charAt(0)}</div>
        <div><p class="font-medium text-text-main text-sm">${a.nombre} ${a.apellidos}</p><p class="text-xs text-text-muted">${a.grado || ''} • ${a.control || ''}</p></div>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function seleccionarAlumnoReporte(alumno) {
  alumnoSeleccionadoReporte = alumno;
  document.getElementById('resultados-alumno-reporte')?.classList.add('hidden');
  document.getElementById('buscar-alumno-reporte').value = '';
  
  const sel = document.getElementById('alumno-seleccionado-reporte');
  if (sel) {
    sel.classList.remove('hidden');
    document.getElementById('avatar-alumno-reporte').textContent = (alumno.nombre || 'A').charAt(0);
    document.getElementById('nombre-alumno-reporte').textContent = `${alumno.nombre} ${alumno.apellidos}`;
    document.getElementById('info-alumno-reporte').textContent = `${alumno.grado || 'N/A'} • ${alumno.control || ''}`;
  }
}

function limpiarAlumnoReporte() {
  alumnoSeleccionadoReporte = null;
  document.getElementById('alumno-seleccionado-reporte')?.classList.add('hidden');
}

function actualizarCategoriasReporte() {
  const tipo = document.getElementById('tipo-reporte')?.value;
  const select = document.getElementById('categoria-reporte');
  if (!select) return;
  
  const cats = tipo === 'positivo' 
    ? [['participacion','Participación destacada'],['ayuda','Ayuda a compañeros'],['voluntario','Trabajo voluntario'],['comportamiento','Excelente comportamiento'],['otro','Otro']]
    : [['conducta','Mala conducta'],['uniforme','Falta de uniforme'],['tarea','No entregó tarea'],['respeto','Falta de respeto'],['pelea','Pelea'],['celular','Uso de celular'],['otro','Otro']];
  
  select.innerHTML = '<option value="">Seleccionar...</option>' + cats.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('');
}

async function enviarReporte() {
  if (!alumnoSeleccionadoReporte) { mostrarNotificacion('Selecciona un alumno', 'warning'); return; }
  
  const tipo = document.getElementById('tipo-reporte')?.value;
  const categoria = document.getElementById('categoria-reporte')?.value;
  const descripcion = document.getElementById('descripcion-reporte')?.value.trim();
  const gravedad = document.querySelector('input[name="gravedad-reporte"]:checked')?.value || 'leve';
  const citarPadres = document.getElementById('reporte-citar-padres')?.checked;
  
  if (!categoria) { mostrarNotificacion('Selecciona categoría', 'warning'); return; }
  
  const profesor = window.usuarioActual;
  if (!profesor) return;
  
  const puntos = tipo === 'positivo' ? 10 : PUNTOS_GRAVEDAD[gravedad] || -5;
  
  try {
    const reporteRef = await db.collection('reportes').add({
      alumnoId: alumnoSeleccionadoReporte._id || alumnoSeleccionadoReporte.control,
      alumnoNombre: `${alumnoSeleccionadoReporte.nombre} ${alumnoSeleccionadoReporte.apellidos}`,
      alumnoGrado: alumnoSeleccionadoReporte.grado,
      tipo, categoria, descripcion, gravedad: tipo === 'negativo' ? gravedad : null, puntos,
      reportadoPor: `${profesor.nombre} ${profesor.apellidos}`.trim(),
      reportadoPorId: profesor.id || profesor.control,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      estado: 'activo'
    });
    
    if (citarPadres && tipo === 'negativo') {
      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() + 3);
      fechaCita.setHours(10, 0, 0, 0);
      await db.collection('citatorios').add({
        alumnoId: alumnoSeleccionadoReporte._id || alumnoSeleccionadoReporte.control,
        alumnoNombre: `${alumnoSeleccionadoReporte.nombre} ${alumnoSeleccionadoReporte.apellidos}`,
        motivo: `${categoria}: ${descripcion}`.substring(0, 200),
        reporteId: reporteRef.id,
        fechaCita, estado: 'pendiente',
        solicitadoPor: `${profesor.nombre} ${profesor.apellidos}`.trim(),
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    limpiarFormularioReporte();
    mostrarNotificacion('✅ Reporte enviado', 'success');
    cargarMisReportesProfesor();
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al enviar', 'error');
  }
}

function limpiarFormularioReporte() {
  alumnoSeleccionadoReporte = null;
  document.getElementById('alumno-seleccionado-reporte')?.classList.add('hidden');
  document.getElementById('buscar-alumno-reporte').value = '';
  document.getElementById('descripcion-reporte').value = '';
  document.getElementById('categoria-reporte').value = '';
  document.getElementById('reporte-citar-padres').checked = false;
}

async function cargarMisReportesProfesor() {
  const container = document.getElementById('mis-reportes-profesor');
  if (!container) return;
  
  const profesor = window.usuarioActual;
  if (!profesor) return;
  
  try {
    const snapshot = await db.collection('reportes')
      .where('reportadoPorId', '==', profesor.id || profesor.control)
      .get();
    
    const reportes = [];
    snapshot.forEach(doc => reportes.push({ _id: doc.id, ...doc.data() }));
    reportes.sort((a, b) => (b.fecha?.toDate?.() || new Date(0)) - (a.fecha?.toDate?.() || new Date(0)));
    
    if (reportes.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-text-muted"><span class="text-3xl opacity-30">📋</span><p class="text-sm mt-2">No has enviado reportes</p></div>`;
      return;
    }
    
    container.innerHTML = '';
    reportes.slice(0, 15).forEach(r => {
      const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const esPos = r.tipo === 'positivo';
      const div = document.createElement('div');
      div.className = `p-3 rounded-xl ${esPos ? 'bg-success/10' : 'bg-danger/10'} flex items-center gap-3`;
      div.innerHTML = `
        <span class="text-xl">${esPos ? '⭐' : '⚠️'}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-text-main text-sm truncate">${r.alumnoNombre}</p>
          <p class="text-xs text-text-muted">${r.categoria} • ${fecha.toLocaleDateString('es-MX')}</p>
        </div>
        <span class="font-bold ${esPos ? 'text-success' : 'text-danger'}">${r.puntos > 0 ? '+' : ''}${r.puntos}</span>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================
// 🔹 DASHBOARD PREFECTURA
// ========================
async function cargarDashboardPrefectura() {
  await cargarEstadisticasPrefectura();
  await cargarReportesRecientesPrefectura();
  await cargarPermisosPendientes();
  await cargarCitatoriosPendientes();
  await cargarAlumnosConMasReportes();
}

async function cargarEstadisticasPrefectura() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  
  try {
    const reportesSnap = await db.collection('reportes').get();
    let reportesHoy = 0;
    reportesSnap.forEach(doc => {
      const f = doc.data().fecha?.toDate?.();
      if (f && f >= hoy) reportesHoy++;
    });
    document.getElementById('pref-stat-reportes-hoy').textContent = reportesHoy;
    
    const permisosSnap = await db.collection('permisos').where('estado', '==', 'pendiente').get();
    document.getElementById('pref-stat-permisos').textContent = permisosSnap.size;
    
    const citatoriosSnap = await db.collection('citatorios').where('estado', '==', 'pendiente').get();
    document.getElementById('pref-stat-citatorios').textContent = citatoriosSnap.size;
    
    document.getElementById('pref-stat-sancionados').textContent = '0';
  } catch (error) {
    console.error('Error:', error);
  }
}

async function cargarReportesRecientesPrefectura() {
  const container = document.getElementById('pref-reportes-recientes');
  if (!container) return;
  
  try {
    const snapshot = await db.collection('reportes').get();
    const reportes = [];
    snapshot.forEach(doc => reportes.push({ _id: doc.id, ...doc.data() }));
    reportes.sort((a, b) => (b.fecha?.toDate?.() || new Date(0)) - (a.fecha?.toDate?.() || new Date(0)));
    
    if (reportes.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-text-muted"><span class="text-4xl opacity-30">📝</span><p class="text-sm mt-2">Sin reportes</p></div>`;
      return;
    }
    
    container.innerHTML = '';
    reportes.slice(0, 10).forEach(r => {
      const fecha = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const esPos = r.tipo === 'positivo';
      const div = document.createElement('div');
      div.className = `p-3 rounded-xl ${esPos ? 'bg-success/10 border-l-4 border-success' : 'bg-danger/10 border-l-4 border-danger'}`;
      div.innerHTML = `
        <div class="flex justify-between mb-1">
          <span class="font-medium text-text-main text-sm">${r.alumnoNombre || 'Alumno'}</span>
          <span class="text-xs text-text-muted">${fecha.toLocaleDateString('es-MX')}</span>
        </div>
        <p class="text-xs text-text-muted">${r.categoria} - ${(r.descripcion || '').substring(0, 50)}...</p>
        <div class="flex justify-between mt-2">
          <span class="text-xs text-text-muted">Por: ${r.reportadoPor || 'Sistema'}</span>
          <span class="text-xs font-bold ${esPos ? 'text-success' : 'text-danger'}">${r.puntos > 0 ? '+' : ''}${r.puntos} pts</span>
        </div>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

async function cargarPermisosPendientes() {
  const container = document.getElementById('pref-permisos-pendientes');
  if (!container) return;
  
  try {
    const snapshot = await db.collection('permisos').where('estado', '==', 'pendiente').get();
    
    if (snapshot.empty) {
      container.innerHTML = `<div class="text-center py-8 text-text-muted"><span class="text-4xl opacity-30">🚪</span><p class="text-sm mt-2">Sin permisos pendientes</p></div>`;
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
      const div = document.createElement('div');
      div.className = 'p-3 bg-surface-light/50 rounded-xl';
      div.innerHTML = `
        <div class="flex justify-between mb-2">
          <span class="font-medium text-text-main text-sm">${p.alumnoNombre || 'Alumno'}</span>
          <span class="text-xs text-text-muted">${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p class="text-xs text-text-muted mb-2">${p.motivo || 'Sin motivo'}</p>
        <div class="flex gap-2">
          <button onclick="aprobarPermiso('${doc.id}')" class="flex-1 py-1.5 bg-success/20 hover:bg-success/30 text-success text-xs rounded-lg">Aprobar</button>
          <button onclick="rechazarPermiso('${doc.id}')" class="flex-1 py-1.5 bg-danger/20 hover:bg-danger/30 text-danger text-xs rounded-lg">Rechazar</button>
        </div>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

async function aprobarPermiso(id) {
  try {
    await db.collection('permisos').doc(id).update({ estado: 'aprobado', fechaAprobacion: firebase.firestore.FieldValue.serverTimestamp() });
    mostrarNotificacion('✅ Permiso aprobado', 'success');
    cargarPermisosPendientes();
    cargarEstadisticasPrefectura();
  } catch (e) { console.error(e); }
}

async function rechazarPermiso(id) {
  try {
    await db.collection('permisos').doc(id).update({ estado: 'rechazado', fechaRechazo: firebase.firestore.FieldValue.serverTimestamp() });
    mostrarNotificacion('Permiso rechazado', 'warning');
    cargarPermisosPendientes();
    cargarEstadisticasPrefectura();
  } catch (e) { console.error(e); }
}

async function cargarCitatoriosPendientes() {
  const container = document.getElementById('pref-citatorios-pendientes');
  if (!container) return;
  
  try {
    const snapshot = await db.collection('citatorios').where('estado', '==', 'pendiente').get();
    
    if (snapshot.empty) {
      container.innerHTML = `<div class="text-center py-8 text-text-muted"><span class="text-4xl opacity-30">📋</span><p class="text-sm mt-2">Sin citatorios pendientes</p></div>`;
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const c = doc.data();
      const fecha = c.fechaCita?.toDate ? c.fechaCita.toDate() : new Date(c.fechaCita);
      const div = document.createElement('div');
      div.className = 'p-3 bg-warning/10 border-l-4 border-warning rounded-xl';
      div.innerHTML = `
        <div class="flex justify-between mb-1"><span class="font-medium text-text-main text-sm">${c.alumnoNombre || 'Alumno'}</span></div>
        <p class="text-xs text-text-muted mb-2">${(c.motivo || '').substring(0, 60)}...</p>
        <div class="flex justify-between">
          <span class="text-xs text-warning">📅 ${fecha.toLocaleDateString('es-MX')}</span>
          <button onclick="marcarCitatorioCompletado('${doc.id}')" class="text-xs text-success hover:underline">✓ Completado</button>
        </div>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

async function marcarCitatorioCompletado(id) {
  try {
    await db.collection('citatorios').doc(id).update({ estado: 'completado', fechaCompletado: firebase.firestore.FieldValue.serverTimestamp() });
    mostrarNotificacion('✅ Citatorio completado', 'success');
    cargarCitatoriosPendientes();
    cargarEstadisticasPrefectura();
  } catch (e) { console.error(e); }
}

async function cargarAlumnosConMasReportes() {
  const tbody = document.getElementById('pref-tabla-alumnos-reportes');
  if (!tbody) return;
  
  try {
    const reportesSnap = await db.collection('reportes').get();
    const alumnosPuntos = {};
    
    reportesSnap.forEach(doc => {
      const r = doc.data();
      const id = r.alumnoId;
      if (!id) return;
      
      if (!alumnosPuntos[id]) {
        alumnosPuntos[id] = { id, nombre: r.alumnoNombre || 'Sin nombre', grado: r.alumnoGrado || 'N/A', reportes: 0, puntos: 100 };
      }
      alumnosPuntos[id].reportes++;
      alumnosPuntos[id].puntos += (r.puntos || 0);
    });
    
    const alumnos = Object.values(alumnosPuntos).sort((a, b) => b.reportes - a.reportes).slice(0, 10);
    
    if (alumnos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-text-muted">Sin datos</td></tr>`;
      return;
    }
    
    tbody.innerHTML = '';
    alumnos.forEach(a => {
      let estadoClass = 'bg-success/20 text-success', estadoText = 'Normal';
      if (a.puntos < 50) { estadoClass = 'bg-danger/20 text-danger'; estadoText = 'Crítico'; }
      else if (a.puntos < 70) { estadoClass = 'bg-warning/20 text-warning'; estadoText = 'Alerta'; }
      
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border-subtle';
      tr.innerHTML = `
        <td class="py-3"><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">${a.nombre.charAt(0)}</div><span class="text-text-main">${a.nombre}</span></div></td>
        <td class="py-3 text-text-muted">${a.grado}</td>
        <td class="py-3 text-center"><span class="px-2 py-1 bg-danger/20 text-danger rounded-full text-xs">${a.reportes}</span></td>
        <td class="py-3 text-center font-bold ${a.puntos < 50 ? 'text-danger' : a.puntos < 70 ? 'text-warning' : 'text-success'}">${a.puntos}</td>
        <td class="py-3 text-center"><span class="px-2 py-1 ${estadoClass} rounded-full text-xs">${estadoText}</span></td>
        <td class="py-3"><button onclick="verHistorialAlumno('${a.id}')" class="text-xs text-primary hover:underline">Ver historial</button></td>`;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================
// 🔹 BÚSQUEDA PREFECTURA
// ========================
async function buscarAlumnoPrefectura(query) {
  const container = document.getElementById('pref-resultados-alumno');
  if (!container || query.length < 2) { container?.classList.add('hidden'); return; }
  
  try {
    const queryLower = query.toLowerCase();
    const alumnos = [];
    const snapshot = await db.collection('alumnos').get();
    
    snapshot.forEach(doc => {
      const a = { _id: doc.id, ...doc.data() };
      const nombre = `${a.nombre || ''} ${a.apellidos || ''}`.toLowerCase();
      if (nombre.includes(queryLower) || (a.control || '').includes(query)) alumnos.push(a);
    });
    
    container.classList.remove('hidden');
    container.className = 'mt-2 max-h-48 overflow-y-auto bg-surface rounded-xl border border-border-subtle';
    
    if (alumnos.length === 0) {
      container.innerHTML = '<p class="p-3 text-text-muted text-sm">No encontrado</p>';
      return;
    }
    
    container.innerHTML = '';
    alumnos.slice(0, 8).forEach(a => {
      const div = document.createElement('div');
      div.className = 'p-3 hover:bg-surface-light cursor-pointer flex items-center gap-3';
      div.onclick = () => seleccionarAlumnoPrefectura(a);
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">${(a.nombre || 'A').charAt(0)}</div>
        <div><p class="font-medium text-text-main text-sm">${a.nombre} ${a.apellidos}</p><p class="text-xs text-text-muted">${a.grado || ''}</p></div>`;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function seleccionarAlumnoPrefectura(alumno) {
  alumnoSeleccionadoPrefectura = alumno;
  document.getElementById('pref-resultados-alumno')?.classList.add('hidden');
  document.getElementById('pref-buscar-alumno').value = `${alumno.nombre} ${alumno.apellidos}`;
  
  const sel = document.getElementById('pref-alumno-seleccionado');
  if (sel) {
    sel.classList.remove('hidden');
    sel.className = 'mt-3 p-3 bg-primary/10 rounded-xl flex items-center justify-between';
    sel.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">${(alumno.nombre || 'A').charAt(0)}</div>
        <div><p class="font-medium text-text-main">${alumno.nombre} ${alumno.apellidos}</p><p class="text-xs text-text-muted">${alumno.grado || ''} • ${alumno.control || ''}</p></div>
      </div>
      <button onclick="limpiarAlumnoPrefectura()" class="p-1 hover:bg-surface-light rounded-full"><svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
  }
}

function limpiarAlumnoPrefectura() {
  alumnoSeleccionadoPrefectura = null;
  document.getElementById('pref-alumno-seleccionado')?.classList.add('hidden');
  document.getElementById('pref-buscar-alumno').value = '';
}

async function crearReportePrefectura() {
  if (!alumnoSeleccionadoPrefectura) { mostrarNotificacion('Selecciona un alumno', 'warning'); return; }
  
  const tipo = document.getElementById('pref-tipo-reporte')?.value || 'negativo';
  const categoria = document.getElementById('pref-categoria')?.value || 'otro';
  const descripcion = document.getElementById('pref-descripcion')?.value.trim() || '';
  
  const usuario = window.usuarioActual;
  const puntos = tipo === 'positivo' ? 10 : -10;
  
  try {
    await db.collection('reportes').add({
      alumnoId: alumnoSeleccionadoPrefectura._id || alumnoSeleccionadoPrefectura.control,
      alumnoNombre: `${alumnoSeleccionadoPrefectura.nombre} ${alumnoSeleccionadoPrefectura.apellidos}`,
      alumnoGrado: alumnoSeleccionadoPrefectura.grado,
      tipo, categoria, descripcion, puntos,
      reportadoPor: usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Prefectura',
      reportadoPorTipo: 'Prefectura',
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      estado: 'activo'
    });
    
    // 🔔 ENVIAR NOTIFICACIÓN AL ALUMNO
    try {
      const alumnoId = alumnoSeleccionadoPrefectura._id || alumnoSeleccionadoPrefectura.control;
      if (alumnoId && typeof enviarNotificacionAUsuario === 'function') {
        const titulo = tipo === 'positivo' ? '⭐ Mérito registrado' : '⚠️ Reporte disciplinario';
        const cuerpo = tipo === 'positivo' 
          ? `Has recibido ${puntos} puntos por: ${categoria}`
          : `Se registró un reporte: ${categoria}`;
        
        await enviarNotificacionAUsuario(alumnoId, {
          title: titulo,
          body: cuerpo,
          tipo: 'reporte',
          data: { tipo: 'disciplina', categoria }
        });
        console.log('🔔 Notificación de reporte enviada a:', alumnoId);
      }
    } catch (notifError) {
      console.warn('No se pudo enviar notificación:', notifError);
    }
    
    limpiarAlumnoPrefectura();
    document.getElementById('pref-descripcion').value = '';
    mostrarNotificacion('✅ Reporte creado', 'success');
    cargarDashboardPrefectura();
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al crear reporte', 'error');
  }
}

// Modales
function abrirModalPermiso() {
  mostrarNotificacion('Función de permisos próximamente', 'info');
}

function abrirModalCitatorio() {
  mostrarNotificacion('Función de citatorios próximamente', 'info');
}

function verHistorialAlumno(alumnoId) {
  mostrarNotificacion('Ver historial: ' + alumnoId, 'info');
}

function verTodosReportes() {
  mostrarNotificacion('Ver todos los reportes', 'info');
}

// Utilidades
function mostrarNotificacion(mensaje, tipo = 'info') {
  if (typeof window.mostrarNotificacion === 'function') {
    window.mostrarNotificacion(mensaje, tipo);
  } else {
    console.log(`[${tipo}] ${mensaje}`);
  }
}

// Exports
window.buscarAlumnoReporte = buscarAlumnoReporte;
window.seleccionarAlumnoReporte = seleccionarAlumnoReporte;
window.limpiarAlumnoReporte = limpiarAlumnoReporte;
window.actualizarCategoriasReporte = actualizarCategoriasReporte;
window.enviarReporte = enviarReporte;
window.limpiarFormularioReporte = limpiarFormularioReporte;
window.buscarAlumnoPrefectura = buscarAlumnoPrefectura;
window.seleccionarAlumnoPrefectura = seleccionarAlumnoPrefectura;
window.limpiarAlumnoPrefectura = limpiarAlumnoPrefectura;
window.crearReportePrefectura = crearReportePrefectura;
window.aprobarPermiso = aprobarPermiso;
window.rechazarPermiso = rechazarPermiso;
window.marcarCitatorioCompletado = marcarCitatorioCompletado;
window.abrirModalPermiso = abrirModalPermiso;
window.abrirModalCitatorio = abrirModalCitatorio;
window.verHistorialAlumno = verHistorialAlumno;
window.verTodosReportes = verTodosReportes;
window.filtrarHistorialDisciplina = filtrarHistorialDisciplina;
