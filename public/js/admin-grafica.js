// =============================
// 📊 PANEL ADMIN — GRÁFICAS EN TIEMPO REAL (v3.0 PROFESIONAL)
// =============================

let graficaAsistenciaChart = null;
let graficaClasesChart = null;
let graficaAulaChart = null;
let unsubscribeSesiones = null;

// ========================
// 🔹 INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Iniciando módulo de gráficas...');
  
  // Iniciar panel de clases en tiempo real
  setTimeout(() => {
    iniciarPanelClasesTiempoReal();
    iniciarGraficaAsistenciaSemanal();
  }, 500);
});

// ========================
// 🔹 GRÁFICA DE ASISTENCIA SEMANAL
// ========================
async function iniciarGraficaAsistenciaSemanal() {
  const canvas = document.getElementById('grafica-asistencia');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Obtener datos de la última semana
  const datos = await obtenerDatosAsistenciaSemanal();
  
  if (graficaAsistenciaChart) graficaAsistenciaChart.destroy();
  
  graficaAsistenciaChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.labels,
      datasets: [
        {
          label: 'Alumnos',
          data: datos.alumnos,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#fff',
          pointBorderWidth: 1
        },
        {
          label: 'Profesores',
          data: datos.profesores,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 1
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
            boxWidth: 6,
            boxHeight: 6,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8
        }
      },
      scales: {
        x: {
          grid: { 
            color: 'rgba(148, 163, 184, 0.08)',
            drawBorder: false
          },
          ticks: { 
            color: '#64748b', 
            font: { size: 10 },
            padding: 5
          }
        },
        y: {
          beginAtZero: true,
          grid: { 
            color: 'rgba(148, 163, 184, 0.08)',
            drawBorder: false
          },
          ticks: { 
            color: '#64748b', 
            font: { size: 10 },
            padding: 8,
            stepSize: 5
          }
        }
      },
      layout: {
        padding: {
          top: 5,
          bottom: 5
        }
      }
    }
  });
}

async function obtenerDatosAsistenciaSemanal() {
  const labels = [];
  const alumnos = [];
  const profesores = [];
  
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    fecha.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);
    
    labels.push(dias[fecha.getDay()]);
    
    try {
      const registrosSnap = await db.collection('registros')
        .where('fecha', '>=', fecha.toISOString())
        .where('fecha', '<=', fechaFin.toISOString())
        .get();
      
      let countAlumnos = 0;
      let countProfesores = 0;
      
      registrosSnap.forEach(doc => {
        const r = doc.data();
        if (r.tipo === 'Alumno') countAlumnos++;
        else if (r.tipo === 'Profesor') countProfesores++;
      });
      
      alumnos.push(countAlumnos);
      profesores.push(countProfesores);
    } catch (e) {
      alumnos.push(0);
      profesores.push(0);
    }
  }
  
  return { labels, alumnos, profesores };
}

// ========================
// 🔹 PANEL DE CLASES EN TIEMPO REAL
// ========================
function iniciarPanelClasesTiempoReal() {
  console.log("⏱ Iniciando panel de clases en tiempo real...");

  const listaClases = document.getElementById("lista-clases-activas");
  const panelAula = document.getElementById("panel-grafica-aula");
  const tituloAula = document.getElementById("titulo-grafica-aula");
  const resumenAula = document.getElementById("resumen-aula");
  const btnVolver = document.getElementById("btn-volver-general");
  const graficaCanvas = document.getElementById("grafica-aula");

  if (!listaClases) {
    console.warn("⚠️ Lista de clases no encontrada");
    return;
  }

  // Rango de hoy
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  
  const finDia = new Date();
  finDia.setHours(23, 59, 59, 999);

  // Limpiar listener anterior si existe
  if (unsubscribeSesiones) unsubscribeSesiones();

  // Escuchar sesiones de hoy
  unsubscribeSesiones = db.collection("sesiones")
    .where("inicio", ">=", inicioDia.toISOString())
    .where("inicio", "<=", finDia.toISOString())
    .onSnapshot(snapshot => {
      listaClases.innerHTML = "";

      const sesionesActivas = [];
      
      snapshot.forEach(doc => {
        const sesion = doc.data();
        const estado = (sesion.estado || "").toLowerCase();
        if (estado.includes("curso") || estado.includes("activa")) {
          sesionesActivas.push({ id: doc.id, ...sesion });
        }
      });

      if (sesionesActivas.length === 0) {
        listaClases.innerHTML = `
          <div class="empty-clases">
            <span class="empty-icon">📚</span>
            <p>No hay clases activas en este momento</p>
          </div>
        `;
        return;
      }

      sesionesActivas.forEach((sesion, index) => {
        const prof = sesion.profesor || {};
        const alumnos = sesion.alumnos ? Object.values(sesion.alumnos) : [];
        const conteo = contarEstadosAlumnos(alumnos);

        const item = document.createElement("div");
        item.className = "clase-activa-card";
        item.style.animationDelay = `${index * 0.1}s`;
        item.innerHTML = `
          <div class="clase-header">
            <div class="clase-profesor">
              <div class="profesor-avatar">
                ${(prof.nombre || 'P')[0].toUpperCase()}
              </div>
              <div class="profesor-info">
                <span class="profesor-nombre">${prof.nombre || "Profesor"} ${prof.apellidos || ""}</span>
                <span class="profesor-materia">${sesion.turno || ''}</span>
              </div>
            </div>
            <span class="clase-aula">${sesion.aula || '-'}</span>
          </div>
          <div class="clase-stats">
            <div class="stat-item stat-presentes">
              <span class="stat-value">${conteo.presentes}</span>
              <span class="stat-label">Presentes</span>
            </div>
            <div class="stat-item stat-baño">
              <span class="stat-value">${conteo.baño}</span>
              <span class="stat-label">En baño</span>
            </div>
            <div class="stat-item stat-ausentes">
              <span class="stat-value">${conteo.ausentes}</span>
              <span class="stat-label">Ausentes</span>
            </div>
          </div>
          <div class="clase-footer">
            <span class="clase-horario">🕐 ${sesion.horario || '-'}</span>
            <span class="clase-grupo">${sesion.grado || ''}° ${sesion.grupo || ''}</span>
          </div>
        `;
        
        item.addEventListener("click", () => mostrarGraficaAula(sesion.id, sesion));
        listaClases.appendChild(item);
      });
    }, error => {
      console.error("Error conectando con sesiones:", error);
      listaClases.innerHTML = `
        <div class="error-clases">
          <span class="error-icon">❌</span>
          <p>Error de conexión</p>
        </div>
      `;
    });

  // ========================
  // MOSTRAR GRÁFICA DE AULA
  // ========================
  function mostrarGraficaAula(sesionId, sesion) {
    if (!panelAula || !graficaCanvas) return;
    
    const prof = sesion.profesor || {};
    const alumnos = sesion.alumnos ? Object.values(sesion.alumnos) : [];
    const conteo = contarEstadosAlumnos(alumnos);

    panelAula.style.display = "block";
    listaClases.parentElement.style.display = "none";
    
    if (tituloAula) {
      tituloAula.innerHTML = `
        <span class="titulo-icon">📈</span>
        Aula ${sesion.aula} — ${sesion.horario}
      `;
    }

    if (graficaAulaChart) graficaAulaChart.destroy();
    
    const ctx = graficaCanvas.getContext("2d");

    graficaAulaChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Presentes", "En baño", "Ausentes"],
        datasets: [{
          data: [conteo.presentes, conteo.baño, conteo.ausentes],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd5e1',
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        }
      }
    });

    actualizarResumenAula(sesion, conteo, alumnos);

    // Listener en tiempo real para esta sesión
    const unsubscribeAula = db.collection("sesiones").doc(sesionId).onSnapshot(docSnap => {
      if (panelAula.style.display === "none") return;

      const ses = docSnap.data();
      if (!ses) return;

      if (ses.estado?.toLowerCase().includes("finalizada")) {
        cerrarGraficaClase(prof, ses);
        return;
      }

      const nuevosAlumnos = ses.alumnos ? Object.values(ses.alumnos) : [];
      const nuevosConteo = contarEstadosAlumnos(nuevosAlumnos);

      graficaAulaChart.data.datasets[0].data = [
        nuevosConteo.presentes,
        nuevosConteo.baño,
        nuevosConteo.ausentes
      ];
      graficaAulaChart.update('none');

      actualizarResumenAula(ses, nuevosConteo, nuevosAlumnos);
    });

    // Botón volver
    if (btnVolver) {
      btnVolver.onclick = () => {
        unsubscribeAula();
        panelAula.style.display = "none";
        listaClases.parentElement.style.display = "block";
      };
    }
  }

  // ========================
  // ACTUALIZAR RESUMEN
  // ========================
  function actualizarResumenAula(sesion, conteo, alumnos) {
    if (!resumenAula) return;
    
    const prof = sesion.profesor || {};
    const total = alumnos.length;
    const porcentajeAsistencia = total > 0 ? Math.round((conteo.presentes / total) * 100) : 0;
    
    resumenAula.innerHTML = `
      <div class="resumen-grid">
        <div class="resumen-card">
          <span class="resumen-icon">👨‍🏫</span>
          <div class="resumen-content">
            <span class="resumen-label">Profesor</span>
            <span class="resumen-value">${prof.nombre || ""} ${prof.apellidos || ""}</span>
          </div>
        </div>
        <div class="resumen-card">
          <span class="resumen-icon">🏫</span>
          <div class="resumen-content">
            <span class="resumen-label">Aula</span>
            <span class="resumen-value">${sesion.aula || '-'}</span>
          </div>
        </div>
        <div class="resumen-card">
          <span class="resumen-icon">🕐</span>
          <div class="resumen-content">
            <span class="resumen-label">Horario</span>
            <span class="resumen-value">${sesion.horario || '-'}</span>
          </div>
        </div>
        <div class="resumen-card">
          <span class="resumen-icon">📊</span>
          <div class="resumen-content">
            <span class="resumen-label">Asistencia</span>
            <span class="resumen-value">${porcentajeAsistencia}%</span>
          </div>
        </div>
      </div>
      
      <div class="stats-bar">
        <div class="stats-bar-item presentes" style="width: ${total > 0 ? (conteo.presentes/total)*100 : 0}%">
          <span>${conteo.presentes}</span>
        </div>
        <div class="stats-bar-item baño" style="width: ${total > 0 ? (conteo.baño/total)*100 : 0}%">
          <span>${conteo.baño}</span>
        </div>
        <div class="stats-bar-item ausentes" style="width: ${total > 0 ? (conteo.ausentes/total)*100 : 0}%">
          <span>${conteo.ausentes}</span>
        </div>
      </div>
      
      <div class="alumnos-mini-lista">
        <h4>👥 Alumnos (${total})</h4>
        <div class="alumnos-scroll">
          ${alumnos.map(a => {
            const ultimoEvento = a.eventos && a.eventos.length > 0 ? a.eventos[a.eventos.length - 1] : null;
            const estadoClass = getEstadoAlumno(a);
            return `
              <div class="alumno-mini ${estadoClass}">
                <span class="alumno-mini-nombre">${a.nombre}</span>
                <span class="alumno-mini-estado">${ultimoEvento ? ultimoEvento.tipo : 'Sin registro'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="estado-clase">
        <span class="estado-indicator"></span>
        ${sesion.estado || "En curso"}
      </div>
    `;
  }

  function getEstadoAlumno(alumno) {
    const eventos = alumno.eventos || [];
    const tieneEntrada = eventos.some(e => e.tipo === "entrada");
    const salioBaño = eventos.some(e => e.tipo === "baño-salida");
    const regresoBaño = eventos.some(e => e.tipo === "baño-regreso");
    
    if (salioBaño && !regresoBaño) return 'en-baño';
    if (tieneEntrada) return 'presente';
    return 'ausente';
  }

  function cerrarGraficaClase(prof, sesion) {
    if (graficaAulaChart) graficaAulaChart.destroy();
    if (resumenAula) {
      resumenAula.innerHTML = `
        <div class="clase-finalizada">
          <span class="finalizada-icon">🏁</span>
          <h3>Clase Finalizada</h3>
          <p>Profesor: ${prof.nombre || ""} ${prof.apellidos || ""}</p>
          <p>Hora: ${sesion.fin ? new Date(sesion.fin).toLocaleTimeString() : "N/D"}</p>
        </div>
      `;
    }
  }
}

// ========================
// 🔹 FUNCIONES AUXILIARES
// ========================
function contarEstadosAlumnos(alumnos) {
  let presentes = 0, baño = 0;
  
  alumnos.forEach(a => {
    const eventos = a.eventos || [];
    const tieneEntrada = eventos.some(e => e.tipo === "entrada");
    const salioBaño = eventos.some(e => e.tipo === "baño-salida");
    const regresoBaño = eventos.some(e => e.tipo === "baño-regreso");

    if (tieneEntrada && (!salioBaño || (salioBaño && regresoBaño))) presentes++;
    if (salioBaño && !regresoBaño) baño++;
  });

  const total = alumnos.length;
  const ausentes = Math.max(0, total - presentes - baño);
  return { presentes, ausentes, baño };
}

// ========================
// 🔹 EXPORTS
// ========================
window.iniciarPanelClasesTiempoReal = iniciarPanelClasesTiempoReal;
window.iniciarGraficaAsistenciaSemanal = iniciarGraficaAsistenciaSemanal;
