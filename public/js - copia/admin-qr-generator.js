// ========================================
// 🔐 GENERADOR QR ADMIN
// Para crear códigos de nuevos usuarios
// ========================================

let ultimoUsuarioGenerado = null;
let tipoCodigoGenerado = 'qr'; // 'qr' o 'barcode'

/**
 * Muestra/oculta el panel de generación de QR
 */
function toggleGeneradorQR() {
  const panel = document.getElementById('generador-qr-admin');
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      // Reset al abrir
      limpiarFormularioAdmin();
    }
  }
}

/**
 * Cambia entre tabs de Alumno y Profesor
 */
function cambiarTabQRAdmin(tipo) {
  const tabAlumno = document.getElementById('tab-qr-alumno');
  const tabProfesor = document.getElementById('tab-qr-profesor');
  const formAlumno = document.getElementById('form-qr-alumno');
  const formProfesor = document.getElementById('form-qr-profesor');
  
  if (tipo === 'alumno') {
    tabAlumno.className = 'flex-1 py-3 px-4 bg-primary/20 text-primary rounded-xl font-medium transition-all flex items-center justify-center gap-2';
    tabProfesor.className = 'flex-1 py-3 px-4 bg-surface-light text-text-muted rounded-xl font-medium transition-all flex items-center justify-center gap-2';
    formAlumno.classList.remove('hidden');
    formProfesor.classList.add('hidden');
  } else {
    tabProfesor.className = 'flex-1 py-3 px-4 bg-accent/20 text-accent rounded-xl font-medium transition-all flex items-center justify-center gap-2';
    tabAlumno.className = 'flex-1 py-3 px-4 bg-surface-light text-text-muted rounded-xl font-medium transition-all flex items-center justify-center gap-2';
    formProfesor.classList.remove('hidden');
    formAlumno.classList.add('hidden');
  }
  
  limpiarPreviewAdmin();
}

/**
 * Genera QR o Barcode para un nuevo alumno
 */
async function generarQRAdminAlumno(tipo = 'qr') {
  const nombre = document.getElementById('admin-alumno-nombre')?.value.trim();
  const apellidos = document.getElementById('admin-alumno-apellidos')?.value.trim();
  const grado = document.getElementById('admin-alumno-grado')?.value;
  const grupo = document.getElementById('admin-alumno-grupo')?.value;
  const control = document.getElementById('admin-alumno-control')?.value.trim();
  const whatsapp = document.getElementById('admin-alumno-whatsapp')?.value.trim();
  
  // Validar campos obligatorios
  if (!nombre || !apellidos || !control) {
    mostrarNotificacion('⚠️ Completa nombre, apellidos y número de control', 'warning');
    return;
  }
  
  // Crear objeto usuario
  const usuario = {
    nombre,
    apellidos,
    grado: grado ? `${grado}°${grupo || ''}` : '',
    control,
    whatsapp: whatsapp || '',
    tipo: 'Alumno'
  };
  
  // Guardar en Firebase
  try {
    await db.collection('usuarios').doc(control).set({
      ...usuario,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor: 'admin'
    }, { merge: true });
    
    // También guardar en colección alumnos para compatibilidad
    await db.collection('alumnos').doc(control).set({
      ...usuario,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Usuario guardado en Firebase:', control);
  } catch (e) {
    console.error('Error guardando usuario:', e);
  }
  
  // Generar código
  ultimoUsuarioGenerado = usuario;
  tipoCodigoGenerado = tipo;
  
  if (tipo === 'qr') {
    generarQRPreview(usuario, 'A');
  } else {
    generarBarcodePreview(usuario, 'A');
  }
  
  mostrarNotificacion('✅ Código generado correctamente', 'success');
}

/**
 * Genera QR o Barcode para un nuevo profesor
 */
async function generarQRAdminProfesor(tipo = 'qr') {
  const nombre = document.getElementById('admin-prof-nombre')?.value.trim();
  const apellidos = document.getElementById('admin-prof-apellidos')?.value.trim();
  const materias = document.getElementById('admin-prof-materias')?.value.trim();
  const grupos = document.getElementById('admin-prof-grupos')?.value.trim();
  const telefono = document.getElementById('admin-prof-telefono')?.value.trim();
  
  if (!nombre || !apellidos || !telefono) {
    mostrarNotificacion('⚠️ Completa nombre, apellidos y teléfono', 'warning');
    return;
  }
  
  const usuario = {
    nombre,
    apellidos,
    materias: materias || '',
    grupos: grupos || '',
    telefono,
    tipo: 'Profesor'
  };
  
  // Guardar en Firebase
  try {
    await db.collection('usuarios').doc(telefono).set({
      ...usuario,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor: 'admin'
    }, { merge: true });
    
    await db.collection('profesores').doc(telefono).set({
      ...usuario,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Profesor guardado en Firebase:', telefono);
  } catch (e) {
    console.error('Error guardando profesor:', e);
  }
  
  ultimoUsuarioGenerado = usuario;
  tipoCodigoGenerado = tipo;
  
  if (tipo === 'qr') {
    generarQRPreview(usuario, 'P');
  } else {
    generarBarcodePreview(usuario, 'P');
  }
  
  mostrarNotificacion('✅ Código generado correctamente', 'success');
}

/**
 * Genera QR y lo muestra en el preview
 */
function generarQRPreview(usuario, tipoUsuario) {
  const container = document.getElementById('admin-qr-preview');
  const barcodeEl = document.getElementById('admin-barcode-preview');
  const infoEl = document.getElementById('admin-qr-info');
  const actionsEl = document.getElementById('admin-qr-actions');
  
  if (!container) return;
  
  // Ocultar barcode, mostrar QR
  container.classList.remove('hidden');
  barcodeEl?.classList.add('hidden');
  
  // Limpiar container
  container.innerHTML = '';
  
  // Crear datos del QR (JSON completo para login)
  const identificador = tipoUsuario === 'A' ? usuario.control : usuario.telefono;
  
  const qrData = JSON.stringify({
    tipo: usuario.tipo,
    id: identificador,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    control: usuario.control || '',
    telefono: usuario.telefono || '',
    grado: usuario.grado || '',
    materias: usuario.materias || ''
  });
  
  // Generar QR
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  } catch (e) {
    console.error('Error generando QR:', e);
    container.innerHTML = '<span class="text-red-500">Error generando QR</span>';
  }
  
  // Actualizar info
  if (infoEl) {
    infoEl.innerHTML = `
      <strong class="text-text-main">${usuario.nombre} ${usuario.apellidos}</strong><br>
      <span class="text-text-muted">${usuario.tipo} - ${identificador}</span>
    `;
  }
  
  // Mostrar acciones
  if (actionsEl) actionsEl.classList.remove('hidden');
}

/**
 * Genera código de barras y lo muestra en el preview
 */
function generarBarcodePreview(usuario, tipoUsuario) {
  const container = document.getElementById('admin-qr-preview');
  const barcodeEl = document.getElementById('admin-barcode-preview');
  const infoEl = document.getElementById('admin-qr-info');
  const actionsEl = document.getElementById('admin-qr-actions');
  
  if (!barcodeEl) return;
  
  // Ocultar QR, mostrar barcode
  container?.classList.add('hidden');
  barcodeEl.classList.remove('hidden');
  barcodeEl.innerHTML = '';
  
  // Código simple: solo el identificador (número de control o teléfono)
  const identificador = tipoUsuario === 'A' ? usuario.control : usuario.telefono;
  
  try {
    if (typeof JsBarcode !== 'undefined') {
      JsBarcode(barcodeEl, identificador, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000'
      });
    }
  } catch (e) {
    console.error('Error generando barcode:', e);
  }
  
  if (infoEl) {
    infoEl.innerHTML = `
      <strong class="text-text-main">${usuario.nombre} ${usuario.apellidos}</strong><br>
      <span class="text-text-muted">${usuario.tipo} - ${identificador}</span>
    `;
  }
  
  if (actionsEl) actionsEl.classList.remove('hidden');
}

/**
 * Descarga el código generado como imagen
 */
function descargarQRAdmin() {
  if (!ultimoUsuarioGenerado) {
    mostrarNotificacion('⚠️ Genera un código primero', 'warning');
    return;
  }
  
  const usuario = ultimoUsuarioGenerado;
  const identificador = usuario.tipo === 'Alumno' ? usuario.control : usuario.telefono;
  
  if (tipoCodigoGenerado === 'qr') {
    // Descargar QR
    const canvas = document.querySelector('#admin-qr-preview canvas');
    if (!canvas) {
      mostrarNotificacion('⚠️ No se encontró el QR', 'error');
      return;
    }
    
    // Crear imagen con datos adicionales
    const img = document.createElement('canvas');
    const ctx = img.getContext('2d');
    img.width = 300;
    img.height = 400;
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, img.width, img.height);
    
    // Header
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KEYON ACCESS', 150, 28);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('CBTis 001 - Fresnillo', 150, 45);
    
    // Tipo de usuario
    ctx.fillStyle = usuario.tipo === 'Alumno' ? '#3b82f6' : '#8b5cf6';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(usuario.tipo.toUpperCase(), 150, 65);
    
    // QR
    ctx.drawImage(canvas, 50, 75, 200, 200);
    
    // Datos del usuario
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${usuario.nombre} ${usuario.apellidos}`, 150, 300);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    if (usuario.tipo === 'Alumno') {
      ctx.fillText(`Control: ${usuario.control}`, 150, 320);
      if (usuario.grado) ctx.fillText(`Grado: ${usuario.grado}`, 150, 340);
    } else {
      ctx.fillText(`Tel: ${usuario.telefono}`, 150, 320);
      if (usuario.materias) ctx.fillText(`${usuario.materias}`, 150, 340);
    }
    
    // Footer
    ctx.fillStyle = '#999';
    ctx.font = '9px Arial';
    ctx.fillText('Escanea este código para ingresar al sistema', 150, 380);
    
    // Descargar
    const link = document.createElement('a');
    link.download = `QR_${usuario.tipo}_${usuario.nombre}_${identificador}.png`;
    link.href = img.toDataURL('image/png');
    link.click();
    
  } else {
    // Descargar Barcode como SVG
    const svg = document.getElementById('admin-barcode-preview');
    if (!svg) {
      mostrarNotificacion('⚠️ No se encontró el código de barras', 'error');
      return;
    }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.download = `Barcode_${usuario.tipo}_${usuario.nombre}_${identificador}.svg`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  mostrarNotificacion('📥 Código descargado', 'success');
}

/**
 * Abre ventana de impresión
 */
function imprimirQRAdmin() {
  if (!ultimoUsuarioGenerado) {
    mostrarNotificacion('⚠️ Genera un código primero', 'warning');
    return;
  }
  
  const usuario = ultimoUsuarioGenerado;
  const identificador = usuario.tipo === 'Alumno' ? usuario.control : usuario.telefono;
  
  let contenido = '';
  
  if (tipoCodigoGenerado === 'qr') {
    const canvas = document.querySelector('#admin-qr-preview canvas');
    if (canvas) {
      contenido = `<img src="${canvas.toDataURL('image/png')}" style="width: 200px; height: 200px;">`;
    }
  } else {
    const svg = document.getElementById('admin-barcode-preview');
    if (svg) {
      contenido = svg.outerHTML;
    }
  }
  
  const ventana = window.open('', '_blank', 'width=400,height=500');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Imprimir Código - ${usuario.nombre}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 20px;
        }
        h1 { font-size: 18px; margin-bottom: 5px; }
        h2 { font-size: 14px; color: #666; margin-bottom: 15px; }
        .tipo { 
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 15px;
          background: ${usuario.tipo === 'Alumno' ? '#dbeafe' : '#ede9fe'};
          color: ${usuario.tipo === 'Alumno' ? '#1d4ed8' : '#7c3aed'};
        }
        .datos { margin-top: 15px; font-size: 14px; }
        .datos strong { display: block; font-size: 16px; margin-bottom: 5px; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <h1>KEYON ACCESS</h1>
      <h2>CBTis 001 - Fresnillo</h2>
      <div class="tipo">${usuario.tipo.toUpperCase()}</div>
      <div>${contenido}</div>
      <div class="datos">
        <strong>${usuario.nombre} ${usuario.apellidos}</strong>
        ${usuario.tipo === 'Alumno' 
          ? `Control: ${usuario.control}${usuario.grado ? '<br>Grado: ' + usuario.grado : ''}`
          : `Tel: ${usuario.telefono}${usuario.materias ? '<br>' + usuario.materias : ''}`
        }
      </div>
      <div class="footer">Escanea este código para ingresar al sistema</div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  ventana.document.close();
}

/**
 * Limpia el formulario
 */
function limpiarFormularioAdmin() {
  // Limpiar inputs alumno
  ['admin-alumno-nombre', 'admin-alumno-apellidos', 'admin-alumno-control', 'admin-alumno-whatsapp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['admin-alumno-grado', 'admin-alumno-grupo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  
  // Limpiar inputs profesor
  ['admin-prof-nombre', 'admin-prof-apellidos', 'admin-prof-materias', 'admin-prof-grupos', 'admin-prof-telefono'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  limpiarPreviewAdmin();
}

/**
 * Limpia el preview
 */
function limpiarPreviewAdmin() {
  ultimoUsuarioGenerado = null;
  
  const qrPreview = document.getElementById('admin-qr-preview');
  const barcodePreview = document.getElementById('admin-barcode-preview');
  const infoEl = document.getElementById('admin-qr-info');
  const actionsEl = document.getElementById('admin-qr-actions');
  
  if (qrPreview) {
    qrPreview.classList.remove('hidden');
    qrPreview.innerHTML = `
      <div class="text-center text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
        <span class="text-sm">El código aparecerá aquí</span>
      </div>
    `;
  }
  
  if (barcodePreview) {
    barcodePreview.classList.add('hidden');
    barcodePreview.innerHTML = '';
  }
  
  if (infoEl) infoEl.textContent = 'Completa los datos y genera el código';
  if (actionsEl) actionsEl.classList.add('hidden');
}

// ========================
// EXPORTS
// ========================
window.toggleGeneradorQR = toggleGeneradorQR;
window.cambiarTabQRAdmin = cambiarTabQRAdmin;
window.generarQRAdminAlumno = generarQRAdminAlumno;
window.generarQRAdminProfesor = generarQRAdminProfesor;
window.descargarQRAdmin = descargarQRAdmin;
window.imprimirQRAdmin = imprimirQRAdmin;
window.limpiarFormularioAdmin = limpiarFormularioAdmin;

console.log('📱 Generador QR Admin cargado');
