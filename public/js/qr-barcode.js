// ========================
// Generar QR (robusto contra overflow)
// ========================
async function generarQR(container, data, botonDescarga, nombreArchivo) {
  if (!container) return console.error("No existe contenedor QR");
  container.innerHTML = "";

  try {
    let payloadText = "";

    // si data es objeto, intentar stringify y medir
    if (typeof data === "object" && data !== null) {
      const rawJson = JSON.stringify(data);

      // Umbral seguro (evita overflow). Ajusta si quieres; 1000 es conservador.
      const UMbral = 1000;

      if (rawJson.length <= UMbral) {
        // cabe en QR -> usamos JSON completo (útil para cámaras)
        payloadText = rawJson;
      } else {
        // demasiado grande -> guardamos el objeto en Firestore y generamos QR de referencia
        const collection = (data.tipo === "Alumno") ? "alumnos"
                          : (data.tipo === "Profesor") ? "profesores"
                          : "usuarios";

        // preferir usar control/telefono como id para lectora física
        let docId = data.control || data.telefono || null;
        if (!docId) {
          // generar id automático
          docId = db.collection(collection).doc().id;
        }

        // guardamos/actualizamos en BD (añadir un timestamp para seguimiento)
        await db.collection(collection).doc(docId).set({
          ...data,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // payload corto que referencia al doc
        payloadText = JSON.stringify({ tipo: data.tipo || "Usuario", id: docId });
        console.log("➡️ Datos guardados en BD; QR contiene referencia:", payloadText);
      }

    } else {
      // si data es string
      payloadText = String(data || "").trim();
      if (!payloadText) throw new Error("No hay datos para generar QR");

      // Si la cadena es muy larga, creamos un documento de respaldo y referenciamos
      if (payloadText.length > 1000) {
        const docId = db.collection("usuarios").doc().id;
        await db.collection("usuarios").doc(docId).set({
          raw: payloadText,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        payloadText = JSON.stringify({ tipo: "Referencia", id: docId });
      }
    }

    // finalmente generamos el QR con nivel de corrección L (máxima capacidad)
    new QRCode(container, {
      text: payloadText,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.H
    });

    // asignar descarga si existe canvas
    const canvas = container.querySelector("canvas");
    if (canvas && botonDescarga) {
      botonDescarga.onclick = () => {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = nombreArchivo || "qr.png";
        a.click();
      };
    }

    mostrarOverlayTipo("success", "✅ QR generado");
    reproducirBeep("success");

  } catch (err) {
    console.error("Error en generarQR:", err);
    mostrarOverlayTipo("error", "❌ Error generando QR");
    reproducirBeep("error");
  }
}

function generarBarcode(container, data, botonDescarga, nombreArchivo) {
  if (!container) return console.error("No existe contenedor Barcode");
  container.innerHTML = ""; // limpiar

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  container.appendChild(svg);

  try {
    JsBarcode(svg, data, { format: "CODE128", width:2, height:50, displayValue:true });
  } catch(e){ console.error("JsBarcode no definido", e); }

  botonDescarga.onclick = () => {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], {type:"image/svg+xml"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  };
}

// ========================
// Alumno
// ========================
document.getElementById("btnAlumnoQRCamara").addEventListener("click", async ()=>{
  const nombre = alumnoNombreInput.value.trim();
  const apellidos = alumnoApellidosInput.value.trim();
  const grado = alumnoGradoInput.value.trim();
  const control = alumnoControlInput.value.trim();
  const whatsapp = alumnoWhatsappInput.value.trim();
  if(!nombre||!apellidos||!control) return alert("⚠️ Completa los campos");

  // Guardar en Firebase
  await db.collection("alumnos").doc(control).set({nombre, apellidos, grado, control, whatsapp, tipo:"Alumno"});

  // QR JSON completo
  const qrData = JSON.stringify({tipo:"Alumno", nombre, apellidos, grado, control, whatsapp});
  generarQR(alumnoQrcodeDiv, qrData, alumnoDescargarBtn, `QR_Alumno_Camara_${nombre}_${apellidos}.png`);
  reproducirBeep("success");
});

document.getElementById("btnAlumnoQRLector").addEventListener("click", async ()=>{
  const nombre = alumnoNombreInput.value.trim();
  const apellidos = alumnoApellidosInput.value.trim();
  const grado = alumnoGradoInput.value.trim();
  const control = alumnoControlInput.value.trim();
  const whatsapp = alumnoWhatsappInput.value.trim();

  if(!nombre||!apellidos||!control) return alert("⚠️ Completa los campos");

  // Guardar en Firebase
  await db.collection("alumnos").doc(control).set({
    nombre,
    apellidos,
    grado,
    control,
    whatsapp,
    tipo:"Alumno"
  });

  // Código de barras solo con el número de control
  generarBarcode(alumnoQrcodeDiv, control, alumnoDescargarBtn, `Barcode_Alumno_${nombre}_${apellidos}.svg`);
  reproducirBeep("success");
  mostrarOverlayScan("Código de barras generado correctamente", "success");
});


// ========================
// Profesor
// ========================
document.getElementById("btnProfQRCamara").addEventListener("click", async () => {
  const nombre = profNombreInput.value.trim();
  const apellidos = profApellidosInput.value.trim();
  const materias = profMateriasInput.value.trim();
  const grupos = profGruposInput.value.trim();
  const telefono = profTelefonoInput.value.trim();

  if (!nombre || !apellidos || !telefono) return alert("⚠️ Completa los campos");

  // Crear ID (puedes usar telefono o un ID generado automáticamente)
  const docId = telefono || db.collection("profesores").doc().id;

  // Guardar todos los datos completos en Firestore
  await db.collection("profesores").doc(docId).set({
    nombre,
    apellidos,
    materias,
    grupos,
    telefono,
    tipo: "Profesor",
    savedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Generar QR SOLO con referencia al ID
  const qrData = JSON.stringify({ tipo: "Profesor", id: docId });
  generarQR(profQrcodeDiv, qrData, profDescargarBtn, `QR_Profesor_${nombre}_${apellidos}.png`);
  reproducirBeep("success");
});


document.getElementById("btnProfQRLector").addEventListener("click", async ()=>{
  const nombre = profNombreInput.value.trim();
  const apellidos = profApellidosInput.value.trim();
  const telefono = profTelefonoInput.value.trim();
  if(!nombre||!apellidos||!telefono) return alert("⚠️ Completa los campos");

  await db.collection("profesores").doc(telefono).set({nombre, apellidos, telefono, tipo:"Profesor"});
  generarBarcode(profQrcodeDiv, telefono, profDescargarBtn, `Barcode_Profesor_${nombre}_${apellidos}.svg`);
  reproducirBeep("success");
});


