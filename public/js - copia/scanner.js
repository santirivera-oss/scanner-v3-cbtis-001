// ----------------------------
// Listener global para el escáner (mejorado)
// ----------------------------
let bufferCodigo = "";

const listenerEscaner = (e) => {
  // Ignorar teclas de control
  if (e.key === "Shift" || e.key === "Alt" || e.key === "Control") return;

  // Ignorar si el foco está en un input o textarea
  const tag = e.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  // Enter indica que se completó un código
  if (e.key === "Enter") {
    if (bufferCodigo.trim() !== "") {
      procesarQR(bufferCodigo.trim()); // llamar a tu función que procesa QR/código
      bufferCodigo = ""; // limpiar buffer
    }
    e.preventDefault();
    return;
  }

  // Guardar cada tecla escaneada
  bufferCodigo += e.key;
};

// Activar listener global
document.addEventListener("keydown", listenerEscaner);





// ========================
// Activar / Detener cámara
// ========================
// ========================
// Variables globales
// ========================
let html5QrCode; // instancia de Html5Qrcode

// ========================
// Activar modo cámara (HTML5 QR)
// ========================
function activarModoCamara() {
  // Detener cámara si ya estaba activa
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    }).catch(() => { html5QrCode = null; });
  }

  // Inicializar Html5Qrcode
  html5QrCode = new Html5Qrcode("qr-reader");

  const config = { fps: 15, qrbox: 300 };

  html5QrCode.start(
    { facingMode: "environment" }, 
    config, 
    qrCodeMessage => {
      // Se llama cada vez que detecta un QR
      procesarQRDesdeCamara(qrCodeMessage);
      reproducirBeep("success");
      mostrarOverlayScan("QR detectado con cámara", "success");
    },
    errorMessage => {
      // Mensaje de detección continua
      document.getElementById("prof-scan-status").textContent = "📷 Detectando QR...";
    }
  ).catch(err => {
    console.error("Error al iniciar cámara:", err);
    mostrarOverlayTipo("error", "❌ No se pudo iniciar la cámara");
    reproducirBeep("error");
  });

  document.getElementById("prof-scan-status").textContent = "📷 Cámara activa: apunta al QR";
}

// Activar modo lector
// ========================
// Activar modo lector (input físico)
// ========================
function activarModoLector() {
  // Detener cámara si estaba activa
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    }).catch(() => { html5QrCode = null; });
  }

  // Mostrar input lector (fuera de flujo visual)
  const inEl = document.getElementById("input-lector");
  if (inEl) {
    inEl.style.display = "block";
    inEl.focus({preventScroll: true});
    setTimeout(() => {
      try { inEl.focus({preventScroll:true}); } catch(e) { inEl.focus(); }
    }, 50);
  }
  reproducirBeep("success")
  document.getElementById("prof-scan-status").textContent = "🔌 Listo para lector: escanea un código físico";
}


// Procesar QR desde cámara
function procesarQRDesdeCamara(qrData) {
  try {
    let datos = {};
    // Intentar parsear JSON
    if(qrData.startsWith("{") && qrData.endsWith("}")) {
      datos = JSON.parse(qrData);
    } else {
      // QR plano: key=value
      qrData.split(";").forEach(pair=>{
        const [k,...rest] = pair.split("=");
        if(!k) return;
        datos[k.trim()] = rest.join("=").trim();
      });
    }
    if(!datos.tipo) throw new Error("QR inválido");
    procesarQR(datos);
  } catch(e) {
    console.warn("Error procesando QR de cámara:", e);
    mostrarOverlayTipo("error", "❌ QR inválido");
    reproducirBeep("error");
  }
}


// Lector físico (input)
inputLector.addEventListener("input", async (e) => {
  const valor = e.target.value.trim();
  if (!valor) return; // evita input vacío

  try {
    console.log("🔍 Buscando código:", valor);

    // Intentar en alumnos (por control)
    const docAlumno = await db.collection("alumnos").doc(valor).get();
    if (docAlumno.exists) {
      const dataAlumno = docAlumno.data();
      console.log("✅ Alumno encontrado:", dataAlumno);

      await procesarQR({
        nombre: dataAlumno.nombre || "Desconocido",
        apellidos: dataAlumno.apellidos || "",
        control: dataAlumno.control || "N/A",
        grado: dataAlumno.grado || "",
        whatsapp: dataAlumno.whatsapp || "",
      });

      mostrarOverlayScan(`${dataAlumno.nombre || ""} ${dataAlumno.apellidos || ""}`, "success");
      reproducirBeep("success");
      return;
    }

// Intentar en profesores (por telefono)
const docProf = await db.collection("profesores").doc(valor).get();
if (docProf.exists) {
  const dataProf = docProf.data();
  console.log("✅ Profesor encontrado:", dataProf);

  // PASAR TODOS LOS CAMPOS
  await procesarQR(dataProf);

  mostrarOverlayTipo("success", `👨‍🏫 Bienvenido, ${dataProf.nombre || ""}`);
  reproducirBeep("success");
  return;
}

  } catch (err) {
    console.error("❌ Error procesando QR:", err);
    mostrarOverlayTipo("error", `❌ ${err.message}`);
    reproducirBeep("error");

  } finally {
    e.target.value = ""; // limpiar input siempre
  }
});
