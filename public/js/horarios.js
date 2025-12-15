// ========================================
// 📅 MÓDULO DE HORARIOS
// Keyon Access System v2.0
// CBTis 001 - Fresnillo, Zacatecas
// Basado en estructura real de horarios
// ========================================

// ========================
// 🔹 CONFIGURACIÓN BASE
// ========================
const CONFIG_HORARIOS = {
  plantel: 'CBTis No. 001',
  cct: '32DCT0138L',
  ubicacion: 'Carr. Panamericana Km. 724.3, Fresnillo, Zacatecas',
  cicloEscolar: '2025-2026-1',
  periodoEscolar: 'AGO2025/ENE2026'
};

// ========================
// 🔹 ESTRUCTURA DE MÓDULOS (HORARIOS)
// ========================
const MODULOS_MATUTINO = [
  { modulo: 1, inicio: '07:00', fin: '07:50' },
  { modulo: 2, inicio: '07:50', fin: '08:40' },
  { modulo: 3, inicio: '08:40', fin: '09:30' },
  { modulo: 'receso', inicio: '09:30', fin: '09:50', esReceso: true },
  { modulo: 4, inicio: '09:50', fin: '10:40' },
  { modulo: 5, inicio: '10:40', fin: '11:30' },
  { modulo: 6, inicio: '11:30', fin: '12:20' },
  { modulo: 7, inicio: '12:20', fin: '13:10' },
  { modulo: 8, inicio: '13:10', fin: '14:00' }
];

const MODULOS_VESPERTINO = [
  { modulo: 1, inicio: '13:10', fin: '14:00' },
  { modulo: 2, inicio: '14:00', fin: '14:50' },
  { modulo: 3, inicio: '14:50', fin: '15:40' },
  { modulo: 4, inicio: '15:40', fin: '16:30' },
  { modulo: 'receso', inicio: '16:30', fin: '16:50', esReceso: true },
  { modulo: 5, inicio: '16:50', fin: '17:40' },
  { modulo: 6, inicio: '17:40', fin: '18:30' },
  { modulo: 7, inicio: '18:30', fin: '19:20' },
  { modulo: 8, inicio: '19:20', fin: '20:10' }
];

// ========================
// 🔹 GRUPOS POR TURNO
// ========================
const GRUPOS_MATUTINO = ['A', 'K', 'C', 'E', 'F', 'G'];
const GRUPOS_VESPERTINO = ['D', 'I', 'H', 'L', 'M', 'P'];
const SEMESTRES = [1, 3, 5];
const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

// ========================
// 🔹 CATÁLOGO DE MATERIAS
// ========================
const CATALOGO_MATERIAS = {
  // Primer Semestre - Básicas
  'PM-I': { nombre: 'Pensamiento Matemático I', abreviatura: 'PMI', horas: 4, semestre: 1, tipo: 'basica' },
  'LYC-I': { nombre: 'Lengua y Comunicación I', abreviatura: 'LYCI', horas: 3, semestre: 1, tipo: 'basica' },
  'IN-I': { nombre: 'Inglés I', abreviatura: 'InI', horas: 3, semestre: 1, tipo: 'basica' },
  'PFYH-I': { nombre: 'Pensamiento Filosófico y Humanidades I', abreviatura: 'PFyH I', horas: 4, semestre: 1, tipo: 'basica' },
  'CS-I': { nombre: 'Ciencias Sociales I', abreviatura: 'CS I', horas: 2, semestre: 1, tipo: 'basica' },
  'CSNET-I': { nombre: 'Cs. Naturales, Experimentales y Tecnología I', abreviatura: 'Cs.NET I', horas: 4, semestre: 1, tipo: 'basica' },
  'CD-I': { nombre: 'Cultura Digital I', abreviatura: 'CDI', horas: 3, semestre: 1, tipo: 'basica' },
  'TUT-I': { nombre: 'Tutoría', abreviatura: 'T', horas: 1, semestre: 1, tipo: 'tutoria' },

  // Tercer Semestre - Básicas
  'PM-III': { nombre: 'Pensamiento Matemático III', abreviatura: 'PM III', horas: 4, semestre: 3, tipo: 'basica' },
  'LYC-III': { nombre: 'Lengua y Comunicación III', abreviatura: 'LYC III', horas: 3, semestre: 3, tipo: 'basica' },
  'IN-III': { nombre: 'Inglés III', abreviatura: 'InIII', horas: 3, semestre: 3, tipo: 'basica' },
  'H-II': { nombre: 'Humanidades II', abreviatura: 'H II', horas: 4, semestre: 3, tipo: 'basica' },
  'EIEYD': { nombre: 'Ecosistemas: Interacciones, Energía y Dinámica', abreviatura: 'EIEYD', horas: 4, semestre: 3, tipo: 'basica' },
  'TUT-III': { nombre: 'Tutoría', abreviatura: 'T', horas: 1, semestre: 3, tipo: 'tutoria' },

  // Quinto Semestre - Básicas
  'TSDM-II': { nombre: 'Temas Selectos de Matemáticas II', abreviatura: 'TSDM II', horas: 5, semestre: 5, tipo: 'basica' },
  'IN-V': { nombre: 'Inglés V', abreviatura: 'InV', horas: 5, semestre: 5, tipo: 'basica' },
  'CHIMDEEC': { nombre: 'Conciencia Histórica II; México Durante el...', abreviatura: 'CHIMDEEC', horas: 3, semestre: 5, tipo: 'basica' },
  'LEELPDLV': { nombre: 'La Energía en los Procesos de la Vida', abreviatura: 'LEELPDLV', horas: 4, semestre: 5, tipo: 'basica' },
  'EPYS': { nombre: 'Economía Pública y Social', abreviatura: 'EPYS', horas: 3, semestre: 5, tipo: 'basica' },
  'APM': { nombre: 'Aplicaciones del Pensamiento Matemático', abreviatura: 'APM', horas: 3, semestre: 5, tipo: 'basica' },
  'MYEELO': { nombre: 'Materia y Energía en los Organismos', abreviatura: 'MYEELO', horas: 3, semestre: 5, tipo: 'basica' },
  'TUT-V': { nombre: 'Tutoría', abreviatura: 'T', horas: 1, semestre: 5, tipo: 'tutoria' },

  // Especialidad: Programación
  'MEFPEDDS': { nombre: 'Emplea Frameworks para el Desarrollo de Software', abreviatura: 'MEFPEDDS', horas: 9, semestre: 3, tipo: 'especialidad', carrera: 'programacion' },
  'APLIMETAG': { nombre: 'Aplica Metodologías Ágiles para el Desarrollo', abreviatura: 'APLIMETAG', horas: 8, semestre: 3, tipo: 'especialidad', carrera: 'programacion' },
  'MCAW': { nombre: 'Construye Aplicaciones Web', abreviatura: 'MCAW', horas: 7, semestre: 5, tipo: 'especialidad', carrera: 'programacion' },
  'MIAW': { nombre: 'Implementa Aplicaciones Web', abreviatura: 'MIAW', horas: 5, semestre: 5, tipo: 'especialidad', carrera: 'programacion' },
  'MDBDDO': { nombre: 'Diseña Bases de Datos Ofimáticas', abreviatura: 'MDBDDO', horas: 4, semestre: 5, tipo: 'especialidad', carrera: 'programacion' },
  'MGIMEUDSMDBDDO': { nombre: 'Gestiona Información Mediante el Uso de SMBD', abreviatura: 'MGIMEUDSMDBDDO', horas: 8, semestre: 5, tipo: 'especialidad', carrera: 'programacion' },

  // Especialidad: Contabilidad
  'MECDC': { nombre: 'Elabora Contabilidad de Costos', abreviatura: 'MECDC', horas: 12, semestre: 3, tipo: 'especialidad', carrera: 'contabilidad' },
  'MRNDFE': { nombre: 'Realiza Nómina de Forma Electrónica', abreviatura: 'MRNDFE', horas: 5, semestre: 3, tipo: 'especialidad', carrera: 'contabilidad' },
  'MGIFDPF': { nombre: 'Genera Información Fiscal de Personas Físicas', abreviatura: 'MGIFDPF', horas: 7, semestre: 5, tipo: 'especialidad', carrera: 'contabilidad' },
  'MGIDPM': { nombre: 'Genera Información de Personas Morales', abreviatura: 'MGIDPM', horas: 5, semestre: 5, tipo: 'especialidad', carrera: 'contabilidad' },

  // Especialidad: Electrónica
  'MDCED': { nombre: 'Diseña Circuitos Electrónicos Digitales', abreviatura: 'MDCED', horas: 7, semestre: 3, tipo: 'especialidad', carrera: 'electronica' },
  'MACED': { nombre: 'Arma Circuitos Electrónicos Digitales', abreviatura: 'MACED', horas: 10, semestre: 3, tipo: 'especialidad', carrera: 'electronica' },
  'MPCCM': { nombre: 'Programa Circuitos con Microcontroladores', abreviatura: 'MPCCM', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'electronica' },
  'MACCMEPD': { nombre: 'Arma Circuitos con Microcontroladores', abreviatura: 'MACCMEPD', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'electronica' },

  // Especialidad: Laboratorista Clínico
  'MIMCBETB': { nombre: 'Identifica Microorganismos (Bacterias)', abreviatura: 'MIMCBETB', horas: 7, semestre: 3, tipo: 'especialidad', carrera: 'laboratorista' },
  'MIMCBETP': { nombre: 'Identifica Microorganismos (Parásitos)', abreviatura: 'MIMCBETP', horas: 7, semestre: 3, tipo: 'especialidad', carrera: 'laboratorista' },
  'MRAHDSBYH': { nombre: 'Realiza Análisis Hematológicos', abreviatura: 'MRAHDSBYH', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'laboratorista' },
  'MAYFSCFT': { nombre: 'Analiza y Fracciona Sangre', abreviatura: 'MAYFSCFT', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'laboratorista' },

  // Especialidad: Mecánica/Máquinas-Herramienta
  'MMPMETC': { nombre: 'Maquina Piezas Mecánicas en Torno Convencional', abreviatura: 'MMPMETC', horas: 7, semestre: 3, tipo: 'especialidad', carrera: 'mecanica' },
  'MCYSPM': { nombre: 'Corta y Suelda Piezas Mecánicas', abreviatura: 'MCYSPM', horas: 10, semestre: 3, tipo: 'especialidad', carrera: 'mecanica' },
  'MMPMETDCN': { nombre: 'Maquina Piezas en Torno CNC', abreviatura: 'MMPMETDCN', horas: 5, semestre: 5, tipo: 'especialidad', carrera: 'mecanica' },
  'MMPMEFDCN': { nombre: 'Maquina Piezas en Fresadora CNC', abreviatura: 'MMPMEFDCN', horas: 7, semestre: 5, tipo: 'especialidad', carrera: 'mecanica' },

  // Especialidad: Puericultura
  'MDLCDDPDN': { nombre: 'Describe las Características del Desarrollo', abreviatura: 'MDLCDDPDN', horas: 5, semestre: 3, tipo: 'especialidad', carrera: 'puericultura' },
  'MILPSQAEDIDN': { nombre: 'Identifica los Problemas Socioemocionales', abreviatura: 'MILPSQAEDIDN', horas: 5, semestre: 3, tipo: 'especialidad', carrera: 'puericultura' },
  'MRAP': { nombre: 'Realiza Actividades Pedagógicas', abreviatura: 'MRAP', horas: 7, semestre: 3, tipo: 'especialidad', carrera: 'puericultura' },
  'MRAPEPDEP': { nombre: 'Realiza Actividades para Programa de Educación', abreviatura: 'MRAPEPDEP', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'puericultura' },
  'MAELNDEE': { nombre: 'Auxilia en Necesidades de Educación Especial', abreviatura: 'MAELNDEE', horas: 6, semestre: 5, tipo: 'especialidad', carrera: 'puericultura' },

  // Especialidad: Minería
  'MPELPDBYVDRPEDAPYT': { nombre: 'Participa en Procesos de Barrenado', abreviatura: 'MPELPDB', horas: 8, semestre: 3, tipo: 'especialidad', carrera: 'mineria' },
  'MPELOYMELSDB': { nombre: 'Participa en Operación y Mantenimiento', abreviatura: 'MPELOYMELSDB', horas: 9, semestre: 3, tipo: 'especialidad', carrera: 'mineria' },
  'MPELEDM': { nombre: 'Participa en el Rezagado del Mineral', abreviatura: 'MPELEDM', horas: 4, semestre: 5, tipo: 'especialidad', carrera: 'mineria' },
  'MPEERDM': { nombre: 'Participa en el Acarreo de Mineral', abreviatura: 'MPEERDM', horas: 4, semestre: 5, tipo: 'especialidad', carrera: 'mineria' },
  'MPEEADM': { nombre: 'Participa en la Extracción de Minerales', abreviatura: 'MPEEADM', horas: 4, semestre: 5, tipo: 'especialidad', carrera: 'mineria' }
};

// ========================
// 🔹 CARRERAS/ESPECIALIDADES
// ========================
const CARRERAS = {
  programacion: { nombre: 'Programación', clave: 'PROG', grupos: ['A', 'K', 'I', 'P'] },
  contabilidad: { nombre: 'Contabilidad', clave: 'CONT', grupos: ['C', 'D'] },
  electronica: { nombre: 'Electrónica', clave: 'ELEC', grupos: ['E'] },
  laboratorista: { nombre: 'Laboratorista Clínico', clave: 'LAB', grupos: ['F'] },
  mecanica: { nombre: 'Máquinas-Herramienta', clave: 'MEC', grupos: ['G'] },
  puericultura: { nombre: 'Puericultura', clave: 'PUER', grupos: ['H', 'L'] },
  mineria: { nombre: 'Minería', clave: 'MIN', grupos: ['M'] }
};

// ========================
// 🔹 AULAS ESPECIALES
// ========================
const AULAS_ESPECIALES = {
  'CC1': { nombre: 'Centro de Cómputo 1', tipo: 'laboratorio' },
  'CC2': { nombre: 'Centro de Cómputo 2', tipo: 'laboratorio' },
  'CCCONT': { nombre: 'Centro de Cómputo Contabilidad', tipo: 'laboratorio' },
  'L.INT': { nombre: 'Laboratorio Integral', tipo: 'laboratorio' },
  'LDF': { nombre: 'Laboratorio de Física', tipo: 'laboratorio' },
  'TALLER': { nombre: 'Taller', tipo: 'taller' }
};

// ========================
// 🔹 FUNCIONES PRINCIPALES
// ========================

/**
 * Obtener el turno basado en el grupo
 */
function obtenerTurnoPorGrupo(grupo) {
  if (GRUPOS_MATUTINO.includes(grupo.toUpperCase())) return 'Matutino';
  if (GRUPOS_VESPERTINO.includes(grupo.toUpperCase())) return 'Vespertino';
  return null;
}

/**
 * Obtener grupos disponibles por turno
 */
function obtenerGruposPorTurno(turno) {
  return turno === 'Matutino' ? GRUPOS_MATUTINO : GRUPOS_VESPERTINO;
}

/**
 * Obtener módulos por turno
 */
function obtenerModulosPorTurno(turno) {
  return turno === 'Matutino' ? MODULOS_MATUTINO : MODULOS_VESPERTINO;
}

/**
 * Obtener el módulo actual basado en la hora
 */
function obtenerModuloActual(turno = null) {
  const ahora = new Date();
  const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                     ahora.getMinutes().toString().padStart(2, '0');
  
  // Si no se especifica turno, detectar automáticamente
  if (!turno) {
    const hora = ahora.getHours();
    turno = hora < 13 ? 'Matutino' : 'Vespertino';
  }
  
  const modulos = obtenerModulosPorTurno(turno);
  
  for (const mod of modulos) {
    if (mod.esReceso) continue;
    if (horaActual >= mod.inicio && horaActual < mod.fin) {
      return { ...mod, turno };
    }
  }
  
  return null;
}

/**
 * Obtener siguiente módulo
 */
function obtenerSiguienteModulo(turno = null) {
  const ahora = new Date();
  const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                     ahora.getMinutes().toString().padStart(2, '0');
  
  if (!turno) {
    const hora = ahora.getHours();
    turno = hora < 13 ? 'Matutino' : 'Vespertino';
  }
  
  const modulos = obtenerModulosPorTurno(turno);
  
  for (const mod of modulos) {
    if (mod.esReceso) continue;
    if (horaActual < mod.inicio) {
      return { ...mod, turno };
    }
  }
  
  return null;
}

/**
 * Calcular tiempo restante para el siguiente módulo
 */
function calcularTiempoParaSiguienteModulo(turno = null) {
  const siguiente = obtenerSiguienteModulo(turno);
  if (!siguiente) return null;
  
  const ahora = new Date();
  const [horas, minutos] = siguiente.inicio.split(':').map(Number);
  const horaInicio = new Date(ahora);
  horaInicio.setHours(horas, minutos, 0, 0);
  
  const diff = horaInicio - ahora;
  if (diff < 0) return null;
  
  const minutosRestantes = Math.floor(diff / 60000);
  const hRestantes = Math.floor(minutosRestantes / 60);
  const mRestantes = minutosRestantes % 60;
  
  return {
    modulo: siguiente,
    minutosRestantes,
    texto: hRestantes > 0 ? `${hRestantes}h ${mRestantes}m` : `${mRestantes} min`
  };
}

/**
 * Obtener información de un grupo completo
 */
function obtenerInfoGrupo(semestre, grupo) {
  const turno = obtenerTurnoPorGrupo(grupo);
  const grupoId = `${semestre}${grupo}-${turno === 'Matutino' ? 'M' : 'V'}`;
  
  // Buscar carrera según el grupo
  let carrera = null;
  for (const [clave, info] of Object.entries(CARRERAS)) {
    if (info.grupos.includes(grupo.toUpperCase())) {
      carrera = { clave, ...info };
      break;
    }
  }
  
  // Determinar horas semanales según semestre
  const horasSemanales = semestre === 5 ? 33 : 36;
  
  return {
    id: grupoId,
    nombre: `${semestre}°${grupo}`,
    semestre,
    seccion: grupo,
    turno,
    carrera,
    horasSemanales,
    cicloEscolar: CONFIG_HORARIOS.cicloEscolar
  };
}

/**
 * Obtener todos los grupos del plantel
 */
function obtenerTodosLosGrupos() {
  const grupos = [];
  
  SEMESTRES.forEach(semestre => {
    [...GRUPOS_MATUTINO, ...GRUPOS_VESPERTINO].forEach(grupo => {
      grupos.push(obtenerInfoGrupo(semestre, grupo));
    });
  });
  
  return grupos;
}

/**
 * Obtener información de una materia
 */
function obtenerInfoMateria(clave) {
  // Buscar por clave exacta
  if (CATALOGO_MATERIAS[clave]) {
    return { clave, ...CATALOGO_MATERIAS[clave] };
  }
  
  // Buscar por abreviatura
  for (const [key, materia] of Object.entries(CATALOGO_MATERIAS)) {
    if (materia.abreviatura === clave || 
        materia.abreviatura.toLowerCase() === clave.toLowerCase()) {
      return { clave: key, ...materia };
    }
  }
  
  return null;
}

/**
 * Obtener materias por semestre
 */
function obtenerMateriasPorSemestre(semestre, carrera = null) {
  const materias = [];
  
  for (const [clave, materia] of Object.entries(CATALOGO_MATERIAS)) {
    if (materia.semestre === semestre) {
      // Si es materia básica o de tutoría, siempre incluir
      if (materia.tipo === 'basica' || materia.tipo === 'tutoria') {
        materias.push({ clave, ...materia });
      }
      // Si es de especialidad, verificar carrera
      else if (materia.tipo === 'especialidad' && carrera && materia.carrera === carrera) {
        materias.push({ clave, ...materia });
      }
    }
  }
  
  return materias;
}

// ========================
// 🔹 FUNCIONES DE FIREBASE
// ========================

/**
 * Cargar horario de un grupo desde Firebase
 */
async function cargarHorarioGrupo(semestre, grupo) {
  try {
    const grupoId = `${semestre}${grupo}`;
    const turno = obtenerTurnoPorGrupo(grupo);
    
    // Buscar en colección 'horarios'
    const snapshot = await db.collection('horarios')
      .where('grupoId', '==', grupoId)
      .where('activo', '==', true)
      .get();
    
    if (snapshot.empty) {
      console.log(`No hay horarios registrados para ${grupoId}`);
      return null;
    }
    
    const horarios = [];
    snapshot.forEach(doc => {
      horarios.push({ id: doc.id, ...doc.data() });
    });
    
    // Organizar por día y módulo
    const horarioOrganizado = {};
    DIAS_SEMANA.forEach(dia => {
      horarioOrganizado[dia] = {};
    });
    
    horarios.forEach(h => {
      if (horarioOrganizado[h.dia]) {
        horarioOrganizado[h.dia][h.modulo] = h;
      }
    });
    
    return {
      grupoId,
      semestre,
      grupo,
      turno,
      horarios: horarioOrganizado,
      modulos: obtenerModulosPorTurno(turno)
    };
    
  } catch (error) {
    console.error('Error cargando horario:', error);
    return null;
  }
}

/**
 * Cargar horario de un profesor desde Firebase
 */
async function cargarHorarioProfesor(profesorId) {
  try {
    // Buscar asignaciones del profesor
    const asignacionesSnap = await db.collection('asignaciones')
      .where('profesorId', '==', profesorId)
      .where('activa', '==', true)
      .get();
    
    if (asignacionesSnap.empty) {
      // Buscar también por control o teléfono
      const asigAlt = await db.collection('asignaciones')
        .where('activa', '==', true)
        .get();
      
      const asignaciones = [];
      asigAlt.forEach(doc => {
        const data = doc.data();
        if (data.profesorControl === profesorId || 
            data.profesorTelefono === profesorId) {
          asignaciones.push({ id: doc.id, ...data });
        }
      });
      
      if (asignaciones.length === 0) {
        console.log(`No hay asignaciones para profesor ${profesorId}`);
        return null;
      }
      
      return await procesarAsignacionesProfesor(asignaciones);
    }
    
    const asignaciones = [];
    asignacionesSnap.forEach(doc => {
      asignaciones.push({ id: doc.id, ...doc.data() });
    });
    
    return await procesarAsignacionesProfesor(asignaciones);
    
  } catch (error) {
    console.error('Error cargando horario profesor:', error);
    return null;
  }
}

/**
 * Procesar asignaciones del profesor y obtener horarios
 */
async function procesarAsignacionesProfesor(asignaciones) {
  const horarios = [];
  
  for (const asig of asignaciones) {
    // Buscar horarios de esta asignación
    const horariosSnap = await db.collection('horarios')
      .where('asignacionId', '==', asig.id)
      .where('activo', '==', true)
      .get();
    
    horariosSnap.forEach(doc => {
      horarios.push({
        id: doc.id,
        ...doc.data(),
        materia: asig.materiaNombre || asig.materia,
        grupo: asig.grupoNombre || asig.grupo
      });
    });
  }
  
  // Organizar por día
  const horarioOrganizado = {};
  DIAS_SEMANA.forEach(dia => {
    horarioOrganizado[dia] = [];
  });
  
  horarios.forEach(h => {
    if (horarioOrganizado[h.dia]) {
      horarioOrganizado[h.dia].push(h);
    }
  });
  
  // Ordenar cada día por módulo
  DIAS_SEMANA.forEach(dia => {
    horarioOrganizado[dia].sort((a, b) => a.modulo - b.modulo);
  });
  
  return {
    asignaciones,
    horarios: horarioOrganizado,
    totalHoras: horarios.length
  };
}

/**
 * Obtener siguiente clase del profesor
 */
async function obtenerSiguienteClaseProfesor(profesorId) {
  const horarioProfesor = await cargarHorarioProfesor(profesorId);
  if (!horarioProfesor) return null;
  
  const ahora = new Date();
  const diasJS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaActual = diasJS[ahora.getDay()];
  
  if (diaActual === 'domingo' || diaActual === 'sabado') {
    return { mensaje: 'No hay clases los fines de semana' };
  }
  
  const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                     ahora.getMinutes().toString().padStart(2, '0');
  
  // Buscar en el día actual
  const clasesHoy = horarioProfesor.horarios[diaActual] || [];
  
  for (const clase of clasesHoy) {
    if (clase.horaInicio > horaActual) {
      return {
        ...clase,
        esHoy: true,
        tiempoRestante: calcularDiferenciaHoras(horaActual, clase.horaInicio)
      };
    }
  }
  
  // Buscar en los siguientes días
  const indexDiaActual = DIAS_SEMANA.indexOf(diaActual);
  for (let i = 1; i <= 5; i++) {
    const indexSiguiente = (indexDiaActual + i) % 5;
    const diaSiguiente = DIAS_SEMANA[indexSiguiente];
    const clasesDia = horarioProfesor.horarios[diaSiguiente] || [];
    
    if (clasesDia.length > 0) {
      return {
        ...clasesDia[0],
        esHoy: false,
        dia: diaSiguiente,
        diasHasta: i
      };
    }
  }
  
  return null;
}

/**
 * Calcular diferencia entre dos horas
 */
function calcularDiferenciaHoras(horaInicio, horaFin) {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  
  const minutos1 = h1 * 60 + m1;
  const minutos2 = h2 * 60 + m2;
  
  const diff = minutos2 - minutos1;
  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;
  
  if (horas > 0) {
    return `${horas}h ${minutos}m`;
  }
  return `${minutos} min`;
}

/**
 * Obtener clases del día para profesor
 */
async function obtenerClasesHoyProfesor(profesorId) {
  const horarioProfesor = await cargarHorarioProfesor(profesorId);
  if (!horarioProfesor) return [];
  
  const ahora = new Date();
  const diasJS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaActual = diasJS[ahora.getDay()];
  
  if (diaActual === 'domingo' || diaActual === 'sabado') {
    return [];
  }
  
  return horarioProfesor.horarios[diaActual] || [];
}

/**
 * Obtener horario del alumno basado en su grupo
 */
async function obtenerHorarioAlumno(alumno) {
  if (!alumno || !alumno.grado) return null;
  
  // Extraer semestre y grupo del grado (formato: "3°A" o "3A")
  const match = alumno.grado.match(/(\d+)[°]?([A-Za-z])/);
  if (!match) return null;
  
  const semestre = parseInt(match[1]);
  const grupo = match[2].toUpperCase();
  
  return await cargarHorarioGrupo(semestre, grupo);
}

/**
 * Guardar un horario en Firebase
 */
async function guardarHorario(horarioData) {
  try {
    const horario = {
      ...horarioData,
      cicloEscolar: CONFIG_HORARIOS.cicloEscolar,
      activo: true,
      creado: firebase.firestore.FieldValue.serverTimestamp(),
      actualizado: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('horarios').add(horario);
    console.log('Horario guardado:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('Error guardando horario:', error);
    throw error;
  }
}

/**
 * Guardar asignación profesor-materia-grupo
 */
async function guardarAsignacion(asignacionData) {
  try {
    const asignacion = {
      ...asignacionData,
      cicloEscolar: CONFIG_HORARIOS.cicloEscolar,
      activa: true,
      creado: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('asignaciones').add(asignacion);
    console.log('Asignación guardada:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('Error guardando asignación:', error);
    throw error;
  }
}

// ========================
// 🔹 FUNCIONES DE UI
// ========================

/**
 * Renderizar horario en tabla HTML
 */
function renderizarHorarioTabla(horarioData, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !horarioData) return;
  
  const modulos = horarioData.modulos || obtenerModulosPorTurno(horarioData.turno);
  
  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-surface-light/50">
            <th class="p-3 text-left text-text-muted font-medium">Hora</th>
            ${DIAS_SEMANA.map(dia => `
              <th class="p-3 text-center text-text-muted font-medium capitalize">${dia}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
  `;
  
  modulos.forEach(mod => {
    if (mod.esReceso) {
      html += `
        <tr class="bg-warning/10">
          <td colspan="6" class="p-2 text-center text-warning font-medium">
            ☕ Receso (${mod.inicio} - ${mod.fin})
          </td>
        </tr>
      `;
    } else {
      html += `
        <tr class="border-b border-border-subtle hover:bg-surface-light/30 transition-colors">
          <td class="p-3">
            <div class="font-medium text-text-main">${mod.inicio}</div>
            <div class="text-xs text-text-muted">${mod.fin}</div>
          </td>
      `;
      
      DIAS_SEMANA.forEach(dia => {
        const clase = horarioData.horarios[dia]?.[mod.modulo];
        if (clase) {
          html += `
            <td class="p-2">
              <div class="bg-primary/10 rounded-lg p-2 text-center">
                <div class="font-medium text-primary text-xs">${clase.materiaAbrev || clase.materia}</div>
                <div class="text-xs text-text-muted">${clase.aula || ''}</div>
                ${clase.profesorNombre ? `<div class="text-xs text-text-muted mt-1">${clase.profesorNombre}</div>` : ''}
              </div>
            </td>
          `;
        } else {
          html += `<td class="p-2"><div class="text-center text-text-muted">-</div></td>`;
        }
      });
      
      html += `</tr>`;
    }
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Renderizar próximas clases del profesor
 */
function renderizarProximasClases(clases, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!clases || clases.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-text-muted">
        <span class="text-4xl block mb-2">📅</span>
        <p>No hay clases programadas</p>
      </div>
    `;
    return;
  }
  
  const ahora = new Date();
  const horaActual = ahora.getHours().toString().padStart(2, '0') + ':' + 
                     ahora.getMinutes().toString().padStart(2, '0');
  
  let html = '';
  clases.forEach((clase, index) => {
    const esActual = horaActual >= clase.horaInicio && horaActual < clase.horaFin;
    const esSiguiente = !esActual && horaActual < clase.horaInicio && index === 0;
    const yaPaso = horaActual >= clase.horaFin;
    
    let bgClass = 'bg-surface-light/50';
    let statusBadge = '';
    
    if (esActual) {
      bgClass = 'bg-success/20 border-l-4 border-success';
      statusBadge = '<span class="px-2 py-1 bg-success/30 text-success text-xs rounded-full">En curso</span>';
    } else if (esSiguiente) {
      bgClass = 'bg-primary/20 border-l-4 border-primary';
      statusBadge = '<span class="px-2 py-1 bg-primary/30 text-primary text-xs rounded-full">Siguiente</span>';
    } else if (yaPaso) {
      bgClass = 'bg-surface-light/30 opacity-60';
      statusBadge = '<span class="px-2 py-1 bg-gray-500/30 text-text-muted text-xs rounded-full">Completada</span>';
    }
    
    html += `
      <div class="p-4 rounded-xl ${bgClass} mb-3 transition-all hover:shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-text-main">${clase.materia || clase.materiaNombre}</div>
            <div class="text-sm text-text-muted mt-1">
              <span class="inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${clase.horaInicio} - ${clase.horaFin}
              </span>
            </div>
            <div class="text-sm text-text-muted">
              <span class="inline-flex items-center gap-1 mt-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                ${clase.grupo || clase.grupoNombre} • Aula ${clase.aula || '-'}
              </span>
            </div>
          </div>
          <div class="text-right">
            ${statusBadge}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Renderizar tarjeta de próxima clase
 */
function renderizarTarjetaSiguienteClase(clase, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!clase) {
    container.innerHTML = `
      <div class="text-center py-6 text-text-muted">
        <span class="text-3xl block mb-2">🎉</span>
        <p>No tienes más clases hoy</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-5 border border-primary/20">
      <div class="flex items-center gap-2 text-primary text-sm font-medium mb-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ${clase.esHoy ? 'Próxima clase' : `${clase.dia} (en ${clase.diasHasta} día${clase.diasHasta > 1 ? 's' : ''})`}
      </div>
      
      <h3 class="text-xl font-bold text-text-main mb-2">${clase.materia || clase.materiaNombre}</h3>
      
      <div class="space-y-2 text-text-muted">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>${clase.grupo || clase.grupoNombre}</span>
        </div>
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <span>Aula ${clase.aula || '-'}</span>
        </div>
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>${clase.horaInicio} - ${clase.horaFin}</span>
        </div>
      </div>
      
      ${clase.esHoy && clase.tiempoRestante ? `
        <div class="mt-4 pt-4 border-t border-white/10">
          <span class="text-sm text-primary">⏱️ Comienza en ${clase.tiempoRestante}</span>
        </div>
      ` : ''}
    </div>
  `;
}

// ========================
// 🔹 EXPORTS GLOBALES
// ========================
window.CONFIG_HORARIOS = CONFIG_HORARIOS;
window.MODULOS_MATUTINO = MODULOS_MATUTINO;
window.MODULOS_VESPERTINO = MODULOS_VESPERTINO;
window.GRUPOS_MATUTINO = GRUPOS_MATUTINO;
window.GRUPOS_VESPERTINO = GRUPOS_VESPERTINO;
window.CATALOGO_MATERIAS = CATALOGO_MATERIAS;
window.CARRERAS = CARRERAS;
window.DIAS_SEMANA = DIAS_SEMANA;

// Funciones de utilidad
window.obtenerTurnoPorGrupo = obtenerTurnoPorGrupo;
window.obtenerGruposPorTurno = obtenerGruposPorTurno;
window.obtenerModulosPorTurno = obtenerModulosPorTurno;
window.obtenerModuloActual = obtenerModuloActual;
window.obtenerSiguienteModulo = obtenerSiguienteModulo;
window.calcularTiempoParaSiguienteModulo = calcularTiempoParaSiguienteModulo;
window.obtenerInfoGrupo = obtenerInfoGrupo;
window.obtenerTodosLosGrupos = obtenerTodosLosGrupos;
window.obtenerInfoMateria = obtenerInfoMateria;
window.obtenerMateriasPorSemestre = obtenerMateriasPorSemestre;

// Funciones de Firebase
window.cargarHorarioGrupo = cargarHorarioGrupo;
window.cargarHorarioProfesor = cargarHorarioProfesor;
window.obtenerSiguienteClaseProfesor = obtenerSiguienteClaseProfesor;
window.obtenerClasesHoyProfesor = obtenerClasesHoyProfesor;
window.obtenerHorarioAlumno = obtenerHorarioAlumno;
window.guardarHorario = guardarHorario;
window.guardarAsignacion = guardarAsignacion;

// Funciones de UI
window.renderizarHorarioTabla = renderizarHorarioTabla;
window.renderizarProximasClases = renderizarProximasClases;
window.renderizarTarjetaSiguienteClase = renderizarTarjetaSiguienteClase;

// ========================
// 🔹 VINCULAR PROFESORES EXISTENTES
// ========================

/**
 * Obtener todos los profesores de la DB
 */
async function obtenerProfesoresDB() {
  try {
    const snapshot = await db.collection('profesores').get();
    const profesores = [];
    
    snapshot.forEach(doc => {
      profesores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📚 ${profesores.length} profesores encontrados en DB`);
    return profesores;
    
  } catch (error) {
    console.error('Error obteniendo profesores:', error);
    return [];
  }
}

/**
 * Generar iniciales a partir del nombre completo
 */
function generarIniciales(nombre, apellidos) {
  let iniciales = '';
  
  // Primera letra del nombre
  if (nombre) {
    iniciales += nombre.trim().charAt(0).toUpperCase();
  }
  
  // Primera letra del primer apellido
  if (apellidos) {
    const primerApellido = apellidos.trim().split(' ')[0];
    iniciales += primerApellido.charAt(0).toUpperCase();
  }
  
  return iniciales;
}

/**
 * Parsear grupos del string (ej: "5E, 5C y 5F" -> ["5E", "5C", "5F"])
 */
function parsearGrupos(gruposStr) {
  if (!gruposStr) return [];
  
  // Reemplazar "y" por coma, luego dividir por coma
  return gruposStr
    .replace(/\s+y\s+/gi, ', ')
    .split(',')
    .map(g => g.trim())
    .filter(g => g.length > 0);
}

/**
 * Parsear materia y vincular con catálogo
 */
function vincularMateria(materiaStr) {
  if (!materiaStr) return null;
  
  const materiaNormalizada = materiaStr.toLowerCase().trim();
  
  // Mapeo de nombres comunes a claves del catálogo
  const mapeoMaterias = {
    'ingles': ['IN-I', 'IN-III', 'IN-V'],
    'inglés': ['IN-I', 'IN-III', 'IN-V'],
    'matematicas': ['PM-I', 'PM-III', 'TSDM-II'],
    'matemáticas': ['PM-I', 'PM-III', 'TSDM-II'],
    'pensamiento matematico': ['PM-I', 'PM-III'],
    'lengua': ['LYC-I', 'LYC-III'],
    'comunicacion': ['LYC-I', 'LYC-III'],
    'lengua y comunicacion': ['LYC-I', 'LYC-III'],
    'filosofia': ['PFYH-I'],
    'humanidades': ['H-II', 'PFYH-I'],
    'ciencias sociales': ['CS-I'],
    'cultura digital': ['CD-I'],
    'tutoria': ['TUT-I', 'TUT-III', 'TUT-V'],
    'programacion': ['MEFPEDDS', 'APLIMETAG', 'MCAW', 'MIAW'],
    'contabilidad': ['MECDC', 'MRNDFE', 'MGIFDPF'],
    'electronica': ['MDCED', 'MACED', 'MPCCM'],
    'puericultura': ['MDLCDDPDN', 'MRAP', 'MRAPEPDEP'],
    'mineria': ['MPELPDBYVDRPEDAPYT', 'MPELOYMELSDB'],
    'mecanica': ['MMPMETC', 'MCYSPM', 'MMPMETDCN'],
    'laboratorio': ['MIMCBETB', 'MRAHDSBYH'],
    'fisica': ['CSNET-I', 'EIEYD'],
    'quimica': ['CSNET-I', 'LEELPDLV'],
    'biologia': ['CSNET-I', 'MYEELO'],
    'ecologia': ['EIEYD'],
    'economia': ['EPYS'],
    'historia': ['CHIMDEEC']
  };
  
  // Buscar en el mapeo
  for (const [clave, valores] of Object.entries(mapeoMaterias)) {
    if (materiaNormalizada.includes(clave)) {
      return {
        claves: valores,
        nombre: materiaStr,
        encontrada: true
      };
    }
  }
  
  // Si no se encuentra, devolver info genérica
  return {
    claves: [],
    nombre: materiaStr,
    encontrada: false
  };
}

/**
 * Actualizar un profesor con datos del sistema de horarios
 */
async function actualizarProfesorConHorarios(profesorId, datosAdicionales) {
  try {
    await db.collection('profesores').doc(profesorId).update({
      ...datosAdicionales,
      actualizadoHorarios: new Date().toISOString()
    });
    
    console.log(`✅ Profesor ${profesorId} actualizado`);
    return true;
    
  } catch (error) {
    console.error(`Error actualizando profesor ${profesorId}:`, error);
    return false;
  }
}

/**
 * Procesar y vincular todos los profesores existentes
 */
async function vincularTodosProfesores() {
  console.log('🔄 Iniciando vinculación de profesores...');
  
  const profesores = await obtenerProfesoresDB();
  const resultados = {
    total: profesores.length,
    actualizados: 0,
    errores: 0,
    detalles: []
  };
  
  for (const prof of profesores) {
    try {
      // Generar iniciales si no las tiene
      const iniciales = prof.iniciales || generarIniciales(prof.nombre, prof.apellidos);
      
      // Parsear grupos
      const gruposArray = parsearGrupos(prof.grupos);
      
      // Vincular materias
      const materiaInfo = vincularMateria(prof.materias);
      
      // Determinar turno basado en grupos
      let turnoDetectado = prof.turno || prof.ultimoTurno;
      if (!turnoDetectado && gruposArray.length > 0) {
        const primerGrupo = gruposArray[0];
        const letra = primerGrupo.replace(/[0-9°]/g, '').toUpperCase();
        turnoDetectado = obtenerTurnoPorGrupo(letra);
      }
      
      // Preparar datos adicionales
      const datosAdicionales = {
        iniciales,
        gruposArray,
        turno: turnoDetectado,
        materiasVinculadas: materiaInfo?.claves || [],
        materiaNombre: materiaInfo?.nombre || prof.materias,
        cicloEscolar: CONFIG_HORARIOS.cicloEscolar
      };
      
      // Actualizar en DB
      const exito = await actualizarProfesorConHorarios(prof.id, datosAdicionales);
      
      if (exito) {
        resultados.actualizados++;
        resultados.detalles.push({
          id: prof.id,
          nombre: `${prof.nombre} ${prof.apellidos}`,
          iniciales,
          grupos: gruposArray,
          turno: turnoDetectado,
          materias: materiaInfo?.claves || [],
          status: 'OK'
        });
      } else {
        resultados.errores++;
      }
      
    } catch (error) {
      console.error(`Error procesando profesor ${prof.id}:`, error);
      resultados.errores++;
    }
  }
  
  console.log('✅ Vinculación completada:', resultados);
  return resultados;
}

/**
 * Crear asignaciones automáticas basadas en los datos del profesor
 */
async function crearAsignacionesProfesor(profesorId) {
  try {
    const profDoc = await db.collection('profesores').doc(profesorId).get();
    if (!profDoc.exists) {
      console.error('Profesor no encontrado:', profesorId);
      return [];
    }
    
    const prof = profDoc.data();
    const gruposArray = prof.gruposArray || parsearGrupos(prof.grupos);
    const materiasClaves = prof.materiasVinculadas || [];
    
    const asignaciones = [];
    
    for (const grupoStr of gruposArray) {
      // Extraer semestre y letra del grupo (ej: "5E" -> semestre: 5, grupo: "E")
      const match = grupoStr.match(/(\d+)[°]?([A-Za-z])/);
      if (!match) continue;
      
      const semestre = parseInt(match[1]);
      const grupo = match[2].toUpperCase();
      const turno = obtenerTurnoPorGrupo(grupo);
      const grupoId = `${semestre}${grupo}-${turno === 'Matutino' ? 'M' : 'V'}`;
      
      // Buscar la materia correcta para este semestre
      let materiaId = null;
      for (const clave of materiasClaves) {
        const materia = CATALOGO_MATERIAS[clave];
        if (materia && materia.semestre === semestre) {
          materiaId = clave;
          break;
        }
      }
      
      // Si no encontramos materia específica, usar la primera
      if (!materiaId && materiasClaves.length > 0) {
        materiaId = materiasClaves[0];
      }
      
      const asignacion = {
        profesorId: profesorId,
        profesorNombre: `${prof.nombre} ${prof.apellidos}`.trim(),
        profesorIniciales: prof.iniciales,
        profesorTelefono: prof.telefono,
        materiaId: materiaId,
        materiaNombre: prof.materiaNombre || prof.materias,
        grupoId: grupoId,
        grupoNombre: `${semestre}°${grupo}`,
        semestre: semestre,
        grupo: grupo,
        turno: turno,
        cicloEscolar: CONFIG_HORARIOS.cicloEscolar,
        activa: true,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Verificar si ya existe
      const existente = await db.collection('asignaciones')
        .where('profesorId', '==', profesorId)
        .where('grupoId', '==', grupoId)
        .where('cicloEscolar', '==', CONFIG_HORARIOS.cicloEscolar)
        .get();
      
      if (existente.empty) {
        const docRef = await db.collection('asignaciones').add(asignacion);
        asignaciones.push({ id: docRef.id, ...asignacion });
        console.log(`✅ Asignación creada: ${prof.nombre} → ${semestre}°${grupo}`);
      } else {
        console.log(`ℹ️ Asignación ya existe: ${prof.nombre} → ${semestre}°${grupo}`);
      }
    }
    
    return asignaciones;
    
  } catch (error) {
    console.error('Error creando asignaciones:', error);
    return [];
  }
}

/**
 * Crear asignaciones para TODOS los profesores
 */
async function crearTodasLasAsignaciones() {
  console.log('🔄 Creando asignaciones para todos los profesores...');
  
  const profesores = await obtenerProfesoresDB();
  let totalAsignaciones = 0;
  
  for (const prof of profesores) {
    const asignaciones = await crearAsignacionesProfesor(prof.id);
    totalAsignaciones += asignaciones.length;
  }
  
  console.log(`✅ Total asignaciones creadas: ${totalAsignaciones}`);
  return totalAsignaciones;
}

/**
 * Obtener horario de un profesor por teléfono
 */
async function obtenerHorarioProfesorPorTelefono(telefono) {
  try {
    // Buscar asignaciones del profesor
    const asignacionesSnap = await db.collection('asignaciones')
      .where('profesorTelefono', '==', telefono)
      .where('activa', '==', true)
      .get();
    
    if (asignacionesSnap.empty) {
      console.log(`No hay asignaciones para teléfono ${telefono}`);
      return null;
    }
    
    const asignaciones = [];
    asignacionesSnap.forEach(doc => {
      asignaciones.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      telefono,
      asignaciones,
      grupos: asignaciones.map(a => a.grupoNombre),
      materia: asignaciones[0]?.materiaNombre
    };
    
  } catch (error) {
    console.error('Error obteniendo horario por teléfono:', error);
    return null;
  }
}

/**
 * Mostrar resumen de profesores y sus asignaciones
 */
async function mostrarResumenProfesores() {
  const profesores = await obtenerProfesoresDB();
  
  console.log('\n📊 RESUMEN DE PROFESORES');
  console.log('='.repeat(60));
  
  for (const prof of profesores) {
    const iniciales = prof.iniciales || generarIniciales(prof.nombre, prof.apellidos);
    const grupos = prof.gruposArray || parsearGrupos(prof.grupos);
    
    console.log(`\n👤 ${prof.nombre} ${prof.apellidos} (${iniciales})`);
    console.log(`   📱 Tel: ${prof.telefono || 'N/A'}`);
    console.log(`   📚 Materia: ${prof.materias || 'N/A'}`);
    console.log(`   🏫 Grupos: ${grupos.join(', ') || 'N/A'}`);
    console.log(`   🌅 Turno: ${prof.turno || prof.ultimoTurno || 'N/A'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${profesores.length} profesores`);
  
  return profesores;
}

// ========================
// 🔹 EXPORTS ADICIONALES
// ========================
window.obtenerProfesoresDB = obtenerProfesoresDB;
window.generarIniciales = generarIniciales;
window.parsearGrupos = parsearGrupos;
window.vincularMateria = vincularMateria;
window.vincularTodosProfesores = vincularTodosProfesores;
window.crearAsignacionesProfesor = crearAsignacionesProfesor;
window.crearTodasLasAsignaciones = crearTodasLasAsignaciones;
window.obtenerHorarioProfesorPorTelefono = obtenerHorarioProfesorPorTelefono;
window.mostrarResumenProfesores = mostrarResumenProfesores;

console.log('📅 Módulo de horarios cargado - CBTis 001');
