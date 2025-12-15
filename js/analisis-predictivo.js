// ========================================
// 🤖 ANÁLISIS PREDICTIVO DE ASISTENCIA
// Keyon Access System v2.0
// CBTis 001 - Fresnillo, Zacatecas
// ========================================

// ========================
// 🔹 CONFIGURACIÓN
// ========================
const CONFIG_ANALISIS = {
  // Umbrales para alertas
  umbralRiesgoAlto: 70,      // % asistencia < 70 = riesgo alto
  umbralRiesgoMedio: 80,     // % asistencia < 80 = riesgo medio
  umbralTardanzas: 5,        // > 5 tardanzas al mes = alerta
  diasConsecutivosFalta: 3,  // 3+ faltas consecutivas = alerta
  
  // Pesos para el score de riesgo (suma = 100)
  pesos: {
    asistencia: 40,          // Peso del % de asistencia
    tendencia: 25,           // Peso de la tendencia reciente
    tardanzas: 15,           // Peso de las tardanzas
    faltasConsecutivas: 20   // Peso de faltas consecutivas
  }
};

// ========================
// 🔹 OBTENER DATOS HISTÓRICOS
// ========================

/**
 * Obtener historial de asistencia de un alumno
 */
async function obtenerHistorialAlumno(alumnoId) {
  try {
    const registros = [];
    
    // Buscar en sesiones
    const sesionesSnap = await db.collection('sesiones')
      .orderBy('inicio', 'desc')
      .limit(100)
      .get();
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      const alumnos = sesion.alumnos || {};
      
      // Buscar al alumno en esta sesión
      Object.entries(alumnos).forEach(([control, alumno]) => {
        if (control === alumnoId || alumno.id === alumnoId) {
          const eventos = alumno.eventos || [];
          const entrada = eventos.find(e => e.tipo === 'entrada');
          
          registros.push({
            fecha: sesion.inicio,
            sesionId: doc.id,
            materia: sesion.materia,
            grupo: `${sesion.grado}°${sesion.grupo}`,
            asistio: true,
            horaEntrada: entrada?.ts || entrada?.hora,
            inicioClase: sesion.inicio,
            tardanza: entrada ? calcularTardanza(sesion.inicio, entrada.ts || entrada.hora) : 0,
            eventos: eventos
          });
        }
      });
    });
    
    return registros;
    
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return [];
  }
}

/**
 * Obtener todos los alumnos con su historial resumido
 */
async function obtenerTodosLosAlumnos() {
  try {
    const alumnosSnap = await db.collection('usuarios')
      .where('tipo', '==', 'Alumno')
      .get();
    
    const alumnos = [];
    alumnosSnap.forEach(doc => {
      alumnos.push({ id: doc.id, ...doc.data() });
    });
    
    return alumnos;
    
  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    return [];
  }
}

/**
 * Calcular tardanza en minutos
 */
function calcularTardanza(inicioClase, horaEntrada) {
  if (!inicioClase || !horaEntrada) return 0;
  
  const inicio = new Date(inicioClase);
  const entrada = new Date(horaEntrada);
  const diffMin = Math.floor((entrada - inicio) / 60000);
  
  return diffMin > 0 ? diffMin : 0;
}

// ========================
// 🔹 ANÁLISIS DE PATRONES
// ========================

/**
 * Analizar patrones de un alumno
 */
async function analizarAlumno(alumnoId) {
  const historial = await obtenerHistorialAlumno(alumnoId);
  
  if (historial.length === 0) {
    return {
      alumnoId,
      sinDatos: true,
      mensaje: 'Sin datos suficientes para análisis'
    };
  }
  
  // Calcular métricas
  const totalClases = historial.length;
  const asistencias = historial.filter(r => r.asistio).length;
  const porcentajeAsistencia = (asistencias / totalClases) * 100;
  
  // Tardanzas (> 10 minutos)
  const tardanzas = historial.filter(r => r.tardanza > 10);
  const totalTardanzas = tardanzas.length;
  const promedioTardanza = tardanzas.length > 0 
    ? tardanzas.reduce((sum, r) => sum + r.tardanza, 0) / tardanzas.length 
    : 0;
  
  // Tendencia reciente (últimas 2 semanas vs anteriores)
  const hace2Semanas = new Date();
  hace2Semanas.setDate(hace2Semanas.getDate() - 14);
  
  const recientes = historial.filter(r => new Date(r.fecha) >= hace2Semanas);
  const anteriores = historial.filter(r => new Date(r.fecha) < hace2Semanas);
  
  const asistenciaReciente = recientes.length > 0 
    ? (recientes.filter(r => r.asistio).length / recientes.length) * 100 
    : porcentajeAsistencia;
  
  const asistenciaAnterior = anteriores.length > 0 
    ? (anteriores.filter(r => r.asistio).length / anteriores.length) * 100 
    : porcentajeAsistencia;
  
  const tendencia = asistenciaReciente - asistenciaAnterior;
  
  // Faltas consecutivas (calcular la racha actual)
  let faltasConsecutivas = 0;
  const historialOrdenado = [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  for (const registro of historialOrdenado) {
    if (!registro.asistio) {
      faltasConsecutivas++;
    } else {
      break;
    }
  }
  
  // Patrones por día de la semana
  const patronesDia = analizarPatronesPorDia(historial);
  
  // Calcular score de riesgo
  const scoreRiesgo = calcularScoreRiesgo({
    porcentajeAsistencia,
    tendencia,
    totalTardanzas,
    faltasConsecutivas,
    totalClases
  });
  
  return {
    alumnoId,
    metricas: {
      totalClases,
      asistencias,
      porcentajeAsistencia: Math.round(porcentajeAsistencia * 10) / 10,
      totalTardanzas,
      promedioTardanza: Math.round(promedioTardanza),
      faltasConsecutivas
    },
    tendencia: {
      valor: Math.round(tendencia * 10) / 10,
      direccion: tendencia > 2 ? 'mejorando' : tendencia < -2 ? 'empeorando' : 'estable',
      asistenciaReciente: Math.round(asistenciaReciente * 10) / 10,
      asistenciaAnterior: Math.round(asistenciaAnterior * 10) / 10
    },
    patronesDia,
    riesgo: scoreRiesgo,
    alertas: generarAlertas({
      porcentajeAsistencia,
      tendencia,
      totalTardanzas,
      faltasConsecutivas
    }),
    prediccion: generarPrediccion({
      porcentajeAsistencia,
      tendencia,
      faltasConsecutivas
    })
  };
}

/**
 * Analizar patrones por día de la semana
 */
function analizarPatronesPorDia(historial) {
  const dias = {
    0: { nombre: 'Domingo', total: 0, asistencias: 0, tardanzas: 0 },
    1: { nombre: 'Lunes', total: 0, asistencias: 0, tardanzas: 0 },
    2: { nombre: 'Martes', total: 0, asistencias: 0, tardanzas: 0 },
    3: { nombre: 'Miércoles', total: 0, asistencias: 0, tardanzas: 0 },
    4: { nombre: 'Jueves', total: 0, asistencias: 0, tardanzas: 0 },
    5: { nombre: 'Viernes', total: 0, asistencias: 0, tardanzas: 0 },
    6: { nombre: 'Sábado', total: 0, asistencias: 0, tardanzas: 0 }
  };
  
  historial.forEach(registro => {
    const dia = new Date(registro.fecha).getDay();
    dias[dia].total++;
    if (registro.asistio) dias[dia].asistencias++;
    if (registro.tardanza > 10) dias[dia].tardanzas++;
  });
  
  // Calcular porcentajes y encontrar patrones
  const patronesArray = Object.entries(dias)
    .filter(([_, d]) => d.total > 0)
    .map(([dia, d]) => ({
      dia: parseInt(dia),
      nombre: d.nombre,
      total: d.total,
      porcentajeAsistencia: Math.round((d.asistencias / d.total) * 100),
      porcentajeTardanzas: Math.round((d.tardanzas / d.total) * 100)
    }))
    .sort((a, b) => a.porcentajeAsistencia - b.porcentajeAsistencia);
  
  return {
    peorDia: patronesArray[0] || null,
    mejorDia: patronesArray[patronesArray.length - 1] || null,
    detalle: patronesArray
  };
}

/**
 * Calcular score de riesgo (0-100, mayor = más riesgo)
 */
function calcularScoreRiesgo({ porcentajeAsistencia, tendencia, totalTardanzas, faltasConsecutivas, totalClases }) {
  const pesos = CONFIG_ANALISIS.pesos;
  let score = 0;
  
  // Factor asistencia (0-40 puntos)
  // 100% asistencia = 0 puntos, 50% = 40 puntos
  const factorAsistencia = Math.max(0, (100 - porcentajeAsistencia) * (pesos.asistencia / 50));
  score += factorAsistencia;
  
  // Factor tendencia (0-25 puntos)
  // Tendencia negativa suma puntos
  if (tendencia < 0) {
    const factorTendencia = Math.min(Math.abs(tendencia) * 2, pesos.tendencia);
    score += factorTendencia;
  }
  
  // Factor tardanzas (0-15 puntos)
  const factorTardanzas = Math.min((totalTardanzas / Math.max(totalClases, 1)) * 100, pesos.tardanzas);
  score += factorTardanzas;
  
  // Factor faltas consecutivas (0-20 puntos)
  const factorConsecutivas = Math.min(faltasConsecutivas * 7, pesos.faltasConsecutivas);
  score += factorConsecutivas;
  
  return {
    valor: Math.round(Math.min(score, 100)),
    nivel: score >= 60 ? 'alto' : score >= 35 ? 'medio' : 'bajo',
    factores: {
      asistencia: Math.round(factorAsistencia),
      tendencia: Math.round(tendencia < 0 ? Math.min(Math.abs(tendencia) * 2, pesos.tendencia) : 0),
      tardanzas: Math.round(factorTardanzas),
      consecutivas: Math.round(factorConsecutivas)
    }
  };
}

/**
 * Generar alertas específicas
 */
function generarAlertas({ porcentajeAsistencia, tendencia, totalTardanzas, faltasConsecutivas }) {
  const alertas = [];
  
  if (porcentajeAsistencia < CONFIG_ANALISIS.umbralRiesgoAlto) {
    alertas.push({
      tipo: 'critico',
      icono: '🚨',
      mensaje: `Asistencia crítica: ${Math.round(porcentajeAsistencia)}%`,
      recomendacion: 'Contactar inmediatamente a padres/tutores'
    });
  } else if (porcentajeAsistencia < CONFIG_ANALISIS.umbralRiesgoMedio) {
    alertas.push({
      tipo: 'advertencia',
      icono: '⚠️',
      mensaje: `Asistencia baja: ${Math.round(porcentajeAsistencia)}%`,
      recomendacion: 'Programar reunión con el alumno'
    });
  }
  
  if (faltasConsecutivas >= CONFIG_ANALISIS.diasConsecutivosFalta) {
    alertas.push({
      tipo: 'critico',
      icono: '📅',
      mensaje: `${faltasConsecutivas} faltas consecutivas`,
      recomendacion: 'Verificar situación del alumno urgentemente'
    });
  }
  
  if (totalTardanzas >= CONFIG_ANALISIS.umbralTardanzas) {
    alertas.push({
      tipo: 'advertencia',
      icono: '⏰',
      mensaje: `${totalTardanzas} tardanzas registradas`,
      recomendacion: 'Hablar con el alumno sobre puntualidad'
    });
  }
  
  if (tendencia < -10) {
    alertas.push({
      tipo: 'advertencia',
      icono: '📉',
      mensaje: 'Tendencia de asistencia en descenso',
      recomendacion: 'Monitorear de cerca las próximas semanas'
    });
  }
  
  return alertas;
}

/**
 * Generar predicción
 */
function generarPrediccion({ porcentajeAsistencia, tendencia, faltasConsecutivas }) {
  let prediccionAsistencia = porcentajeAsistencia;
  
  // Ajustar por tendencia
  prediccionAsistencia += tendencia * 0.5;
  
  // Ajustar por faltas consecutivas
  if (faltasConsecutivas >= 3) {
    prediccionAsistencia -= faltasConsecutivas * 2;
  }
  
  // Limitar entre 0 y 100
  prediccionAsistencia = Math.max(0, Math.min(100, prediccionAsistencia));
  
  let mensaje = '';
  let probabilidadDesercion = 0;
  
  if (prediccionAsistencia >= 90) {
    mensaje = 'Se espera que mantenga buena asistencia';
    probabilidadDesercion = 5;
  } else if (prediccionAsistencia >= 80) {
    mensaje = 'Asistencia probablemente estable con posibles faltas ocasionales';
    probabilidadDesercion = 15;
  } else if (prediccionAsistencia >= 70) {
    mensaje = 'Riesgo de aumentar inasistencias sin intervención';
    probabilidadDesercion = 30;
  } else {
    mensaje = 'Alto riesgo de deserción o abandono';
    probabilidadDesercion = 50 + (70 - prediccionAsistencia);
  }
  
  return {
    asistenciaProxMes: Math.round(prediccionAsistencia),
    mensaje,
    probabilidadDesercion: Math.min(Math.round(probabilidadDesercion), 95)
  };
}

// ========================
// 🔹 ANÁLISIS GRUPAL
// ========================

/**
 * Obtener alumnos en riesgo
 */
async function obtenerAlumnosEnRiesgo() {
  const alumnos = await obtenerTodosLosAlumnos();
  const alumnosConRiesgo = [];
  
  for (const alumno of alumnos) {
    const analisis = await analizarAlumno(alumno.control || alumno.id);
    
    if (!analisis.sinDatos && analisis.riesgo.nivel !== 'bajo') {
      alumnosConRiesgo.push({
        ...alumno,
        analisis
      });
    }
  }
  
  // Ordenar por riesgo descendente
  alumnosConRiesgo.sort((a, b) => b.analisis.riesgo.valor - a.analisis.riesgo.valor);
  
  return alumnosConRiesgo;
}

/**
 * Análisis general del plantel
 */
async function analizarPlantel() {
  try {
    const sesionesSnap = await db.collection('sesiones')
      .orderBy('inicio', 'desc')
      .limit(200)
      .get();
    
    const estadisticas = {
      totalSesiones: 0,
      totalAlumnos: new Set(),
      asistenciasPorDia: {},
      asistenciasPorHora: {},
      asistenciasPorGrupo: {},
      tendenciaSemanal: []
    };
    
    const ahora = new Date();
    const hace4Semanas = new Date(ahora.getTime() - 28 * 24 * 60 * 60 * 1000);
    
    sesionesSnap.forEach(doc => {
      const sesion = doc.data();
      estadisticas.totalSesiones++;
      
      const fecha = new Date(sesion.inicio);
      const dia = fecha.getDay();
      const hora = fecha.getHours();
      const grupo = `${sesion.grado}°${sesion.grupo}`;
      const semana = getNumeroSemana(fecha);
      
      // Contar alumnos
      const alumnos = sesion.alumnos || {};
      const cantidadAlumnos = Object.keys(alumnos).length;
      
      Object.keys(alumnos).forEach(control => estadisticas.totalAlumnos.add(control));
      
      // Por día
      if (!estadisticas.asistenciasPorDia[dia]) {
        estadisticas.asistenciasPorDia[dia] = { total: 0, alumnos: 0 };
      }
      estadisticas.asistenciasPorDia[dia].total++;
      estadisticas.asistenciasPorDia[dia].alumnos += cantidadAlumnos;
      
      // Por hora
      if (!estadisticas.asistenciasPorHora[hora]) {
        estadisticas.asistenciasPorHora[hora] = { total: 0, alumnos: 0 };
      }
      estadisticas.asistenciasPorHora[hora].total++;
      estadisticas.asistenciasPorHora[hora].alumnos += cantidadAlumnos;
      
      // Por grupo
      if (!estadisticas.asistenciasPorGrupo[grupo]) {
        estadisticas.asistenciasPorGrupo[grupo] = { total: 0, alumnos: 0 };
      }
      estadisticas.asistenciasPorGrupo[grupo].total++;
      estadisticas.asistenciasPorGrupo[grupo].alumnos += cantidadAlumnos;
    });
    
    // Calcular promedios
    const diasNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const patronesDia = Object.entries(estadisticas.asistenciasPorDia)
      .map(([dia, data]) => ({
        dia: diasNombre[dia],
        promedio: Math.round(data.alumnos / data.total)
      }))
      .sort((a, b) => a.promedio - b.promedio);
    
    const patronesGrupo = Object.entries(estadisticas.asistenciasPorGrupo)
      .map(([grupo, data]) => ({
        grupo,
        promedio: Math.round(data.alumnos / data.total),
        totalClases: data.total
      }))
      .sort((a, b) => a.promedio - b.promedio);
    
    return {
      resumen: {
        totalSesiones: estadisticas.totalSesiones,
        totalAlumnos: estadisticas.totalAlumnos.size,
        promedioAlumnosPorClase: Math.round(
          Object.values(estadisticas.asistenciasPorDia).reduce((sum, d) => sum + d.alumnos, 0) /
          Math.max(estadisticas.totalSesiones, 1)
        )
      },
      patrones: {
        peorDia: patronesDia[0] || null,
        mejorDia: patronesDia[patronesDia.length - 1] || null,
        diasDetalle: patronesDia,
        grupoMenorAsistencia: patronesGrupo[0] || null,
        grupoMayorAsistencia: patronesGrupo[patronesGrupo.length - 1] || null,
        gruposDetalle: patronesGrupo
      },
      recomendaciones: generarRecomendacionesPlantel(patronesDia, patronesGrupo)
    };
    
  } catch (error) {
    console.error('Error analizando plantel:', error);
    return null;
  }
}

/**
 * Obtener número de semana del año
 */
function getNumeroSemana(fecha) {
  const inicioAno = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha - inicioAno) / (24 * 60 * 60 * 1000));
  return Math.ceil((dias + inicioAno.getDay() + 1) / 7);
}

/**
 * Generar recomendaciones para el plantel
 */
function generarRecomendacionesPlantel(patronesDia, patronesGrupo) {
  const recomendaciones = [];
  
  if (patronesDia.length > 0) {
    const peorDia = patronesDia[0];
    if (peorDia.promedio < patronesDia[patronesDia.length - 1]?.promedio * 0.8) {
      recomendaciones.push({
        tipo: 'dia',
        icono: '📅',
        mensaje: `Los ${peorDia.dia} tienen menor asistencia`,
        accion: `Considerar actividades especiales o revisar horarios del ${peorDia.dia}`
      });
    }
  }
  
  if (patronesGrupo.length > 0) {
    const peorGrupo = patronesGrupo[0];
    recomendaciones.push({
      tipo: 'grupo',
      icono: '👥',
      mensaje: `El grupo ${peorGrupo.grupo} tiene la menor asistencia promedio`,
      accion: 'Reunión con tutor del grupo para identificar causas'
    });
  }
  
  return recomendaciones;
}

// ========================
// 🔹 UI DEL PANEL DE ANÁLISIS
// ========================

/**
 * Renderizar panel de análisis en admin
 */
async function renderizarPanelAnalisis(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-12">
      <span class="text-4xl block mb-4 animate-pulse">🔄</span>
      <p class="text-text-muted">Analizando datos...</p>
    </div>
  `;
  
  try {
    // Obtener datos
    const [alumnosRiesgo, analisisPlantel] = await Promise.all([
      obtenerAlumnosEnRiesgo(),
      analizarPlantel()
    ]);
    
    const alumnosRiesgoAlto = alumnosRiesgo.filter(a => a.analisis.riesgo.nivel === 'alto');
    const alumnosRiesgoMedio = alumnosRiesgo.filter(a => a.analisis.riesgo.nivel === 'medio');
    
    container.innerHTML = `
      <!-- Estadísticas Rápidas -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="glass rounded-2xl p-5 border-l-4 border-danger">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-text-muted text-sm">Riesgo Alto</p>
              <p class="text-3xl font-bold text-danger">${alumnosRiesgoAlto.length}</p>
            </div>
            <span class="text-3xl">🚨</span>
          </div>
        </div>
        <div class="glass rounded-2xl p-5 border-l-4 border-warning">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-text-muted text-sm">Riesgo Medio</p>
              <p class="text-3xl font-bold text-warning">${alumnosRiesgoMedio.length}</p>
            </div>
            <span class="text-3xl">⚠️</span>
          </div>
        </div>
        <div class="glass rounded-2xl p-5 border-l-4 border-primary">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-text-muted text-sm">Clases Analizadas</p>
              <p class="text-3xl font-bold text-primary">${analisisPlantel?.resumen?.totalSesiones || 0}</p>
            </div>
            <span class="text-3xl">📚</span>
          </div>
        </div>
        <div class="glass rounded-2xl p-5 border-l-4 border-success">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-text-muted text-sm">Alumnos Activos</p>
              <p class="text-3xl font-bold text-success">${analisisPlantel?.resumen?.totalAlumnos || 0}</p>
            </div>
            <span class="text-3xl">👥</span>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Alumnos en Riesgo -->
        <div class="glass rounded-2xl p-6">
          <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            🚨 Alumnos en Riesgo
            <span class="text-sm bg-danger/20 text-danger px-2 py-1 rounded-lg">${alumnosRiesgo.length}</span>
          </h3>
          <div class="space-y-3 max-h-[400px] overflow-y-auto">
            ${alumnosRiesgo.length === 0 ? `
              <div class="text-center py-8 text-text-muted">
                <span class="text-3xl block mb-2">✅</span>
                <p>No hay alumnos en riesgo detectados</p>
              </div>
            ` : alumnosRiesgo.slice(0, 10).map(alumno => `
              <div class="flex items-center gap-3 p-3 rounded-xl ${alumno.analisis.riesgo.nivel === 'alto' ? 'bg-danger/10 border border-danger/20' : 'bg-warning/10 border border-warning/20'}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${alumno.analisis.riesgo.nivel === 'alto' ? 'bg-danger' : 'bg-warning'}">
                  ${alumno.analisis.riesgo.valor}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-text-main truncate">${alumno.nombre} ${alumno.apellidos || ''}</p>
                  <p class="text-xs text-text-muted">${alumno.grado || 'N/A'} • ${alumno.analisis.metricas.porcentajeAsistencia}% asistencia</p>
                </div>
                <div class="text-right">
                  <span class="text-xs ${alumno.analisis.tendencia.direccion === 'empeorando' ? 'text-danger' : alumno.analisis.tendencia.direccion === 'mejorando' ? 'text-success' : 'text-text-muted'}">
                    ${alumno.analisis.tendencia.direccion === 'empeorando' ? '📉' : alumno.analisis.tendencia.direccion === 'mejorando' ? '📈' : '➡️'}
                    ${alumno.analisis.tendencia.valor > 0 ? '+' : ''}${alumno.analisis.tendencia.valor}%
                  </span>
                </div>
                <button onclick="verDetalleAnalisis('${alumno.control || alumno.id}')" class="p-2 hover:bg-surface-light rounded-lg transition-colors">
                  <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Patrones Detectados -->
        <div class="glass rounded-2xl p-6">
          <h3 class="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            📊 Patrones Detectados
          </h3>
          <div class="space-y-4">
            ${analisisPlantel?.patrones ? `
              <!-- Patrón por día -->
              <div class="bg-surface-light/50 rounded-xl p-4">
                <p class="text-sm text-text-muted mb-2">📅 Por día de la semana</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs text-text-muted">Menor asistencia</p>
                    <p class="font-medium text-danger">${analisisPlantel.patrones.peorDia?.dia || 'N/A'}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-text-muted">Mayor asistencia</p>
                    <p class="font-medium text-success">${analisisPlantel.patrones.mejorDia?.dia || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <!-- Patrón por grupo -->
              <div class="bg-surface-light/50 rounded-xl p-4">
                <p class="text-sm text-text-muted mb-2">👥 Por grupo</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs text-text-muted">Menor promedio</p>
                    <p class="font-medium text-danger">${analisisPlantel.patrones.grupoMenorAsistencia?.grupo || 'N/A'}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-text-muted">Mayor promedio</p>
                    <p class="font-medium text-success">${analisisPlantel.patrones.grupoMayorAsistencia?.grupo || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ` : '<p class="text-text-muted text-center py-4">Sin datos suficientes</p>'}
            
            <!-- Recomendaciones -->
            <div class="border-t border-border-subtle pt-4">
              <p class="text-sm font-medium text-text-main mb-3">💡 Recomendaciones</p>
              <div class="space-y-2">
                ${analisisPlantel?.recomendaciones?.map(rec => `
                  <div class="flex items-start gap-2 text-sm">
                    <span>${rec.icono}</span>
                    <div>
                      <p class="text-text-main">${rec.mensaje}</p>
                      <p class="text-xs text-text-muted">${rec.accion}</p>
                    </div>
                  </div>
                `).join('') || '<p class="text-text-muted text-sm">Sin recomendaciones específicas</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error renderizando panel:', error);
    container.innerHTML = `
      <div class="text-center py-12 text-danger">
        <span class="text-4xl block mb-4">⚠️</span>
        <p>Error al cargar análisis</p>
      </div>
    `;
  }
}

/**
 * Ver detalle de análisis de un alumno
 */
async function verDetalleAnalisis(alumnoId) {
  const modal = document.createElement('div');
  modal.id = 'modal-analisis-alumno';
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <div class="p-6 border-b border-border-subtle flex items-center justify-between">
        <h3 class="text-xl font-bold text-text-main">📊 Análisis Detallado</h3>
        <button onclick="document.getElementById('modal-analisis-alumno').remove()" class="p-2 hover:bg-surface-light rounded-lg">
          <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto max-h-[70vh]" id="contenido-analisis-alumno">
        <div class="text-center py-8">
          <span class="text-3xl animate-pulse">🔄</span>
          <p class="text-text-muted mt-2">Analizando...</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Obtener análisis
  const analisis = await analizarAlumno(alumnoId);
  
  // Buscar datos del alumno
  let alumnoData = null;
  try {
    const snap = await db.collection('usuarios').where('control', '==', alumnoId).limit(1).get();
    if (!snap.empty) {
      alumnoData = snap.docs[0].data();
    }
  } catch (e) {}
  
  const contenedor = document.getElementById('contenido-analisis-alumno');
  if (!contenedor) return;
  
  if (analisis.sinDatos) {
    contenedor.innerHTML = `
      <div class="text-center py-8 text-text-muted">
        <span class="text-4xl block mb-4">📭</span>
        <p>${analisis.mensaje}</p>
      </div>
    `;
    return;
  }
  
  contenedor.innerHTML = `
    <!-- Info del Alumno -->
    <div class="flex items-center gap-4 mb-6">
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
        ${(alumnoData?.nombre || 'A').charAt(0)}${(alumnoData?.apellidos || '').charAt(0)}
      </div>
      <div>
        <h4 class="text-lg font-bold text-text-main">${alumnoData?.nombre || ''} ${alumnoData?.apellidos || ''}</h4>
        <p class="text-text-muted">${alumnoData?.grado || 'N/A'} • Control: ${alumnoId}</p>
      </div>
    </div>
    
    <!-- Score de Riesgo -->
    <div class="glass rounded-xl p-4 mb-6 ${analisis.riesgo.nivel === 'alto' ? 'border-l-4 border-danger' : analisis.riesgo.nivel === 'medio' ? 'border-l-4 border-warning' : 'border-l-4 border-success'}">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-text-muted">Score de Riesgo</p>
          <p class="text-3xl font-bold ${analisis.riesgo.nivel === 'alto' ? 'text-danger' : analisis.riesgo.nivel === 'medio' ? 'text-warning' : 'text-success'}">${analisis.riesgo.valor}/100</p>
        </div>
        <div class="text-right">
          <span class="px-3 py-1 rounded-full text-sm font-medium ${analisis.riesgo.nivel === 'alto' ? 'bg-danger/20 text-danger' : analisis.riesgo.nivel === 'medio' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}">
            Riesgo ${analisis.riesgo.nivel.charAt(0).toUpperCase() + analisis.riesgo.nivel.slice(1)}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Métricas -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-surface-light/50 rounded-xl p-3 text-center">
        <p class="text-2xl font-bold text-text-main">${analisis.metricas.porcentajeAsistencia}%</p>
        <p class="text-xs text-text-muted">Asistencia</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-3 text-center">
        <p class="text-2xl font-bold text-text-main">${analisis.metricas.totalTardanzas}</p>
        <p class="text-xs text-text-muted">Tardanzas</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-3 text-center">
        <p class="text-2xl font-bold text-text-main">${analisis.metricas.faltasConsecutivas}</p>
        <p class="text-xs text-text-muted">Faltas Consec.</p>
      </div>
      <div class="bg-surface-light/50 rounded-xl p-3 text-center">
        <p class="text-2xl font-bold text-text-main">${analisis.metricas.totalClases}</p>
        <p class="text-xs text-text-muted">Clases</p>
      </div>
    </div>
    
    <!-- Tendencia -->
    <div class="glass rounded-xl p-4 mb-6">
      <p class="text-sm font-medium text-text-main mb-3">📈 Tendencia</p>
      <div class="flex items-center gap-4">
        <span class="text-3xl">${analisis.tendencia.direccion === 'mejorando' ? '📈' : analisis.tendencia.direccion === 'empeorando' ? '📉' : '➡️'}</span>
        <div>
          <p class="font-medium ${analisis.tendencia.direccion === 'mejorando' ? 'text-success' : analisis.tendencia.direccion === 'empeorando' ? 'text-danger' : 'text-text-main'}">
            ${analisis.tendencia.direccion.charAt(0).toUpperCase() + analisis.tendencia.direccion.slice(1)}
          </p>
          <p class="text-sm text-text-muted">
            Reciente: ${analisis.tendencia.asistenciaReciente}% vs Anterior: ${analisis.tendencia.asistenciaAnterior}%
          </p>
        </div>
      </div>
    </div>
    
    <!-- Alertas -->
    ${analisis.alertas.length > 0 ? `
      <div class="glass rounded-xl p-4 mb-6">
        <p class="text-sm font-medium text-text-main mb-3">⚠️ Alertas</p>
        <div class="space-y-2">
          ${analisis.alertas.map(alerta => `
            <div class="flex items-start gap-2 p-2 rounded-lg ${alerta.tipo === 'critico' ? 'bg-danger/10' : 'bg-warning/10'}">
              <span>${alerta.icono}</span>
              <div>
                <p class="text-sm font-medium text-text-main">${alerta.mensaje}</p>
                <p class="text-xs text-text-muted">${alerta.recomendacion}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <!-- Predicción -->
    <div class="glass rounded-xl p-4">
      <p class="text-sm font-medium text-text-main mb-3">🔮 Predicción</p>
      <div class="space-y-2">
        <p class="text-text-main">${analisis.prediccion.mensaje}</p>
        <div class="flex items-center gap-4 mt-3">
          <div class="flex-1">
            <p class="text-xs text-text-muted">Asistencia esperada próx. mes</p>
            <p class="text-lg font-bold text-primary">${analisis.prediccion.asistenciaProxMes}%</p>
          </div>
          <div class="flex-1">
            <p class="text-xs text-text-muted">Probabilidad de deserción</p>
            <p class="text-lg font-bold ${analisis.prediccion.probabilidadDesercion > 30 ? 'text-danger' : 'text-success'}">${analisis.prediccion.probabilidadDesercion}%</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ========================
// 🔹 EXPORTAR REPORTE
// ========================

/**
 * Exportar reporte de alumnos en riesgo a CSV
 */
async function exportarReporteRiesgo() {
  if (typeof mostrarNotificacion === 'function') {
    mostrarNotificacion('⏳ Generando reporte...', 'info');
  }
  
  try {
    const alumnosRiesgo = await obtenerAlumnosEnRiesgo();
    
    if (alumnosRiesgo.length === 0) {
      if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('ℹ️ No hay alumnos en riesgo para exportar', 'info');
      }
      return;
    }
    
    // Crear CSV
    let csv = '\ufeff'; // BOM para Excel
    csv += 'No,Control,Nombre,Grado,% Asistencia,Tardanzas,Faltas Consec.,Score Riesgo,Nivel,Tendencia,Predicción Deserción\n';
    
    alumnosRiesgo.forEach((alumno, index) => {
      const a = alumno.analisis;
      csv += `${index + 1},`;
      csv += `${alumno.control || alumno.id},`;
      csv += `"${alumno.nombre || ''} ${alumno.apellidos || ''}",`;
      csv += `${alumno.grado || 'N/A'},`;
      csv += `${a.metricas.porcentajeAsistencia}%,`;
      csv += `${a.metricas.totalTardanzas},`;
      csv += `${a.metricas.faltasConsecutivas},`;
      csv += `${a.riesgo.valor},`;
      csv += `${a.riesgo.nivel},`;
      csv += `${a.tendencia.direccion},`;
      csv += `${a.prediccion.probabilidadDesercion}%\n`;
    });
    
    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_riesgo_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    if (typeof mostrarNotificacion === 'function') {
      mostrarNotificacion(`📥 ${alumnosRiesgo.length} alumnos exportados`, 'success');
    }
    
  } catch (error) {
    console.error('Error exportando reporte:', error);
    if (typeof mostrarNotificacion === 'function') {
      mostrarNotificacion('❌ Error al exportar', 'error');
    }
  }
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.analizarAlumno = analizarAlumno;
window.obtenerAlumnosEnRiesgo = obtenerAlumnosEnRiesgo;
window.analizarPlantel = analizarPlantel;
window.renderizarPanelAnalisis = renderizarPanelAnalisis;
window.verDetalleAnalisis = verDetalleAnalisis;
window.exportarReporteRiesgo = exportarReporteRiesgo;

console.log('🤖 Módulo de Análisis Predictivo cargado');
