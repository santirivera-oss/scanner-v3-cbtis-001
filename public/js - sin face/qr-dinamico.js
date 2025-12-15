// ========================================
// 🔐 QR DINÁMICO CON ROTACIÓN TEMPORAL v2.1
// Keyon Access System v2.0
// Sistema anti-trampas optimizado para lectores
// ========================================

// ========================
// 🔹 CONFIGURACIÓN
// ========================
const CONFIG_QR_DINAMICO = {
  tiempoValidez: 30,           // Segundos de validez
  tolerancia: 5,               // Segundos extra de tolerancia
  claveSecreta: 'KEYON_CBTIS001_2025',
  intervaloActualizacion: 1000,
  modoSeguro: true             // true = validar tiempo y hash
};

// Variables globales
let intervaloQRAlumno = null;
let intervaloQRProfesor = null;
let ultimoCodigoAlumno = '';
let ultimoCodigoProfesor = '';

// ========================
// 🔹 UTILIDADES DE HASH
// ========================

function hashSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 4);
}

function obtenerBloqueTiempo() {
  return Math.floor(Date.now() / 1000 / CONFIG_QR_DINAMICO.tiempoValidez);
}

// ========================
// 🔹 GENERACIÓN DE CÓDIGOS
// ========================

/**
 * Genera código compacto para barcode
 * Formato: TIDxxxxyyyy (T=tipo, ID=identificador, xxxx=bloque, yyyy=hash)
 */
function generarCodigoCompacto(tipo, identificador) {
  const bloque = obtenerBloqueTiempo();
  const bloqueCorto = bloque.toString(36).toUpperCase().slice(-4).padStart(4, '0');
  const hash = hashSimple(`${identificador}${CONFIG_QR_DINAMICO.claveSecreta}${bloque}`);
  return `${tipo}${identificador}${bloqueCorto}${hash}`;
}

/**
 * Genera código para QR (base64 de JSON)
 */
function generarCodigoQR(tipo, identificador, datosExtra = {}) {
  const bloque = obtenerBloqueTiempo();
  const hash = hashSimple(`${identificador}${CONFIG_QR_DINAMICO.claveSecreta}${bloque}`);
  
  const datos = {
    v: '2',
    t: tipo,
    i: identificador,
    b: bloque,
    h: hash,
    ...datosExtra
  };
  
  return btoa(JSON.stringify(datos));
}

// ========================
// 🔹 DECODIFICACIÓN
// ========================

function decodificarCodigo(codigo) {
  if (!codigo || typeof codigo !== 'string') {
    return { valido: false, mensaje: 'Código vacío' };
  }
  
  codigo = codigo.trim();
  console.log('🔍 Decodificando:', codigo.substring(0, 40) + '...');
  
  // 1. Base64 (QR dinámico)
  if (codigo.length > 20) {
    try {
      const decoded = atob(codigo);
      const json = JSON.parse(decoded);
      console.log('📦 JSON decodificado:', json);
      
      if (json.v === '2') {
        return validarCodigoDinamico(json);
      }
      // Legacy JSON
      return { 
        valido: true, 
        tipo: json.tipo === 'Profesor' ? 'profesor' : 'alumno',
        datos: json, 
        identificador: json.control || json.telefono || json.id,
        mensaje: 'JSON legacy'
      };
    } catch (e) {
      // No es base64, continuar
    }
  }
  
  // 2. Código compacto (barcode dinámico): A12345678XXXXHHHH
  const tipoChar = codigo.charAt(0);
  if ((tipoChar === 'A' || tipoChar === 'P') && codigo.length >= 16) {
    return decodificarCodigoCompacto(codigo);
  }
  
  // 3. Solo número (legacy)
  if (/^\d{6,15}$/.test(codigo)) {
    return {
      valido: true,
      tipo: 'legacy',
      datos: { control: codigo },
      identificador: codigo,
      mensaje: 'Código numérico legacy'
    };
  }
  
  // 4. JSON directo
  if (codigo.startsWith('{')) {
    try {
      const json = JSON.parse(codigo);
      return {
        valido: true,
        tipo: json.tipo === 'Profesor' ? 'profesor' : 'alumno',
        datos: json,
        identificador: json.control || json.telefono || json.id,
        mensaje: 'JSON directo'
      };
    } catch (e) {
      return { valido: false, mensaje: 'JSON inválido' };
    }
  }
  
  return { valido: false, mensaje: 'Formato no reconocido' };
}

function decodificarCodigoCompacto(codigo) {
  const tipo = codigo.charAt(0);
  const resto = codigo.substring(1);
  
  // Últimos 4 = hash, anteriores 4 = bloque
  const hashRecibido = resto.slice(-4);
  const sinHash = resto.slice(0, -4);
  const bloqueStr = sinHash.slice(-4);
  const identificador = sinHash.slice(0, -4);
  const bloqueRecibido = parseInt(bloqueStr, 36);
  
  console.log('📊 Compacto:', { tipo, identificador, bloqueStr, hashRecibido });
  
  return validarCodigoDinamico({
    t: tipo,
    i: identificador,
    b: bloqueRecibido,
    h: hashRecibido
  });
}

function validarCodigoDinamico(datos) {
  const tipoTexto = datos.t === 'A' ? 'alumno' : 'profesor';
  
  if (!CONFIG_QR_DINAMICO.modoSeguro) {
    return {
      valido: true,
      tipo: tipoTexto,
      datos: datos,
      identificador: datos.i,
      mensaje: 'Modo seguro desactivado'
    };
  }
  
  const bloqueActual = obtenerBloqueTiempo();
  const bloquesValidos = [bloqueActual, bloqueActual - 1, bloqueActual + 1];
  
  console.log('⏰ Validando tiempo:', { recibido: datos.b, actual: bloqueActual, validos: bloquesValidos });
  
  if (!bloquesValidos.includes(datos.b)) {
    return {
      valido: false,
      tipo: tipoTexto,
      datos: datos,
      identificador: datos.i,
      mensaje: '⏰ Código expirado. Regenera tu QR.',
      error: 'EXPIRED'
    };
  }
  
  const hashEsperado = hashSimple(`${datos.i}${CONFIG_QR_DINAMICO.claveSecreta}${datos.b}`);
  console.log('🔐 Validando hash:', { recibido: datos.h, esperado: hashEsperado });
  
  if (datos.h !== hashEsperado) {
    return {
      valido: false,
      tipo: tipoTexto,
      datos: datos,
      identificador: datos.i,
      mensaje: '🚫 Código inválido.',
      error: 'INVALID_HASH'
    };
  }
  
  return {
    valido: true,
    tipo: tipoTexto,
    datos: datos,
    identificador: datos.i,
    mensaje: '✅ Código válido'
  };
}

// ========================
// 🔹 GENERACIÓN AUTOMÁTICA DE QR
// ========================

function iniciarQRDinamicoAlumno() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') {
    console.log('⚠️ No hay alumno logueado');
    return;
  }
  
  console.log('🔐 Iniciando QR para alumno:', usuario.nombre);
  llenarDatosAlumnoQR(usuario);
  actualizarQRAlumno();
  
  if (intervaloQRAlumno) clearInterval(intervaloQRAlumno);
  
  let ultimoBloque = obtenerBloqueTiempo();
  
  intervaloQRAlumno = setInterval(() => {
    const bloqueActual = obtenerBloqueTiempo();
    
    if (bloqueActual !== ultimoBloque) {
      console.log('🔄 Regenerando QR alumno');
      ultimoBloque = bloqueActual;
      actualizarQRAlumno();
      animarCambioQR('alumno-qrcode');
    }
    
    actualizarTemporizador('alumno');
  }, CONFIG_QR_DINAMICO.intervaloActualizacion);
}

function iniciarQRDinamicoProfesor() {
  const usuario = window.usuarioActual || window.profesorRegistrado;
  if (!usuario || usuario.tipo !== 'Profesor') {
    console.log('⚠️ No hay profesor logueado');
    return;
  }
  
  console.log('🔐 Iniciando QR para profesor:', usuario.nombre);
  llenarDatosProfesorQR(usuario);
  actualizarQRProfesor();
  
  if (intervaloQRProfesor) clearInterval(intervaloQRProfesor);
  
  let ultimoBloque = obtenerBloqueTiempo();
  
  intervaloQRProfesor = setInterval(() => {
    const bloqueActual = obtenerBloqueTiempo();
    
    if (bloqueActual !== ultimoBloque) {
      console.log('🔄 Regenerando QR profesor');
      ultimoBloque = bloqueActual;
      actualizarQRProfesor();
      animarCambioQR('prof-qrcode');
    }
    
    actualizarTemporizador('profesor');
  }, CONFIG_QR_DINAMICO.intervaloActualizacion);
}

function actualizarQRAlumno() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') return;
  
  const qrContainer = document.getElementById('alumno-qrcode');
  const barcodeContainer = document.getElementById('alumno-barcode');
  if (!qrContainer) return;
  
  const identificador = usuario.control || usuario.id;
  
  // Generar códigos
  const codigoBarras = generarCodigoCompacto('A', identificador);
  const codigoQR = generarCodigoQR('A', identificador, {
    n: (usuario.nombre || '').substring(0, 12),
    g: usuario.grado || ''
  });
  
  // Guardar para descarga
  ultimoCodigoAlumno = codigoBarras;
  
  console.log('📱 Código barras generado:', codigoBarras);
  console.log('📱 Código QR generado:', codigoQR.substring(0, 30) + '...');
  
  // Generar QR
  qrContainer.innerHTML = '';
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: codigoQR,
        width: 180,
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
    }
  } catch (e) {
    console.error('Error generando QR:', e);
  }
  
  // Generar Barcode
  if (barcodeContainer && typeof JsBarcode !== 'undefined') {
    try {
      // Limpiar SVG existente
      barcodeContainer.innerHTML = '';
      
      JsBarcode(barcodeContainer, codigoBarras, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000'
      });
    } catch (e) {
      console.error('Error generando Barcode:', e);
    }
  }
  
  // Badge de seguridad
  const badge = document.getElementById('qr-security-badge-alumno');
  if (badge) badge.style.display = 'flex';
}

function actualizarQRProfesor() {
  const usuario = window.usuarioActual || window.profesorRegistrado;
  if (!usuario || usuario.tipo !== 'Profesor') return;
  
  const qrContainer = document.getElementById('prof-qrcode');
  const barcodeContainer = document.getElementById('prof-barcode');
  if (!qrContainer) return;
  
  const identificador = usuario.telefono || usuario.control || usuario.id;
  
  const codigoBarras = generarCodigoCompacto('P', identificador);
  const codigoQR = generarCodigoQR('P', identificador, {
    n: (usuario.nombre || '').substring(0, 12)
  });
  
  ultimoCodigoProfesor = codigoBarras;
  
  qrContainer.innerHTML = '';
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: codigoQR,
        width: 180,
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
    }
  } catch (e) {
    console.error('Error generando QR:', e);
  }
  
  if (barcodeContainer && typeof JsBarcode !== 'undefined') {
    try {
      barcodeContainer.innerHTML = '';
      JsBarcode(barcodeContainer, codigoBarras, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000'
      });
    } catch (e) {
      console.error('Error generando Barcode:', e);
    }
  }
  
  const badge = document.getElementById('qr-security-badge-profesor');
  if (badge) badge.style.display = 'flex';
}

// ========================
// 🔹 UI HELPERS
// ========================

function llenarDatosAlumnoQR(usuario) {
  const avatar = document.getElementById('avatar-alumno-qr');
  if (avatar) {
    avatar.textContent = `${(usuario.nombre || 'A').charAt(0)}${(usuario.apellidos || '').charAt(0)}`.toUpperCase();
  }
  
  const nombre = document.getElementById('nombre-alumno-qr');
  if (nombre) nombre.textContent = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
  
  const grado = document.getElementById('grado-alumno-qr');
  if (grado) grado.textContent = usuario.grado || 'Sin grado';
  
  const control = document.getElementById('control-alumno-qr');
  if (control) control.textContent = usuario.control || 'N/A';
  
  const whatsapp = document.getElementById('whatsapp-alumno-qr');
  if (whatsapp) whatsapp.textContent = usuario.whatsapp || 'No registrado';
}

function llenarDatosProfesorQR(usuario) {
  const avatar = document.getElementById('avatar-profesor-qr');
  if (avatar) {
    avatar.textContent = `${(usuario.nombre || 'P').charAt(0)}${(usuario.apellidos || '').charAt(0)}`.toUpperCase();
  }
  
  const nombre = document.getElementById('nombre-profesor-qr');
  if (nombre) nombre.textContent = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
  
  const materias = document.getElementById('materias-profesor-qr');
  if (materias) materias.textContent = usuario.materias || 'Sin materias';
  
  const telefono = document.getElementById('telefono-profesor-qr');
  if (telefono) telefono.textContent = usuario.telefono || 'N/A';
  
  const grupos = document.getElementById('grupos-profesor-qr');
  if (grupos) grupos.textContent = usuario.grupos || 'N/A';
}

function actualizarTemporizador(tipo) {
  const container = document.getElementById(`qr-timer-${tipo}`);
  if (!container) return;
  
  const ahora = Math.floor(Date.now() / 1000);
  const bloqueActual = obtenerBloqueTiempo();
  const finBloque = (bloqueActual + 1) * CONFIG_QR_DINAMICO.tiempoValidez;
  const segundos = Math.max(0, finBloque - ahora);
  
  let colorClass = 'text-success bg-success/10';
  if (segundos <= 10) colorClass = 'text-red-500 bg-red-500/10';
  else if (segundos <= 20) colorClass = 'text-yellow-500 bg-yellow-500/10';
  
  container.innerHTML = `
    <div class="flex items-center justify-center gap-2 p-2 rounded-lg ${colorClass}">
      <svg class="w-4 h-4 ${segundos <= 10 ? 'animate-pulse' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span class="text-sm font-bold">${segundos}s</span>
    </div>
  `;
}

function animarCambioQR(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.transform = 'scale(0.95)';
    container.style.opacity = '0.7';
    setTimeout(() => {
      container.style.transform = 'scale(1)';
      container.style.opacity = '1';
    }, 200);
  }
}

function detenerQRDinamico() {
  if (intervaloQRAlumno) { clearInterval(intervaloQRAlumno); intervaloQRAlumno = null; }
  if (intervaloQRProfesor) { clearInterval(intervaloQRProfesor); intervaloQRProfesor = null; }
}

// ========================
// 🔹 DESCARGA
// ========================

function descargarQRAlumno() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') {
    alert('⚠️ No hay alumno logueado');
    return;
  }
  
  const canvas = document.querySelector('#alumno-qrcode canvas');
  if (!canvas) {
    alert('⚠️ Espera a que se genere el QR');
    return;
  }
  
  // Crear imagen completa
  const img = document.createElement('canvas');
  const ctx = img.getContext('2d');
  img.width = 300;
  img.height = 420;
  
  // Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, img.width, img.height);
  
  // Header
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('KEYON ACCESS', 150, 30);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText('CBTis 001 - Fresnillo', 150, 48);
  
  // QR
  ctx.drawImage(canvas, 60, 60, 180, 180);
  
  // Datos
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${usuario.nombre || ''} ${usuario.apellidos || ''}`, 150, 265);
  ctx.font = '12px Arial';
  ctx.fillText(`Control: ${usuario.control || 'N/A'}`, 150, 285);
  ctx.fillText(`Grado: ${usuario.grado || 'N/A'}`, 150, 303);
  
  // Código de barras (texto)
  ctx.font = 'bold 11px Courier';
  ctx.fillStyle = '#000';
  ctx.fillText(ultimoCodigoAlumno || '', 150, 340);
  
  // Advertencia
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('⚠️ CÓDIGO DINÁMICO', 150, 375);
  ctx.font = '9px Arial';
  ctx.fillText('Válido por ' + CONFIG_QR_DINAMICO.tiempoValidez + ' segundos', 150, 390);
  ctx.fillText('Muestra el código EN VIVO de la app', 150, 405);
  
  // Descargar
  const link = document.createElement('a');
  link.download = `QR_${usuario.nombre || 'alumno'}_${usuario.control || ''}.png`;
  link.href = img.toDataURL('image/png');
  link.click();
  
  console.log('📥 QR descargado');
}

function descargarQRProfesor() {
  const usuario = window.usuarioActual || window.profesorRegistrado;
  if (!usuario || usuario.tipo !== 'Profesor') {
    alert('⚠️ No hay profesor logueado');
    return;
  }
  
  const canvas = document.querySelector('#prof-qrcode canvas');
  if (!canvas) {
    alert('⚠️ Espera a que se genere el QR');
    return;
  }
  
  const img = document.createElement('canvas');
  const ctx = img.getContext('2d');
  img.width = 300;
  img.height = 400;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, img.width, img.height);
  
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('KEYON ACCESS', 150, 30);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText('PROFESOR - CBTis 001', 150, 48);
  
  ctx.drawImage(canvas, 60, 60, 180, 180);
  
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${usuario.nombre || ''} ${usuario.apellidos || ''}`, 150, 265);
  ctx.font = '12px Arial';
  ctx.fillText(`Tel: ${usuario.telefono || 'N/A'}`, 150, 285);
  
  ctx.font = 'bold 11px Courier';
  ctx.fillStyle = '#000';
  ctx.fillText(ultimoCodigoProfesor || '', 150, 320);
  
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('⚠️ CÓDIGO DINÁMICO', 150, 355);
  ctx.font = '9px Arial';
  ctx.fillText('Válido por ' + CONFIG_QR_DINAMICO.tiempoValidez + ' segundos', 150, 370);
  
  const link = document.createElement('a');
  link.download = `QR_Prof_${usuario.nombre || 'profesor'}.png`;
  link.href = img.toDataURL('image/png');
  link.click();
}

/**
 * Descarga solo el código de barras
 */
function descargarBarcodeAlumno() {
  const usuario = window.usuarioActual;
  if (!usuario || usuario.tipo !== 'Alumno') {
    alert('⚠️ No hay alumno logueado');
    return;
  }
  
  const svg = document.getElementById('alumno-barcode');
  if (!svg) {
    alert('⚠️ Espera a que se genere el código');
    return;
  }
  
  // Convertir SVG a imagen
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const link = document.createElement('a');
  link.download = `Barcode_${usuario.nombre || 'alumno'}_${usuario.control || ''}.svg`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  console.log('📥 Barcode descargado');
}

function descargarBarcodeProfesor() {
  const usuario = window.usuarioActual || window.profesorRegistrado;
  if (!usuario || usuario.tipo !== 'Profesor') {
    alert('⚠️ No hay profesor logueado');
    return;
  }
  
  const svg = document.getElementById('prof-barcode');
  if (!svg) {
    alert('⚠️ Espera a que se genere el código');
    return;
  }
  
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const link = document.createElement('a');
  link.download = `Barcode_Prof_${usuario.nombre || 'profesor'}.svg`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

// ========================
// 🔹 OBSERVERS
// ========================

document.addEventListener('DOMContentLoaded', () => {
  // Observer para QR alumno
  const seccionAlumno = document.getElementById('generador-qr-alumno');
  if (seccionAlumno) {
    const obs = new MutationObserver(() => {
      if (!seccionAlumno.classList.contains('hidden') && window.usuarioActual?.tipo === 'Alumno') {
        setTimeout(() => iniciarQRDinamicoAlumno(), 100);
      }
    });
    obs.observe(seccionAlumno, { attributes: true, attributeFilter: ['class'] });
  }
  
  // Observer para QR profesor
  const seccionProfesor = document.getElementById('generador-qr-profesor');
  if (seccionProfesor) {
    const obs = new MutationObserver(() => {
      if (!seccionProfesor.classList.contains('hidden') && (window.usuarioActual?.tipo === 'Profesor' || window.profesorRegistrado)) {
        setTimeout(() => iniciarQRDinamicoProfesor(), 100);
      }
    });
    obs.observe(seccionProfesor, { attributes: true, attributeFilter: ['class'] });
  }
  
  console.log('🔐 QR Dinámico v2.1 inicializado');
});

// ========================
// 🔹 FUNCIONES LEGACY (compatibilidad)
// ========================

async function manejarCodigo(codigo) {
  const resultado = decodificarCodigo(codigo);
  
  if (!resultado.valido) {
    console.warn('❌', resultado.mensaje);
    if (typeof actualizarAviso === 'function') actualizarAviso(resultado.mensaje, 'error');
    if (typeof reproducirBeep === 'function') reproducirBeep('error');
    return null;
  }
  
  // Delegar al procesador de QR si existe
  if (typeof procesarCodigoValidado === 'function') {
    return await procesarCodigoValidado(resultado);
  }
  
  return resultado;
}

async function procesarQR(codigo) {
  return await manejarCodigo(codigo);
}

// ========================
// 🔹 EXPORTS
// ========================
window.CONFIG_QR_DINAMICO = CONFIG_QR_DINAMICO;
window.generarCodigoCompacto = generarCodigoCompacto;
window.generarCodigoQR = generarCodigoQR;
window.decodificarCodigo = decodificarCodigo;
window.validarCodigoDinamico = validarCodigoDinamico;
window.manejarCodigo = manejarCodigo;
window.procesarQR = procesarQR;
window.iniciarQRDinamicoAlumno = iniciarQRDinamicoAlumno;
window.iniciarQRDinamicoProfesor = iniciarQRDinamicoProfesor;
window.actualizarQRAlumno = actualizarQRAlumno;
window.actualizarQRProfesor = actualizarQRProfesor;
window.detenerQRDinamico = detenerQRDinamico;
window.descargarQRAlumno = descargarQRAlumno;
window.descargarQRProfesor = descargarQRProfesor;
window.descargarBarcodeAlumno = descargarBarcodeAlumno;
window.descargarBarcodeProfesor = descargarBarcodeProfesor;
window.obtenerBloqueTiempo = obtenerBloqueTiempo;

console.log('🔐 QR Dinámico v2.1 | Validez:', CONFIG_QR_DINAMICO.tiempoValidez + 's');
