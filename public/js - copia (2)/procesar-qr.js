// ===================================
// 🔍 Procesar QR (Compatible con QR Dinámico v2)
// ===================================

async function procesarQR(datosRaw) {
  try {
    // Normalizar entrada - asegurar que sea string
    if (datosRaw === null || datosRaw === undefined) {
      throw new Error("Código vacío");
    }
    
    // Si es objeto, convertir a string JSON
    if (typeof datosRaw === 'object') {
      datosRaw = JSON.stringify(datosRaw);
    } else {
      datosRaw = String(datosRaw);
    }
    
    let datos = datosRaw;
    let usuario = {};
    console.log("🔍 Código leído:", datosRaw.substring(0, 60));

    // ====== NUEVO: Usar decodificador de QR dinámico ======
    if (typeof decodificarCodigo === 'function') {
      const resultado = decodificarCodigo(datosRaw);
      
      if (resultado.valido) {
        console.log("✅ Código dinámico válido:", resultado.tipo, resultado.identificador);
        
        const identificador = resultado.identificador;
        const tipoCodigo = resultado.tipo;
        
        // Buscar usuario en Firebase
        if (tipoCodigo === 'alumno' || tipoCodigo === 'legacy') {
          // Buscar en usuarios
          let snap = await db.collection('usuarios').where('control', '==', identificador).limit(1).get();
          
          if (snap.empty) {
            // Buscar en alumnos
            const docAlumno = await db.collection('alumnos').doc(identificador).get();
            if (docAlumno.exists) {
              usuario = { id: docAlumno.id, ...docAlumno.data(), tipo: 'Alumno' };
            }
          } else {
            usuario = { id: snap.docs[0].id, ...snap.docs[0].data() };
            usuario.tipo = 'Alumno';
          }
          
          // Usar datos del código como fallback
          if (!usuario.nombre && resultado.datos) {
            usuario = {
              id: identificador,
              control: identificador,
              nombre: resultado.datos.n || 'Alumno',
              apellidos: resultado.datos.a || '',
              grado: resultado.datos.g || '',
              tipo: 'Alumno'
            };
          }
          
        } else if (tipoCodigo === 'profesor') {
          // Buscar en usuarios
          let snap = await db.collection('usuarios').where('telefono', '==', identificador).limit(1).get();
          
          if (snap.empty) {
            // Buscar en profesores
            const docProf = await db.collection('profesores').doc(identificador).get();
            if (docProf.exists) {
              usuario = { id: docProf.id, ...docProf.data(), tipo: 'Profesor' };
            }
          } else {
            usuario = { id: snap.docs[0].id, ...snap.docs[0].data() };
            usuario.tipo = 'Profesor';
          }
          
          if (!usuario.nombre && resultado.datos) {
            usuario = {
              id: identificador,
              telefono: identificador,
              nombre: resultado.datos.n || 'Profesor',
              apellidos: resultado.datos.a || '',
              tipo: 'Profesor'
            };
          }
        }
        
        // Continuar con el procesamiento normal
        if (usuario.tipo) {
          return await procesarUsuarioEscaneado(usuario);
        }
        
      } else if (resultado.error === 'EXPIRED') {
        actualizarAviso("⏰ Código expirado. El usuario debe regenerar su QR.", "error");
        reproducirBeep("error");
        return;
      } else if (resultado.error === 'INVALID_HASH') {
        actualizarAviso("🚫 Código inválido o manipulado.", "error");
        reproducirBeep("error");
        return;
      }
      // Si no es código dinámico válido, continuar con lógica legacy
    }

    // ====== LÓGICA LEGACY ======
    
    // 1️⃣ Detectar formato QR (JSON, key=value, ID numérico)
    if (typeof datos === "string") {
      datos = datos.trim();
      if (datos.startsWith("{") && datos.endsWith("}")) {
        try { datos = JSON.parse(datos); } catch { throw new Error("QR JSON inválido"); }
      } else if (datos.includes("=") && datos.includes(";")) {
        datos = Object.fromEntries(
          datos.split(";").map(p => p.trim()).filter(p => p).map(par => par.split("=").map(x => x.trim()))
        );
      } else if (/^\d+$/.test(datos)) {
        // 🔹 Buscar por número de control o teléfono
        const docAlum = await db.collection("alumnos").doc(datos).get();
        if (docAlum.exists) datos = { ...docAlum.data(), tipo: "Alumno", id: docAlum.id };
        else {
          const docProf = await db.collection("profesores").doc(datos).get();
          if (docProf.exists) datos = { ...docProf.data(), tipo: "Profesor", id: docProf.id };
          else throw new Error("Código no encontrado");
        }
      } else throw new Error("Formato QR no reconocido");
    }

    // 2️⃣ Datos completos desde ID
    if (datos.id && datos.tipo) {
      const colec = datos.tipo === "Alumno" ? "alumnos" : "profesores";
      const snap = await db.collection(colec).doc(datos.id).get();
      if (!snap.exists) throw new Error("Referencia no encontrada");
      datos = { ...snap.data(), tipo: datos.tipo, id: snap.id };
    }

    // 3️⃣ Crear objeto usuario
    usuario = {
      id: datos.id || "",
      nombre: datos.nombre || "Desconocido",
      apellidos: datos.apellidos || "",
      tipo: datos.tipo || (datos.control ? "Alumno" : "Profesor"),
      control: datos.control || "",
      telefono: datos.telefono || datos.whatsapp || "",
      grado: datos.grado || "",
      whatsapp: datos.whatsapp || ""
    };

    await procesarUsuarioEscaneado(usuario);

  } catch (error) {
    console.error("❌ Error procesando QR:", error);
    reproducirBeep("error");
    actualizarAviso(`❌ ${error.message || "Error procesando código"}`, "error");
  }
}

/**
 * Procesa el usuario después de identificarlo
 */
async function procesarUsuarioEscaneado(usuario) {
  // 4️⃣ Evitar doble lectura inmediata
  const codigo = usuario.tipo === "Alumno" ? usuario.control : usuario.telefono;
  if (!codigo) throw new Error("Código vacío o inválido");

  const esEventoTemporalMismoAlumno = window.__eventoTemporal && window.__eventoTemporal.alumno?.control === usuario.control;
  if (!esEventoTemporalMismoAlumno && window.__ultimoCodigo === codigo) return;
  window.__ultimoCodigo = codigo;

  // 5️⃣ Si está activo el modo CBTis (Ingreso o Salida)
  if (window.modoCBTis) {
    console.log("🏫 Modo CBTis activo:", window.modoCBTis);
    await registrarIngresoCBTis(usuario, window.modoCBTis, window.modoEscaneo || "Cámara");
    reproducirBeep("success");
    mostrarUsuario(usuario);
    return;
  }

  // 6️⃣ Registrar historial admin (flujo normal)
  if (typeof agregarHistorialAdmin === 'function') {
    agregarHistorialAdmin({
      nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
      tipo: usuario.tipo
    });
  }

  // 7️⃣ Flujo Profesor (fuera de CBTis)
  if (usuario.tipo === "Profesor") {
    window.profesorRegistrado = usuario;
    if (typeof iniciarSesionClase === 'function') {
      iniciarSesionClase(usuario);
    }
    actualizarAviso(`👨‍🏫 Bienvenido ${usuario.nombre}. Inicia tu clase`, "success");
  }

  // 8️⃣ Flujo Alumno (fuera de CBTis)
  else if (usuario.tipo === "Alumno") {
    if (!window.profesorRegistrado || !window.claseActiva) {
      actualizarAviso("⚠️ Escanea primero QR del profesor", "error");
      return;
    }

    // Evento temporal activo
    if (window.__eventoTemporal) {
      if (!window.__eventoTemporal.alumno) {
        window.__eventoTemporal.alumno = usuario;
        window.__eventoTemporal.inicio = new Date();
        if (window.__eventoTemporal.startCrono) window.__eventoTemporal.startCrono();
        await registrarEventoAlumnoEnSesion(usuario, window.__eventoTemporal.tipoSalida);
        actualizarAviso(`✅ ${usuario.nombre} salió (${window.__eventoTemporal.tipoSalida})`, "success");
        const infoEl = document.getElementById('overlay-temporal-info');
        if (infoEl) infoEl.innerText = 'Escanea tu QR de regreso cuando regreses';
      } else if (window.__eventoTemporal.alumno.control === usuario.control) {
        clearInterval(window.__eventoTemporal.interval);
        await registrarEventoAlumnoEnSesion(usuario, window.__eventoTemporal.tipoRegreso);
        const dur = Math.round((new Date() - window.__eventoTemporal.inicio) / 1000);
        actualizarAviso(`✅ ${usuario.nombre} regresó. Tiempo transcurrido: ${dur}s`, "success");
        const overlayEl = document.getElementById('overlay-temporal');
        if (overlayEl) overlayEl.remove();
        window.__eventoTemporal = null;
      } else {
        actualizarAviso('⚠️ Este QR no coincide con la salida registrada', 'error');
      }
    } else {
      await registrarEventoAlumnoEnSesion(usuario, "entrada");
      if (typeof mostrarMiniAlumno === 'function') {
        mostrarMiniAlumno(`${usuario.nombre} ${usuario.apellidos} (${new Date().toLocaleTimeString()})`);
      }
      actualizarAviso(`Alumnos registrados: ${Object.values(window.claseActiva.alumnos).map(a=>a.nombre).join(", ")}`, "success");
    }
  }

  // 9️⃣ Mostrar usuario y beep final
  mostrarUsuario(usuario);
  reproducirBeep("success");
}

// ========================
// Mostrar usuario (para debug o UI)
// ========================
function mostrarUsuario(usuario) {
  console.log("👤 Datos del usuario:", usuario);
  const infoDiv = document.getElementById("info-usuario");
  if (infoDiv) {
    infoDiv.innerHTML = `
      <div class="usuario-info">
        <strong>${usuario.tipo}</strong><br>
        <span>${usuario.nombre} ${usuario.apellidos}</span><br>
        ${usuario.grado ? `Grado: ${usuario.grado}<br>` : ""}
        ${usuario.whatsapp ? `WhatsApp: ${usuario.whatsapp}` : ""}
      </div>
    `;
  }
}

// =============================
// Registro y actualización
// =============================
async function registrarIngresoAlumno(datos) {
  try {
    const nombreCompleto = `${datos.nombre} ${datos.apellidos || ''}`.trim();
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Prevención de duplicados en registros
    const snapshot = await db.collection('registros')
      .where('alumno','==',nombreCompleto)
      .where('fecha','>=', fechaHoy + 'T00:00:00.000Z')
      .get();
    if (!snapshot.empty) {
      mostrarOverlayTipo('warning', `⚠️ ${nombreCompleto} ya registrado hoy`);
      reproducirBeep('warning');
      return;
    }

    let tipoEvento = 'entrada';
    if (window.__eventoProximo) {
      tipoEvento = window.__eventoProximo;
      window.__eventoProximo = null;
    }

    if (window.claseActiva && window.claseActiva.estado === 'En curso') {
      await (typeof registrarEventoAlumnoEnSesion === 'function' 
        ? registrarEventoAlumnoEnSesion(datos, tipoEvento) 
        : null);
    } else {
      await db.collection('registros').add({
        alumno: nombreCompleto,
        grado: datos.grado || '',
        control: datos.control || '',
        whatsapp: datos.whatsapp || '',
        tipo: 'Alumno',
        fecha: new Date().toISOString(),
        profesor: ''
      });

      mostrarOverlayTipo('success', `🎓 Bienvenido, ${nombreCompleto}`);
      reproducirBeep('success');
      if (typeof actualizarHistorial === 'function') {
        actualizarHistorial(datos, true);
      }
    }
  } catch (e) {
    console.error('registrarIngresoAlumno:', e);
    mostrarOverlayTipo('error', 'Error registrando ingreso');
  }
}

// Export global
window.procesarQR = procesarQR;
window.procesarUsuarioEscaneado = procesarUsuarioEscaneado;
window.mostrarUsuario = mostrarUsuario;
window.registrarIngresoAlumno = registrarIngresoAlumno;
