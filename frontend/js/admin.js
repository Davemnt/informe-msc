// Permitir que los botones llamen a verInforme desde HTML
window.verInforme = function(id) {
    if (window.admin && typeof window.admin.viewInforme === 'function') {
        window.admin.viewInforme(id);
    }
};
// Toast helper
window.showToast = function(message, type = 'info', duration = 3500) {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.innerHTML = `<span>${message}</span><button class="close-toast" aria-label="Cerrar">&times;</button>`;
        container.appendChild(div);
        // show
        requestAnimationFrame(() => div.classList.add('show'));
        const closeFn = () => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 300);
        };
        div.querySelector('.close-toast').addEventListener('click', closeFn);
        if (duration > 0) setTimeout(closeFn, duration);
    } catch (e) { console.error('showToast error', e); }
};
// ...existing code...
// ===============================================
// PANEL ADMINISTRATIVO - GESTIÓN COMPLETA DE INFORMES
// ===============================================

class AdminPanel {
            showEditarPreguntaModal(id, texto, tipo, orden, activa) {
                document.getElementById('admin_modalEditarPregunta').style.display = 'block';
                document.getElementById('admin_editarPreguntaId').value = id;
                document.getElementById('admin_editarPreguntaTexto').value = decodeURIComponent(texto);
                document.getElementById('admin_editarPreguntaTipo').value = tipo;
                document.getElementById('admin_editarPreguntaOrden').value = orden;
                const chk = document.getElementById('admin_editarPreguntaActiva');
                if (chk) chk.checked = (activa === true || activa === 'true' || activa === 1 || activa === '1');
            }

            closeEditarPreguntaModal() {
                document.getElementById('admin_modalEditarPregunta').style.display = 'none';
            }

            async editarPregunta(e) {
                e.preventDefault();
                const id = document.getElementById('admin_editarPreguntaId').value;
                const texto = document.getElementById('admin_editarPreguntaTexto').value.trim();
                const tipo = document.getElementById('admin_editarPreguntaTipo').value;
                const orden = parseInt(document.getElementById('admin_editarPreguntaOrden').value, 10) || 0;
                if (!texto) {
                    alert('El texto de la pregunta es obligatorio');
                    return;
                }
                try {
                    const activa = document.getElementById('admin_editarPreguntaActiva') ? document.getElementById('admin_editarPreguntaActiva').checked : true;
                    if (window.firebaseApp && window.firebaseApp.db) {
                        await window.firebaseApp.db.collection('preguntas').doc(id).update({
                            texto,
                            tipo,
                            orden,
                            activa: !!activa
                        });
                        this.closeEditarPreguntaModal();
                            this.loadPreguntas();
                            window.showToast('Pregunta actualizada', 'success');
                        return;
                    }
                    // Fallback to API if Firebase not available
                    const token = localStorage.getItem('adminToken');
                    const res = await fetch(`/api/admin/preguntas/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ texto, tipo, orden, activa: 1 })
                    });
                    if (res.ok) {
                        this.closeEditarPreguntaModal();
                        this.loadPreguntas();
                        window.showToast('Pregunta actualizada', 'success');
                    } else {
                        window.showToast('No se pudo editar la pregunta', 'error');
                    }
                } catch (e) {
                    console.error('editarPregunta error:', e);
                    window.showToast('Error al editar pregunta', 'error');
                }
            }
        // Obtener IDs de informes visualizados (sincronizado en Firestore)
        async getVisualizados() {
            try {
                // Intentar obtener de Firestore si está disponible
                if (window.firebaseApp && window.firebaseApp.db && this.currentUser) {
                    const docRef = window.firebaseApp.db.collection('informes_vistos').doc(this.currentUser);
                    const doc = await docRef.get();
                    
                    if (doc.exists) {
                        const data = doc.data();
                        console.log('Informes vistos cargados de Firestore:', data.ids?.length || 0);
                        return data.ids || [];
                    } else {
                        console.log('No hay informes vistos en Firestore para este usuario');
                        return [];
                    }
                }
            } catch (error) {
                console.warn('Error obteniendo informes vistos de Firestore, usando localStorage:', error);
            }
            
            // Fallback a localStorage
            const v = localStorage.getItem('informesVisualizados');
            return v ? JSON.parse(v) : [];
        }

        // Guardar IDs de informes visualizados (sincronizado en Firestore)
        async setVisualizados(ids) {
            try {
                // Guardar en Firestore si está disponible
                if (window.firebaseApp && window.firebaseApp.db && this.currentUser) {
                    const docRef = window.firebaseApp.db.collection('informes_vistos').doc(this.currentUser);
                    await docRef.set({
                        ids: ids,
                        usuario: this.currentUser,
                        ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Informes vistos guardados en Firestore:', ids.length);
                    
                    // También guardar en localStorage como cache
                    localStorage.setItem('informesVisualizados', JSON.stringify(ids));
                    return;
                }
            } catch (error) {
                console.error('Error guardando informes vistos en Firestore:', error);
                console.warn('Usando localStorage como fallback');
            }
            
            // Fallback a localStorage
            localStorage.setItem('informesVisualizados', JSON.stringify(ids));
        }

        // Marcar un informe como visualizado
        async marcarVisualizado(id) {
            const visualizados = await this.getVisualizados();
            if (!visualizados.includes(id)) {
                visualizados.push(id);
                await this.setVisualizados(visualizados);
            }
        }

        // Marcar como visto y actualizar vistas
        async marcarComoVisto(id) {
            console.log('Marcando informe como visto:', id);
            await this.marcarVisualizado(id);
            window.showToast('Informe marcado como visto', 'success');
            
            // Actualizar estadísticas
            await this.loadStats();
            
            // Actualizar la vista actual
            if (this.currentTab === 'todos') {
                await this.loadTodosInformes();
            } else if (this.currentTab === 'visualizados') {
                await this.loadVisualizados();
            }
        }
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.currentUser = localStorage.getItem('adminUser');
        this.currentTab = 'todos';
        this.allInformes = [];
        
        this.checkAuthentication();
        this.initializeEventListeners();
    }

    // 🔐 Autenticación y Login
    checkAuthentication() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');

        if (this.token && this.currentUser) {
            // Usuario ya autenticado
            this.showAdminPanel();
        } else {
            // Mostrar pantalla de login
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    }

    initializeEventListeners() {
        // Formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        // Mostrar/ocultar PIN
        const pinInput = document.getElementById('pin');
        const togglePin = document.getElementById('togglePin');
        const iconShow = document.getElementById('iconShowPin');
        const iconHide = document.getElementById('iconHidePin');
        if (pinInput && togglePin && iconShow && iconHide) {
            togglePin.addEventListener('click', function() {
                if (pinInput.type === 'password') {
                    pinInput.type = 'text';
                    iconShow.style.display = 'none';
                    iconHide.style.display = 'block';
                    togglePin.setAttribute('aria-label', 'Ocultar PIN');
                } else {
                    pinInput.type = 'password';
                    iconShow.style.display = 'block';
                    iconHide.style.display = 'none';
                    togglePin.setAttribute('aria-label', 'Mostrar PIN');
                }
            });
        }

        // Cerrar modal al hacer clic fuera de él
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('informeModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Tecla ESC para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        // Now using PIN-only flow: read PIN input
        const pin = document.getElementById('pin').value;

        if (!pin) {
            this.showLoginMessage('Por favor ingrese el PIN', 'error');
            return;
        }

        // Debug info (no mostrar PIN en texto claro)
        console.debug('AdminPanel.handleLogin: pinLength=', pin ? pin.length : 0, ' firebaseApp=', !!window.firebaseApp);

        this.setLoginLoading(true);

        try {
            if (window.firebaseApp && typeof window.firebaseApp.signIn === 'function') {
                // Use Firebase Auth with fixed admin email and PIN as password
                const adminEmail = window.firebaseApp.adminEmail || 'admin@informe-msc.local';
                try {
                    const user = await window.firebaseApp.signIn(adminEmail, pin);
                    localStorage.setItem('adminToken', user.uid);
                    localStorage.setItem('adminUser', adminEmail);
                    this.token = user.uid;
                    this.currentUser = adminEmail;

                    this.showLoginMessage('¡Login exitoso! Cargando panel...', 'success');
                    setTimeout(async () => await this.showAdminPanel(), 800);
                } catch (fbErr) {
                    console.error('Firebase signIn error:', fbErr);
                    const msg = (fbErr && (fbErr.message || fbErr.code)) ? (fbErr.message || fbErr.code) : 'Error de autenticación con Firebase';
                    this.showLoginMessage(msg, 'error');
                }
            } else {
                // Fallback to existing backend auth
                // For fallback, send PIN to backend login endpoint as { pin }
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminUser', data.usuario);
                    this.token = data.token;
                    this.currentUser = data.usuario;
                    this.showLoginMessage('¡Login exitoso! Cargando panel...', 'success');
                    setTimeout(async () => await this.showAdminPanel(), 800);
                } else {
                    this.showLoginMessage(data.error || 'Error de autenticación', 'error');
                }
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showLoginMessage(error.message || 'Error de conexión. Verifique su conexión a internet.', 'error');
        } finally {
            this.setLoginLoading(false);
        }
    }

    async showAdminPanel() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        const adminUserElement = document.getElementById('adminUser');

        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        if (adminUserElement) {
            adminUserElement.textContent = `👤 ${this.currentUser}`;
        }

        // Sincronizar informes vistos entre localStorage y Firestore
        await this.syncInformesVistos();
        
        // Cargar datos iniciales
        this.loadInitialData();
    }

    logout() {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.reload();
        }
    }

    setLoginLoading(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginLoading = document.getElementById('loginLoading');

        if (loading) {
            loginBtn.disabled = true;
            loginText.classList.add('hidden');
            loginLoading.classList.remove('hidden');
        } else {
            loginBtn.disabled = false;
            loginText.classList.remove('hidden');
            loginLoading.classList.add('hidden');
        }
    }

    showLoginMessage(message, type = 'info') {
        const container = document.getElementById('loginMessage');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type} fade-in`;
        messageDiv.textContent = message;

        container.innerHTML = '';
        container.appendChild(messageDiv);

        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (messageDiv.parentElement) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    // 📊 Carga de datos y estadísticas
    async syncInformesVistos() {
        try {
            console.log('Sincronizando informes vistos...');
            
            // Obtener datos de localStorage
            const localData = localStorage.getItem('informesVisualizados');
            const localIds = localData ? JSON.parse(localData) : [];
            
            // Si hay Firebase disponible
            if (window.firebaseApp && window.firebaseApp.db && this.currentUser) {
                const docRef = window.firebaseApp.db.collection('informes_vistos').doc(this.currentUser);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    // Ya existe en Firestore, usar esos datos
                    const firestoreData = doc.data();
                    const firestoreIds = firestoreData.ids || [];
                    console.log('Datos en Firestore:', firestoreIds.length);
                    
                    // Combinar ambos conjuntos de datos (sin duplicados)
                    const combined = [...new Set([...localIds, ...firestoreIds])];
                    
                    if (combined.length > firestoreIds.length) {
                        // Hay nuevos datos en localStorage, actualizar Firestore
                        console.log('Actualizando Firestore con datos locales...');
                        await this.setVisualizados(combined);
                    } else {
                        // Firestore está actualizado, solo actualizar localStorage
                        localStorage.setItem('informesVisualizados', JSON.stringify(firestoreIds));
                    }
                } else if (localIds.length > 0) {
                    // No existe en Firestore pero hay datos locales, migrarlos
                    console.log('Migrando datos locales a Firestore...');
                    await this.setVisualizados(localIds);
                }
            }
            
            console.log('Sincronización completada');
        } catch (error) {
            console.error('Error en sincronización de informes vistos:', error);
        }
    }
    
    async loadInitialData() {
        console.log('AdminPanel.loadInitialData: start', { token: this.token, firebaseApp: !!window.firebaseApp });
        try {
            await Promise.all([
                this.loadStats(),
                this.loadTodosInformes()
            ]);
            console.log('AdminPanel.loadInitialData: completed');
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showMessage('Error cargando datos del panel', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await this.fetchWithAuth('/api/admin/informes');
            
            if (response.ok) {
                const data = await response.json();
                this.allInformes = data.informes;
                this.updateStats(data.informes);
            } else {
                throw new Error('Error cargando estadísticas');
            }

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.updateStats([]);
        }
    }

    async updateStats(informes) {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().toISOString().slice(0, 7);

        const totalInformes = informes.length;
        const totalPersonas = new Set(informes.map(i => `${i.nombre} ${i.apellido}`)).size;
        const informesHoy = informes.filter(i => typeof i.fecha_informe === 'string' && i.fecha_informe.startsWith(today)).length;
        
        // Calcular informes visualizados y pendientes
        const visualizados = await this.getVisualizados();
        const informesVistos = informes.filter(i => visualizados.includes(i.id)).length;
        const informesPendientes = totalInformes - informesVistos;

        document.getElementById('totalInformes').textContent = totalInformes;
        document.getElementById('totalPersonas').textContent = totalPersonas;
        document.getElementById('informesHoy').textContent = informesHoy;
        document.getElementById('informesVistos').textContent = informesVistos;
        document.getElementById('informesPendientes').textContent = informesPendientes;
    }

    // 📋 Gestión de tabs
    switchTab(tabName) {
        // Actualizar tabs activos
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`button[onclick="admin.switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');

        this.currentTab = tabName;

        // Cargar datos específicos del tab
        switch (tabName) {
            case 'todos':
                this.loadTodosInformes();
                break;
            case 'visualizados':
                this.loadVisualizados();
                break;
            case 'agrupados':
                this.loadAgrupadosData();
                break;
            case 'preguntas':
                this.loadPreguntas();
                break;
            case 'filtros':
                // Los filtros no necesitan carga automática
                break;
        }
    }

    // ❓ Tab: Preguntas Personalizadas
    async loadPreguntas() {
            const container = document.getElementById('preguntasContainer');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Cargando preguntas...</p></div>';
        console.log('AdminPanel.loadPreguntas: start', { firebaseAvailable: !!window.firebaseApp });
        try {
            let preguntas = null;
            // Try Firestore first, but fail gracefully to static fallback
            if (window.firebaseApp && window.firebaseApp.db) {
                try {
                    const snapshot = await window.firebaseApp.db.collection('preguntas').orderBy('orden').get();
                    preguntas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } catch (fbErr) {
                    console.error('AdminPanel.loadPreguntas: Firestore read error, falling back to static JSON', fbErr);
                    preguntas = null;
                }
            }
            if (!preguntas) {
                // Fallback estático
                try {
                    const fallback = await fetch('/data/preguntas.json');
                    if (!fallback.ok) {
                        container.innerHTML = '<div class="no-data">No hay preguntas personalizadas.</div>';
                        return;
                    }
                    const data = await fallback.json();
                    preguntas = data.preguntas || [];
                } catch (fetchErr) {
                    console.error('AdminPanel.loadPreguntas: static fallback fetch error', fetchErr);
                    container.innerHTML = '<div class="no-data">Error al cargar preguntas.</div>';
                    return;
                }
            }
            if (!preguntas || preguntas.length === 0) {
                container.innerHTML = '<div class="no-data">No hay preguntas personalizadas.</div>';
                return;
            }
            // Filtrar preguntas que no tienen texto (no deben mostrarse)
            preguntas = preguntas.filter(p => p.texto && p.texto.toString().trim().length > 0);
            if (!preguntas || preguntas.length === 0) {
                container.innerHTML = '<div class="no-data">No hay preguntas personalizadas.</div>';
                return;
            }
            let html = '<table class="data-table"><thead><tr><th>Pregunta</th><th>Tipo</th><th>Orden</th><th>Activa</th><th>Acciones</th></tr></thead><tbody>';
            for (const pregunta of preguntas) {
                html += `<tr>
                    <td>${pregunta.texto}</td>
                    <td>${pregunta.tipo}</td>
                    <td>${pregunta.orden}</td>
                    <td>${pregunta.activa ? 'Sí' : 'No'}</td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="admin.showEditarPreguntaModal('${pregunta.id}', '${encodeURIComponent(pregunta.texto)}', '${pregunta.tipo}', ${pregunta.orden}, ${pregunta.activa ? 'true' : 'false'})">✏️ Editar</button>
                        <button class="btn btn-secondary btn-small" onclick="admin.deletePregunta('${pregunta.id}')">🗑️ Eliminar</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table>';
            container.innerHTML = html;
                // Modal pregunta: submit
                const formPregunta = document.getElementById('admin_formPregunta');
                if (formPregunta) {
                    formPregunta.addEventListener('submit', (e) => this.createPregunta(e));
                }

                // Modal editar pregunta: submit
                const formEditarPregunta = document.getElementById('admin_formEditarPregunta');
                if (formEditarPregunta) {
                    formEditarPregunta.addEventListener('submit', (e) => this.editarPregunta(e));
                }

                // Cerrar modales al hacer click fuera
                window.addEventListener('click', (e) => {
                    const modal = document.getElementById('admin_modalPregunta');
                    if (e.target === modal) {
                        this.closePreguntaModal();
                    }
                    const modalEdit = document.getElementById('admin_modalEditarPregunta');
                    if (e.target === modalEdit) {
                        this.closeEditarPreguntaModal();
                    }
                });
        } catch (e) {
            console.error('AdminPanel.loadPreguntas: unexpected error', e);
            container.innerHTML = '<div class="no-data">Error al cargar preguntas.</div>';
        }
    }

    async deletePregunta(id) {
        if (!confirm('¿Seguro que deseas eliminar esta pregunta?')) return;
        const token = localStorage.getItem('adminToken');
        try {
            if (window.firebaseApp && window.firebaseApp.db) {
                await window.firebaseApp.db.collection('preguntas').doc(id).delete();
                this.loadPreguntas();
                window.showToast('Pregunta eliminada', 'success');
                return;
            }
            const res = await fetch(`/api/admin/preguntas/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                this.loadPreguntas();
                window.showToast('Pregunta eliminada', 'success');
            } else {
                window.showToast('No se pudo eliminar la pregunta', 'error');
            }
        } catch (e) {
            window.showToast('Error de red al eliminar pregunta', 'error');
        }
    }

    showAddPreguntaModal() {
        const modal = document.getElementById('admin_modalPregunta');
        if (modal) modal.style.display = 'block';
        // Ensure at least one empty row exists and bind events
        setTimeout(() => {
            if (typeof this.ensureQuestionRow === 'function') this.ensureQuestionRow();
        }, 50);
    }

    closePreguntaModal() {
        const modal = document.getElementById('admin_modalPregunta');
        if (modal) modal.style.display = 'none';
    }

    async createPregunta(e) {
        e.preventDefault();
        // Collect all rows
        const container = document.getElementById('admin_newQuestionsContainer');
        const rows = Array.from(container.querySelectorAll('.question-row'));
        const toCreate = [];
        for (const r of rows) {
            const textoEl = r.querySelector('.admin_row_preguntaTexto');
            if (!textoEl) continue;
            const textoVal = textoEl.value.trim();
            if (!textoVal) continue; // skip empty rows
            const tipoVal = r.querySelector('.admin_row_preguntaTipo').value;
            const ordenVal = parseInt(r.querySelector('.admin_row_preguntaOrden').value, 10) || 0;
            const activaVal = !!r.querySelector('.admin_row_preguntaActiva').checked;
            toCreate.push({ texto: textoVal, tipo: tipoVal, orden: ordenVal, activa: activaVal });
        }

        if (toCreate.length === 0) {
            alert('Agrega al menos una pregunta con texto.');
            return;
        }

        try {
            if (window.firebaseApp && window.firebaseApp.db) {
                console.log('AdminPanel.createPregunta: saving to Firestore', toCreate);
                // add sequentially (could be batched)
                const auth = window.firebaseApp.auth;
                const user = auth && auth.currentUser ? auth.currentUser : null;
                if (!user) {
                    window.showToast('Debes iniciar sesión antes de crear preguntas', 'error');
                    return;
                }
                const uid = user.uid;
                for (const p of toCreate) {
                    try {
                        await window.firebaseApp.db.collection('preguntas').add(Object.assign({}, p, {
                            createdBy: uid,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }));
                    } catch (fbAddErr) {
                        console.error('AdminPanel.createPregunta: Firestore add error for', p, fbAddErr);
                        window.showToast('Error guardando pregunta en Firestore', 'error');
                        return;
                    }
                }
                this.closePreguntaModal();
                // small delay to allow Firestore indexes to update in some environments
                setTimeout(() => this.loadPreguntas(), 400);
                window.showToast(`${toCreate.length} pregunta(s) creada(s)`, 'success');
                return;
            }

            // Fallback to backend API: send multiple sequentially
            const token = localStorage.getItem('adminToken');
            let success = 0;
            for (const p of toCreate) {
                try {
                    const res = await fetch('/api/admin/preguntas', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ texto: p.texto, tipo: p.tipo, orden: p.orden, activa: p.activa ? 1 : 0 })
                    });
                    if (res.ok) success++;
                    else {
                        const txt = await res.text();
                        console.error('AdminPanel.createPregunta: API error response', res.status, txt);
                    }
                } catch (apiErr) {
                    console.error('AdminPanel.createPregunta: network/API error for', p, apiErr);
                }
            }
            if (success > 0) {
                this.closePreguntaModal();
                this.loadPreguntas();
                window.showToast(`${success} pregunta(s) creada(s)`, 'success');
            } else {
                window.showToast('No se pudieron crear las preguntas', 'error');
            }
        } catch (e) {
            console.error('createPregunta error:', e);
            window.showToast('Error al crear pregunta(s)', 'error');
        }
    }

    // Add a new empty question row to the modal
    addPreguntaRow() {
        const container = document.getElementById('admin_newQuestionsContainer');
        if (!container) return;
        const template = container.querySelector('.question-row');
        const newRow = template.cloneNode(true);
        // clear inputs
        newRow.querySelector('.admin_row_preguntaTexto').value = '';
        newRow.querySelector('.admin_row_preguntaTipo').value = 'texto';
        newRow.querySelector('.admin_row_preguntaOrden').value = '0';
        // default: desactivada hasta que el admin la marque explícitamente
        const actCheckbox = newRow.querySelector('.admin_row_preguntaActiva');
        if (actCheckbox) actCheckbox.checked = false;
        // show remove button
        const removeBtn = newRow.querySelector('.admin_removeRow');
        if (removeBtn) {
            removeBtn.style.display = 'inline-block';
            removeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                newRow.remove();
            });
        }
        // Do NOT auto-add rows on input; rows are added only via the '+ Agregar pregunta' button
        container.appendChild(newRow);
    }

    // Ensure at least one empty row and bind the 'Agregar' button
    ensureQuestionRow() {
        const container = document.getElementById('admin_newQuestionsContainer');
        if (!container) return;
        const addBtn = document.getElementById('admin_addQuestionBtn');
        if (addBtn && !addBtn._bound) {
            addBtn.addEventListener('click', () => this.addPreguntaRow());
            addBtn._bound = true;
        }
        // bind existing row's input
        const rows = Array.from(container.querySelectorAll('.question-row'));
        if (rows.length === 0) this.addPreguntaRow();
        rows.forEach((r, idx) => {
            const removeBtn = r.querySelector('.admin_removeRow');
            if (removeBtn && !removeBtn._bound) {
                removeBtn.addEventListener('click', (ev) => { ev.preventDefault(); r.remove(); });
                removeBtn._bound = true;
            }
        });
    }

    // When typing in the last row, add another empty row
    // onRowInput is intentionally a no-op because rows are added only via the button
    onRowInput() {
        return;
    }

    // 📋 Tab: Todos los Informes
    async loadTodosInformes() {
        const container = document.getElementById('todosInformesContainer');
        try {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading"></div>
                    <p>Cargando informes...</p>
                </div>
            `;
            if (window.firebaseApp && typeof window.firebaseApp.fetchAllInformes === 'function') {
                const all = await window.firebaseApp.fetchAllInformes();
                // Filtrar solo los NO visualizados
                const visualizados = await this.getVisualizados();
                const noVisualizados = all.filter(i => !visualizados.includes(i.id));
                this.renderTodosInformes(noVisualizados, container);
            } else {
                throw new Error('Firestore no disponible');
            }
        } catch (error) {
            console.error('Error cargando todos los informes:', error);
            container.innerHTML = `
                <div class="no-data">
                    <p>❌ Error cargando los informes</p>
                    <button class="btn btn-secondary btn-small" onclick="admin.loadTodosInformes()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    // Cargar informes visualizados
    async loadVisualizados() {
        const container = document.getElementById('visualizadosContainer');
        try {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading"></div>
                    <p>Cargando informes visualizados...</p>
                </div>
            `;
            
            // Usar Firestore si está disponible
            if (window.firebaseApp && typeof window.firebaseApp.fetchAllInformes === 'function') {
                const all = await window.firebaseApp.fetchAllInformes();
                const visualizados = await this.getVisualizados();
                const informesVisualizados = all.filter(i => visualizados.includes(i.id));
                this.renderTodosInformes(informesVisualizados, container);
            } else {
                // Fallback al API
                const response = await this.fetchWithAuth('/api/admin/informes');
                if (response.ok) {
                    const data = await response.json();
                    const visualizados = await this.getVisualizados();
                    const informesVisualizados = data.informes.filter(i => visualizados.includes(i.id));
                    this.renderTodosInformes(informesVisualizados, container);
                } else {
                    throw new Error('Error cargando informes visualizados');
                }
            }
        } catch (error) {
            console.error('Error cargando informes visualizados:', error);
            container.innerHTML = `
                <div class="no-data">
                    <p>❌ Error cargando los informes visualizados</p>
                    <button class="btn btn-secondary btn-small" onclick="admin.loadVisualizados()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    renderTodosInformes(informes, container) {
        // Vista de tabla para desktop
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Fecha</th>
                        <th>Organizaciones</th>
                        <th>Unidades</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${informes.length > 0 ? informes.map(informe => this.renderInformeRow(informe)).join('') : `<tr><td colspan="6" style="text-align:center;">📭 No hay informes registrados</td></tr>`}
                </tbody>
            </table>
        `;
        
        // Vista de tarjetas para móvil
        const mobileHTML = `
            <div class="mobile-informes-container">
                ${informes.length > 0 ? informes.map(informe => this.renderMobileCard(informe)).join('') : `<div class="no-data"><p>📭 No hay informes registrados</p></div>`}
            </div>
        `;
        
        container.innerHTML = tableHTML + mobileHTML;
    }

    renderInformeRow(informe) {
        let fecha = 'Sin fecha';
        if (informe.fecha_informe) {
            if (typeof informe.fecha_informe === 'string') {
                const d = new Date(informe.fecha_informe);
                if (!isNaN(d)) fecha = d.toLocaleDateString('es-ES');
            } else if (informe.fecha_informe.toDate) {
                // Firestore Timestamp
                const d = informe.fecha_informe.toDate();
                if (!isNaN(d)) fecha = d.toLocaleDateString('es-ES');
            }
        }
        const organizaciones = informe.organizaciones && informe.organizaciones.length > 0 ? informe.organizaciones.join(', ') : 'Ninguna';
        const unidades = informe.unidades && informe.unidades.length > 0 ? informe.unidades.join(', ') : 'Ninguna';
        
        let estadoBadge = '';
        if (informe.tiene_unidades) {
            estadoBadge = '<span class="badge badge-success">Con unidad</span>';
        } else if (informe.tiene_organizaciones) {
            estadoBadge = '<span class="badge badge-warning">Solo organización</span>';
        } else {
            estadoBadge = '<span class="badge badge-info">Sin asignaciones</span>';
        }

        return `
            <tr>
                <td><strong>${informe.nombre} ${informe.apellido}</strong></td>
                <td>${fecha}</td>
                <td title="${organizaciones}">${this.truncateText(organizaciones, 30)}</td>
                <td title="${unidades}">${this.truncateText(unidades, 25)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="verInforme('${informe.id}')">
                            👁️ Ver
                        </button>
                        <button class="btn btn-success btn-small" onclick="admin.marcarComoVisto('${informe.id}')" title="Marcar como visto">
                            ✓ Visto
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Renderizar tarjeta móvil para un informe
    renderMobileCard(informe) {
        let fecha = 'Sin fecha';
        if (informe.fecha_informe) {
            if (typeof informe.fecha_informe === 'string') {
                const d = new Date(informe.fecha_informe);
                if (!isNaN(d)) fecha = d.toLocaleDateString('es-ES');
            } else if (informe.fecha_informe.toDate) {
                // Firestore Timestamp
                const d = informe.fecha_informe.toDate();
                if (!isNaN(d)) fecha = d.toLocaleDateString('es-ES');
            }
        }
        const organizaciones = informe.organizaciones && informe.organizaciones.length > 0 ? informe.organizaciones.join(', ') : 'Ninguna';
        const unidades = informe.unidades && informe.unidades.length > 0 ? informe.unidades.join(', ') : 'Ninguna';
        
        let estadoBadge = '';
        if (informe.tiene_unidades) {
            estadoBadge = '<span class="badge badge-success">Con unidad</span>';
        } else if (informe.tiene_organizaciones) {
            estadoBadge = '<span class="badge badge-warning">Solo organización</span>';
        } else {
            estadoBadge = '<span class="badge badge-info">Sin asignaciones</span>';
        }

        return `
            <div class="mobile-informe-card">
                <div class="mobile-card-header">
                    <h4 class="mobile-card-name">${informe.nombre} ${informe.apellido}</h4>
                    <span class="mobile-card-date">${fecha}</span>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Organizaciones</span>
                        <span class="mobile-card-value">${organizaciones}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Unidades</span>
                        <span class="mobile-card-value">${unidades}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Estado</span>
                        <span class="mobile-card-value">${estadoBadge}</span>
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <button class="btn btn-primary btn-small" onclick="verInforme('${informe.id}')">
                        👁️ Ver Detalles
                    </button>
                    <button class="btn btn-success btn-small" onclick="admin.marcarComoVisto('${informe.id}')">
                        ✓ Marcar Visto
                    </button>
                </div>
            </div>
        `;
    }

    // 👥 Tab: Por Persona
    async loadAgrupadosData() {
        const container = document.getElementById('agrupadosContainer');
        
        try {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading"></div>
                    <p>Cargando datos agrupados...</p>
                </div>
            `;

            const response = await this.fetchWithAuth('/api/admin/informes/agrupados');
            
            if (response.ok) {
                const data = await response.json();
                this.renderAgrupadosData(data.informes, container);
            } else {
                throw new Error('Error cargando datos agrupados');
            }

        } catch (error) {
            console.error('Error cargando datos agrupados:', error);
            container.innerHTML = `
                <div class="no-data">
                    <p>❌ Error cargando los datos agrupados</p>
                    <button class="btn btn-secondary btn-small" onclick="admin.loadAgrupadosData()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    renderAgrupadosData(personas, container) {
        if (personas.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <p>📭 No hay personas registradas</p>
                </div>
            `;
            return;
        }
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Persona</th>
                        <th>Total Informes</th>
                        <th>Último Informe Recibido</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${personas.map(persona => this.renderPersonaRow(persona)).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tableHTML;
    }

    renderPersonaRow(persona) {
        function formatFecha(fecha) {
            if (!fecha) return 'Sin fecha';
            const d = new Date(fecha);
            return isNaN(d) ? 'Sin fecha' : d.toLocaleDateString('es-ES');
        }
        // Solo mostrar la fecha del último informe recibido
        const ultimoInforme = formatFecha(persona.ultimo_informe);
        let diasDesdeUltimo = null;
        if (ultimoInforme !== 'Sin fecha') {
            diasDesdeUltimo = Math.floor((new Date() - new Date(persona.ultimo_informe)) / (1000 * 60 * 60 * 24));
        }
        let estadoTiempo = '';
        if (diasDesdeUltimo !== null) {
            if (diasDesdeUltimo <= 15) {
                estadoTiempo = '<span class="badge badge-success">Reciente</span>';
            } else if (diasDesdeUltimo <= 30) {
                estadoTiempo = '<span class="badge badge-warning">Hace tiempo</span>';
            } else {
                estadoTiempo = '<span class="badge badge-info">Inactivo</span>';
            }
        }
        // Botón para ver todas las fechas de informes enviados
        return `
            <tr>
                <td><strong>${persona.persona}</strong></td>
                <td>
                    <span class="badge badge-info">${persona.total_informes}</span>
                </td>
                <td>
                    ${ultimoInforme} ${estadoTiempo}
                    <button class="btn btn-secondary btn-small" style="margin-left:8px;" onclick="admin.showFechasInformes('${persona.ids_informes}','${persona.persona.replace(/'/g, '\'')}')">🗓️</button>
                </td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="admin.viewPersonInformes('${persona.ids_informes}')">
                        📋 Ver Informes
                    </button>
                </td>
            </tr>
        `;
    }
    // Mostrar modal con todas las fechas de informes enviados por la persona
    showFechasInformes(idsString, personaNombre) {
        const ids = idsString.split(',').map(id => id.trim());
        const informesPersona = this.allInformes.filter(informe => ids.includes(String(informe.id)));
        if (informesPersona.length === 0) {
            alert('No hay informes registrados para esta persona.');
            return;
        }
        // Ordenar por fecha descendente
        informesPersona.sort((a, b) => new Date(b.fecha_informe) - new Date(a.fecha_informe));
        const listaFechas = informesPersona.map((i) => {
            const d = new Date(i.fecha_informe);
            return `<li style=\"padding:0.5rem 0;border-bottom:1px solid #eee;display:block;\"><span style=\"font-weight:500;\">${!isNaN(d) ? d.toLocaleString('es-ES') : 'Sin fecha'}</span></li>`;
        }).join('');
        const modal = document.getElementById('informeModal');
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class=\"fechas-modal-content\">
                <h2 class=\"fechas-modal-title\">🗓️ Fechas de informes enviados</h2>
                <div class=\"fechas-modal-persona\">${personaNombre}</div>
                <ul class=\"fechas-modal-list\">${listaFechas}</ul>
                <div class=\"fechas-modal-footer\">
                    <button class=\"btn btn-secondary\" onclick=\"admin.closeModal()\">Cerrar</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        // Agregar estilos responsivos y modernos
        if (!document.getElementById('fechas-modal-style')) {
            const style = document.createElement('style');
            style.id = 'fechas-modal-style';
            style.textContent = `
                .fechas-modal-content {
                    max-width: 420px;
                    margin: 2rem auto;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
                    padding: 1.5rem 1.2rem 1.2rem 1.2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.2rem;
                    animation: fadeIn 0.3s;
                }
                .fechas-modal-title {
                    font-size: 1.3rem;
                    font-weight: 600;
                    margin-bottom: 0.2rem;
                    text-align: center;
                }
                .fechas-modal-persona {
                    color: #666;
                    font-size: 1.05rem;
                    text-align: center;
                    margin-bottom: 0.5rem;
                }
                .fechas-modal-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    max-height: 260px;
                    overflow-y: auto;
                }
                .fechas-modal-list li:last-child {
                    border-bottom: none;
                }
                .fechas-modal-footer {
                    text-align: right;
                }
                @media (max-width: 600px) {
                    .fechas-modal-content {
                        max-width: 98vw;
                        padding: 1rem 0.5rem 0.7rem 0.5rem;
                    }
                    .fechas-modal-title {
                        font-size: 1.05rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 🔍 Tab: Filtros Avanzados
    async applyFilters() {
        const fechaInicio = document.getElementById('filtroFechaInicio').value;
        const fechaFin = document.getElementById('filtroFechaFin').value;
        const organizacion = document.getElementById('filtroOrganizacion').value;
        const unidad = document.getElementById('filtroUnidad').value;

        const container = document.getElementById('filteredContainer');
        const countElement = document.getElementById('filteredCount');

        try {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading"></div>
                    <p>Aplicando filtros...</p>
                </div>
            `;

            const params = new URLSearchParams();
            if (fechaInicio) params.append('fecha_inicio', fechaInicio);
            if (fechaFin) params.append('fecha_fin', fechaFin);
            if (organizacion) params.append('organizacion', organizacion);
            if (unidad) params.append('unidad', unidad);

            const response = await this.fetchWithAuth(`/api/admin/informes/filtrar?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderTodosInformes(data.informes, container);
                countElement.textContent = `${data.informes.length} resultado${data.informes.length !== 1 ? 's' : ''}`;
                countElement.className = 'badge badge-success';
            } else {
                throw new Error('Error aplicando filtros');
            }

        } catch (error) {
            console.error('Error aplicando filtros:', error);
            container.innerHTML = `
                <div class="no-data">
                    <p>❌ Error aplicando filtros</p>
                    <button class="btn btn-secondary btn-small" onclick="admin.applyFilters()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
            countElement.textContent = 'Error';
            countElement.className = 'badge badge-warning';
        }
    }

    clearFilters() {
        document.getElementById('filtroFechaInicio').value = '';
        document.getElementById('filtroFechaFin').value = '';
        document.getElementById('filtroOrganizacion').value = '';
        document.getElementById('filtroUnidad').value = '';

        const container = document.getElementById('filteredContainer');
        const countElement = document.getElementById('filteredCount');

        container.innerHTML = `
            <div class="no-data">
                <p>Configure los filtros y haga clic en "Aplicar Filtros" para ver los resultados</p>
            </div>
        `;

        countElement.textContent = '0 resultados';
        countElement.className = 'badge badge-info';
    }

    // 👁️ Visualización de detalles
    async viewInforme(id) {
        try {
            const informe = this.allInformes.find(i => i.id === id);
            if (!informe) {
                const response = await this.fetchWithAuth('/api/admin/informes');
                if (response.ok) {
                    const data = await response.json();
                    this.allInformes = data.informes;
                    const informeFound = this.allInformes.find(i => i.id === id);
                    if (informeFound) {
                        await this.marcarVisualizado(informeFound.id);
                        this.showInformeModal(informeFound);
                        // Actualizar estadísticas después de marcar como visto
                        await this.loadStats();
                    } else {
                        throw new Error('Informe no encontrado');
                    }
                } else {
                    throw new Error('Error cargando informe');
                }
            } else {
                await this.marcarVisualizado(informe.id);
                this.showInformeModal(informe);
                // Actualizar estadísticas después de marcar como visto
                await this.loadStats();
            }
        } catch (error) {
            console.error('Error mostrando informe:', error);
            alert('Error cargando el detalle del informe');
        }
    }

    showInformeModal(informe) {
        const modal = document.getElementById('informeModal');
        const modalBody = document.getElementById('modalBody');

        let fecha = 'Sin fecha';
        if (informe.fecha_informe) {
            if (typeof informe.fecha_informe === 'string') {
                const d = new Date(informe.fecha_informe);
                if (!isNaN(d)) fecha = d.toLocaleString('es-ES');
            } else if (informe.fecha_informe.toDate) {
                // Firestore Timestamp
                const d = informe.fecha_informe.toDate();
                if (!isNaN(d)) fecha = d.toLocaleString('es-ES');
            }
        }
        
        modalBody.innerHTML = `
            <div style="display: grid; gap: 1.5rem;">
                <!-- Datos Personales -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">👤 Datos Personales</h3>
                    </div>
                    <p><strong>Nombre:</strong> ${informe.nombre}</p>
                    <p><strong>Apellido:</strong> ${informe.apellido}</p>
                    <p><strong>Fecha del Informe:</strong> ${fecha}</p>
                </div>

                <!-- Organizaciones -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">🏢 Organizaciones</h3>
                    </div>
                    <p><strong>Tiene organizaciones:</strong> ${informe.tiene_organizaciones ? 'Sí' : 'No'}</p>
                    ${informe.organizaciones.length > 0 ? `
                        <p><strong>Organizaciones asignadas:</strong></p>
                        <ul style="margin-left: 1.5rem;">
                            ${informe.organizaciones.map(org => `<li>${org}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>

                <!-- Unidades -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">🏛️ Unidades</h3>
                    </div>
                    <p><strong>Tiene unidades:</strong> ${informe.tiene_unidades ? 'Sí' : 'No'}</p>
                    ${informe.unidades.length > 0 ? `
                        <p><strong>Unidades asignadas:</strong></p>
                        <ul style="margin-left: 1.5rem;">
                            ${informe.unidades.map(unidad => `<li>${unidad}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>

                ${informe.tiene_unidades ? `
                    <!-- Información Específica de Unidad -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📊 Información de Unidad</h3>
                        </div>
                        <p><strong>Trabajan con futuros élderes:</strong> ${informe.trabajo_futuros_elderes ? 'Sí' : 'No'}</p>
                        ${informe.futuros_elderes.length > 0 ? `
                            <p><strong>Futuros élderes:</strong></p>
                            <ul style="margin-left: 1.5rem;">
                                ${informe.futuros_elderes.map(elder => `<li>${elder}</li>`).join('')}
                            </ul>
                        ` : ''}
                        <p><strong>Reunión de presidencia:</strong> ${informe.reunion_presidencia ? 'Sí' : 'No'}</p>
                        <p><strong>Entrevistas de ministración:</strong> ${informe.entrevistas_ministracion ? 'Sí' : 'No'}</p>
                    </div>
                ` : ''}

                <!-- Informe Detallado -->
                ${informe.informe_detallado ? `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📋 Informe Detallado</h3>
                        </div>
                        <div style="background: var(--color-gris-claro); padding: 1rem; border-radius: var(--border-radius); white-space: pre-wrap; text-align: left;">
                            <div style="text-align:left;width:100%;display:block;">${informe.informe_detallado}</div>
                        </div>
                    </div>
                ` : ''}

                <!-- Botón Eliminar -->
                <div style="text-align: right;">
                    <button class="btn btn-danger" id="deleteInformeBtn">🗑️ Eliminar Informe</button>
                </div>
            </div>
        `;

        // Agregar handler para eliminar
        setTimeout(() => {
            const btn = document.getElementById('deleteInformeBtn');
            if (btn) {
                btn.onclick = async () => {
                    if (confirm('¿Está seguro de que desea eliminar este informe? Esta acción no se puede deshacer.')) {
                        try {
                            await this.deleteInforme(informe.id);
                            this.showMessage('Informe eliminado correctamente', 'success');
                            this.closeModal();
                            await this.refreshData();
                        } catch (err) {
                            this.showMessage('Error eliminando informe: ' + (err.message || err), 'error');
                        }
                    }
                };
            }
        }, 0);

        modal.style.display = 'block';
    }

    // Eliminar informe de Firestore
    async deleteInforme(id) {
        if (window.firebaseApp && typeof window.firebaseApp.deleteInforme === 'function') {
            await window.firebaseApp.deleteInforme(id);
            await this.loadTodosInformes();
        } else {
            alert('No se puede eliminar informe: Firestore no disponible.');
        }
    }

    viewPersonInformes(idsString) {
        const ids = idsString.split(',').map(id => parseInt(id.trim()));
        const informesPersona = this.allInformes.filter(informe => ids.includes(informe.id));

        if (informesPersona.length > 0) {
            const modal = document.getElementById('informeModal');
            const modalBody = document.getElementById('modalBody');
            
            const persona = `${informesPersona[0].nombre} ${informesPersona[0].apellido}`;

            modalBody.innerHTML = `
                <div style="margin-bottom: 2rem;">
                    <h3>📋 Histórico de Informes - ${persona}</h3>
                    <p>Total de informes: <strong>${informesPersona.length}</strong></p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto;">
                    ${informesPersona
                        .sort((a, b) => new Date(b.fecha_informe) - new Date(a.fecha_informe))
                        .map(informe => {
                            const fecha = new Date(informe.fecha_informe).toLocaleDateString('es-ES');
                            return `
                                <div class="card" style="cursor: pointer;" onclick="admin.viewInforme(${informe.id})">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>Informe #${informe.id}</strong> - ${fecha}
                                            <br>
                                            <small style="color: var(--color-gris-oscuro);">
                                                ${informe.organizaciones.concat(informe.unidades).slice(0, 2).join(', ')}
                                                ${informe.organizaciones.concat(informe.unidades).length > 2 ? '...' : ''}
                                            </small>
                                        </div>
                                        <button class="btn btn-primary btn-small">
                                            Ver Detalle
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            `;

            modal.style.display = 'block';
        }
    }

    closeModal() {
        const modal = document.getElementById('informeModal');
        modal.style.display = 'none';
        
        // Actualizar vistas de informes si estamos en las pestañas de informes
        if (this.currentTab === 'todos' || this.currentTab === 'visualizados') {
            if (this.currentTab === 'todos') {
                this.loadTodosInformes();
            } else if (this.currentTab === 'visualizados') {
                this.loadVisualizados();
            }
        }
    }

    // 🔄 Funciones de utilidad
    async refreshData() {
        await this.loadStats();
        
        switch (this.currentTab) {
            case 'todos':
                await this.loadTodosInformes();
                break;
            case 'agrupados':
                await this.loadAgrupadosData();
                break;
            case 'filtros':
                if (this.hasActiveFilters()) {
                    await this.applyFilters();
                }
                break;
        }
        
        this.showMessage('Datos actualizados correctamente', 'success');
    }

    hasActiveFilters() {
        return document.getElementById('filtroFechaInicio').value ||
               document.getElementById('filtroFechaFin').value ||
               document.getElementById('filtroOrganizacion').value ||
               document.getElementById('filtroUnidad').value;
    }

    exportData() {
        try {
            let dataToExport = [];
            
            // Determinar qué datos exportar según el tab activo
            switch (this.currentTab) {
                case 'todos':
                    dataToExport = this.allInformes;
                    break;
                case 'filtros':
                    // Obtener los datos filtrados del contenedor
                    const filteredTable = document.querySelector('#filteredContainer table');
                    if (filteredTable) {
                        // Aquí podrías implementar la exportación de datos filtrados
                        alert('Funcionalidad de exportación en desarrollo');
                        return;
                    } else {
                        alert('No hay datos filtrados para exportar');
                        return;
                    }
                default:
                    dataToExport = this.allInformes;
            }

            if (dataToExport.length === 0) {
                alert('No hay datos para exportar');
                return;
            }

            // Exportar como CSV simple
            this.exportToCSV(dataToExport);
            
        } catch (error) {
            console.error('Error exportando datos:', error);
            alert('Error al exportar los datos');
        }
    }

    exportToCSV(data) {
        const headers = ['ID', 'Nombre', 'Apellido', 'Fecha', 'Organizaciones', 'Unidades', 'Futuros Élderes', 'Reunión Presidencia', 'Entrevistas Ministración', 'Informe Detallado'];
        
        const csvContent = [
            headers.join(','),
            ...data.map(informe => [
                informe.id,
                `"${informe.nombre}"`,
                `"${informe.apellido}"`,
                `"${new Date(informe.fecha_informe).toLocaleString('es-ES')}"`,
                `"${informe.organizaciones.join('; ')}"`,
                `"${informe.unidades.join('; ')}"`,
                `"${informe.futuros_elderes.join('; ')}"`,
                informe.reunion_presidencia ? 'Sí' : 'No',
                informe.entrevistas_ministracion ? 'Sí' : 'No',
                `"${(informe.informe_detallado || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `informes_sumo_consejo_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async fetchWithAuth(url) {
        // If Firebase is configured, handle admin routes locally using Firestore
        if (window.firebaseApp && typeof window.firebaseApp.fetchAllInformes === 'function') {
            try {
                const all = await window.firebaseApp.fetchAllInformes();

                if (url.includes('/api/admin/informes/agrupados')) {
                    // Group by person
                    const map = {};
                    all.forEach(item => {
                        const key = (item.nombre || '').toLowerCase() + '|' + (item.apellido || '').toLowerCase();
                        if (!map[key]) {
                            map[key] = { persona: `${item.nombre} ${item.apellido}`, total_informes: 0, ultimo_informe: item.fecha_informe || '', primer_informe: item.fecha_informe || '', ids_informes: [] };
                        }
                        const entry = map[key];
                        entry.total_informes += 1;
                        if (!entry.ultimo_informe || new Date(item.fecha_informe) > new Date(entry.ultimo_informe)) entry.ultimo_informe = item.fecha_informe;
                        if (!entry.primer_informe || new Date(item.fecha_informe) < new Date(entry.primer_informe)) entry.primer_informe = item.fecha_informe;
                        entry.ids_informes.push(item.id);
                    });
                    const grouped = Object.values(map).map(g => ({ ...g, ids_informes: g.ids_informes.join(',') }));
                    return { ok: true, json: async () => ({ informes: grouped }) };
                }

                if (url.includes('/api/admin/informes/filtrar')) {
                    const qs = url.split('?')[1] || '';
                    const params = new URLSearchParams(qs);
                    const fecha_inicio = params.get('fecha_inicio');
                    const fecha_fin = params.get('fecha_fin');
                    const organizacion = params.get('organizacion');
                    const unidad = params.get('unidad');

                    let filtered = all.slice();
                    if (fecha_inicio) filtered = filtered.filter(i => new Date(i.fecha_informe) >= new Date(fecha_inicio));
                    if (fecha_fin) filtered = filtered.filter(i => new Date(i.fecha_informe) <= new Date(fecha_fin));
                    if (organizacion) filtered = filtered.filter(i => JSON.stringify(i.organizaciones || []).toLowerCase().includes(organizacion.toLowerCase()));
                    if (unidad) filtered = filtered.filter(i => JSON.stringify(i.unidades || []).toLowerCase().includes(unidad.toLowerCase()));

                    return { ok: true, json: async () => ({ informes: filtered }) };
                }

                // Default: return all informes in a shape similar to backend
                return { ok: true, json: async () => ({ informes: all }) };
            } catch (err) {
                return { ok: false, json: async () => ({ error: err.message }) };
            }
        }

        // Fallback to backend API
        return fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    }

    showMessage(message, type = 'info') {
        // Crear mensaje temporal en la esquina superior derecha
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type} fade-in`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '10000';
        messageDiv.style.maxWidth = '300px';

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// Inicializar panel administrativo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.admin = new AdminPanel();
});