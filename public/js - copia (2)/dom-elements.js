
// ========================
// Elementos del DOM
// ========================

const emailRol = document.getElementById("email-rol");
const overlayRol = document.getElementById("overlay-rol");
const passwordContainer = document.getElementById("password-container");
const passwordRol = document.getElementById("password-rol");
const btnEntrar = document.getElementById("btn-entrar");
const errorRol = document.getElementById("error-rol");

const panelAlumno = document.getElementById("panel-alumno");
const panelProfesor = document.getElementById("panel-profesor");
const panelAdmin = document.getElementById("panel-admin");

// QR Alumno
const btnAlumnoQR = document.getElementById("btn-alumno-qr");
const alumnoQrcodeDiv = document.getElementById("alumno-qrcode");
const alumnoDescargarBtn = document.getElementById("alumno-descargar");
const alumnoMensaje = document.getElementById("alumno-mensaje");

// Inputs Alumno
const alumnoNombreInput = document.getElementById("alumno-nombre");
const alumnoApellidosInput = document.getElementById("alumno-apellidos");
const alumnoGradoInput = document.getElementById("alumno-grado");
const alumnoControlInput = document.getElementById("alumno-control");
const alumnoWhatsappInput = document.getElementById("alumno-whatsapp");

// QR Profesor
const btnProfQR = document.getElementById("btn-prof-qr");
const profQrcodeDiv = document.getElementById("prof-qrcode");
const profDescargarBtn = document.getElementById("prof-descargar");
const profMensaje = document.getElementById("prof-mensaje");

// Inputs Profesor
const profNombreInput = document.getElementById("prof-nombre");
const profApellidosInput = document.getElementById("prof-apellidos");
const profMateriasInput = document.getElementById("prof-materias");
const profGruposInput = document.getElementById("prof-grupos");
const profTelefonoInput = document.getElementById("prof-telefono");

// Escáner
const qrUpload = document.getElementById("qr-upload");
const video = document.getElementById("video");
const profScanStatus = document.getElementById("prof-scan-status");
const audio = new Audio('assets/beep-success.wav');
const historialEscaneos = []; // guardará todos los registros de esta sesión


// Overlay de escaneo
const overlay = document.getElementById("overlay");
const overlayInfo = document.getElementById("overlay-info");

// Admin
const btnExportUsuarios = document.getElementById("btn-export-usuarios");
const btnExportRegistros = document.getElementById("btn-export-registros");
const adminLog = document.getElementById("admin-log");
const inputLector = document.getElementById("input-lector");

