/// ========================
// Funciones helper adaptadas al overlay actual
// ========================
function mostrarOverlayScan(texto, tipo = "success") {
  const overlayEl = document.getElementById('overlay');
  if (!overlayEl) return;

  overlayEl.classList.remove('success', 'warning', 'error', 'info');
  overlayEl.classList.add(tipo);

  const tituloEl = document.getElementById('overlay-titulo');
  const infoEl = document.getElementById('prof-scan-status');

  const titulos = {
    success: "✅ Escaneo exitoso",
    warning: "⚠️ QR ya registrado",
    error: "❌ Error en escaneo",
    info: "⏳ Escaneando QR..."
  };

  const mensajes = {
    success: texto || "Alumno registrado correctamente",
    warning: texto || "El QR ya fue escaneado",
    error: texto || "Error al procesar el QR",
    info: texto || "Apunta el QR del alumno"
  };

  if (tituloEl) tituloEl.textContent = titulos[tipo] || titulos.info;
  if (infoEl) infoEl.textContent = mensajes[tipo] || mensajes.info;

  // Mostrar overlay con animación
  overlayEl.style.display = 'flex';
  overlayEl.style.opacity = '0';
  overlayEl.style.transition = 'opacity 0.3s ease';
  requestAnimationFrame(() => { overlayEl.style.opacity = '1'; });

  // Ocultar suavemente
  if (overlayEl._timeoutId) clearTimeout(overlayEl._timeoutId);
  overlayEl._timeoutId = setTimeout(() => {
    overlayEl.style.opacity = '0';
    setTimeout(() => {
      overlayEl.style.display = 'none';
      overlayEl.classList.remove(tipo);
    }, 300);
  }, 2500);
}

function mostrarOverlayTipo(tipo = 'info', mensaje = '', duracion = 2200) {
  const overlayEl = document.getElementById('overlay');
  if (!overlayEl) return;

  overlayEl.classList.remove('success', 'warning', 'error', 'info');
  overlayEl.classList.add(tipo);

  const tituloEl = document.getElementById('overlay-titulo');
  const infoEl = document.getElementById('prof-scan-status');

  const titulos = {
    success: "✅ Escaneo exitoso",
    warning: "⚠️ Advertencia",
    error: "❌ Error",
    info: "ℹ️ Información"
  };

  const mensajes = {
    success: mensaje || "Operación completada correctamente",
    warning: mensaje || "Atención requerida",
    error: mensaje || "Ocurrió un problema",
    info: mensaje || "Procesando..."
  };

  if (tituloEl) tituloEl.textContent = titulos[tipo] || titulos.info;
  if (infoEl) infoEl.textContent = mensajes[tipo] || mensajes.info;

  overlayEl.style.display = 'flex';
  overlayEl.style.opacity = '0';
  overlayEl.style.transition = 'opacity 0.3s ease';
  requestAnimationFrame(() => { overlayEl.style.opacity = '1'; });

  if (overlayEl._timeoutId) clearTimeout(overlayEl._timeoutId);
  overlayEl._timeoutId = setTimeout(() => {
    overlayEl.style.opacity = '0';
    setTimeout(() => {
      overlayEl.style.display = 'none';
      overlayEl.classList.remove(tipo);
    }, 300);
  }, duracion);
}


// =============================
// Panel profesor y mini overlay
// =============================
const panelAviso = document.getElementById("panel-aviso");

function actualizarAviso(texto, tipo = "info") {
  if (!panelAviso) return;
  panelAviso.textContent = texto;
  panelAviso.classList.remove("success", "error", "info");
  panelAviso.classList.add(tipo);
}

// Estado global temporal
window.profesorRegistrado = null;
window.alumnosEscaneados = [];


// ------------------------------------------------------------
// 4️⃣ Mini-Overlay: mostrarMiniAlumno()
// ------------------------------------------------------------
// =============================================================
// MINI OVERLAY HOLOGRAFICO FUTURISTA EXARA V3
// =============================================================
(function(){

  function ensureHolo() {
    let box = document.getElementById("mini-holo");
    if (box) return box;

    box = document.createElement("div");
    box.id = "mini-holo";
    box.innerHTML = `
      <div id="mini-holo-title">📡 Registros Recientes</div>
      <div id="mini-holo-list"></div>
      <button id="mini-holo-clear">Limpiar</button>
    `;
    document.body.appendChild(box);

    // animar aparición
    requestAnimationFrame(()=> box.classList.add("show"));

    // botón limpiar
    box.querySelector("#mini-holo-clear").onclick = () => {
      document.getElementById("mini-holo-list").innerHTML = "";
      window.alumnosEscaneados = [];
    };

    return box;
  }

  // 🌟 Función principal
  window.mostrarMiniAlumno = function (texto) {

    const box = ensureHolo();
    const list = document.getElementById("mini-holo-list");

    const item = document.createElement("div");
    item.className = "holo-item";

    item.innerHTML = `
      <span class="holo-icon">🔹</span>
      <span>${texto}</span>
    `;

    list.prepend(item);

    // mantener máximo 30
    while (list.children.length > 30) {
      list.removeChild(list.lastChild);
    }
  };

})();