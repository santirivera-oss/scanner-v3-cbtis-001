// ========================================
// 📊 DASHBOARD DEL PROFESOR
// Keyon Access System v2.0
// Compatible con estructura de datos existente
// ========================================

// Variables globales
let graficaProfesorSemanal = null;

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  // Observar cuando se muestra el dashboard del profesor
  const dashboardProf = document.getElementById('dashboard-profesor');
  if (dashboardProf) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          const isVisible = !dashboardProf.classList.contains('hidden') && 
                           dashboardProf.style.display !== 'none';
          if (isVisible) {
            console.log('📊 Dashboard profesor visible');
            inicializarDashboardProfesor();
          }
        }
      });
    });
    observer.observe(dashboardProf, { attributes: true });
    
    // También verificar si ya está visible al cargar
    setTimeout(() => {
      const isVisible = !dashboardProf.classList.contains('hidden') && 
                       dashboardProf.style.display !== 'none' &&
                       window.usuarioActual?.tipo === 'Profesor';
      if (isVisible) {
        console.log('📊 Dashboard profesor visible (inicial)');
        inicializarDashboardProfesor();
      }
    }, 500);
  }
  
  // Observar cuando se muestra el historial del profesor
  const historialProf = document.getElementById('historial-profesor');
  if (historialProf) {
    const observerHistorial = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          const isVisible = !historialProf.classList.contains('hidden') && 
                           historialProf.style.display !== 'none';
          if (isVisible) {
            console.log('📋 Historial profesor visible');
            cargarHistorialProfesor();
          }
        }
      });
    });
    observerHistorial.observe(historialProf, { attributes: true });
  }
  
  // Filtro de historial
  const filtroHistorial = document.getElementById('filtro-historial-profesor');
  if (filtroHistorial) {
    // No establecer fecha por defecto para mostrar todos los registros
    filtroHistorial.addEventListener('change', (e) => {
      cargarHistorialProfesor(e.target.value);
    });
  }
});

// Función para inicializar cuando el profesor hace login
function iniciarDashboardProfesorAlLogin() {
  setTimeout(() => {
    const profesor = obtenerProfesorActual();
    if (profesor) {
      console.log('📊 Iniciando dashboard post-login para:', profesor.nombreCompleto);
      inicializarDashboardProfesor();
    }
  }, 300);
}

// ========================
// 🔹 OBTENER PROFESOR ACTUAL
// ========================
function obtenerProfesorActual() {
  const profesor = window.usuarioActual || window.profesorRegistrado;
  if (!profesor) return null;
  
  return {
    id: profesor.id || profesor.control || profesor.telefono || '',
    nombre: profesor.nombre || '',
    apellidos: profesor.apellidos || '',
    nombreCompleto: `${profesor.nombre || ''} ${profesor.apellidos || ''}`.trim(),
    control: profesor.control || '',
    telefono: profesor.telefono || '',
    materias: profesor.materias || ''
  };
}

// ========================
// 🔹 VERIFICAR SI SESIÓN PERTENECE AL PROFESOR
// ========================
function sesionEsDelProfesor(sesion, profesor) {
  // Verificar por múltiples campos para máxima compatibilidad
  const profSesion = sesion.profesor || {};
  
  // Por control
  if (profesor.control && profSesion.control === profesor.control) return true;
  
  // Por teléfono
  if (profesor.telefono && profSesion.telefono === profesor.telefono) return true;
  
  // Por nombre completo
  const nombreSesion = `${profSesion.nombre || ''} ${profSesion.apellidos || ''}`.trim();
  if (profesor.nombreCompleto && nombreSesion === profesor.nombreCompleto) return true;
  
  // Por profesorId (nuevo campo)
  if (sesion.profesorId && (sesion.profesorId === profesor.id || 
                            sesion.profesorId === profesor.control ||
                            sesion.profesorId === profesor.telefono)) return true;
  
  return false;
}

// ========================
// 🔹 OBTENER FECHA DE SESIÓN
// ========================
function obtenerFechaSesion(sesion) {
  // Soportar múltiples campos de fecha
  return sesion.fechaInicio || sesion.inicio || sesion.fecha || null;
}

// ========================
// 🔹 INICIALIZAR DASHBOARD
// ========================
async function inicializarDashboardProfesor() {
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    console.warn('⚠️ No hay profesor logueado');
    return;
  }
  
  console.log('📊 Inicializando dashboard para:', profesor.nombreCompleto);
  
  // Cargar todas las estadísticas
  await cargarEstadisticasProfesor(profesor);
  await cargarGraficaProfesorSemanal(profesor);
  await cargarTopPuntualidad(profesor);
  await cargarClasesHoy(profesor);
  await cargarActividadProfesor();
}

// ========================
// 🔹 ESTADÍSTICAS DEL DÍA
// ========================
async function cargarEstadisticasProfesor(profesor) {
  try {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log('📊 Buscando sesiones para:', profesor.nombreCompleto, 'fecha:', hoyStr);
    
    // Obtener TODAS las sesiones y filtrar manualmente (más compatible)
    const sesionesSnap = await db.collection('sesiones').get();
    
    let totalClases = 0;
    let totalAlumnos = 0;
    let totalPresentes = 0;
    let totalPuntuales = 0;
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      
      // Verificar si es del profesor actual
      if (!sesionEsDelProfesor(sesion, profesor)) return;
      
      // Verificar si es de hoy
      const fechaSesion = obtenerFechaSesion(sesion);
      if (!fechaSesion || !fechaSesion.startsWith(hoyStr)) return;
      
      // Contar esta sesión
      totalClases++;
      
      // Procesar alumnos
      const alumnos = sesion.alumnos || {};
      Object.values(alumnos).forEach(alumno => {
        totalAlumnos++;
        
        const eventos = alumno.eventos || [];
        const entradaEvento = eventos.find(e => e.tipo === 'entrada');
        
        if (entradaEvento) {
          totalPresentes++;
          
          // Verificar puntualidad (llegó en los primeros 10 minutos)
          if (entradaEvento.hora && fechaSesion) {
            const horaInicio = new Date(fechaSesion);
            const horaEntrada = new Date(entradaEvento.hora);
            const diffMinutos = (horaEntrada - horaInicio) / (1000 * 60);
            
            if (diffMinutos <= 10) {
              totalPuntuales++;
            }
          }
        }
      });
    });
    
    // Calcular porcentajes
    const porcentajeAsistencia = totalAlumnos > 0 ? Math.round((totalPresentes / totalAlumnos) * 100) : 0;
    const porcentajePuntualidad = totalPresentes > 0 ? Math.round((totalPuntuales / totalPresentes) * 100) : 0;
    
    console.log('📊 Estadísticas:', { totalClases, totalPresentes, totalAlumnos, porcentajeAsistencia, porcentajePuntualidad });
    
    // Actualizar UI con animación
    animarContador('prof-stat-clases', totalClases);
    animarContador('prof-stat-alumnos', totalPresentes);
    animarContador('prof-stat-asistencia', porcentajeAsistencia);
    animarContador('prof-stat-puntualidad', porcentajePuntualidad);
    
    // Actualizar trends
    const trendClases = document.getElementById('prof-stat-clases-trend');
    if (trendClases) {
      trendClases.textContent = totalClases > 0 ? `${totalClases} clase${totalClases > 1 ? 's' : ''} impartida${totalClases > 1 ? 's' : ''}` : 'Sin clases hoy';
    }
    
    const trendAlumnos = document.getElementById('prof-stat-alumnos-trend');
    if (trendAlumnos) {
      trendAlumnos.textContent = totalAlumnos > 0 ? `de ${totalAlumnos} esperados` : 'Sin registros';
    }
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ========================
// 🔹 ANIMACIÓN DE CONTADOR
// ========================
function animarContador(elementId, valorFinal) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const valorInicial = parseInt(element.textContent) || 0;
  const duracion = 1000;
  const pasos = 30;
  const incremento = (valorFinal - valorInicial) / pasos;
  let paso = 0;
  
  const intervalo = setInterval(() => {
    paso++;
    const valorActual = Math.round(valorInicial + (incremento * paso));
    element.textContent = valorActual;
    
    if (paso >= pasos) {
      element.textContent = valorFinal;
      clearInterval(intervalo);
    }
  }, duracion / pasos);
}

// ========================
// 🔹 GRÁFICA SEMANAL
// ========================
async function cargarGraficaProfesorSemanal(profesor) {
  const canvas = document.getElementById('prof-grafica-semanal');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Obtener datos de los últimos 7 días
  const datos = await obtenerDatosSemanaProfesor(profesor);
  
  if (graficaProfesorSemanal) {
    graficaProfesorSemanal.destroy();
  }
  
  graficaProfesorSemanal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.labels,
      datasets: [
        {
          label: 'Presentes',
          data: datos.presentes,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Ausentes',
          data: datos.ausentes,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#94a3b8',
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 15,
            boxWidth: 8,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(139, 92, 246, 0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          ticks: { 
            color: '#64748b', 
            font: { size: 11 },
            stepSize: 5
          }
        }
      }
    }
  });
}

async function obtenerDatosSemanaProfesor(profesor) {
  const labels = [];
  const presentes = [];
  const ausentes = [];
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Obtener todas las sesiones una sola vez
  const sesionesSnap = await db.collection('sesiones').get();
  const todasSesiones = [];
  sesionesSnap.forEach(doc => todasSesiones.push(doc.data()));
  
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    labels.push(diasSemana[fecha.getDay()]);
    
    let presentesDia = 0;
    let ausentesDia = 0;
    
    todasSesiones.forEach(sesion => {
      if (!sesionEsDelProfesor(sesion, profesor)) return;
      
      const fechaSesion = obtenerFechaSesion(sesion);
      if (!fechaSesion || !fechaSesion.startsWith(fechaStr)) return;
      
      const alumnos = sesion.alumnos || {};
      Object.values(alumnos).forEach(alumno => {
        const eventos = alumno.eventos || [];
        const tieneEntrada = eventos.some(e => e.tipo === 'entrada');
        
        if (tieneEntrada) {
          presentesDia++;
        } else {
          ausentesDia++;
        }
      });
    });
    
    presentes.push(presentesDia);
    ausentes.push(ausentesDia);
  }
  
  return { labels, presentes, ausentes };
}

// ========================
// 🔹 TOP PUNTUALIDAD
// ========================
async function cargarTopPuntualidad(profesor) {
  const container = document.getElementById('prof-top-puntualidad');
  if (!container) return;
  
  try {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const fechaLimite = hace30Dias.toISOString().split('T')[0];
    
    // Obtener sesiones del último mes
    const sesionesSnap = await db.collection('sesiones').get();
    
    const puntualidadAlumnos = {};
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      
      if (!sesionEsDelProfesor(sesion, profesor)) return;
      
      const fechaSesion = obtenerFechaSesion(sesion);
      if (!fechaSesion || fechaSesion < fechaLimite) return;
      
      const alumnos = sesion.alumnos || {};
      
      Object.entries(alumnos).forEach(([alumnoId, alumno]) => {
        if (!puntualidadAlumnos[alumnoId]) {
          puntualidadAlumnos[alumnoId] = {
            nombre: alumno.nombre || 'Desconocido',
            apellidos: alumno.apellidos || '',
            totalClases: 0,
            puntuales: 0
          };
        }
        
        puntualidadAlumnos[alumnoId].totalClases++;
        
        const eventos = alumno.eventos || [];
        const entradaEvento = eventos.find(e => e.tipo === 'entrada');
        
        if (entradaEvento && entradaEvento.hora && fechaSesion) {
          const horaInicio = new Date(fechaSesion);
          const horaEntrada = new Date(entradaEvento.hora);
          const diffMinutos = (horaEntrada - horaInicio) / (1000 * 60);
          
          if (diffMinutos <= 10) {
            puntualidadAlumnos[alumnoId].puntuales++;
          }
        }
      });
    });
    
    // Calcular porcentaje y ordenar
    const ranking = Object.values(puntualidadAlumnos)
      .map(a => ({
        ...a,
        porcentaje: a.totalClases > 0 ? Math.round((a.puntuales / a.totalClases) * 100) : 0
      }))
      .filter(a => a.totalClases >= 2) // Mínimo 2 clases
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 5);
    
    if (ranking.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">🏆</span>
          <p class="text-sm">Sin datos suficientes</p>
        </div>
      `;
      return;
    }
    
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    
    container.innerHTML = ranking.map((alumno, index) => {
      const iniciales = (alumno.nombre.charAt(0) + (alumno.apellidos.charAt(0) || '')).toUpperCase();
      const colorBarra = alumno.porcentaje >= 90 ? 'bg-success' : alumno.porcentaje >= 70 ? 'bg-warning' : 'bg-danger';
      
      return `
        <div class="flex items-center gap-3 p-3 bg-surface-light/50 rounded-xl">
          <span class="text-xl">${medallas[index]}</span>
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-xs font-bold">
            ${iniciales}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-text-main font-medium truncate">${alumno.nombre} ${alumno.apellidos}</p>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
                <div class="h-full ${colorBarra} rounded-full transition-all" style="width: ${alumno.porcentaje}%"></div>
              </div>
              <span class="text-xs text-text-muted font-medium">${alumno.porcentaje}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error cargando top puntualidad:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-text-muted">
        <span class="text-4xl block mb-2 opacity-30">⚠️</span>
        <p class="text-sm">Error al cargar datos</p>
      </div>
    `;
  }
}

// ========================
// 🔹 CLASES DE HOY (integrado con módulo horarios)
// ========================
async function cargarClasesHoy(profesor) {
  const container = document.getElementById('prof-clases-hoy');
  if (!container) return;
  
  try {
    // Primero intentar con el módulo de horarios programados
    if (typeof obtenerClasesHoyProfesor === 'function') {
      const clasesHorario = await obtenerClasesHoyProfesor(profesor.id || profesor.control || profesor.telefono);
      
      if (clasesHorario && clasesHorario.length > 0) {
        if (typeof renderizarProximasClases === 'function') {
          renderizarProximasClases(clasesHorario, 'prof-clases-hoy');
          return;
        }
      }
    }
    
    // Fallback: buscar sesiones del día
    const hoyStr = new Date().toISOString().split('T')[0];
    
    const sesionesSnap = await db.collection('sesiones').get();
    const clasesHoy = [];
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      sesion._id = doc.id;
      
      if (!sesionEsDelProfesor(sesion, profesor)) return;
      
      const fechaSesion = obtenerFechaSesion(sesion);
      if (!fechaSesion || !fechaSesion.startsWith(hoyStr)) return;
      
      clasesHoy.push(sesion);
    });
    
    // Ordenar por hora
    clasesHoy.sort((a, b) => {
      const fechaA = obtenerFechaSesion(a) || '';
      const fechaB = obtenerFechaSesion(b) || '';
      return fechaA.localeCompare(fechaB);
    });
    
    if (clasesHoy.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">📅</span>
          <p class="text-sm">No hay clases registradas hoy</p>
          <button onclick="document.querySelector('[data-section=escaner-profesor]').click()" 
                  class="mt-4 py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-sm font-medium transition-all">
            + Iniciar nueva clase
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    clasesHoy.forEach(sesion => {
      const alumnos = Object.values(sesion.alumnos || {});
      const presentes = alumnos.filter(a => (a.eventos || []).some(e => e.tipo === 'entrada')).length;
      
      const fechaSesion = obtenerFechaSesion(sesion);
      const horaInicio = fechaSesion ? new Date(fechaSesion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const fechaFin = sesion.fechaFin || sesion.fin;
      const horaFin = fechaFin ? new Date(fechaFin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'En curso';
      
      const estaFinalizada = sesion.estado && (sesion.estado.toLowerCase().includes('finalizada') || sesion.estado === 'finalizada');
      const estadoClase = estaFinalizada ? 'bg-surface-light text-text-muted' : 'bg-success/20 text-success';
      const iconoEstado = estaFinalizada ? '✓' : '●';
      
      const materia = sesion.materia || `${sesion.grado || ''}°${sesion.grupo || ''}`;
      
      const item = document.createElement('div');
      item.className = 'p-4 bg-surface-light/50 rounded-xl border border-border-subtle hover:border-accent/30 transition-all';
      item.innerHTML = `
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="font-medium text-text-main">${materia}</p>
            <p class="text-sm text-text-muted">${sesion.grado || '-'}°${sesion.grupo || '-'} • Aula ${sesion.aula || '-'}</p>
          </div>
          <span class="px-2 py-1 ${estadoClase} rounded-lg text-xs font-medium flex items-center gap-1">
            <span class="text-[10px]">${iconoEstado}</span>
            ${estaFinalizada ? 'Finalizada' : 'Activa'}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-text-muted">
            🕐 ${horaInicio} - ${horaFin}
          </span>
          <span class="text-primary font-medium">
            ${presentes}/${alumnos.length} alumnos
          </span>
        </div>
      `;
      container.appendChild(item);
    });
    
  } catch (error) {
    console.error('Error cargando clases de hoy:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-text-muted">
        <span class="text-4xl block mb-2 opacity-30">⚠️</span>
        <p class="text-sm">Error al cargar clases</p>
      </div>
    `;
  }
}

// ========================
// 🔹 SIGUIENTE CLASE DEL PROFESOR
// ========================
async function cargarSiguienteClaseProfesor(profesor) {
  const container = document.getElementById('prof-siguiente-clase');
  if (!container) return;
  
  try {
    // Intentar con módulo de horarios
    if (typeof obtenerSiguienteClaseProfesor === 'function') {
      const siguienteClase = await obtenerSiguienteClaseProfesor(profesor.id || profesor.control || profesor.telefono);
      
      if (siguienteClase && !siguienteClase.mensaje) {
        if (typeof renderizarTarjetaSiguienteClase === 'function') {
          renderizarTarjetaSiguienteClase(siguienteClase, 'prof-siguiente-clase');
          return;
        }
      }
    }
    
    // Fallback: mostrar mensaje por defecto
    container.innerHTML = `
      <div class="bg-gradient-to-br from-surface-light/50 to-surface/50 rounded-2xl p-5 border border-border-subtle">
        <div class="text-center py-4">
          <span class="text-4xl block mb-2">📅</span>
          <p class="text-text-muted">Sin horario programado</p>
          <p class="text-xs text-text-muted mt-1">Inicia una clase desde el escáner</p>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error cargando siguiente clase:', error);
  }
}

// ========================
// 🔹 ACTIVIDAD RECIENTE
// ========================
async function cargarActividadProfesor() {
  const container = document.getElementById('prof-actividad-reciente');
  if (!container) {
    console.warn('Container prof-actividad-reciente no encontrado');
    return;
  }
  
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    console.warn('No hay profesor actual');
    return;
  }
  
  // También cargar siguiente clase si existe el contenedor
  await cargarSiguienteClaseProfesor(profesor);
  
  // Mostrar loading
  container.innerHTML = `
    <div class="text-center py-8 text-text-muted">
      <span class="text-4xl block mb-2 animate-pulse">⏳</span>
      <p class="text-sm">Cargando actividad...</p>
    </div>
  `;
  
  try {
    const actividades = [];
    
    // MÉTODO 1: Buscar en registros
    try {
      const registrosSnap = await db.collection('registros')
        .orderBy('fecha', 'desc')
        .limit(100)
        .get();
      
      registrosSnap.forEach(doc => {
        const reg = doc.data();
        // Filtrar por nombre del profesor o por sesión
        const esDelProfesor = 
          reg.profesor === profesor.nombreCompleto || 
          reg.profesor === `${profesor.nombre} ${profesor.apellidos}`.trim() ||
          reg.profesor === profesor.nombre ||
          reg.profesorId === profesor.id ||
          reg.profesorId === profesor.control ||
          reg.profesorId === profesor.telefono ||
          (reg.profesor && reg.profesor.includes(profesor.nombre));
        
        if (esDelProfesor) {
          actividades.push({
            tipo: 'registro',
            nombre: reg.nombreCompleto || reg.alumno || 'Alumno',
            evento: reg.evento || 'entrada',
            fecha: reg.fecha,
            fuente: 'registros'
          });
        }
      });
    } catch (e) {
      console.warn('Error buscando en registros:', e);
    }
    
    // MÉTODO 2: Buscar en sesiones del profesor
    try {
      const sesionesSnap = await db.collection('sesiones')
        .orderBy('inicio', 'desc')
        .limit(20)
        .get();
      
      sesionesSnap.forEach(doc => {
        const sesion = doc.data();
        
        // Verificar si es del profesor actual
        if (!sesionEsDelProfesor(sesion, profesor)) return;
        
        // Extraer eventos de alumnos
        const alumnos = sesion.alumnos || {};
        Object.values(alumnos).forEach(alumno => {
          const eventos = alumno.eventos || [];
          eventos.forEach(evento => {
            actividades.push({
              tipo: 'sesion',
              nombre: alumno.nombre || 'Alumno',
              evento: evento.tipo || evento.evento || 'entrada',
              fecha: evento.ts || evento.hora || evento.fecha,
              fuente: 'sesiones',
              grupo: `${sesion.grado}°${sesion.grupo}`
            });
          });
        });
      });
    } catch (e) {
      console.warn('Error buscando en sesiones:', e);
    }
    
    // Ordenar por fecha descendente
    actividades.sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
      return fechaB - fechaA;
    });
    
    // Tomar solo los primeros 15
    const actividadesRecientes = actividades.slice(0, 15);
    
    console.log(`📊 Actividades encontradas: ${actividades.length}, mostrando: ${actividadesRecientes.length}`);
    
    if (actividadesRecientes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">⚡</span>
          <p class="text-sm">Sin actividad reciente</p>
          <p class="text-xs mt-2 opacity-70">Los registros aparecerán cuando escanees alumnos</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    const iconos = {
      'entrada': '✅',
      'salida': '🚪',
      'baño-salida': '🚽',
      'baño-regreso': '↩️',
      'emergencia-salida': '🚨',
      'emergencia-regreso': '↩️'
    };
    
    actividadesRecientes.forEach((act, index) => {
      const fecha = act.fecha ? new Date(act.fecha) : null;
      const hora = fecha ? fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const esHoy = fecha && fecha.toDateString() === new Date().toDateString();
      const fechaTexto = esHoy ? hora : (fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' ' + hora : '--');
      
      const item = document.createElement('div');
      item.className = 'actividad-item flex items-center gap-3 p-3 bg-surface-light/30 rounded-xl hover:bg-surface-light/50 transition-all';
      item.style.animationDelay = `${index * 0.05}s`;
      
      item.innerHTML = `
        <span class="text-lg">${iconos[act.evento] || '📋'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-text-main font-medium truncate">${act.nombre}</p>
          <p class="text-xs text-text-muted">${act.evento || 'registro'}${act.grupo ? ` • ${act.grupo}` : ''}</p>
        </div>
        <span class="text-xs text-primary font-medium whitespace-nowrap">${fechaTexto}</span>
      `;
      container.appendChild(item);
    });
    
  } catch (error) {
    console.error('Error cargando actividad:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-danger">
        <span class="text-4xl block mb-2">⚠️</span>
        <p class="text-sm">Error al cargar actividad</p>
      </div>
    `;
  }
}

// ========================
// 🔹 HISTORIAL
// ========================
async function cargarHistorialProfesor(fecha = null) {
  const tbody = document.getElementById('tabla-historial-profesor');
  if (!tbody) return;
  
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    console.warn('📋 No hay profesor para cargar historial');
    return;
  }
  
  console.log('📋 Cargando historial para:', profesor.nombreCompleto, 'fecha filtro:', fecha);
  
  // Mostrar loading
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-8 text-center text-text-muted">
        <span class="text-4xl block mb-2 animate-pulse">⏳</span>
        <p>Cargando historial...</p>
      </td>
    </tr>
  `;
  
  try {
    const sesionesSnap = await db.collection('sesiones').get();
    const sesionesProfesor = [];
    
    console.log('📋 Total sesiones en BD:', sesionesSnap.size);
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      sesion._id = doc.id;
      
      // Debug: mostrar datos de la sesión
      // console.log('📋 Sesión:', doc.id, sesion.profesor);
      
      if (!sesionEsDelProfesor(sesion, profesor)) return;
      
      // Filtrar por fecha si se especifica
      if (fecha) {
        const fechaSesion = obtenerFechaSesion(sesion);
        if (!fechaSesion || !fechaSesion.startsWith(fecha)) return;
      }
      
      sesionesProfesor.push(sesion);
    });
    
    console.log('📋 Sesiones del profesor encontradas:', sesionesProfesor.length);
    
    // Ordenar por fecha descendente
    sesionesProfesor.sort((a, b) => {
      const fechaA = obtenerFechaSesion(a) || '';
      const fechaB = obtenerFechaSesion(b) || '';
      return fechaB.localeCompare(fechaA);
    });
    
    // Limitar a 50
    const sesiones = sesionesProfesor.slice(0, 50);
    
    if (sesiones.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-text-muted">
            <span class="text-4xl block mb-2 opacity-30">📋</span>
            <p>No hay registros ${fecha ? 'para esta fecha' : 'en el historial'}</p>
            <p class="text-xs mt-2">Inicia una clase y finalízala para ver el historial</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = '';
    
    sesiones.forEach((sesion, index) => {
      const alumnos = Object.values(sesion.alumnos || {});
      const presentes = alumnos.filter(a => (a.eventos || []).some(e => e.tipo === 'entrada')).length;
      const porcentaje = alumnos.length > 0 ? Math.round((presentes / alumnos.length) * 100) : 0;
      
      const fechaSesion = obtenerFechaSesion(sesion);
      const fechaFormato = fechaSesion ? new Date(fechaSesion).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : '-';
      const horaInicio = fechaSesion ? new Date(fechaSesion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
      
      // Detectar estado
      const esFinalizada = sesion.estado && sesion.estado.toLowerCase().includes('finalizada');
      const estadoBadge = esFinalizada 
        ? '<span class="px-2 py-0.5 bg-surface-light text-text-muted rounded text-xs">Finalizada</span>'
        : '<span class="px-2 py-0.5 bg-success/20 text-success rounded text-xs">En curso</span>';
      
      const colorPorcentaje = porcentaje >= 80 ? 'text-success' : porcentaje >= 60 ? 'text-warning' : 'text-danger';
      
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border-subtle/50 hover:bg-surface-light/30 transition-colors';
      tr.innerHTML = `
        <td class="py-4 px-2">
          <div class="flex flex-col">
            <span class="text-text-main font-medium">${fechaFormato}</span>
            <span class="text-xs text-text-muted">${horaInicio}</span>
          </div>
        </td>
        <td class="py-4 px-2">
          <span class="text-text-main">${sesion.aula || '-'}</span>
        </td>
        <td class="py-4 px-2">
          <span class="text-text-main">${sesion.grado || '-'}°${sesion.grupo || '-'}</span>
        </td>
        <td class="py-4 px-2">
          <span class="text-text-main">${sesion.turno || '-'}</span>
        </td>
        <td class="py-4 px-2">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-text-main">${presentes}</span>
            <span class="text-text-muted">/ ${alumnos.length}</span>
          </div>
        </td>
        <td class="py-4 px-2">
          <span class="font-semibold ${colorPorcentaje}">${porcentaje}%</span>
        </td>
        <td class="py-4 px-2">
          <div class="flex items-center gap-2">
            ${estadoBadge}
            <button onclick="verDetalleSesionProfesor('${sesion._id}')" class="p-2 hover:bg-surface-light rounded-lg transition-all" title="Ver detalles">
              <svg class="w-4 h-4 text-text-muted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    console.log('📋 Historial cargado:', sesiones.length, 'clases');
    
  } catch (error) {
    console.error('Error cargando historial:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-danger">
          <span class="text-4xl block mb-2">⚠️</span>
          <p>Error al cargar historial</p>
          <p class="text-xs mt-1">${error.message}</p>
        </td>
      </tr>
    `;
  }
}

// ========================
// 🔹 VER DETALLE SESIÓN (PROFESOR)
// ========================
async function verDetalleSesionProfesor(sesionId) {
  try {
    const doc = await db.collection('sesiones').doc(sesionId).get();
    if (!doc.exists) {
      if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Sesión no encontrada', 'error');
      return;
    }
    
    const sesion = doc.data();
    const alumnos = Object.values(sesion.alumnos || {});
    const fechaSesion = obtenerFechaSesion(sesion);
    
    // Crear modal de detalle
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
    modal.id = 'modal-detalle-sesion';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const fechaFormato = fechaSesion ? new Date(fechaSesion).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Sin fecha';
    
    const horaInicio = fechaSesion ? new Date(fechaSesion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const horaFin = sesion.fin ? new Date(sesion.fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-minute' }) : '--:--';
    
    modal.innerHTML = `
      <div class="bg-surface rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-border-subtle">
        <!-- Header -->
        <div class="p-6 border-b border-border-subtle bg-surface-light/50">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-text-main">📋 Detalle de Clase</h3>
              <p class="text-text-muted text-sm mt-1">${fechaFormato}</p>
            </div>
            <button onclick="document.getElementById('modal-detalle-sesion').remove()" class="p-2 hover:bg-surface-light rounded-xl transition-colors">
              <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Info de la sesión -->
        <div class="p-6 border-b border-border-subtle">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-3 bg-surface-light/50 rounded-xl">
              <p class="text-2xl font-bold text-primary">${sesion.aula || '-'}</p>
              <p class="text-xs text-text-muted">Aula</p>
            </div>
            <div class="text-center p-3 bg-surface-light/50 rounded-xl">
              <p class="text-2xl font-bold text-accent">${sesion.grado || '-'}°${sesion.grupo || '-'}</p>
              <p class="text-xs text-text-muted">Grupo</p>
            </div>
            <div class="text-center p-3 bg-surface-light/50 rounded-xl">
              <p class="text-2xl font-bold text-success">${alumnos.filter(a => (a.eventos || []).some(e => e.tipo === 'entrada')).length}</p>
              <p class="text-xs text-text-muted">Presentes</p>
            </div>
            <div class="text-center p-3 bg-surface-light/50 rounded-xl">
              <p class="text-2xl font-bold text-text-main">${alumnos.length}</p>
              <p class="text-xs text-text-muted">Total</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-center gap-4 text-sm text-text-muted">
            <span>🕐 ${horaInicio} - ${horaFin}</span>
            <span>•</span>
            <span>📅 ${sesion.turno || 'Sin turno'}</span>
          </div>
        </div>
        
        <!-- Lista de alumnos -->
        <div class="p-6 max-h-[40vh] overflow-y-auto">
          <h4 class="font-semibold text-text-main mb-4">👥 Lista de Alumnos</h4>
          ${alumnos.length === 0 ? `
            <p class="text-center text-text-muted py-4">No hay alumnos registrados</p>
          ` : `
            <div class="space-y-2">
              ${alumnos.map(alumno => {
                const eventos = alumno.eventos || [];
                const entrada = eventos.find(e => e.tipo === 'entrada');
                const salidaBano = eventos.find(e => e.tipo === 'baño-salida');
                const regresoBano = eventos.find(e => e.tipo === 'baño-regreso');
                
                const horaEntrada = entrada ? new Date(entrada.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : null;
                
                return `
                  <div class="flex items-center justify-between p-3 bg-surface-light/30 rounded-xl">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                        ${(alumno.nombre || 'D').charAt(0)}${(alumno.apellidos || '').charAt(0)}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-text-main">${alumno.nombre || ''} ${alumno.apellidos || ''}</p>
                        <p class="text-xs text-text-muted">${alumno.control || alumno.id || ''}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      ${entrada ? `<span class="px-2 py-1 bg-success/20 text-success rounded text-xs">✓ ${horaEntrada}</span>` : '<span class="px-2 py-1 bg-danger/20 text-danger rounded text-xs">Ausente</span>'}
                      ${salidaBano ? '<span class="text-lg" title="Salió al baño">🚽</span>' : ''}
                      ${regresoBano ? '<span class="text-lg" title="Regresó del baño">✅</span>' : (salidaBano ? '<span class="text-lg opacity-50" title="No regresó">⏳</span>' : '')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-border-subtle bg-surface-light/30 flex justify-end gap-3">
          <button onclick="exportarSesionIndividual('${sesionId}')" class="py-2 px-4 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl text-sm font-medium transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Exportar
          </button>
          <button onclick="document.getElementById('modal-detalle-sesion').remove()" class="py-2 px-4 bg-surface-light hover:bg-surface border border-border-subtle rounded-xl text-sm font-medium text-text-main transition-all">
            Cerrar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error viendo detalle:', error);
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Error al cargar detalles', 'error');
  }
}

// ========================
// 🔹 EXPORTAR SESIÓN INDIVIDUAL
// ========================
async function exportarSesionIndividual(sesionId) {
  try {
    const doc = await db.collection('sesiones').doc(sesionId).get();
    if (!doc.exists) return;
    
    const sesion = doc.data();
    const alumnos = Object.values(sesion.alumnos || {});
    const fechaSesion = obtenerFechaSesion(sesion);
    const fecha = fechaSesion ? fechaSesion.split('T')[0] : 'sin-fecha';
    
    let csv = 'Alumno,Control,Entrada,Salida Baño,Regreso Baño,Estado\n';
    
    alumnos.forEach(alumno => {
      const eventos = alumno.eventos || [];
      const entrada = eventos.find(e => e.tipo === 'entrada');
      const salidaBano = eventos.find(e => e.tipo === 'baño-salida');
      const regresoBano = eventos.find(e => e.tipo === 'baño-regreso');
      
      const horaEntrada = entrada ? new Date(entrada.hora).toLocaleTimeString('es-MX') : '-';
      const horaSalidaBano = salidaBano ? new Date(salidaBano.hora).toLocaleTimeString('es-MX') : '-';
      const horaRegresoBano = regresoBano ? new Date(regresoBano.hora).toLocaleTimeString('es-MX') : '-';
      const estado = entrada ? 'Presente' : 'Ausente';
      
      const nombre = `${alumno.nombre || ''} ${alumno.apellidos || ''}`.trim().replace(/,/g, ' ');
      
      csv += `${nombre},${alumno.control || '-'},${horaEntrada},${horaSalidaBano},${horaRegresoBano},${estado}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clase_${sesion.grado || ''}${sesion.grupo || ''}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('📥 Clase exportada', 'success');
    
  } catch (error) {
    console.error('Error exportando sesión:', error);
  }
}

// ========================
// 🔹 EXPORTAR FUNCIONES
// ========================
async function exportarMisRegistros() {
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay profesor logueado', 'error');
    return;
  }
  
  try {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('⏳ Generando reporte...', 'info');
    
    const registrosSnap = await db.collection('registros')
      .orderBy('fecha', 'desc')
      .limit(1000)
      .get();
    
    const registros = [];
    registrosSnap.forEach(doc => {
      const r = doc.data();
      if (r.profesor === profesor.nombreCompleto || 
          r.profesor === profesor.nombre ||
          r.profesorId === profesor.id) {
        registros.push(r);
      }
    });
    
    if (registros.length === 0) {
      if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay registros para exportar', 'warning');
      return;
    }
    
    let csv = 'Fecha,Hora,Alumno,Evento,Aula\n';
    
    registros.forEach(r => {
      const fecha = r.fecha ? r.fecha.split('T')[0] : '';
      const hora = r.fecha ? new Date(r.fecha).toLocaleTimeString('es-MX') : '';
      const alumno = (r.nombreCompleto || r.alumno || '').replace(/,/g, ' ');
      
      csv += `${fecha},${hora},${alumno},${r.evento || ''},${r.aula || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mis_registros_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion(`📥 ${registros.length} registros exportados`, 'success');
    
  } catch (error) {
    console.error('Error exportando:', error);
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Error al exportar', 'error');
  }
}

async function exportarHistorialProfesor() {
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay profesor logueado', 'error');
    return;
  }
  
  try {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('⏳ Generando reporte...', 'info');
    
    const sesionesSnap = await db.collection('sesiones').get();
    const sesiones = [];
    
    sesionesSnap.forEach(doc => {
      const s = doc.data();
      if (sesionEsDelProfesor(s, profesor)) {
        sesiones.push(s);
      }
    });
    
    if (sesiones.length === 0) {
      if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay clases para exportar', 'warning');
      return;
    }
    
    // Ordenar por fecha
    sesiones.sort((a, b) => {
      const fechaA = obtenerFechaSesion(a) || '';
      const fechaB = obtenerFechaSesion(b) || '';
      return fechaB.localeCompare(fechaA);
    });
    
    let csv = 'Fecha,Hora Inicio,Hora Fin,Aula,Grado,Grupo,Turno,Alumnos Presentes,Total Alumnos,Asistencia %,Estado\n';
    
    sesiones.forEach(s => {
      const alumnos = Object.values(s.alumnos || {});
      const presentes = alumnos.filter(a => (a.eventos || []).some(e => e.tipo === 'entrada')).length;
      const porcentaje = alumnos.length > 0 ? Math.round((presentes / alumnos.length) * 100) : 0;
      
      const fechaSesion = obtenerFechaSesion(s);
      const fecha = fechaSesion ? fechaSesion.split('T')[0] : '';
      const horaInicio = fechaSesion ? new Date(fechaSesion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      const horaFin = s.fin ? new Date(s.fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      const estado = s.estado && s.estado.toLowerCase().includes('finalizada') ? 'Finalizada' : 'En curso';
      
      csv += `${fecha},${horaInicio},${horaFin},${s.aula || ''},${s.grado || ''},${s.grupo || ''},${s.turno || ''},${presentes},${alumnos.length},${porcentaje}%,${estado}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historial_clases_${profesor.nombre}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion(`📥 ${sesiones.length} clases exportadas`, 'success');
    
  } catch (error) {
    console.error('Error exportando:', error);
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Error al exportar', 'error');
  }
}

// ========================
// 🔹 VER DETALLE SESIÓN
// ========================
async function verDetalleSesion(sesionId) {
  // Reutilizar la función del admin si existe
  if (typeof verSesion === 'function') {
    verSesion(sesionId);
  } else {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Función en desarrollo', 'info');
  }
}

// ========================
// 🔹 PANEL CLASE ACTIVA
// ========================

// Variable para el intervalo del cronómetro
let intervaloCronometroBano = null;

// Inicializar panel de clase activa
async function inicializarClaseActiva() {
  console.log('📚 Inicializando panel de clase activa...');
  
  // Verificar si hay clase activa
  if (window.claseActiva && window.claseActiva.estado === 'En curso') {
    mostrarClaseActivaUI(window.claseActiva);
  } else {
    // Buscar en Firebase si hay clase activa del profesor
    await buscarClaseActivaProfesor();
  }
}

// Buscar clase activa del profesor en Firebase
async function buscarClaseActivaProfesor() {
  const profesor = obtenerProfesorActual();
  if (!profesor) return;
  
  try {
    const sesionesSnap = await db.collection('sesiones')
      .where('estado', '==', 'En curso')
      .orderBy('inicio', 'desc')
      .limit(5)
      .get();
    
    let claseEncontrada = null;
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      if (sesionEsDelProfesor(sesion, profesor)) {
        claseEncontrada = { id: doc.id, ...sesion };
      }
    });
    
    if (claseEncontrada) {
      window.claseActiva = claseEncontrada;
      mostrarClaseActivaUI(claseEncontrada);
    } else {
      mostrarSinClaseActiva();
    }
    
  } catch (error) {
    console.error('Error buscando clase activa:', error);
    mostrarSinClaseActiva();
  }
}

// Mostrar UI cuando no hay clase activa
function mostrarSinClaseActiva() {
  const estadoContainer = document.getElementById('clase-activa-estado');
  if (estadoContainer) {
    estadoContainer.innerHTML = `
      <div class="text-center py-12">
        <span class="text-6xl block mb-4">📚</span>
        <h3 class="text-xl font-bold text-text-main mb-2">No hay clase activa</h3>
        <p class="text-text-muted mb-6">Inicia una nueva clase para comenzar a registrar asistencia</p>
        <button onclick="iniciarNuevaClaseRapido()" class="py-3 px-8 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          Iniciar Nueva Clase
        </button>
      </div>
    `;
  }
  
  // Ocultar paneles secundarios
  ['clase-activa-alumnos', 'clase-activa-info', 'clase-activa-resumen', 'clase-activa-acciones', 'clase-activa-cronometro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

// Mostrar UI de clase activa
function mostrarClaseActivaUI(clase) {
  console.log('📚 Mostrando clase activa:', clase);
  
  const estadoContainer = document.getElementById('clase-activa-estado');
  if (!estadoContainer) return;
  
  const tiempoTranscurrido = calcularTiempoTranscurrido(clase.inicio);
  const alumnos = clase.alumnos || {};
  const totalAlumnos = Object.keys(alumnos).length;
  
  // Panel principal con info de la clase
  estadoContainer.innerHTML = `
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-success to-primary flex items-center justify-center">
          <span class="text-3xl">📖</span>
        </div>
        <div>
          <h3 class="text-xl font-bold text-text-main">${clase.materia || 'Clase'} - ${clase.grado || ''}°${clase.grupo || ''}</h3>
          <p class="text-text-muted">${clase.turno || ''} • Aula ${clase.aula || 'N/A'}</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-sm text-text-muted">Tiempo transcurrido</p>
          <p class="text-2xl font-bold text-primary" id="clase-tiempo-transcurrido">${tiempoTranscurrido}</p>
        </div>
        <div class="w-3 h-3 rounded-full bg-success animate-pulse"></div>
      </div>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-surface-light/50 rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-text-main">${totalAlumnos}</p>
        <p class="text-xs text-text-muted">Alumnos</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-success" id="stat-presentes">${contarAlumnosPorEstado(alumnos, 'presente')}</p>
        <p class="text-xs text-text-muted">Presentes</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-warning" id="stat-bano">${contarAlumnosPorEstado(alumnos, 'baño')}</p>
        <p class="text-xs text-text-muted">En Baño</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-primary">${new Date(clase.inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
        <p class="text-xs text-text-muted">Inicio</p>
      </div>
    </div>
  `;
  
  // Mostrar paneles secundarios
  ['clase-activa-alumnos', 'clase-activa-info', 'clase-activa-resumen', 'clase-activa-acciones', 'clase-activa-cronometro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
  
  // Llenar lista de alumnos
  actualizarListaAlumnosClase(alumnos);
  
  // Llenar info
  actualizarInfoClase(clase);
  
  // Llenar resumen
  actualizarResumenClase(alumnos);
  
  // Llenar cronómetro de baño
  actualizarCronometroBano(alumnos);
  
  // Iniciar actualización periódica
  iniciarActualizacionPeriodica();
}

// Calcular tiempo transcurrido
function calcularTiempoTranscurrido(inicio) {
  if (!inicio) return '00:00';
  const inicioDate = new Date(inicio);
  const ahora = new Date();
  const diff = Math.floor((ahora - inicioDate) / 1000);
  
  const horas = Math.floor(diff / 3600);
  const minutos = Math.floor((diff % 3600) / 60);
  const segundos = diff % 60;
  
  if (horas > 0) {
    return `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }
  return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

// Contar alumnos por estado
function contarAlumnosPorEstado(alumnos, estado) {
  let count = 0;
  Object.values(alumnos).forEach(alumno => {
    const eventos = alumno.eventos || [];
    const ultimoEvento = eventos[eventos.length - 1];
    
    if (estado === 'presente') {
      if (ultimoEvento && (ultimoEvento.tipo === 'entrada' || ultimoEvento.tipo === 'baño-regreso')) {
        count++;
      }
    } else if (estado === 'baño') {
      if (ultimoEvento && ultimoEvento.tipo === 'baño-salida') {
        count++;
      }
    }
  });
  return count;
}

// Actualizar lista de alumnos en clase
function actualizarListaAlumnosClase(alumnos) {
  const container = document.getElementById('clase-activa-lista-alumnos');
  const contador = document.getElementById('clase-activa-contador');
  if (!container) return;
  
  const alumnosArray = Object.entries(alumnos);
  
  if (contador) contador.textContent = alumnosArray.length;
  
  if (alumnosArray.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-text-muted">
        <span class="text-3xl block mb-2">👥</span>
        <p class="text-sm">Aún no hay alumnos registrados</p>
        <p class="text-xs mt-1">Escanea o registra manualmente</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  alumnosArray.forEach(([control, alumno]) => {
    const eventos = alumno.eventos || [];
    const ultimoEvento = eventos[eventos.length - 1];
    const horaEntrada = eventos.find(e => e.tipo === 'entrada');
    
    let estadoIcon = '✅';
    let estadoText = 'Presente';
    let estadoColor = 'text-success';
    
    if (ultimoEvento?.tipo === 'baño-salida') {
      estadoIcon = '🚽';
      estadoText = 'En baño';
      estadoColor = 'text-warning';
    } else if (ultimoEvento?.tipo === 'salida') {
      estadoIcon = '🚪';
      estadoText = 'Salió';
      estadoColor = 'text-danger';
    }
    
    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 p-3 bg-surface-light/30 rounded-xl hover:bg-surface-light/50 transition-all';
    
    item.innerHTML = `
      <span class="text-xl">${estadoIcon}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text-main truncate">${alumno.nombre || 'Alumno'}</p>
        <p class="text-xs text-text-muted">${control} • ${horaEntrada ? new Date(horaEntrada.ts || horaEntrada.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
      </div>
      <span class="text-xs ${estadoColor} font-medium">${estadoText}</span>
    `;
    
    container.appendChild(item);
  });
}

// Actualizar info de la clase
function actualizarInfoClase(clase) {
  const container = document.getElementById('clase-activa-info-content');
  if (!container) return;
  
  container.innerHTML = `
    <div class="flex justify-between py-2 border-b border-border-subtle">
      <span class="text-text-muted text-sm">Materia</span>
      <span class="text-text-main text-sm font-medium">${clase.materia || 'N/A'}</span>
    </div>
    <div class="flex justify-between py-2 border-b border-border-subtle">
      <span class="text-text-muted text-sm">Grupo</span>
      <span class="text-text-main text-sm font-medium">${clase.grado || ''}°${clase.grupo || ''}</span>
    </div>
    <div class="flex justify-between py-2 border-b border-border-subtle">
      <span class="text-text-muted text-sm">Aula</span>
      <span class="text-text-main text-sm font-medium">${clase.aula || 'N/A'}</span>
    </div>
    <div class="flex justify-between py-2 border-b border-border-subtle">
      <span class="text-text-muted text-sm">Turno</span>
      <span class="text-text-main text-sm font-medium">${clase.turno || 'N/A'}</span>
    </div>
    <div class="flex justify-between py-2">
      <span class="text-text-muted text-sm">Inicio</span>
      <span class="text-text-main text-sm font-medium">${clase.inicio ? new Date(clase.inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
    </div>
  `;
}

// Actualizar resumen de la clase
function actualizarResumenClase(alumnos) {
  const presentes = contarAlumnosPorEstado(alumnos, 'presente');
  const enBano = contarAlumnosPorEstado(alumnos, 'baño');
  
  // Contar tardanzas (entrada > 10 min después del inicio)
  let tardanzas = 0;
  if (window.claseActiva?.inicio) {
    const inicioClase = new Date(window.claseActiva.inicio);
    Object.values(alumnos).forEach(alumno => {
      const entrada = (alumno.eventos || []).find(e => e.tipo === 'entrada');
      if (entrada) {
        const horaEntrada = new Date(entrada.ts || entrada.hora);
        const diffMin = (horaEntrada - inicioClase) / 60000;
        if (diffMin > 10) tardanzas++;
      }
    });
  }
  
  document.getElementById('clase-resumen-presentes')?.textContent && (document.getElementById('clase-resumen-presentes').textContent = presentes);
  document.getElementById('clase-resumen-bano')?.textContent && (document.getElementById('clase-resumen-bano').textContent = enBano);
  document.getElementById('clase-resumen-tardanzas')?.textContent && (document.getElementById('clase-resumen-tardanzas').textContent = tardanzas);
  document.getElementById('clase-resumen-ausentes')?.textContent && (document.getElementById('clase-resumen-ausentes').textContent = 0); // Se podría calcular con lista del grupo
}

// Actualizar cronómetro de alumnos en baño
function actualizarCronometroBano(alumnos) {
  const container = document.getElementById('lista-alumnos-bano');
  if (!container) return;
  
  const alumnosEnBano = [];
  
  Object.entries(alumnos).forEach(([control, alumno]) => {
    const eventos = alumno.eventos || [];
    const ultimoEvento = eventos[eventos.length - 1];
    
    if (ultimoEvento?.tipo === 'baño-salida') {
      alumnosEnBano.push({
        control,
        nombre: alumno.nombre,
        horaSalida: ultimoEvento.ts || ultimoEvento.hora
      });
    }
  });
  
  if (alumnosEnBano.length === 0) {
    container.innerHTML = `<p class="text-text-muted text-sm text-center py-4">Ningún alumno en baño</p>`;
    return;
  }
  
  container.innerHTML = '';
  
  alumnosEnBano.forEach(alumno => {
    const tiempoEnBano = calcularTiempoEnBano(alumno.horaSalida);
    const minutos = parseInt(tiempoEnBano.split(':')[0]);
    const esAlerta = minutos >= 5;
    
    const item = document.createElement('div');
    item.className = `flex items-center justify-between p-3 rounded-xl ${esAlerta ? 'bg-danger/20 border border-danger/30' : 'bg-warning/10'}`;
    
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-lg">${esAlerta ? '⚠️' : '🚽'}</span>
        <span class="text-sm font-medium text-text-main">${alumno.nombre}</span>
      </div>
      <span class="text-lg font-mono font-bold ${esAlerta ? 'text-danger' : 'text-warning'}">${tiempoEnBano}</span>
    `;
    
    container.appendChild(item);
  });
}

// Calcular tiempo en baño
function calcularTiempoEnBano(horaSalida) {
  if (!horaSalida) return '00:00';
  const salida = new Date(horaSalida);
  const ahora = new Date();
  const diff = Math.floor((ahora - salida) / 1000);
  
  const minutos = Math.floor(diff / 60);
  const segundos = diff % 60;
  
  return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

// Iniciar actualización periódica
function iniciarActualizacionPeriodica() {
  // Limpiar intervalo anterior
  if (intervaloCronometroBano) clearInterval(intervaloCronometroBano);
  
  // Actualizar cada segundo
  intervaloCronometroBano = setInterval(() => {
    if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
      clearInterval(intervaloCronometroBano);
      return;
    }
    
    // Actualizar tiempo transcurrido
    const tiempoEl = document.getElementById('clase-tiempo-transcurrido');
    if (tiempoEl) {
      tiempoEl.textContent = calcularTiempoTranscurrido(window.claseActiva.inicio);
    }
    
    // Actualizar cronómetros de baño
    actualizarCronometroBano(window.claseActiva.alumnos || {});
    
  }, 1000);
}

// Iniciar nueva clase rápido
function iniciarNuevaClaseRapido() {
  const profesor = obtenerProfesorActual();
  if (!profesor) {
    mostrarNotificacion('⚠️ No hay profesor logueado', 'warning');
    return;
  }
  
  // Usar la función existente de iniciar-clase.js
  if (typeof iniciarSesionClase === 'function') {
    iniciarSesionClase(profesor);
  } else {
    // Navegar al escáner
    document.querySelector('[data-section="escaner-profesor"]')?.click();
  }
}

// Abrir escáner desde clase activa
function abrirEscanerDesdeClase() {
  document.querySelector('[data-section="escaner-profesor"]')?.click();
}

// Registrar alumno manual
function registrarAlumnoManual() {
  if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
    mostrarNotificacion('⚠️ No hay clase activa', 'warning');
    return;
  }
  
  // Crear modal para buscar alumno
  const modal = document.createElement('div');
  modal.id = 'modal-registro-manual';
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="glass rounded-2xl w-full max-w-md overflow-hidden animate-slide-in-up">
      <div class="p-6 border-b border-border-subtle">
        <h3 class="text-xl font-bold text-text-main flex items-center gap-2">
          ➕ Registrar Alumno Manual
        </h3>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-text-muted text-sm mb-2">Número de Control</label>
          <input type="text" id="manual-control" placeholder="Ej: 12345678" class="w-full py-3 px-4 bg-surface-light/50 border border-border-subtle rounded-xl text-text-main focus:outline-none focus:border-primary/50">
        </div>
        <div id="manual-alumno-preview" class="hidden">
          <!-- Se llena al buscar -->
        </div>
      </div>
      <div class="p-4 border-t border-border-subtle flex justify-end gap-3">
        <button onclick="document.getElementById('modal-registro-manual').remove()" class="py-2 px-4 bg-surface-light hover:bg-surface rounded-xl text-sm font-medium text-text-main transition-all">
          Cancelar
        </button>
        <button onclick="buscarYRegistrarAlumno()" class="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-all">
          Buscar y Registrar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('manual-control')?.focus();
}

// Buscar y registrar alumno
async function buscarYRegistrarAlumno() {
  const control = document.getElementById('manual-control')?.value.trim();
  if (!control) {
    mostrarNotificacion('⚠️ Ingresa un número de control', 'warning');
    return;
  }
  
  try {
    // Buscar alumno en usuarios
    const usuariosSnap = await db.collection('usuarios')
      .where('control', '==', control)
      .limit(1)
      .get();
    
    if (usuariosSnap.empty) {
      mostrarNotificacion('❌ Alumno no encontrado', 'error');
      return;
    }
    
    const alumnoDoc = usuariosSnap.docs[0];
    const alumno = alumnoDoc.data();
    
    // Registrar en la clase activa usando la función existente
    if (typeof registrarAlumnoEnClase === 'function') {
      registrarAlumnoEnClase(alumno);
      document.getElementById('modal-registro-manual')?.remove();
      
      // Actualizar UI
      setTimeout(() => {
        if (window.claseActiva) {
          mostrarClaseActivaUI(window.claseActiva);
        }
      }, 500);
    } else {
      mostrarNotificacion('⚠️ Error al registrar', 'error');
    }
    
  } catch (error) {
    console.error('Error buscando alumno:', error);
    mostrarNotificacion('❌ Error al buscar', 'error');
  }
}

// Finalizar clase activa
function finalizarClaseActiva() {
  if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
    mostrarNotificacion('⚠️ No hay clase activa', 'warning');
    return;
  }
  
  if (!confirm('¿Finalizar la clase actual?')) return;
  
  // Usar la función existente
  if (typeof finalizarClase === 'function') {
    finalizarClase();
    
    // Limpiar intervalo
    if (intervaloCronometroBano) clearInterval(intervaloCronometroBano);
    
    // Actualizar UI después de un momento
    setTimeout(() => {
      mostrarSinClaseActiva();
    }, 500);
  }
}

// Toggle pase de lista
function togglePaseLista() {
  mostrarNotificacion('📋 Función de pase de lista en desarrollo', 'info');
}

// Exportar asistencia de la clase
function exportarAsistenciaClase() {
  if (!window.claseActiva) {
    mostrarNotificacion('⚠️ No hay clase activa', 'warning');
    return;
  }
  
  const clase = window.claseActiva;
  const alumnos = clase.alumnos || {};
  
  // Crear CSV
  let csv = '\ufeff'; // BOM
  csv += 'No,Control,Nombre,Hora Entrada,Estado,Tiempo en Baño\n';
  
  let i = 1;
  Object.entries(alumnos).forEach(([control, alumno]) => {
    const eventos = alumno.eventos || [];
    const entrada = eventos.find(e => e.tipo === 'entrada');
    const ultimoEvento = eventos[eventos.length - 1];
    
    let estado = 'Presente';
    if (ultimoEvento?.tipo === 'baño-salida') estado = 'En baño';
    if (ultimoEvento?.tipo === 'salida') estado = 'Salió';
    
    csv += `${i},${control},"${alumno.nombre || ''}",${entrada ? new Date(entrada.ts || entrada.hora).toLocaleTimeString('es-MX') : 'N/A'},${estado},\n`;
    i++;
  });
  
  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asistencia_${clase.grado}${clase.grupo}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  mostrarNotificacion('📥 Asistencia exportada', 'success');
}

// Observer para la sección de clase activa
document.addEventListener('DOMContentLoaded', () => {
  const claseActivaSection = document.getElementById('clase-activa');
  if (claseActivaSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          const isVisible = !claseActivaSection.classList.contains('hidden');
          if (isVisible) {
            console.log('📚 Sección clase activa visible');
            inicializarClaseActiva();
          }
        }
      });
    });
    observer.observe(claseActivaSection, { attributes: true });
  }
});

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.inicializarDashboardProfesor = inicializarDashboardProfesor;
window.cargarActividadProfesor = cargarActividadProfesor;
window.cargarHistorialProfesor = cargarHistorialProfesor;
window.exportarMisRegistros = exportarMisRegistros;
window.exportarHistorialProfesor = exportarHistorialProfesor;
window.verDetalleSesion = verDetalleSesion;
window.verDetalleSesionProfesor = verDetalleSesionProfesor;
window.exportarSesionIndividual = exportarSesionIndividual;
window.cargarSiguienteClaseProfesor = cargarSiguienteClaseProfesor;
window.cargarClasesHoy = cargarClasesHoy;
window.iniciarDashboardProfesorAlLogin = iniciarDashboardProfesorAlLogin;
window.inicializarClaseActiva = inicializarClaseActiva;
window.iniciarNuevaClaseRapido = iniciarNuevaClaseRapido;
window.abrirEscanerDesdeClase = abrirEscanerDesdeClase;
window.registrarAlumnoManual = registrarAlumnoManual;
window.buscarYRegistrarAlumno = buscarYRegistrarAlumno;
window.finalizarClaseActiva = finalizarClaseActiva;
window.togglePaseLista = togglePaseLista;
window.exportarAsistenciaClase = exportarAsistenciaClase;

// ========================
// 👤 CARGAR PERFIL COMPLETO DEL PROFESOR
// ========================
async function cargarPerfilCompletoProfesor() {
  const profesor = window.usuarioActual;
  if (!profesor || profesor.tipo !== 'Profesor') return;
  
  const usuarioId = profesor.telefono || profesor.id;
  
  try {
    // Cargar datos actualizados de Firebase
    const doc = await db.collection('profesores').doc(usuarioId).get();
    const datos = doc.exists ? doc.data() : profesor;
    
    // Avatar
    const avatarEl = document.getElementById('avatar-profesor-qr');
    if (avatarEl) {
      const iniciales = `${(datos.nombre || '').charAt(0)}${(datos.apellidos || '').charAt(0)}`.toUpperCase() || '--';
      avatarEl.textContent = iniciales;
    }
    
    // Nombre completo
    const nombreEl = document.getElementById('nombre-profesor-qr');
    if (nombreEl) {
      nombreEl.textContent = `${datos.nombre || ''} ${datos.apellidos || ''}`.trim() || 'Sin nombre';
    }
    
    // Teléfono
    const telefonoEl = document.getElementById('telefono-profesor-qr');
    if (telefonoEl) telefonoEl.textContent = datos.telefono || usuarioId || '-';
    
    // Materias
    const materiasEl = document.getElementById('materias-profesor-qr');
    if (materiasEl) {
      let materias = '-';
      if (datos.materias) {
        if (Array.isArray(datos.materias)) {
          materias = datos.materias.join(', ');
        } else {
          materias = datos.materias;
        }
      }
      materiasEl.textContent = materias;
      materiasEl.title = materias; // Para tooltip
    }
    
    // Grupos
    const gruposEl = document.getElementById('grupos-profesor-qr');
    if (gruposEl) {
      let grupos = '-';
      if (datos.grupos) {
        if (Array.isArray(datos.grupos)) {
          grupos = datos.grupos.length;
        } else {
          grupos = String(datos.grupos).split(',').length;
        }
      }
      gruposEl.textContent = grupos;
    }
    
    // Cargar estadísticas del profesor
    await cargarEstadisticasPerfilProfesor(usuarioId, `${datos.nombre || ''} ${datos.apellidos || ''}`.trim());
    
  } catch (error) {
    console.error('Error cargando perfil profesor:', error);
  }
}

/**
 * Carga las estadísticas del perfil del profesor
 */
async function cargarEstadisticasPerfilProfesor(profesorId, nombreProfesor) {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().split('T')[0];
    
    // Sesiones de hoy
    const sesionesHoySnap = await db.collection('sesiones')
      .where('fecha', '>=', hoyStr)
      .get();
    
    let clasesHoy = 0;
    let alumnosHoy = 0;
    
    sesionesHoySnap.forEach(doc => {
      const sesion = doc.data();
      if (sesion.profesorId === profesorId || 
          sesion.profesor === nombreProfesor ||
          sesion.profesor?.nombre === nombreProfesor) {
        clasesHoy++;
        alumnosHoy += Object.keys(sesion.alumnos || {}).length;
      }
    });
    
    // Sesiones del mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    
    const sesionesMesSnap = await db.collection('sesiones')
      .where('fecha', '>=', inicioMesStr)
      .get();
    
    let sesionesMes = 0;
    sesionesMesSnap.forEach(doc => {
      const sesion = doc.data();
      if (sesion.profesorId === profesorId || 
          sesion.profesor === nombreProfesor ||
          sesion.profesor?.nombre === nombreProfesor) {
        sesionesMes++;
      }
    });
    
    // Actualizar UI
    const clasesHoyEl = document.getElementById('perfil-clases-hoy-profesor');
    if (clasesHoyEl) clasesHoyEl.textContent = clasesHoy;
    
    const alumnosEl = document.getElementById('perfil-alumnos-profesor');
    if (alumnosEl) alumnosEl.textContent = alumnosHoy;
    
    const sesionesEl = document.getElementById('perfil-sesiones-profesor');
    if (sesionesEl) sesionesEl.textContent = sesionesMes;
    
  } catch (error) {
    console.error('Error cargando estadísticas profesor:', error);
  }
}

// Observer para cargar perfil cuando se abre la sección
document.addEventListener('DOMContentLoaded', () => {
  const qrProfesor = document.getElementById('generador-qr-profesor');
  if (qrProfesor) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !qrProfesor.classList.contains('hidden')) {
          cargarPerfilCompletoProfesor();
        }
      });
    });
    observer.observe(qrProfesor, { attributes: true });
  }
});

window.cargarPerfilCompletoProfesor = cargarPerfilCompletoProfesor;
