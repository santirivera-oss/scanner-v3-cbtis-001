# 🎓 Keyon Access System

<div align="center">

![Version](https://img.shields.io/badge/version-2.5-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Firebase](https://img.shields.io/badge/Firebase-9.x-orange.svg)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg)

**Sistema de Control de Asistencia Escolar con Reconocimiento Facial**

[Demo](#-demo) • [Características](#-características) • [Instalación](#-instalación) • [Tecnologías](#-tecnologías) • [Screenshots](#-screenshots)

</div>

---

## 📋 Descripción

**Keyon Access System** es un sistema integral de control de asistencia escolar desarrollado para el CBTis No. 001 de Fresnillo, Zacatecas. Combina múltiples métodos de autenticación incluyendo **códigos QR dinámicos**, **códigos de barras** y **reconocimiento facial** mediante inteligencia artificial.

El sistema permite a profesores iniciar clases y registrar asistencia de alumnos en tiempo real, con dashboards interactivos, análisis predictivo y notificaciones push.

---

## ✨ Características

### 🔐 Autenticación Multi-método
- **QR Dinámico** - Códigos que rotan cada 30 segundos con hash de seguridad
- **Código de Barras** - Compatible con lectores USB
- **Reconocimiento Facial** - Detección en tiempo real con face-api.js
- **Email/Password** - Para administradores

### 🎭 Reconocimiento Facial
- Registro con 3 fotos para mayor precisión
- Detección en tiempo real (30+ FPS)
- Solo almacena descriptores matemáticos (privacidad)
- Modo Kiosco para entrada/salida del plantel

### 👨‍🏫 Panel del Profesor
- Dashboard con estadísticas en tiempo real
- Iniciar clase con QR o reconocimiento facial
- Escáner de asistencia multi-modo
- Historial de clases con exportación CSV
- Top 5 alumnos más puntuales

### 🎓 Panel del Alumno
- Dashboard con sistema de logros y rachas
- QR dinámico personal
- Calendario visual de asistencia
- Historial de clases y entrada/salida
- Estadísticas de puntualidad

### 👨‍💼 Panel Administrador
- Dashboard en tiempo real con Chart.js
- Gestión completa de usuarios (CRUD)
- Generador masivo de códigos QR
- Modo Kiosco CBTis a pantalla completa
- Análisis predictivo con IA

### 📊 Funcionalidades Adicionales
- **Comunicación**: Chat privado y avisos por grupo
- **Prefectura**: Sistema de reportes disciplinarios
- **Horarios**: Gestión completa del plantel
- **Notificaciones**: Push notifications (Web Push API)
- **PWA**: Instalable como aplicación

---

## 🚀 Demo

> ⚠️ Demo disponible próximamente

---

## 📸 Screenshots

<div align="center">

### Login con Múltiples Opciones
![Login](https://via.placeholder.com/800x450/1e1b4b/ffffff?text=Login+Screen)

### Dashboard del Profesor
![Dashboard Profesor](https://via.placeholder.com/800x450/1e1b4b/ffffff?text=Dashboard+Profesor)

### Reconocimiento Facial
![Facial Recognition](https://via.placeholder.com/800x450/1e1b4b/ffffff?text=Reconocimiento+Facial)

### Modo Kiosco CBTis
![Kiosco](https://via.placeholder.com/800x450/1e1b4b/ffffff?text=Modo+Kiosco)

</div>

---

## 🛠️ Tecnologías

| Categoría | Tecnologías |
|-----------|-------------|
| **Frontend** | HTML5, Tailwind CSS 3.x, JavaScript ES6+ |
| **Backend** | Firebase (Firestore, Auth, Cloud Functions) |
| **Gráficas** | Chart.js 4.x |
| **QR/Barcode** | Html5-QRCode, QRCode.js, JsBarcode |
| **Reconocimiento Facial** | face-api.js (TensorFlow.js) |
| **Notificaciones** | Web Push API, OneSignal |
| **PWA** | Service Workers, Web App Manifest |

---

## 📦 Instalación

### Requisitos Previos

- Navegador moderno (Chrome, Firefox, Edge)
- Cuenta de Firebase
- Node.js 18+ (para Cloud Functions)
- HTTPS habilitado (requerido para cámara)

### Pasos de Instalación

#### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/keyon-access-system.git
cd keyon-access-system
```

#### 2. Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar **Firestore Database**
3. Habilitar **Authentication** (Email/Password)
4. Copiar la configuración de Firebase

#### 3. Configurar credenciales

Editar `js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

#### 4. Configurar índices de Firestore

En Firebase Console → Firestore → Índices, crear:

```
Colección: sesiones
Campos: profesorId (ASC), fecha (DESC)

Colección: ingresos_cbtis
Campos: identificador (ASC), timestamp (DESC)
```

#### 5. Desplegar

**Opción A - Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**Opción B - Servidor local:**
```bash
# Con Python
python -m http.server 8080

# Con Node.js
npx serve .
```

#### 6. Acceder al sistema

```
https://tu-proyecto.web.app
```

---

## 📁 Estructura del Proyecto

```
keyon-access-system/
│
├── index-tailwind-v2.html      # Aplicación principal
├── manifest.json               # Configuración PWA
├── sw.js                       # Service Worker
│
├── js/
│   ├── firebase-config.js      # Configuración Firebase
│   ├── auth-system.js          # Sistema de autenticación
│   ├── reconocimiento-facial.js # Reconocimiento facial
│   ├── acceso-cbtis.js         # Control de acceso + Kiosco
│   ├── profesor-dashboard.js   # Panel del profesor
│   ├── alumno-dashboard.js     # Panel del alumno
│   ├── admin-panel.js          # Panel administrativo
│   ├── iniciar-clase.js        # Sistema de clases
│   ├── comunicacion.js         # Chat y avisos
│   ├── prefectura.js           # Sistema disciplinario
│   ├── qr-dinamico.js          # QR con rotación
│   ├── analisis-predictivo.js  # IA predictiva
│   └── ...                     # Más módulos
│
├── functions/                  # Cloud Functions
│   ├── index.js
│   └── package.json
│
└── docs/
    ├── BITACORA-DESARROLLO.md
    └── README.md
```

---

## 🔧 Configuración Avanzada

### Reconocimiento Facial

El umbral de reconocimiento se puede ajustar en `js/reconocimiento-facial.js`:

```javascript
const FACIAL_CONFIG = {
  umbralReconocimiento: 0.5,  // Menor = más estricto (0.4-0.6)
  fotosRegistro: 3,            // Fotos para registrar
  tiempoEntreDetecciones: 1500 // ms entre detecciones
};
```

### QR Dinámico

Configuración en `js/qr-dinamico.js`:

```javascript
const QR_CONFIG = {
  intervaloRotacion: 30000,  // 30 segundos
  algoritmoHash: 'SHA-256'
};
```

---

## 📊 Base de Datos

### Colecciones de Firestore

| Colección | Descripción |
|-----------|-------------|
| `usuarios` | Datos de todos los usuarios |
| `alumnos` | Información específica de alumnos |
| `profesores` | Información específica de profesores |
| `sesiones` | Clases/sesiones registradas |
| `ingresos_cbtis` | Registros de entrada/salida |
| `horarios` | Horarios del plantel |
| `chats` | Conversaciones |
| `avisos` | Avisos por grupo |
| `reportes` | Reportes disciplinarios |

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Santiago Rivera**

- GitHub: [@santirivera-oss](https://github.com/santirivera-oss?tab=overview&from=2025-12-01&to=2025-12-15)
- SitioWeb: [Exara.uk](https://exara.uk)
- Email:  contacto@exara.uk
---

## 🙏 Agradecimientos

- [Firebase](https://firebase.google.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Reconocimiento facial
- [Chart.js](https://www.chartjs.org/) - Gráficas interactivas
- [Html5-QRCode](https://github.com/mebjas/html5-qrcode) - Escáner QR

---

<div align="center">

**⭐ Si este proyecto te fue útil, considera darle una estrella ⭐**

</div>
