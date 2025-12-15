// ========================
// Configuración de sonidos
// ========================
const sonidos = {
  success: new Audio('assets/beep-success.wav'),
  warning: new Audio('assets/beep-warning.wav'),
  error: new Audio('assets/beep-error.wav')
};
Object.values(sonidos).forEach(a => a.preload = 'auto');
let audioUnlocked = false;

function unlockAudioOnUserGesture() {
  if (audioUnlocked) return;
  Promise.all(Object.values(sonidos).map(audio => 
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(()=>{})
  )).then(() => { audioUnlocked = true; console.log('🔓 Audios desbloqueados'); });
}
document.querySelectorAll('.rol-btn').forEach(b => b.addEventListener('click', unlockAudioOnUserGesture, { once: true }));
if (typeof btnEntrar !== "undefined" && btnEntrar) btnEntrar.addEventListener('click', unlockAudioOnUserGesture, { once: true });

function reproducirBeep(tipo="success") {
  const audio = sonidos[tipo];
  if (!audio) return;
  try { audio.currentTime = 0; audio.play().catch(()=>{}); } catch(e){}
}
