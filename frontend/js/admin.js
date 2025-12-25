// ===============================================
// PANEL ADMINISTRATIVO - GESTIÓN COMPLETA DE INFORMES
// ===============================================

class AdminPanel {
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
                    setTimeout(() => this.showAdminPanel(), 800);
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
                    setTimeout(() => this.showAdminPanel(), 800);
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

    showAdminPanel() {
        const loginScreen = document.getElementById('loginScreen');
        const adminPanel = document.getElementById('adminPanel');
        const adminUserElement = document.getElementById('adminUser');

        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        if (adminUserElement) {
            adminUserElement.textContent = `👤 ${this.currentUser}`;
        }

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
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadTodosInformes()
            ]);
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

    updateStats(informes) {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().toISOString().slice(0, 7);

        const totalInformes = informes.length;
        const totalPersonas = new Set(informes.map(i => `${i.nombre} ${i.apellido}`)).size;
        const informesHoy = informes.filter(i => i.fecha_informe.startsWith(today)).length;
        const informesMes = informes.filter(i => i.fecha_informe.startsWith(currentMonth)).length;

        document.getElementById('totalInformes').textContent = totalInformes;
        document.getElementById('totalPersonas').textContent = totalPersonas;
        document.getElementById('informesHoy').textContent = informesHoy;
        document.getElementById('informesMes').textContent = informesMes;
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
            case 'agrupados':
                this.loadAgrupadosData();
                break;
            case 'filtros':
                // Los filtros no necesitan carga automática
                break;
        }
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

            const response = await this.fetchWithAuth('/api/admin/informes');
            
            if (response.ok) {
                const data = await response.json();
                this.renderTodosInformes(data.informes, container);
            } else {
                throw new Error('Error cargando informes');
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

    renderTodosInformes(informes, container) {
        if (informes.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <p>📭 No hay informes registrados</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre Completo</th>
                        <th>Fecha</th>
                        <th>Organizaciones</th>
                        <th>Unidades</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${informes.map(informe => this.renderInformeRow(informe)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    renderInformeRow(informe) {
        const fecha = new Date(informe.fecha_informe).toLocaleDateString('es-ES');
        const organizaciones = informe.organizaciones.length > 0 ? informe.organizaciones.join(', ') : 'Ninguna';
        const unidades = informe.unidades.length > 0 ? informe.unidades.join(', ') : 'Ninguna';
        
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
                <td>${informe.id}</td>
                <td><strong>${informe.nombre} ${informe.apellido}</strong></td>
                <td>${fecha}</td>
                <td title="${organizaciones}">${this.truncateText(organizaciones, 30)}</td>
                <td title="${unidades}">${this.truncateText(unidades, 25)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-small" onclick="admin.viewInforme(${informe.id})">
                            👁️ Ver
                        </button>
                    </div>
                </td>
            </tr>
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
                        <th>Primer Informe</th>
                        <th>Último Informe</th>
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
        const primerInforme = new Date(persona.primer_informe).toLocaleDateString('es-ES');
        const ultimoInforme = new Date(persona.ultimo_informe).toLocaleDateString('es-ES');
        const diasDesdeUltimo = Math.floor((new Date() - new Date(persona.ultimo_informe)) / (1000 * 60 * 60 * 24));

        let estadoTiempo = '';
        if (diasDesdeUltimo <= 15) {
            estadoTiempo = '<span class="badge badge-success">Reciente</span>';
        } else if (diasDesdeUltimo <= 30) {
            estadoTiempo = '<span class="badge badge-warning">Hace tiempo</span>';
        } else {
            estadoTiempo = '<span class="badge badge-info">Inactivo</span>';
        }

        return `
            <tr>
                <td><strong>${persona.persona}</strong></td>
                <td>
                    <span class="badge badge-info">${persona.total_informes}</span>
                </td>
                <td>${primerInforme}</td>
                <td>
                    ${ultimoInforme}
                    ${estadoTiempo}
                </td>
                <td>
                    <button class="btn btn-primary btn-small" onclick="admin.viewPersonInformes('${persona.ids_informes}')">
                        📋 Ver Informes
                    </button>
                </td>
            </tr>
        `;
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
                // Si no está en el cache, cargar de nuevo
                const response = await this.fetchWithAuth('/api/admin/informes');
                if (response.ok) {
                    const data = await response.json();
                    this.allInformes = data.informes;
                    const informeFound = this.allInformes.find(i => i.id === id);
                    if (informeFound) {
                        this.showInformeModal(informeFound);
                    } else {
                        throw new Error('Informe no encontrado');
                    }
                } else {
                    throw new Error('Error cargando informe');
                }
            } else {
                this.showInformeModal(informe);
            }

        } catch (error) {
            console.error('Error mostrando informe:', error);
            alert('Error cargando el detalle del informe');
        }
    }

    showInformeModal(informe) {
        const modal = document.getElementById('informeModal');
        const modalBody = document.getElementById('modalBody');

        const fecha = new Date(informe.fecha_informe).toLocaleString('es-ES');
        
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
                        <div style="background: var(--color-gris-claro); padding: 1rem; border-radius: var(--border-radius); white-space: pre-wrap;">
                            ${informe.informe_detallado}
                        </div>
                    </div>
                ` : ''}

            </div>
        `;

        modal.style.display = 'block';
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