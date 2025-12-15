// accesos-cbtis.js
// Módulo: Control de acceso CBTis (ingreso / salida)
// Versión: Enterprise v2.0 (Tactile Glass UI + Logic Hardening)
// Requiere: db (Firestore compat), actualizarAviso(), reproducirBeep(), mostrarOverlayTipo()

/* -------------------------
   Estado global y carga
   ------------------------- */
window.modoCBTis = null; // 'Ingreso' | 'Salida' | null
window.ingresosCBTis = window.ingresosCBTis || []; // cache local
window.ultimoEscaneoCache = {}; // MEJORA: Cache para Debounce (evitar doble registro)

/* -------------------------
   Crear Panel CBTis (Ingreso / Salida)
   ------------------------- */
function initPanelCBTis(containerId = null) {
  if (document.getElementById("panel-cbtis")) return;

  const cont = containerId ? document.getElementById(containerId) : document.body;
  if (!cont) return;

  const panel = document.createElement("div");
  panel.id = "panel-cbtis";
  // Estilos inline básicos para estructura (el diseño visual viene del CSS global)
  panel.style.cssText = "padding:15px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:15px; background:rgba(15,23,42,0.6); border-radius:12px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px);";

  panel.innerHTML = `
    <strong style="margin-right:8px; color:#e2e8f0;">🏫 CBTis Accesos</strong>
    <button id="btn-cbtis-ingreso" style="padding:8px 14px; background:#10b981; color:#fff; border-radius:8px; border:none; cursor:pointer; font-weight:600;">🔓 Ingreso</button>
    <button id="btn-cbtis-salida" style="padding:8px 14px; background:#ef4444; color:#fff; border-radius:8px; border:none; cursor:pointer; font-weight:600;">🚪 Salida</button>
    <button id="btn-cbtis-cerrar" style="padding:8px 14px; background:#475569; color:#fff; border-radius:8px; border:none; cursor:pointer;">❌ Salir modo</button>
    <span id="modo-actual-cbtis" style="margin-left:10px; font-weight:bold; color:#94a3b8;">Modo: Inactivo</span>
  `;

  cont.prepend(panel);

  // Listeners de botones
  document.getElementById("btn-cbtis-ingreso").addEventListener("click", () => setModoCBTis("Ingreso"));
  document.getElementById("btn-cbtis-salida").addEventListener("click", () => setModoCBTis("Salida"));
  document.getElementById("btn-cbtis-cerrar").addEventListener("click", () => setModoCBTis(null));

  actualizarAviso("🏫 Panel CBTis inicializado", "success");
}

/* -------------------------
   Cambiar modo (Ingreso/Salida)
   ------------------------- */
function setModoCBTis(modo) {
  window.modoCBTis = modo;
  const indicador = document.getElementById("modo-actual-cbtis");
  
  if (indicador) {
    if (!modo) {
      indicador.textContent = "Modo: Inactivo";
      indicador.style.color = "#94a3b8";
    } else {
      indicador.textContent = `Modo: ${modo.toUpperCase()}`;
      indicador.style.color = modo === "Ingreso" ? "#34d399" : "#f87171";
    }
  }
  
  if (modo) {
    actualizarAviso(`Modo activo: ${modo}`, "success");
  } else {
    actualizarAviso("Modo CBTis desactivado", "info");
  }
}

/* -------------------------
   Registrar ingreso/salida (Firestore + UI + Validaciones)
   ------------------------- */
async function registrarIngresoCBTis(datosUsuario, tipoRegistro = "Ingreso", modoEscaneo = "Cámara") {
  try {
    // 1. MEJORA: Validación de datos crítica
    if (!datosUsuario || typeof datosUsuario !== 'object') {
      throw new Error("Datos de usuario inválidos o vacíos.");
    }
    
    // Normalizar identificador
    const identificador = (datosUsuario.control || datosUsuario.identificador || datosUsuario.telefono || datosUsuario.uid || "").toString().trim();
    const nombreCompleto = `${(datosUsuario.nombre || "").toString()} ${(datosUsuario.apellidos || "").toString()}`.trim();

    if (!identificador || !nombreCompleto) {
      reproducirBeep("error");
      actualizarAviso("⚠️ Datos incompletos en el QR (falta ID o Nombre)", "error");
      return;
    }

    // 2. MEJORA: Debounce (Evitar doble registro en < 8 segundos)
    const ahoraTs = Date.now();
    const ultimoTs = window.ultimoEscaneoCache[identificador] || 0;
    if (ahoraTs - ultimoTs < 8000) {
      console.warn(`⏳ Debounce activo para ${identificador}. Registro omitido.`);
      actualizarAviso(`⏳ Espera un momento para escanear de nuevo`, "warning");
      return; // Salir silenciosamente
    }
    window.ultimoEscaneoCache[identificador] = ahoraTs;

    // 3. MEJORA: Manejo de Fechas (Zona Horaria Local Explícita)
    const fechaObj = new Date();
    // Formato ISO local 'YYYY-MM-DD'
    const fechaLocal = fechaObj.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
    const horaLocal = fechaObj.toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const registro = {
      tipoPersona: (datosUsuario.tipo || "Alumno").toString(),
      nombre: nombreCompleto,
      identificador: identificador,
      aula: datosUsuario.aula || datosUsuario.grupo || "General", // Dato extra para overlay
      tipoRegistro, // 'Ingreso' o 'Salida'
      fecha: fechaLocal,
      hora: horaLocal,
      modo: modoEscaneo,
      timestamp: fechaObj.toISOString(), // ISO para ordenamiento en DB
      fotoUrl: datosUsuario.fotoUrl || null // Soporte futuro para foto
    };

    // 4. Guardar en Firestore
    await db.collection("ingresos_cbtis").add(registro);
    
    // Actualizar caché local
    window.ingresosCBTis.unshift(registro);
    if (window.ingresosCBTis.length > 200) window.ingresosCBTis.pop();

    // 5. MEJORA: Lógica 'Salida sin Entrada' (Verificación asíncrona no bloqueante)
    let alertaExtra = "";
    if (tipoRegistro === "Salida") {
       verificarEntradaPrevia(identificador, fechaLocal).then(tieneEntrada => {
         if (!tieneEntrada) console.warn("⚠️ Salida registrada sin entrada previa hoy.");
       });
    }

    // 6. UI y Feedback
    reproducirBeep("success");
    actualizarAviso(`✅ ${tipoRegistro} exitoso: ${registro.nombre}`, "success");
    
    // Mostrar el Overlay Premium
    mostrarOverlayIngresoSalida(registro);

    // Hook opcional para historial administrativo
    if (typeof agregarHistorialAdmin === "function") {
      agregarHistorialAdmin({ nombreCompleto: registro.nombre, tipo: registro.tipoPersona, accion: tipoRegistro });
    }

    return registro;

  } catch (err) {
    console.error("❌ Error en registrarIngresoCBTis:", err);
    reproducirBeep("error");
    actualizarAviso("❌ Error al guardar registro. Verifica tu conexión.", "error");
    // No lanzamos throw para no romper el flujo de la UI principal si falla el guardado
  }
}

// Función auxiliar para verificar entrada (No bloqueante)
async function verificarEntradaPrevia(id, fecha) {
  try {
    const snap = await db.collection("ingresos_cbtis")
      .where("identificador", "==", id)
      .where("fecha", "==", fecha)
      .where("tipoRegistro", "==", "Ingreso")
      .limit(1)
      .get();
    return !snap.empty;
  } catch (e) { return true; } // Si falla, asumimos true para no alarmar
}

/* -------------------------
   Overlay visual (UI Tactile Glass)
   ------------------------- */
(function(){
  // Frases dinámicas
  const frasesIngreso = [
    "Hoy es un gran día para aprender algo nuevo 🌟",
    "Bienvenido: que tu curiosidad te guíe hoy 🚀",
    "Tu talento transforma el aula — hazlo brillar 💫",
    "Aporta, pregunta, crece. ¡Qué tengas excelente clase!",
    "El éxito es la suma de pequeños esfuerzos 📚"
  ];
  const frasesSalida = [
    "Que tengas una tarde excelente — descansa y recarga ⚡",
    "Buen trabajo hoy, mañana será otra oportunidad ✨",
    "Gracias por tu asistencia — ¡nos vemos pronto! 👋",
    "Descansa bien y sigue aprendiendo cada día.",
    "El esfuerzo de hoy es el éxito de mañana 🌙"
  ];

  // MEJORA: Selector de voz más robusto
  function obtenerVozPreferida() {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    
    // Prioridad: Voces en español de Google o Microsoft (suelen ser mejores)
    const prioridades = ['Google español', 'Microsoft Sabina', 'Mexico', 'Spanish', 'es-MX', 'es-ES'];
    
    for (const pref of prioridades) {
      const found = voices.find(v => v.name.includes(pref) || v.lang.includes(pref));
      if (found) return found;
    }
    return voices.find(v => v.lang.startsWith('es')) || voices[0];
  }

  // Función principal del Overlay
  window.mostrarOverlayIngresoSalida = function(registro = {}, opts = {}) {
    const duration = opts.duration || 7000; // Tiempo visible
    const vozActiva = (typeof opts.voz === 'boolean') ? opts.voz : true;
    const logoCBTis = opts.logoCBTis || 'assets/CBTIS501.png'; // Placeholder
    
    // Callback al cerrar
    const onClose = typeof opts.onClose === 'function' ? opts.onClose : null;

    // Limpieza previa
    const prev = document.getElementById("overlay-ingreso");
    if (prev) prev.remove();

    // Crear elemento
    const ov = document.createElement("div");
    ov.id = "overlay-ingreso"; // ID vinculado al CSS Tactile Glass
    ov.setAttribute('role','dialog');

    // Datos
    const tipoReg = (registro.tipoRegistro || 'Ingreso');
    const esSalida = tipoReg.toLowerCase().includes('salida');
    const name = registro.nombre || 'Usuario';
    const role = registro.tipoPersona || 'Estudiante';
    const iden = registro.identificador || '';
    const aula = registro.aula || 'Campus';
    
    // Fecha/Hora
    const d = new Date();
    const horaTxt = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Frase aleatoria
    const frasePool = esSalida ? frasesSalida : frasesIngreso;
    const frase = frasePool[Math.floor(Math.random() * frasePool.length)];
    const saludo = esSalida ? "¡Hasta pronto!" : "¡Bienvenido!";

    // Imagen por defecto (Avatar genérico si no hay foto real)
    const avatarUrl = registro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=38bdf8&color=fff&size=128`;

    // MEJORA: Estructura HTML coincidente con CSS Tactile Glass
    ov.innerHTML = `
      <div class="ov-left">
        <img src="${avatarUrl}" alt="Avatar" onerror="this.src='assets/default-user.png'">
      </div>
      <div class="ov-body">
        <div class="ov-greet">${saludo}</div>
        <div class="ov-name">${name}</div>
        <div class="ov-meta">
          <span class="badge">${role}</span>
          <span>• ${iden}</span>
          <span>• ${aula}</span>
        </div>
        <div class="ov-quote">"${frase}"</div>
        <div class="ov-actions">
          <button id="ov-btn-close" style="background: rgba(255,255,255,0.1); color: #94a3b8;">Cerrar</button>
          <button id="ov-btn-ok" class="ov-ok">${esSalida ? '¡Nos vemos!' : '¡Adelante!'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);

    // Animación de entrada (necesita un pequeño delay para activar transición CSS)
    requestAnimationFrame(()=> {
      ov.classList.add('show');
    });

    // Lógica de cierre
    function cerrar(reason = 'auto') {
      ov.classList.remove('show');
      setTimeout(()=> {
        try { ov.remove(); } catch(e){}
        if (onClose) onClose(reason);
      }, 400); // Coincide con transición CSS
    }

    ov.querySelector('#ov-btn-close').addEventListener('click', ()=> cerrar('manual'));
    ov.querySelector('#ov-btn-ok').addEventListener('click', ()=> cerrar('ok'));

    // Auto-cierre
    const timeoutId = setTimeout(()=> cerrar('auto'), duration);

    // MEJORA: Lógica de Voz (TTS) protegida
    if (vozActiva && 'speechSynthesis' in window) {
      const speak = () => {
        try {
          // Cancelar lecturas anteriores
          speechSynthesis.cancel(); 
          
          const texto = esSalida 
            ? `Hasta luego ${name.split(' ')[0]}. ${frase}` 
            : `Bienvenido ${name.split(' ')[0]}. ${frase}`;

          const ut = new SpeechSynthesisUtterance(texto);
          const voz = obtenerVozPreferida();
          if (voz) ut.voice = voz;
          
          ut.rate = 1.0; // Velocidad normal
          ut.pitch = 1.05; // Tono ligeramente amable
          ut.volume = 1.0;
          
          speechSynthesis.speak(ut);
        } catch(e) {
          console.warn("Error TTS:", e);
        }
      };
      
      // A veces las voces no cargan inmediatamente en Chrome
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = speak;
      } else {
        speak();
      }
    }

    return { close: () => { clearTimeout(timeoutId); cerrar('programmatic'); } };
  };
})();

/* -------------------------
   Exportar EXCEL (Mejorado con filtro Timezone)
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnExportar = document.getElementById("btnExportarAccesos");
  const inputFecha = document.getElementById("filtroFechaAccesos");

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      const fecha = inputFecha ? inputFecha.value : '';
      exportarAccesosCBTisExcel(fecha);
    });
  }
});

async function exportarAccesosCBTisExcel(fechaFiltro = '') {
  try {
    let q = db.collection('ingresos_cbtis').orderBy('timestamp', 'desc');

    // Filtro de fecha respetando zona horaria local
    if (fechaFiltro) {
      // Crear fechas inicio y fin en hora local
      const inicio = new Date(`${fechaFiltro}T00:00:00`);
      const fin = new Date(`${fechaFiltro}T23:59:59`);
      
      // Firestore necesita ISO String, pero ajustado a la zona horaria
      q = db.collection('ingresos_cbtis')
        .where('timestamp', '>=', inicio.toISOString())
        .where('timestamp', '<=', fin.toISOString())
        .orderBy('timestamp', 'desc');
    }

    const snap = await q.get();
    if (snap.empty) {
      actualizarAviso("⚠️ No hay registros para exportar en este periodo", "warning");
      return;
    }

    const registros = snap.docs.map(doc => doc.data());

    // Agrupación inteligente
    const grupos = {
      alumnosIngreso: registros.filter(r => r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Ingreso"),
      alumnosSalida: registros.filter(r => r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Salida"),
      profIngreso: registros.filter(r => !r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Ingreso"),
      profSalida: registros.filter(r => !r.tipoPersona.includes("Alumno") && r.tipoRegistro === "Salida")
    };

    const wb = XLSX.utils.book_new();

    function crearHoja(datos, titulo) {
      if (!datos.length) return null;
      const data = datos.map(d => ({
        "Nombre": d.nombre,
        "ID / Control": d.identificador,
        "Rol": d.tipoPersona,
        "Fecha": d.fecha,
        "Hora": d.hora,
        "Aula": d.aula || "N/A",
        "Modo": d.modo
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      // Ajuste automático de anchos (básico)
      const wscols = Object.keys(data[0]).map(k => ({wch: 20}));
      ws['!cols'] = wscols;
      return ws;
    }

    const hojas = [
      ["Alumnos Entrada", grupos.alumnosIngreso],
      ["Alumnos Salida", grupos.alumnosSalida],
      ["Personal Entrada", grupos.profIngreso],
      ["Personal Salida", grupos.profSalida]
    ];

    let exportado = false;
    hojas.forEach(([nombre, data]) => {
      const ws = crearHoja(data);
      if (ws) {
        XLSX.utils.book_append_sheet(wb, ws, nombre);
        exportado = true;
      }
    });

    if (!exportado) {
      actualizarAviso("⚠️ Datos encontrados pero no clasificables", "warning");
      return;
    }

    const fileName = `Reporte_Accesos_${fechaFiltro || "Total"}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    actualizarAviso("✅ Reporte Excel generado correctamente", "success");

  } catch (err) {
    console.error("Error Exportar:", err);
    actualizarAviso("❌ Error al generar Excel", "error");
  }
}

/* -------------------------
   Inicialización Global
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnCBTis = document.getElementById("btnPanelCBTis");
  if (btnCBTis) {
    btnCBTis.addEventListener("click", () => InitPanelCBTis());
  }
});

function InitPanelCBTis() {
  initPanelCBTis();
  console.log("🚀 Sistema CBTis Access V2 Loaded");
}

// Exponer funciones (Legacy Support)
window.setModoCBTis = setModoCBTis;
window.initPanelCBTis = initPanelCBTis;
window.registrarIngresoCBTis = registrarIngresoCBTis;
window.exportarAccesosCBTisExcel = exportarAccesosCBTisExcel;
window.InitPanelCBTis = InitPanelCBTis;