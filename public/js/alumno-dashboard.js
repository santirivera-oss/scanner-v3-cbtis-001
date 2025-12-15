// ========================================
// 📊 DASHBOARD DEL ALUMNO
// Keyon Access System v2.0
// ========================================

// Variables globales
let graficaAlumnoAsistencia = null;
let calendarioMesActual = new Date();

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  // Observer para dashboard alumno
  const dashboardAlumno = document.getElementById('dashboard-alumno');
  if (dashboardAlumno) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!dashboardAlumno.classList.contains('hidden')) {
            console.log('📊 Dashboard alumno visible');
            inicializarDashboardAlumno();
          }
        }
      });
    });
    observer.observe(dashboardAlumno, { attributes: true });
  }
  
  // Observer para historial alumno
  const historialAlumno = document.getElementById('historial-alumno');
  if (historialAlumno) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!historialAlumno.classList.contains('hidden')) {
            console.log('📋 Historial alumno visible');
            cargarHistorialAlumno();
          }
        }
      });
    });
    observer.observe(historialAlumno, { attributes: true });
  }
  
  // Observer para calendario alumno
  const calendarioAlumno = document.getElementById('calendario-alumno');
  if (calendarioAlumno) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!calendarioAlumno.classList.contains('hidden')) {
            console.log('📅 Calendario alumno visible');
            generarCalendario();
          }
        }
      });
    });
    observer.observe(calendarioAlumno, { attributes: true });
  }
  
  // Filtro de gráfica
  const filtroMes = document.getElementById('alumno-filtro-mes');
  if (filtroMes) {
    filtroMes.addEventListener('change', () => {
      const alumno = obtenerAlumnoActual();
      if (alumno) cargarGraficaAlumno(alumno);
    });
  }
});

// ========================
// 🔹 OBTENER ALUMNO ACTUAL
// ========================
function obtenerAlumnoActual() {
  const alumno = window.usuarioActual;
  if (!alumno || alumno.tipo !== 'Alumno') return null;
  
  return {
    id: alumno.id || alumno.control || '',
    nombre: alumno.nombre || '',
    apellidos: alumno.apellidos || '',
    nombreCompleto: `${alumno.nombre || ''} ${alumno.apellidos || ''}`.trim(),
    control: alumno.control || '',
    grado: alumno.grado || '',
    grupo: alumno.grupo || '',
    turno: alumno.turno || ''
  };
}

// ========================
// 🔹 OBTENER HORARIO DEL ALUMNO
// ========================
async function cargarHorarioAlumnoUI() {
  const alumno = obtenerAlumnoActual();
  if (!alumno) return null;
  
  const container = document.getElementById('alumno-horario-container');
  
  try {
    // Intentar usar módulo de horarios
    if (typeof obtenerHorarioAlumno === 'function') {
      const horario = await obtenerHorarioAlumno(alumno);
      
      if (horario && container) {
        if (typeof renderizarHorarioTabla === 'function') {
          renderizarHorarioTabla(horario, 'alumno-horario-container');
          return horario;
        }
      }
    }
    
    // Si no hay horario programado, mostrar mensaje
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2">📅</span>
          <p>Horario no disponible</p>
          <p class="text-xs mt-1">Contacta a control escolar</p>
        </div>
      `;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error cargando horario del alumno:', error);
    return null;
  }
}

// ========================
// 🔹 INICIALIZAR DASHBOARD
// ========================
async function inicializarDashboardAlumno() {
  const alumno = obtenerAlumnoActual();
  if (!alumno) {
    console.warn('⚠️ No hay alumno logueado');
    return;
  }
  
  console.log('📊 Inicializando dashboard para alumno:', alumno.nombreCompleto);
  
  await cargarEstadisticasAlumno(alumno);
  await cargarGraficaAlumno(alumno);
  await cargarResumenMes(alumno);
  await cargarActividadAlumno(alumno);
  await cargarLogrosAlumno(alumno);
  await cargarProximaClaseAlumno(alumno);
}

// ========================
// 🔹 PRÓXIMA CLASE DEL ALUMNO
// ========================
async function cargarProximaClaseAlumno(alumno) {
  const container = document.getElementById('alumno-proxima-clase');
  if (!container) return;
  
  try {
    // Obtener información del grupo del alumno
    if (typeof obtenerInfoGrupo === 'function' && alumno.grado) {
      const match = alumno.grado.match(/(\d+)[°]?([A-Za-z])/);
      if (match) {
        const semestre = parseInt(match[1]);
        const grupo = match[2].toUpperCase();
        const infoGrupo = obtenerInfoGrupo(semestre, grupo);
        
        // Obtener módulo actual
        if (typeof obtenerModuloActual === 'function') {
          const moduloActual = obtenerModuloActual(infoGrupo.turno);
          const siguienteModulo = typeof obtenerSiguienteModulo === 'function' ? 
                                   obtenerSiguienteModulo(infoGrupo.turno) : null;
          
          if (moduloActual || siguienteModulo) {
            const modulo = moduloActual || siguienteModulo;
            const esActual = !!moduloActual;
            
            container.innerHTML = `
              <div class="bg-gradient-to-br ${esActual ? 'from-success/20 to-accent/20 border-success/20' : 'from-primary/20 to-accent/20 border-primary/20'} rounded-2xl p-4 border">
                <div class="flex items-center gap-2 ${esActual ? 'text-success' : 'text-primary'} text-sm font-medium mb-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  ${esActual ? 'Clase en curso' : 'Próxima clase'}
                </div>
                <div class="text-lg font-bold text-text-main mb-1">Módulo ${modulo.modulo}</div>
                <div class="text-sm text-text-muted">${modulo.inicio} - ${modulo.fin}</div>
                <div class="text-xs text-text-muted mt-2">Grupo: ${infoGrupo.nombre} • ${infoGrupo.turno}</div>
              </div>
            `;
            return;
          }
        }
      }
    }
    
    // Fallback si no hay horario
    container.innerHTML = `
      <div class="bg-surface-light/50 rounded-2xl p-4 border border-border-subtle text-center">
        <span class="text-2xl block mb-2">📚</span>
        <p class="text-sm text-text-muted">Sin clases en este momento</p>
      </div>
    `;
    
  } catch (error) {
    console.error('Error cargando próxima clase:', error);
  }
}

// ========================
// 🔹 ESTADÍSTICAS GENERALES
// ========================
async function cargarEstadisticasAlumno(alumno) {
  try {
    const registros = await obtenerRegistrosAlumno(alumno);
    
    // Calcular estadísticas
    const totalClases = registros.clases.length;
    const clasesAsistidas = registros.clases.filter(c => c.asistio).length;
    const clasesPuntuales = registros.clases.filter(c => c.puntual).length;
    const salidasBano = registros.eventos.filter(e => e.tipo === 'baño-salida').length;
    
    const porcentajeAsistencia = totalClases > 0 ? Math.round((clasesAsistidas / totalClases) * 100) : 0;
    const porcentajePuntualidad = clasesAsistidas > 0 ? Math.round((clasesPuntuales / clasesAsistidas) * 100) : 0;
    
    // Animaciones
    animarContadorAlumno('alumno-stat-asistencia', porcentajeAsistencia);
    animarContadorAlumno('alumno-stat-puntualidad', porcentajePuntualidad);
    animarContadorAlumno('alumno-stat-clases', clasesAsistidas);
    animarContadorAlumno('alumno-stat-bano', salidasBano);
    
    console.log('📊 Estadísticas alumno:', { totalClases, clasesAsistidas, porcentajeAsistencia, porcentajePuntualidad });
    
  } catch (error) {
    console.error('Error cargando estadísticas alumno:', error);
  }
}

// ========================
// 🔹 OBTENER REGISTROS DEL ALUMNO
// ========================
async function obtenerRegistrosAlumno(alumno) {
  const clases = [];
  const eventos = [];
  
  try {
    // Buscar en todas las sesiones
    const sesionesSnap = await db.collection('sesiones').get();
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      const alumnos = sesion.alumnos || {};
      
      // Buscar si este alumno está en la sesión
      let alumnoEnSesion = null;
      let alumnoKey = null;
      
      Object.entries(alumnos).forEach(([key, a]) => {
        if (a.control === alumno.control || 
            a.id === alumno.id ||
            key === alumno.control ||
            key === alumno.id) {
          alumnoEnSesion = a;
          alumnoKey = key;
        }
      });
      
      if (alumnoEnSesion) {
        const eventosAlumno = alumnoEnSesion.eventos || [];
        const entrada = eventosAlumno.find(e => e.tipo === 'entrada');
        const fechaSesion = sesion.inicio || sesion.fechaInicio;
        
        // Calcular puntualidad
        let puntual = false;
        if (entrada && fechaSesion) {
          const horaInicio = new Date(fechaSesion);
          const horaEntrada = new Date(entrada.hora);
          const diffMinutos = (horaEntrada - horaInicio) / (1000 * 60);
          puntual = diffMinutos <= 10;
        }
        
        clases.push({
          fecha: fechaSesion,
          asistio: !!entrada,
          puntual: puntual,
          profesor: sesion.profesor ? `${sesion.profesor.nombre} ${sesion.profesor.apellidos}`.trim() : '-',
          grado: sesion.grado,
          grupo: sesion.grupo,
          aula: sesion.aula,
          turno: sesion.turno,
          eventos: eventosAlumno
        });
        
        // Agregar eventos individuales
        eventosAlumno.forEach(e => {
          eventos.push({
            ...e,
            fecha: e.hora,
            clase: `${sesion.grado || ''}°${sesion.grupo || ''}`
          });
        });
      }
    });
    
    // También buscar en registros directos
    const registrosSnap = await db.collection('registros')
      .where('control', '==', alumno.control)
      .orderBy('fecha', 'desc')
      .limit(100)
      .get();
    
    registrosSnap.forEach(doc => {
      const reg = doc.data();
      eventos.push({
        tipo: reg.evento,
        fecha: reg.fecha,
        hora: reg.fecha,
        clase: reg.aula || '-'
      });
    });
    
  } catch (error) {
    console.error('Error obteniendo registros:', error);
  }
  
  return { clases, eventos };
}

// ========================
// 🔹 GRÁFICA DE ASISTENCIA
// ========================
async function cargarGraficaAlumno(alumno) {
  const canvas = document.getElementById('alumno-grafica-asistencia');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const filtro = document.getElementById('alumno-filtro-mes')?.value || 'mes';
  
  const datos = await obtenerDatosGraficaAlumno(alumno, filtro);
  
  if (graficaAlumnoAsistencia) {
    graficaAlumnoAsistencia.destroy();
  }
  
  graficaAlumnoAsistencia = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.labels,
      datasets: [{
        label: 'Asistencias',
        data: datos.asistencias,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(16, 185, 129, 0.3)',
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
          max: Math.max(...datos.asistencias, 5) + 1,
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          ticks: { 
            color: '#64748b', 
            font: { size: 11 },
            stepSize: 1
          }
        }
      }
    }
  });
}

async function obtenerDatosGraficaAlumno(alumno, filtro) {
  const labels = [];
  const asistencias = [];
  const registros = await obtenerRegistrosAlumno(alumno);
  
  let dias = 7;
  if (filtro === 'mes') dias = 30;
  if (filtro === 'semestre') dias = 180;
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    if (filtro === 'semana') {
      labels.push(diasSemana[fecha.getDay()]);
    } else if (filtro === 'mes') {
      labels.push(fecha.getDate().toString());
    } else {
      labels.push(`${fecha.getDate()} ${meses[fecha.getMonth()]}`);
    }
    
    // Contar asistencias de ese día
    const asistenciasDia = registros.clases.filter(c => {
      if (!c.fecha) return false;
      return c.fecha.startsWith(fechaStr) && c.asistio;
    }).length;
    
    asistencias.push(asistenciasDia);
  }
  
  // Simplificar para semestre (agrupar por semana)
  if (filtro === 'semestre') {
    const labelsAgrupados = [];
    const asistenciasAgrupadas = [];
    
    for (let i = 0; i < asistencias.length; i += 7) {
      const semana = asistencias.slice(i, i + 7);
      const suma = semana.reduce((a, b) => a + b, 0);
      asistenciasAgrupadas.push(suma);
      labelsAgrupados.push(`Sem ${Math.floor(i / 7) + 1}`);
    }
    
    return { labels: labelsAgrupados.slice(-12), asistencias: asistenciasAgrupadas.slice(-12) };
  }
  
  return { labels, asistencias };
}

// ========================
// 🔹 RESUMEN DEL MES
// ========================
async function cargarResumenMes(alumno) {
  try {
    const registros = await obtenerRegistrosAlumno(alumno);
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();
    
    // Filtrar clases del mes actual
    const clasesDelMes = registros.clases.filter(c => {
      if (!c.fecha) return false;
      const fecha = new Date(c.fecha);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    });
    
    const asistencias = clasesDelMes.filter(c => c.asistio).length;
    const faltas = clasesDelMes.filter(c => !c.asistio).length;
    const retardos = clasesDelMes.filter(c => c.asistio && !c.puntual).length;
    
    // Contar baños del mes
    const eventosDelMes = registros.eventos.filter(e => {
      if (!e.fecha) return false;
      const fecha = new Date(e.fecha);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    });
    const banos = eventosDelMes.filter(e => e.tipo === 'baño-salida').length;
    
    document.getElementById('alumno-resumen-asistencias').textContent = asistencias;
    document.getElementById('alumno-resumen-faltas').textContent = faltas;
    document.getElementById('alumno-resumen-retardos').textContent = retardos;
    document.getElementById('alumno-resumen-bano').textContent = banos;
    
  } catch (error) {
    console.error('Error cargando resumen:', error);
  }
}

// ========================
// 🔹 ACTIVIDAD RECIENTE
// ========================
async function cargarActividadAlumno(alumno) {
  const container = document.getElementById('alumno-actividad-reciente');
  if (!container) return;
  
  try {
    const registros = await obtenerRegistrosAlumno(alumno);
    
    // Ordenar eventos por fecha
    const eventosOrdenados = registros.eventos
      .filter(e => e.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);
    
    if (eventosOrdenados.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl block mb-2 opacity-30">⚡</span>
          <p class="text-sm">Sin actividad reciente</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    const iconos = {
      'entrada': '✅',
      'salida': '🚪',
      'baño-salida': '🚽',
      'baño-regreso': '↩️'
    };
    
    const nombres = {
      'entrada': 'Entrada a clase',
      'salida': 'Salida de clase',
      'baño-salida': 'Salida al baño',
      'baño-regreso': 'Regreso del baño'
    };
    
    eventosOrdenados.forEach((evento, index) => {
      const fecha = new Date(evento.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      
      const item = document.createElement('div');
      item.className = 'flex items-center gap-3 p-3 bg-surface-light/30 rounded-xl';
      item.style.animationDelay = `${index * 0.05}s`;
      item.innerHTML = `
        <span class="text-lg">${iconos[evento.tipo] || '📋'}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-text-main font-medium">${nombres[evento.tipo] || evento.tipo}</p>
          <p class="text-xs text-text-muted">${evento.clase || ''}</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-primary font-medium">${horaStr}</p>
          <p class="text-xs text-text-muted">${fechaStr}</p>
        </div>
      `;
      container.appendChild(item);
    });
    
  } catch (error) {
    console.error('Error cargando actividad:', error);
  }
}

// ========================
// 🔹 LOGROS
// ========================
async function cargarLogrosAlumno(alumno) {
  try {
    const registros = await obtenerRegistrosAlumno(alumno);
    
    // Calcular racha
    let racha = 0;
    const clasesOrdenadas = registros.clases
      .filter(c => c.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    for (const clase of clasesOrdenadas) {
      if (clase.asistio) {
        racha++;
      } else {
        break;
      }
    }
    
    document.getElementById('alumno-racha').textContent = racha;
    
    // Verificar logro de asistencia perfecta
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const clasesDelMes = registros.clases.filter(c => {
      if (!c.fecha) return false;
      return new Date(c.fecha).getMonth() === mesActual;
    });
    
    const todasAsistencias = clasesDelMes.length > 0 && clasesDelMes.every(c => c.asistio);
    const logroPerfecto = document.getElementById('alumno-logro-perfecto');
    if (logroPerfecto) {
      if (todasAsistencias && clasesDelMes.length >= 10) {
        logroPerfecto.innerHTML = '<span class="text-emerald-400 font-bold">¡Logrado! 🎉</span>';
      } else {
        const faltantes = clasesDelMes.filter(c => !c.asistio).length;
        logroPerfecto.textContent = faltantes > 0 ? `${faltantes} faltas este mes` : 'Logra 100% en un mes';
      }
    }
    
    // Verificar logro de puntualidad
    const clasesPuntuales = clasesOrdenadas.filter(c => c.puntual).slice(0, 10);
    const logroPuntual = document.getElementById('alumno-logro-puntual');
    if (logroPuntual) {
      if (clasesPuntuales.length >= 10) {
        logroPuntual.innerHTML = '<span class="text-blue-400 font-bold">¡Logrado! 🎉</span>';
      } else {
        logroPuntual.textContent = `${clasesPuntuales.length}/10 clases puntuales`;
      }
    }
    
  } catch (error) {
    console.error('Error cargando logros:', error);
  }
}

// ========================
// 🔹 HISTORIAL
// ========================
async function cargarHistorialAlumno() {
  const tbody = document.getElementById('tabla-historial-alumno');
  if (!tbody) return;
  
  const alumno = obtenerAlumnoActual();
  if (!alumno) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-text-muted">
        <span class="text-4xl block mb-2 animate-pulse">⏳</span>
        <p>Cargando historial...</p>
      </td>
    </tr>
  `;
  
  try {
    const registros = await obtenerRegistrosAlumno(alumno);
    
    // Ordenar por fecha descendente
    const clasesOrdenadas = registros.clases
      .filter(c => c.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 50);
    
    if (clasesOrdenadas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-text-muted">
            <span class="text-4xl block mb-2 opacity-30">📋</span>
            <p>No hay registros en tu historial</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = '';
    
    clasesOrdenadas.forEach(clase => {
      const fecha = new Date(clase.fecha);
      const fechaStr = fecha.toLocaleDateString('es-MX', { 
        weekday: 'short',
        day: 'numeric', 
        month: 'short' 
      });
      const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      
      const entrada = clase.eventos.find(e => e.tipo === 'entrada');
      const horaEntrada = entrada ? new Date(entrada.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
      
      const salidaBano = clase.eventos.filter(e => e.tipo === 'baño-salida').length;
      
      let estadoBadge = '';
      if (!clase.asistio) {
        estadoBadge = '<span class="px-2 py-1 bg-danger/20 text-danger rounded text-xs">Falta</span>';
      } else if (!clase.puntual) {
        estadoBadge = '<span class="px-2 py-1 bg-warning/20 text-warning rounded text-xs">Retardo</span>';
      } else {
        estadoBadge = '<span class="px-2 py-1 bg-success/20 text-success rounded text-xs">Asistencia</span>';
      }
      
      const tr = document.createElement('tr');
      tr.className = 'border-b border-border-subtle/50 hover:bg-surface-light/30 transition-colors';
      tr.innerHTML = `
        <td class="py-4 px-2">
          <div class="flex flex-col">
            <span class="text-text-main font-medium">${fechaStr}</span>
            <span class="text-xs text-text-muted">${horaStr}</span>
          </div>
        </td>
        <td class="py-4 px-2">
          <span class="text-text-main">${clase.grado || '-'}°${clase.grupo || '-'}</span>
          <span class="text-text-muted text-xs block">Aula ${clase.aula || '-'}</span>
        </td>
        <td class="py-4 px-2 text-text-main">${clase.profesor || '-'}</td>
        <td class="py-4 px-2 text-text-main">${horaEntrada}</td>
        <td class="py-4 px-2">
          ${salidaBano > 0 ? `<span class="text-warning">🚽 ${salidaBano}</span>` : '<span class="text-text-muted">-</span>'}
        </td>
        <td class="py-4 px-2">${estadoBadge}</td>
      `;
      tbody.appendChild(tr);
    });
    
  } catch (error) {
    console.error('Error cargando historial:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-danger">
          <span class="text-4xl block mb-2">⚠️</span>
          <p>Error al cargar historial</p>
        </td>
      </tr>
    `;
  }
}

// ========================
// 🔹 CALENDARIO
// ========================
function generarCalendario() {
  const alumno = obtenerAlumnoActual();
  if (!alumno) return;
  
  actualizarMesCalendario();
  cargarDatosCalendario(alumno);
}

function actualizarMesCalendario() {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const mesLabel = document.getElementById('calendario-mes-actual');
  if (mesLabel) {
    mesLabel.textContent = `${meses[calendarioMesActual.getMonth()]} ${calendarioMesActual.getFullYear()}`;
  }
}

function cambiarMesCalendario(delta) {
  calendarioMesActual.setMonth(calendarioMesActual.getMonth() + delta);
  generarCalendario();
}

async function cargarDatosCalendario(alumno) {
  const container = document.getElementById('calendario-dias');
  if (!container) return;
  
  const registros = await obtenerRegistrosAlumno(alumno);
  
  const año = calendarioMesActual.getFullYear();
  const mes = calendarioMesActual.getMonth();
  
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();
  
  // Crear mapa de asistencias
  const asistenciasPorDia = {};
  registros.clases.forEach(clase => {
    if (!clase.fecha) return;
    const fecha = new Date(clase.fecha);
    if (fecha.getMonth() === mes && fecha.getFullYear() === año) {
      const dia = fecha.getDate();
      if (!asistenciasPorDia[dia]) {
        asistenciasPorDia[dia] = { asistio: false, puntual: false, falta: false };
      }
      if (clase.asistio) {
        asistenciasPorDia[dia].asistio = true;
        asistenciasPorDia[dia].puntual = clase.puntual;
      } else {
        asistenciasPorDia[dia].falta = true;
      }
    }
  });
  
  container.innerHTML = '';
  
  // Días vacíos al inicio
  for (let i = 0; i < primerDiaSemana; i++) {
    const div = document.createElement('div');
    div.className = 'aspect-square';
    container.appendChild(div);
  }
  
  // Días del mes
  const hoy = new Date();
  let asistencias = 0, faltas = 0, retardos = 0;
  
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const div = document.createElement('div');
    div.className = 'aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:scale-105';
    
    const esFuturo = new Date(año, mes, dia) > hoy;
    const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear();
    const info = asistenciasPorDia[dia];
    
    if (esFuturo) {
      div.className += ' bg-surface-light/30 text-text-muted';
    } else if (info) {
      if (info.falta && !info.asistio) {
        div.className += ' bg-danger text-white';
        faltas++;
      } else if (info.asistio && !info.puntual) {
        div.className += ' bg-warning text-white';
        retardos++;
      } else if (info.asistio) {
        div.className += ' bg-success text-white';
        asistencias++;
      }
    } else {
      div.className += ' bg-surface-light/50 text-text-muted';
    }
    
    if (esHoy) {
      div.className += ' ring-2 ring-primary ring-offset-2 ring-offset-surface';
    }
    
    div.textContent = dia;
    div.title = info ? (info.asistio ? (info.puntual ? 'Asistencia' : 'Retardo') : 'Falta') : 'Sin clase';
    container.appendChild(div);
  }
  
  // Actualizar resumen
  document.getElementById('cal-asistencias').textContent = asistencias;
  document.getElementById('cal-faltas').textContent = faltas;
  document.getElementById('cal-retardos').textContent = retardos;
  
  const total = asistencias + faltas;
  const porcentaje = total > 0 ? Math.round((asistencias / total) * 100) : 0;
  document.getElementById('cal-porcentaje').textContent = porcentaje + '%';
}

// ========================
// 🔹 EXPORTAR
// ========================
async function exportarMiHistorial() {
  const alumno = obtenerAlumnoActual();
  if (!alumno) {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay alumno logueado', 'error');
    return;
  }
  
  try {
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('⏳ Generando reporte...', 'info');
    
    const registros = await obtenerRegistrosAlumno(alumno);
    
    if (registros.clases.length === 0) {
      if (typeof mostrarNotificacion === 'function') mostrarNotificacion('No hay registros para exportar', 'warning');
      return;
    }
    
    let csv = 'Fecha,Hora,Clase,Profesor,Entrada,Baños,Estado\n';
    
    registros.clases
      .filter(c => c.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .forEach(clase => {
        const fecha = new Date(clase.fecha);
        const fechaStr = fecha.toLocaleDateString('es-MX');
        const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        const entrada = clase.eventos.find(e => e.tipo === 'entrada');
        const horaEntrada = entrada ? new Date(entrada.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
        const banos = clase.eventos.filter(e => e.tipo === 'baño-salida').length;
        
        let estado = 'Falta';
        if (clase.asistio && clase.puntual) estado = 'Asistencia';
        else if (clase.asistio) estado = 'Retardo';
        
        csv += `${fechaStr},${horaStr},${clase.grado || ''}°${clase.grupo || ''},${clase.profesor || ''},${horaEntrada},${banos},${estado}\n`;
      });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi_historial_${alumno.nombre}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion(`📥 Historial exportado`, 'success');
    
  } catch (error) {
    console.error('Error exportando:', error);
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Error al exportar', 'error');
  }
}

// ========================
// 🔹 UTILIDADES
// ========================
function animarContadorAlumno(elementId, valorFinal) {
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
// 🔹 EXPORTS GLOBALES
// ========================
window.inicializarDashboardAlumno = inicializarDashboardAlumno;
window.cargarHistorialAlumno = cargarHistorialAlumno;
window.generarCalendario = generarCalendario;
window.cambiarMesCalendario = cambiarMesCalendario;
window.exportarMiHistorial = exportarMiHistorial;
window.cargarHorarioAlumnoUI = cargarHorarioAlumnoUI;
window.cargarProximaClaseAlumno = cargarProximaClaseAlumno;
window.cargarHistorialCBTisAlumno = cargarHistorialCBTisAlumno;

// ========================
// 🏫 HISTORIAL CBTis (ENTRADAS/SALIDAS)
// ========================

/**
 * Carga el historial de entradas/salidas CBTis del alumno
 */
async function cargarHistorialCBTisAlumno() {
  const container = document.getElementById('historial-cbtis-alumno');
  if (!container) return;
  
  const alumno = obtenerAlumnoActual();
  if (!alumno) return;
  
  const identificador = alumno.control || alumno.telefono;
  if (!identificador) return;
  
  container.innerHTML = `
    <div class="text-center py-8 text-text-muted">
      <span class="text-4xl animate-pulse">⏳</span>
      <p class="mt-2">Cargando registros...</p>
    </div>
  `;
  
  try {
    // Obtener registros de los últimos 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const snapshot = await db.collection('ingresos_cbtis')
      .where('identificador', '==', String(identificador))
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    if (snapshot.empty) {
      container.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <span class="text-4xl opacity-30">🏫</span>
          <p class="mt-2">No hay registros de entrada/salida</p>
        </div>
      `;
      return;
    }
    
    // Agrupar por fecha
    const registrosPorFecha = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const fecha = data.fecha || data.timestamp?.split('T')[0];
      if (!registrosPorFecha[fecha]) {
        registrosPorFecha[fecha] = [];
      }
      registrosPorFecha[fecha].push(data);
    });
    
    // Generar HTML
    let html = '<div class="space-y-4">';
    
    for (const [fecha, registros] of Object.entries(registrosPorFecha)) {
      const fechaObj = new Date(fecha + 'T12:00:00');
      const fechaStr = fechaObj.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      
      const entrada = registros.find(r => r.tipoRegistro === 'Ingreso');
      const salida = registros.find(r => r.tipoRegistro === 'Salida');
      
      html += `
        <div class="p-4 bg-surface-light/30 rounded-xl">
          <div class="flex items-center justify-between mb-3">
            <span class="font-medium text-text-main capitalize">${fechaStr}</span>
            <span class="text-xs text-text-muted">${fecha}</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg ${entrada ? 'bg-success/20' : 'bg-surface-light/50'}">
              <p class="text-xs text-text-muted mb-1">🔓 Entrada</p>
              <p class="font-bold ${entrada ? 'text-success' : 'text-text-muted'}">${entrada ? entrada.hora : 'Sin registro'}</p>
              ${entrada?.modo === 'Facial' ? '<span class="text-xs text-accent">🎭 Facial</span>' : ''}
            </div>
            <div class="p-3 rounded-lg ${salida ? 'bg-red-500/20' : 'bg-surface-light/50'}">
              <p class="text-xs text-text-muted mb-1">🚪 Salida</p>
              <p class="font-bold ${salida ? 'text-red-400' : 'text-text-muted'}">${salida ? salida.hora : 'Sin registro'}</p>
              ${salida?.modo === 'Facial' ? '<span class="text-xs text-accent">🎭 Facial</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando historial CBTis:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-danger">
        <span class="text-4xl">⚠️</span>
        <p class="mt-2">Error al cargar registros</p>
      </div>
    `;
  }
}

// Cargar al abrir sección
document.addEventListener('DOMContentLoaded', () => {
  const seccion = document.getElementById('historial-cbtis-alumno');
  if (seccion) {
    // Observer para cargar cuando sea visible
    const parent = seccion.closest('.content-section');
    if (parent) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class' && !parent.classList.contains('hidden')) {
            cargarHistorialCBTisAlumno();
          }
        });
      });
      observer.observe(parent, { attributes: true });
    }
  }
  
  // Observer para config-alumno (perfil)
  const configAlumno = document.getElementById('config-alumno');
  if (configAlumno) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !configAlumno.classList.contains('hidden')) {
          cargarPerfilCompletoAlumno();
        }
      });
    });
    observer.observe(configAlumno, { attributes: true });
  }
});

// ========================
// 👤 CARGAR PERFIL COMPLETO DEL ALUMNO
// ========================
async function cargarPerfilCompletoAlumno() {
  const alumno = window.usuarioActual;
  if (!alumno || alumno.tipo !== 'Alumno') return;
  
  const usuarioId = alumno.control || alumno.id;
  
  try {
    // Cargar datos actualizados de Firebase
    const doc = await db.collection('alumnos').doc(usuarioId).get();
    const datos = doc.exists ? doc.data() : alumno;
    
    // Avatar
    const avatarEl = document.getElementById('avatar-perfil-alumno');
    if (avatarEl) {
      const iniciales = `${(datos.nombre || '').charAt(0)}${(datos.apellidos || '').charAt(0)}`.toUpperCase() || '--';
      avatarEl.textContent = iniciales;
    }
    
    // Nombre completo
    const nombreEl = document.getElementById('nombre-perfil-alumno');
    if (nombreEl) {
      nombreEl.textContent = `${datos.nombre || ''} ${datos.apellidos || ''}`.trim() || 'Sin nombre';
    }
    
    // Turno
    const turnoEl = document.getElementById('turno-perfil-alumno');
    if (turnoEl) {
      turnoEl.textContent = datos.turno || 'Turno no especificado';
    }
    
    // Datos en la grid
    const configNombre = document.getElementById('config-nombre-alumno');
    if (configNombre) configNombre.textContent = `${datos.nombre || ''} ${datos.apellidos || ''}`.trim() || '-';
    
    const configControl = document.getElementById('config-control-alumno');
    if (configControl) configControl.textContent = datos.control || usuarioId || '-';
    
    const configGrado = document.getElementById('config-grado-alumno');
    if (configGrado) configGrado.textContent = `${datos.grado || '-'}° ${datos.grupo || '-'}`;
    
    const configEspecialidad = document.getElementById('config-especialidad-alumno');
    if (configEspecialidad) configEspecialidad.textContent = datos.especialidad || datos.carrera || 'No especificada';
    
    const configWhatsapp = document.getElementById('config-whatsapp-alumno');
    if (configWhatsapp) configWhatsapp.textContent = datos.whatsapp || datos.telefono || 'No registrado';
    
    const configFecha = document.getElementById('config-fecha-registro-alumno');
    if (configFecha) {
      const fecha = datos.fechaRegistro?.toDate?.() || datos.createdAt?.toDate?.();
      configFecha.textContent = fecha ? fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No disponible';
    }
    
    // Cargar estadísticas rápidas
    await cargarEstadisticasPerfilAlumno(usuarioId);
    
  } catch (error) {
    console.error('Error cargando perfil alumno:', error);
  }
}

/**
 * Carga las estadísticas rápidas del perfil del alumno
 */
async function cargarEstadisticasPerfilAlumno(alumnoId) {
  try {
    // Obtener sesiones del alumno
    const sesionesSnap = await db.collection('sesiones')
      .where('estado', '==', 'Finalizada')
      .orderBy('fecha', 'desc')
      .limit(100)
      .get();
    
    let totalClases = 0;
    let asistencias = 0;
    let puntuales = 0;
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      const alumnos = sesion.alumnos || {};
      
      // Buscar al alumno en esta sesión
      const alumnoEnSesion = Object.values(alumnos).find(a => 
        a.control === alumnoId || a.id === alumnoId
      );
      
      if (alumnoEnSesion) {
        totalClases++;
        if (alumnoEnSesion.estado === 'Presente' || alumnoEnSesion.estado === 'Tardanza') {
          asistencias++;
        }
        if (alumnoEnSesion.estado === 'Presente') {
          puntuales++;
        }
      }
    });
    
    // Calcular porcentajes
    const porcentajeAsistencia = totalClases > 0 ? Math.round((asistencias / totalClases) * 100) : 0;
    const porcentajePuntualidad = asistencias > 0 ? Math.round((puntuales / asistencias) * 100) : 0;
    
    // Actualizar UI
    const asistenciaEl = document.getElementById('perfil-asistencia-alumno');
    if (asistenciaEl) asistenciaEl.textContent = `${porcentajeAsistencia}%`;
    
    const puntualidadEl = document.getElementById('perfil-puntualidad-alumno');
    if (puntualidadEl) puntualidadEl.textContent = `${porcentajePuntualidad}%`;
    
    const clasesEl = document.getElementById('perfil-clases-alumno');
    if (clasesEl) clasesEl.textContent = totalClases;
    
  } catch (error) {
    console.error('Error cargando estadísticas perfil:', error);
  }
}

// Exportar funciones
window.cargarPerfilCompletoAlumno = cargarPerfilCompletoAlumno;
