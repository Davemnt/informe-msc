// encuestas.js - Lógica para la página pública de encuestas

// Toast helper
window.showToast = function(message, type = 'info', duration = 3500) {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.innerHTML = `<span>${message}</span><button class="close-toast" aria-label="Cerrar">&times;</button>`;
        container.appendChild(div);
        requestAnimationFrame(() => div.classList.add('show'));
        const closeFn = () => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 300);
        };
        div.querySelector('.close-toast').addEventListener('click', closeFn);
        if (duration > 0) setTimeout(closeFn, duration);
    } catch (e) { console.error('showToast error', e); }
};

class EncuestasPublicas {
    constructor() {
        this.encuestasActivas = [];
        this.votosUsuario = this.loadVotosUsuario();
    }

    // Cargar votos previos del usuario desde localStorage
    loadVotosUsuario() {
        const votos = localStorage.getItem('encuestasVotadas');
        return votos ? JSON.parse(votos) : {};
    }

    // Guardar voto del usuario en localStorage
    saveVotoUsuario(encuestaId) {
        this.votosUsuario[encuestaId] = true;
        localStorage.setItem('encuestasVotadas', JSON.stringify(this.votosUsuario));
    }

    // Verificar si el usuario ya votó en una encuesta
    hasVotado(encuestaId) {
        return !!this.votosUsuario[encuestaId];
    }

    async loadEncuestasActivas() {
        const container = document.getElementById('encuestasContainer');
        console.log('[ENCUESTAS] Cargando encuestas activas...');

        try {
            if (!window.firebaseApp || !window.firebaseApp.db) {
                container.innerHTML = '<div class="no-data">❌ No se pudo conectar a la base de datos</div>';
                return;
            }

            const snapshot = await window.firebaseApp.db
                .collection('encuestas')
                .where('activa', '==', true)
                .get();

            // Ordenar en el cliente para evitar necesidad de índice compuesto
            this.encuestasActivas = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeB - timeA; // Más reciente primero
                });

            if (this.encuestasActivas.length === 0) {
                container.innerHTML = `
                    <div class="no-polls">
                        <span class="no-polls-icon">📭</span>
                        <h3>No hay encuestas activas</h3>
                        <p>En este momento no hay encuestas disponibles para responder. Vuelve pronto.</p>
                    </div>`;
                return;
            }

            this.renderEncuestas(container);
        } catch (e) {
            console.error('[ENCUESTAS] Error cargando encuestas:', e);
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <p>❌ Ocurrió un error al cargar las encuestas. Intenta recargar la página.</p>
                </div>`;
        }
    }

    renderEncuestas(container) {
        let html = '';

        this.encuestasActivas.forEach(encuesta => {
            const yaVoto = this.hasVotado(encuesta.id);
            const totalVotos = encuesta.totalVotos || 0;

            html += `
                <div class="poll-card">
                    <h3 class="poll-title">${encuesta.titulo}</h3>
                    <p class="poll-question">${encuesta.pregunta}</p>
                    
                    ${yaVoto ? this.renderResultadosUsuario(encuesta) : this.renderOpcionesVoto(encuesta)}
                    
                    <div style="margin-top:1rem; font-size:0.9rem; color:var(--color-gris-oscuro); text-align:right;">
                         Total de votos: <strong>${totalVotos}</strong> 📊
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderOpcionesVoto(encuesta) {
        let html = '<div class="poll-options">';
        
        encuesta.opciones.forEach(opcion => {
            html += `
                <div class="poll-option" onclick="encuestas.votar('${encuesta.id}', '${opcion.id}')">
                    <span class="poll-option-text">${opcion.texto}</span>
                    <span style="font-size:1.2rem; color:var(--color-gris-medio);">➜</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    renderResultadosUsuario(encuesta) {
        const totalVotos = encuesta.totalVotos || 0;
        let html = '<div class="poll-results">';
        html += '<p style="color:var(--color-success); font-weight:500; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;"><span>✅</span> Gracias por tu voto</p>';

        encuesta.opciones.forEach(opcion => {
            const porcentaje = totalVotos > 0 ? Math.round((opcion.votos / totalVotos) * 100) : 0;
            html += `
                <div class="mb-3">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                        <span style="font-weight:500;">${opcion.texto}</span>
                        <span style="font-weight:bold;">${porcentaje}%</span>
                    </div>
                    <div class="result-bar-container">
                        <div class="result-bar" style="width: ${porcentaje}%"></div>
                    </div>
                    <div class="vote-count">${opcion.votos} votos</div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    async votar(encuestaId, opcionId) {
        console.log('[ENCUESTAS] Votando:', { encuestaId, opcionId });

        if (this.hasVotado(encuestaId)) {
            window.showToast('Ya has votado en esta encuesta', 'info');
            return;
        }

        try {
            if (!window.firebaseApp || !window.firebaseApp.db) {
                window.showToast('Error de conexión', 'error');
                return;
            }

            const db = window.firebaseApp.db;
            const encuestaRef = db.collection('encuestas').doc(encuestaId);

            // Usar transacción para actualizar los votos de forma atómica
            await db.runTransaction(async (transaction) => {
                const encuestaDoc = await transaction.get(encuestaRef);
                
                if (!encuestaDoc.exists) {
                    throw new Error('Encuesta no encontrada');
                }

                const encuesta = encuestaDoc.data();
                const opciones = encuesta.opciones.map(opt => {
                    if (opt.id === opcionId) {
                        return { ...opt, votos: (opt.votos || 0) + 1 };
                    }
                    return opt;
                });

                transaction.update(encuestaRef, {
                    opciones: opciones,
                    totalVotos: (encuesta.totalVotos || 0) + 1
                });
            });

            // Guardar registro del voto (opcional - para analytics)
            await db.collection('votos').add({
                encuestaId: encuestaId,
                opcionId: opcionId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Marcar como votado en localStorage
            this.saveVotoUsuario(encuestaId);

            window.showToast('¡Gracias por tu voto!', 'success');

            // Recargar encuestas para mostrar resultados
            setTimeout(() => this.loadEncuestasActivas(), 500);

        } catch (e) {
            console.error('[ENCUESTAS] Error al votar:', e);
            window.showToast('Error al registrar tu voto', 'error');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ENCUESTAS] Inicializando página de encuestas');
    window.encuestas = new EncuestasPublicas();
    
    // Esperar a que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebaseApp && window.firebaseApp.db) {
            clearInterval(checkFirebase);
            window.encuestas.loadEncuestasActivas();
        }
    }, 100);

    // Timeout después de 5 segundos
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.firebaseApp || !window.firebaseApp.db) {
            document.getElementById('encuestasContainer').innerHTML = 
                '<div class="no-data">⚠️ Error: No se pudo conectar con Firebase</div>';
        }
    }, 5000);
});
