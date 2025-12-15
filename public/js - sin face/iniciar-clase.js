// ===================================
// iniciar-clase.js / overlay integrado
// Firebase v8 compat, Firestore
// ADAPTADO A NUEVA UI TAILWIND
// ===================================

window.claseActiva = window.claseActiva || null; 
window.profesorRegistrado = window.profesorRegistrado || null;

// Guardar y cargar sesión local
function _saveClaseLocal() {
  try { localStorage.setItem('claseActiva', JSON.stringify(window.claseActiva)); } catch(e){}
}
function _loadClaseLocal() {
  try {
    const s = localStorage.getItem('claseActiva');
    if (s) window.claseActiva = JSON.parse(s);
  } catch(e){}
}
_loadClaseLocal();

// --------------------
// Iniciar sesión de clase (V3 con memoria inteligente)
// ADAPTADO A NUEVA UI
// --------------------
async function iniciarSesionClase(profesorObj) {
  try {
    _loadClaseLocal();

    if (window.claseActiva && window.claseActiva.estado === 'En curso') {
      if (
        window.claseActiva.profesor &&
        (window.claseActiva.profesor.control === profesorObj.control ||
         window.claseActiva.profesor.telefono === profesorObj.telefono)
      ) {
        actualizarAviso('🔁 Ya tienes una clase en curso', 'info');
        abrirOverlayClaseFlotante(window.claseActiva);
        actualizarIndicadorClase();
        return;
      }
      actualizarAviso('⚠️ Hay otra clase en curso. Finalízala antes o limpia.', 'warning');
      return;
    }

    // ---------- Obtener datos previos del profesor ----------
    let datosPrevios = {};
    try {
      const horarioRef = db.collection('profesores').doc(profesorObj.control || profesorObj.telefono);
      const docSnap = await horarioRef.get();
      if (docSnap.exists) {
        datosPrevios = docSnap.data();
      }
    } catch (e) {
      console.warn('No se pudo cargar horario previo:', e);
    }

    // ---------- Crear overlay con NUEVA UI ----------
    const overlay = document.createElement('div');
    overlay.className = 'overlay-clase-v3';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(10, 15, 26, 0.95);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
      <div class="glass-modal" style="
        width: 90%;
        max-width: 480px;
        background: rgba(17, 24, 39, 0.95);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.4s ease;
      ">
        <h2 style="
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <span style="font-size: 1.8rem;">📘</span>
          Iniciar Clase
        </h2>

        <div style="display: grid; gap: 16px;">
          <div>
            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Turno</label>
            <select id="turno" style="
              width: 100%;
              padding: 12px 16px;
              background: rgba(30, 41, 59, 0.8);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 12px;
              color: #f1f5f9;
              font-size: 1rem;
              outline: none;
              cursor: pointer;
              transition: all 0.2s;
            ">
              <option value="">Seleccionar turno</option>
              <option value="Matutino">Matutino</option>
              <option value="Vespertino">Vespertino</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Grado</label>
              <select id="grado" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: #f1f5f9;
                font-size: 1rem;
                outline: none;
                cursor: pointer;
              ">
                <option value="">Grado</option>
                <option value="1">1°</option>
                <option value="3">3°</option>
                <option value="5">5°</option>
              </select>
            </div>

            <div>
              <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Grupo</label>
              <select id="grupo" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: #f1f5f9;
                font-size: 1rem;
                outline: none;
                cursor: pointer;
              ">
                <option value="">Grupo</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Aula</label>
            <input type="text" id="aula" placeholder="Ej. A-15" style="
              width: 100%;
              padding: 12px 16px;
              background: rgba(30, 41, 59, 0.8);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 12px;
              color: #f1f5f9;
              font-size: 1rem;
              outline: none;
              box-sizing: border-box;
            ">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Hora inicio</label>
              <input type="time" id="horaInicio" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: #f1f5f9;
                font-size: 1rem;
                outline: none;
                box-sizing: border-box;
              ">
            </div>

            <div>
              <label style="display: block; color: #94a3b8; font-size: 0.875rem; margin-bottom: 8px;">Hora salida</label>
              <input type="time" id="horaSalida" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: #f1f5f9;
                font-size: 1rem;
                outline: none;
                box-sizing: border-box;
              ">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="cancelarClase" style="
            flex: 1;
            padding: 14px 24px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            color: #fca5a5;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            ❌ Cancelar
          </button>
          <button id="confirmarClase" style="
            flex: 1;
            padding: 14px 24px;
            background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
          ">
            ✅ Confirmar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Agregar animaciones
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    overlay.appendChild(style);

    // ---------- Listas (desde módulo horarios.js) ----------
    const gruposMatutino = window.GRUPOS_MATUTINO || ["A", "K", "C", "E", "F", "G"];
    const gruposVespertino = window.GRUPOS_VESPERTINO || ["D", "I", "H", "L", "M", "P"];

    const turnoSel = overlay.querySelector('#turno');
    const gradoSel = overlay.querySelector('#grado');
    const grupoSel = overlay.querySelector('#grupo');
    const aulaInput = overlay.querySelector('#aula');
    const horaInicioInput = overlay.querySelector('#horaInicio');
    const horaSalidaInput = overlay.querySelector('#horaSalida');

    // ---------- Prellenar con datos previos ----------
    if (datosPrevios.ultimoTurno) turnoSel.value = datosPrevios.ultimoTurno;
    if (datosPrevios.ultimoGrado) gradoSel.value = datosPrevios.ultimoGrado;

    const grupos = (datosPrevios.ultimoTurno === "Matutino") ? gruposMatutino : gruposVespertino;
    grupos.forEach(g => {
      const op = document.createElement('option');
      op.value = g;
      op.textContent = g;
      grupoSel.appendChild(op);
    });

    if (datosPrevios.ultimoGrupo) grupoSel.value = datosPrevios.ultimoGrupo;
    if (datosPrevios.ultimoAula) aulaInput.value = datosPrevios.ultimoAula;

    // ---------- Horarios automáticos ----------
    const ahora = new Date();
    horaInicioInput.value = ahora.toTimeString().slice(0, 5);
    const salida = new Date(ahora.getTime() + 50 * 60000);
    horaSalidaInput.value = salida.toTimeString().slice(0, 5);

    if (datosPrevios.ultimoHorario) {
      const [inicioPrev, finPrev] = datosPrevios.ultimoHorario.split('-');
      horaInicioInput.value = inicioPrev || horaInicioInput.value;
      horaSalidaInput.value = finPrev || horaSalidaInput.value;
    }

    // ---------- Cambiar grupos según turno ----------
    turnoSel.addEventListener('change', () => {
      grupoSel.innerHTML = `<option value="">Grupo</option>`;
      const grupos = turnoSel.value === 'Matutino' ? gruposMatutino : gruposVespertino;
      grupos.forEach(g => {
        const op = document.createElement('option');
        op.value = g;
        op.textContent = g;
        grupoSel.appendChild(op);
      });
    });

    // ---------- Hover effects ----------
    const confirmarBtn = overlay.querySelector('#confirmarClase');
    const cancelarBtn = overlay.querySelector('#cancelarClase');
    
    confirmarBtn.onmouseover = () => confirmarBtn.style.transform = 'translateY(-2px)';
    confirmarBtn.onmouseout = () => confirmarBtn.style.transform = 'translateY(0)';
    cancelarBtn.onmouseover = () => cancelarBtn.style.background = 'rgba(239, 68, 68, 0.3)';
    cancelarBtn.onmouseout = () => cancelarBtn.style.background = 'rgba(239, 68, 68, 0.2)';

    // ---------- Botones ----------
    cancelarBtn.onclick = () => overlay.remove();

    confirmarBtn.onclick = async () => {
      const turno = turnoSel.value;
      const grado = gradoSel.value;
      const grupo = grupoSel.value;
      const aula = aulaInput.value || 'Aula no especificada';
      const horaInicio = horaInicioInput.value;
      const horaSalida = horaSalidaInput.value;

      if (!turno || !grado || !grupo) {
        actualizarAviso('⚠️ Completa todos los campos', 'warning');
        return;
      }

      const id = `CLASE-${Date.now()}`;
      const inicio = new Date().toISOString();
      
      // Obtener información del módulo actual si está disponible
      let moduloInfo = null;
      if (typeof obtenerModuloActual === 'function') {
        moduloInfo = obtenerModuloActual(turno);
      }

      // Obtener información del grupo si está disponible
      let grupoInfo = null;
      if (typeof obtenerInfoGrupo === 'function') {
        grupoInfo = obtenerInfoGrupo(parseInt(grado), grupo);
      }

      window.claseActiva = {
        id,
        profesor: {
          nombre: profesorObj.nombre || '',
          apellidos: profesorObj.apellidos || '',
          control: profesorObj.control || '',
          telefono: profesorObj.telefono || ''
        },
        profesorId: profesorObj.control || profesorObj.telefono || profesorObj.id,
        turno,
        grado,
        grupo,
        grupoId: grupoInfo?.id || `${grado}${grupo}`,
        aula,
        horario: `${horaInicio}-${horaSalida}`,
        horaInicio,
        horaFin: horaSalida,
        modulo: moduloInfo?.modulo || null,
        inicio,
        fechaInicio: inicio,
        estado: 'En curso',
        alumnos: {},
        cicloEscolar: window.CONFIG_HORARIOS?.cicloEscolar || '2025-2026-1'
      };

      await db.collection('sesiones').doc(id).set(window.claseActiva);

      const horarioRef = db.collection('profesores').doc(profesorObj.control || profesorObj.telefono);
      await horarioRef.set({
        nombre: profesorObj.nombre,
        apellidos: profesorObj.apellidos,
        ultimoHorario: `${horaInicio}-${horaSalida}`,
        ultimoTurno: turno,
        ultimoGrado: grado,
        ultimoGrupo: grupo,
        ultimoAula: aula,
        ultimaSesion: id,
        actualizado: new Date().toISOString()
      }, { merge: true });

      _saveClaseLocal();
      abrirOverlayClaseFlotante(window.claseActiva);
      if (typeof agregarHistorialAdmin === 'function') {
        agregarHistorialAdmin({ nombreCompleto: `${profesorObj.nombre} ${profesorObj.apellidos}`, tipo: 'Profesor' });
      }
      actualizarAviso(`✅ Clase iniciada: ${grado}°${grupo} (${turno}) — ${horaInicio}-${horaSalida}`, 'success');
      actualizarIndicadorClase();
      if (typeof reproducirBeep === 'function') reproducirBeep('success');
      overlay.remove();
    };

  } catch (err) {
    console.error('iniciarSesionClase V3 (memoria):', err);
    actualizarAviso('❌ Error iniciando sesión', 'error');
  }
}


// --------------------
// Registrar evento alumno
// --------------------
async function registrarEventoAlumnoEnSesion(alumnoObj, tipoEvento = 'entrada') {
  try {
    _loadClaseLocal();
    if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
      mostrarOverlayTipo('error', 'No hay clase activa. Escanea el QR del profesor primero.');
      reproducirBeep('error');
      return;
    }

    const key = alumnoObj.control || alumnoObj.telefono || (alumnoObj.nombre + '_' + (alumnoObj.apellidos || ''));
    if (!window.claseActiva.alumnos[key]) {
      window.claseActiva.alumnos[key] = {
        nombre: `${alumnoObj.nombre} ${alumnoObj.apellidos || ''}`.trim(),
        control: alumnoObj.control || '',
        eventos: []
      };
    }

    const ts = new Date().toISOString();
    window.claseActiva.alumnos[key].eventos.push({ tipo: tipoEvento, ts });

    if (tipoEvento.includes('salida') && window.__eventoTemporal && window.__eventoTemporal.alumno?.control === alumnoObj.control) {
      window.__eventoTemporal.inicio = ts;
      const info = document.getElementById('overlay-temporal-info');
      if (info) info.innerText = `⏳ Tiempo transcurriendo...`;

      const btn = document.querySelector('#overlay-temporal button');
      if (btn) btn.style.display = 'inline-block';
    }

    await db.collection('sesiones').doc(window.claseActiva.id).set({
      alumnos: window.claseActiva.alumnos,
      actualizacion: new Date().toISOString()
    }, { merge: true });

    await db.collection('registros').add({
      tipo: 'Alumno',
      nombreCompleto: `${alumnoObj.nombre} ${alumnoObj.apellidos || ''}`.trim(),
      control: alumnoObj.control || '',
      fecha: ts,
      profesor: `${window.claseActiva.profesor.nombre} ${window.claseActiva.profesor.apellidos}`,
      sesionId: window.claseActiva.id,
      evento: tipoEvento
    });

    // 🔔 ENVIAR NOTIFICACIÓN AL ALUMNO (solo en entrada)
    if (tipoEvento === 'entrada' && alumnoObj.control) {
      try {
        if (typeof enviarNotificacionAUsuario === 'function') {
          const materia = window.claseActiva.materia || 'clase';
          await enviarNotificacionAUsuario(alumnoObj.control, {
            title: '✅ Asistencia registrada',
            body: `Tu entrada a ${materia} fue registrada a las ${new Date(ts).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}`,
            tipo: 'asistencia',
            data: { sesionId: window.claseActiva.id, evento: tipoEvento }
          });
        }
      } catch (notifError) {
        console.warn('No se pudo enviar notificación de asistencia:', notifError);
      }
    }

    if (typeof mostrarMiniAlumno === 'function') mostrarMiniAlumno(`${alumnoObj.nombre} — ${tipoEvento} — ${new Date(ts).toLocaleTimeString()}`);
    actualizarAviso(`✅ ${alumnoObj.nombre} — ${tipoEvento}`, 'success');
    reproducirBeep('success');

    _saveClaseLocal();

    const lista = document.getElementById('overlay-clase-lista');
    if (lista) renderListaOverlayClase();
  } catch(err) {
    console.error('registrarEventoAlumnoEnSesion:', err);
    actualizarAviso('❌ Error registrando alumno', 'error');
    reproducirBeep('error');
  }
}


function generarExcelSesion(sesion) {
  try {
    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body{font-family:Arial,Helvetica,sans-serif; padding:20px;}
          h2{color:#264653;}
          h3{background:#e9ecef;padding:10px;border-radius:6px;}
          table{border-collapse:collapse;width:100%;margin-top:15px;font-size:14px;}
          th{background:#06b6d4;color:white;padding:10px;border:1px solid #0891b2;text-align:left;}
          td{border:1px solid #999;padding:8px;vertical-align:top;}
          .control-cell{mso-number-format:'\\@';font-weight:bold;}
        </style>
      </head>
      <body>
      <h2>Reporte de Sesión — ${sesion.id}</h2>
      <table>
        <tr><th>Profesor</th><td>${sesion.profesor.nombre} ${sesion.profesor.apellidos}</td></tr>
        <tr><th>Aula</th><td>${sesion.aula}</td></tr>
        <tr><th>Horario</th><td>${sesion.horario}</td></tr>
        <tr><th>Inicio</th><td>${new Date(sesion.inicio).toLocaleString()}</td></tr>
        <tr><th>Fin</th><td>${sesion.fin ? new Date(sesion.fin).toLocaleString() : 'En curso'}</td></tr>
      </table>
      <h3>Listado de alumnos</h3>
      <table>
        <thead>
          <tr>
            <th style="width:30%">Nombre</th>
            <th style="width:20%">No. Control</th>
            <th style="width:50%">Eventos (Tipo / Hora)</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.values(sesion.alumnos || {}).forEach(a => {
      const eventos = (a.eventos || [])
        .map(ev => `• <b>${ev.tipo}</b> — ${new Date(ev.ts).toLocaleTimeString()}`)
        .join('<br>');
      html += `<tr><td>${a.nombre}</td><td class="control-cell">${a.control || ''}</td><td>${eventos}</td></tr>`;
    });

    html += `</tbody></table><h3>Detalle por alumno</h3>`;

    Object.values(sesion.alumnos || {}).forEach(a => {
      html += `<h4>${a.nombre} ${a.control ? `(<span style="mso-number-format:'\\@';">${a.control}</span>)` : ''}</h4>
        <table><thead><tr><th style="width:30%">Tipo</th><th style="width:30%">Fecha</th><th style="width:40%">Hora</th></tr></thead><tbody>`;
      (a.eventos || []).forEach(ev => {
        const fechaObj = new Date(ev.ts);
        html += `<tr><td>${ev.tipo}</td><td>${fechaObj.toLocaleDateString()}</td><td>${fechaObj.toLocaleTimeString()}</td></tr>`;
      });
      html += `</tbody></table><br>`;
    });

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const fecha = new Date();
    const fechaStr = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}_${fecha.getHours()}-${fecha.getMinutes()}`;
    a.download = `Sesion_${sesion.id}_${fechaStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('generarExcelSesion:', err);
  }
}


// --------------------
// Finalizar sesión clase
// --------------------
async function finalizarSesionClase(motivo='') {
  try {
    _loadClaseLocal();
    if (!window.claseActiva) { mostrarOverlayTipo('error','No hay sesión activa'); return; }

    const id = window.claseActiva.id;
    window.claseActiva.fin = new Date().toISOString();
    window.claseActiva.estado = motivo ? `Finalizada (${motivo})` : 'Finalizada';
    window.claseActiva.motivoFinalizacion = motivo || '';

    await db.collection('sesiones').doc(id).set(window.claseActiva, { merge:true });
    generarExcelSesion(window.claseActiva);

    window.claseActiva = null;
    localStorage.removeItem('claseActiva');
    document.getElementById('overlay-clase')?.remove();
    document.getElementById('overlay-temporal')?.remove();
    actualizarAviso('✅ Clase finalizada y guardada', 'success');
    actualizarIndicadorClase();
    reproducirBeep('success');
  } catch(err) {
    console.error('finalizarSesionClase:', err);
    actualizarAviso('❌ Error finalizando sesión','error');
  }
}


// --------------------
// Overlay flotante principal ARRASTRABLE - NUEVA UI
// --------------------
function abrirOverlayClaseFlotante(sesion) {
  if (!sesion) return;

  let el = document.getElementById('overlay-clase');
  if (!el) {
    el = document.createElement('div');
    el.id = 'overlay-clase';
    el.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      width: 320px;
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 20px;
      padding: 20px;
      z-index: 9999;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1);
      font-family: 'Plus Jakarta Sans', sans-serif;
      cursor: grab;
      transition: box-shadow 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    `;

    el.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
          <span style="font-weight: 700; color: #f1f5f9; font-size: 1rem;">Clase en curso</span>
        </div>
        <button id="overlay-clase-minimize" style="
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        ">—</button>
      </div>
      
      <div id="overlay-clase-body">
        <div style="
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        ">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 1.2rem;">🏫</span>
            <span id="overlay-clase-meta" style="color: #06b6d4; font-weight: 600;">${sesion.aula} — ${sesion.horario}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">👨‍🏫</span>
            <span style="color: #94a3b8; font-size: 0.875rem;">${sesion.profesor.nombre} ${sesion.profesor.apellidos}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
            <span style="font-size: 1.2rem;">📚</span>
            <span style="color: #94a3b8; font-size: 0.875rem;">${sesion.grado}° ${sesion.grupo} — ${sesion.turno}</span>
          </div>
        </div>
        
        <div id="overlay-clase-acciones" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <button id="overlay-accion-bano" class="overlay-btn" style="
            padding: 10px 12px;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 10px;
            color: #6ee7b7;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">🚻 Baño</button>
          <button id="overlay-accion-emergencia" class="overlay-btn" style="
            padding: 10px 12px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 10px;
            color: #fcd34d;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">⚠️ Emergencia</button>
          <button id="overlay-accion-salida" class="overlay-btn" style="
            padding: 10px 12px;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 10px;
            color: #c4b5fd;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">🏁 Salida</button>
          <button id="overlay-accion-finalizar" class="overlay-btn" style="
            padding: 10px 12px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 10px;
            color: #fca5a5;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">✅ Finalizar</button>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Alumnos registrados</span>
            <span id="overlay-clase-count" style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">0</span>
          </div>
          <div id="overlay-clase-lista" style="max-height: 200px; overflow-y: auto;"></div>
        </div>
      </div>
    `;
    
    // Agregar animación de pulse
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.1); }
      }
    `;
    el.appendChild(style);
    
    document.body.appendChild(el);
    
    // Animación de entrada
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1) translateY(0)';
    }, 10);

    // ==========================================================
    // Lógica de Arrastre
    // ==========================================================
    let isDragging = false;
    let offsetX, offsetY;

    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
        isDragging = true;
        el.style.cursor = 'grabbing';
        el.style.boxShadow = '0 25px 50px rgba(0,0,0,0.7), 0 0 40px rgba(6, 182, 212, 0.2)';
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        el.style.transition = 'box-shadow 0.3s ease';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = (e.clientX - offsetX) + 'px';
      el.style.top = (e.clientY - offsetY) + 'px';
      el.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        el.style.cursor = 'grab';
        el.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1)';
      }
    });

    // ==========================================================
    // Botón minimizar
    // ==========================================================
    const minimizeBtn = el.querySelector('#overlay-clase-minimize');
    const body = el.querySelector('#overlay-clase-body');
    let isMinimized = false;
    
    minimizeBtn.onclick = () => {
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'block';
      minimizeBtn.textContent = isMinimized ? '+' : '—';
      el.style.width = isMinimized ? '200px' : '320px';
    };

    // ==========================================================
    // Hover en botones
    // ==========================================================
    el.querySelectorAll('.overlay-btn').forEach(btn => {
      btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
      btn.onmouseout = () => btn.style.transform = 'translateY(0)';
    });

    // ==========================================================
    // Listeners de acciones
    // ==========================================================
    document.getElementById('overlay-accion-bano').addEventListener('click', () => {
      if (!window.claseActiva) return;
      abrirOverlayTemporalAuto('baño-salida', 'baño-regreso');
    });

    document.getElementById('overlay-accion-emergencia').addEventListener('click', () => {
      if (!window.claseActiva) return;
      abrirOverlayTemporalAuto('emergencia-salida', 'emergencia-regreso');
    });

    document.getElementById('overlay-accion-salida').addEventListener('click', () => {
      const alumno = prompt('Nombre del alumno:');
      if (alumno) {
        registrarEventoAlumnoEnSesion({nombre: alumno, control: prompt('Control del alumno:')}, 'salida');
      }
    });

    document.getElementById('overlay-accion-finalizar').addEventListener('click', async () => {
      const motivo = prompt('Motivo de finalización (opcional):') || '';
      await finalizarSesionClase(motivo);
    });
  }

  renderListaOverlayClase();
}


// --------------------
// Overlay temporal (Baño/Emergencia) - NUEVA UI
// --------------------
function abrirOverlayTemporalAuto(tipoSalida, tipoRegreso) {
  if (!window.claseActiva || !window.claseActiva.alumnos) {
    actualizarAviso("⚠️ No hay clase activa", "error");
    return;
  }

  const prev = document.getElementById('overlay-temporal');
  if (prev) prev.remove();

  const nombreAlumno = window.__eventoTemporal?.alumno?.nombre || '';
  const esBano = tipoSalida.includes('baño');

  const ov = document.createElement('div');
  ov.id = 'overlay-temporal';
  ov.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: 300px;
    padding: 24px;
    background: rgba(17, 24, 39, 0.95);
    backdrop-filter: blur(20px);
    border: 2px solid ${esBano ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'};
    border-radius: 20px;
    z-index: 10000;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    font-family: 'Plus Jakarta Sans', sans-serif;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  `;

  ov.innerHTML = `
    <div style="
      width: 60px;
      height: 60px;
      background: ${esBano ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 1.8rem;
    ">${esBano ? '🚻' : '⚠️'}</div>
    <h4 style="color: ${esBano ? '#6ee7b7' : '#fcd34d'}; font-size: 1.2rem; margin-bottom: 8px;">
      ${esBano ? 'Salida al Baño' : 'Emergencia'}
    </h4>
    <p id="overlay-temporal-info" style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 16px;">
      ${nombreAlumno ? `Alumno: ${nombreAlumno}<br>` : ''}
      Escanea tu QR para registrar salida
    </p>
    <div id="overlay-temporal-cronometro" style="
      font-weight: 700;
      font-size: 2rem;
      color: #f1f5f9;
      font-family: 'Space Grotesk', monospace;
      background: rgba(0,0,0,0.3);
      padding: 12px 24px;
      border-radius: 12px;
      margin-bottom: 16px;
    ">00:00:00</div>
    <button id="overlay-temporal-cerrar" style="
      padding: 10px 24px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      color: #fca5a5;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    ">Cerrar</button>
  `;
  document.body.appendChild(ov);

  // Animación de entrada
  setTimeout(() => {
    ov.style.opacity = '1';
    ov.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);

  // Botón cerrar
  ov.querySelector('#overlay-temporal-cerrar').onclick = () => ov.remove();

  // ==========================================================
  // Lógica de Arrastre
  // ==========================================================
  let isDragging = false;
  let offsetX, offsetY;

  ov.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      isDragging = true;
      ov.style.cursor = 'grabbing';
      ov.style.boxShadow = '0 25px 50px rgba(0,0,0,0.8)';
      offsetX = e.clientX - ov.getBoundingClientRect().left;
      offsetY = e.clientY - ov.getBoundingClientRect().top;
      ov.style.transition = 'none';
      ov.style.transform = 'none';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    ov.style.left = (e.clientX - offsetX) + 'px';
    ov.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      ov.style.cursor = 'grab';
      ov.style.transition = 'box-shadow 0.3s ease';
      ov.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
    }
  });

  // Inicializar evento temporal
  window.__eventoTemporal = window.__eventoTemporal || {
    tipoSalida,
    tipoRegreso,
    alumno: null,
    inicio: null,
    interval: null
  };

  window.__eventoTemporal.startCrono = function() {
    const cronometro = document.getElementById('overlay-temporal-cronometro');
    this.interval = setInterval(() => {
      if (!this.inicio) return;
      const diff = new Date() - new Date(this.inicio);
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      cronometro.innerText = `${h}:${m}:${s}`;
    }, 1000);
  };
}


// --------------------
// Indicador de clase - NUEVA UI
// --------------------
function actualizarIndicadorClase() {
  let el = document.getElementById('indicador-clase');
  
  if (!window.claseActiva || window.claseActiva.estado !== 'En curso') {
    if (el) el.remove();
    return;
  }
  
  if (!el) {
    el = document.createElement('div');
    el.id = 'indicador-clase';
    el.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 9998;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    el.onmouseover = () => el.style.transform = 'scale(1.05)';
    el.onmouseout = () => el.style.transform = 'scale(1)';
    el.onclick = () => abrirOverlayClaseFlotante(window.claseActiva);
    
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <div style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
    <span style="color: #f1f5f9; font-weight: 600; font-size: 0.875rem;">Clase activa</span>
    <span style="color: #06b6d4; font-size: 0.75rem;">${window.claseActiva.grado}°${window.claseActiva.grupo}</span>
  `;
  
  // Agregar animación
  if (!document.getElementById('indicador-clase-style')) {
    const style = document.createElement('style');
    style.id = 'indicador-clase-style';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      }
    `;
    document.head.appendChild(style);
  }
}


// --------------------
// Lista overlay - NUEVA UI
// --------------------
function renderListaOverlayClase() {
  const lista = document.getElementById('overlay-clase-lista');
  const countEl = document.getElementById('overlay-clase-count');
  if (!lista || !window.claseActiva) return;
  
  const alumnos = window.claseActiva.alumnos || {};
  const alumnosArr = Object.values(alumnos);
  
  if (countEl) countEl.textContent = alumnosArr.length;
  
  if (alumnosArr.length === 0) {
    lista.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #64748b;">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📋</span>
        <span style="font-size: 0.8rem;">No hay alumnos registrados</span>
      </div>
    `;
    return;
  }
  
  let html = '';
  alumnosArr.forEach(a => {
    const ultimoEvento = (a.eventos && a.eventos.length > 0) 
      ? a.eventos[a.eventos.length - 1] 
      : null;
    const eventoText = ultimoEvento 
      ? `${ultimoEvento.tipo} — ${new Date(ultimoEvento.ts).toLocaleTimeString()}`
      : 'Sin eventos';
    
    html += `
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 10px;
        margin-bottom: 8px;
        border: 1px solid rgba(255,255,255,0.05);
      ">
        <div style="
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #06b6d4, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
        ">${(a.nombre || 'A')[0].toUpperCase()}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="color: #f1f5f9; font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${a.nombre}
          </div>
          <div style="color: #64748b; font-size: 0.7rem;">
            ${eventoText}
          </div>
        </div>
      </div>
    `;
  });
  
  lista.innerHTML = html;
}


// --------------------
// Exports globales
// --------------------
window.iniciarSesionClase = iniciarSesionClase;
window.registrarEventoAlumnoEnSesion = registrarEventoAlumnoEnSesion;
window.finalizarSesionClase = finalizarSesionClase;
window.abrirOverlayClaseFlotante = abrirOverlayClaseFlotante;
window.abrirOverlayTemporalAuto = abrirOverlayTemporalAuto;
window.renderListaOverlayClase = renderListaOverlayClase;
window.actualizarIndicadorClase = actualizarIndicadorClase;
