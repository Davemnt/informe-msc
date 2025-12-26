// ===============================================
// FORMULARIO DINÁMICO - LÓGICA CONDICIONAL COMPLETA
// ===============================================

class FormularioDinamico {
    constructor() {
        this.form = document.getElementById('informeForm');
        this.progressBar = document.getElementById('progressBar');
        this.messageContainer = document.getElementById('messageContainer');
        
        this.initializeEventListeners();
        this.createInitialFuturoElderField();
        this.updateProgress();
    }

    initializeEventListeners() {
        // Radio buttons de organizaciones
        document.querySelectorAll('input[name="tiene_organizaciones"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleOrganizacionesChange());
        });

        // Radio buttons de unidades
        document.querySelectorAll('input[name="tiene_unidades"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleUnidadesChange());
        });

        // Radio buttons de futuros élderes
        document.querySelectorAll('input[name="trabajo_futuros_elderes"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleFuturosElderesChange());
        });

        // Checkboxes de organizaciones y unidades para detectar cambios
        document.addEventListener('change', (e) => {
            if (e.target.name === 'organizaciones' || e.target.name === 'unidades') {
                this.checkSpecialCase();
                this.updateProgress();
            }
            if (e.target.name === 'organizaciones') {
                this.updateOrganizacionesSummary();
            }
        });

        // Formulario submit
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Actualizar progreso en tiempo real
        this.form.addEventListener('input', () => this.updateProgress());
        this.form.addEventListener('change', () => this.updateProgress());
        // Inicializar resumen de organizaciones
        this.updateOrganizacionesSummary();
    }

    updateOrganizacionesSummary() {
        const summaryEl = document.getElementById('organizacionesSummary');
        if (!summaryEl) return;
        const checked = document.querySelectorAll('input[name="organizaciones"]:checked').length;
        summaryEl.textContent = `Seleccionadas: ${checked}`;
    }

    // 🏢 Manejo de sección de organizaciones
    handleOrganizacionesChange() {
        const tieneOrganizaciones = document.querySelector('input[name="tiene_organizaciones"]:checked')?.value;
        const organizacionesSection = document.getElementById('organizacionesSection');

        if (tieneOrganizaciones === 'si') {
            this.showSection(organizacionesSection);
        } else {
            this.hideSection(organizacionesSection);
            // Desmarcar todas las organizaciones
            document.querySelectorAll('input[name="organizaciones"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        }

        this.checkSpecialCase();
        this.updateProgress();
    }

    // 🏛️ Manejo de sección de unidades
    handleUnidadesChange() {
        const tieneUnidades = document.querySelector('input[name="tiene_unidades"]:checked')?.value;
        const unidadesSection = document.getElementById('unidadesSection');
        const unidadConditionalSections = document.getElementById('unidadConditionalSections');

        if (tieneUnidades === 'si') {
            this.showSection(unidadesSection);
            this.showSection(unidadConditionalSections);
        } else {
            this.hideSection(unidadesSection);
            this.hideSection(unidadConditionalSections);
            // Desmarcar todas las unidades
            document.querySelectorAll('input[name="unidades"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            // Limpiar futuros élderes
            this.clearFuturosElderes();
        }

        this.checkSpecialCase();
        this.updateProgress();
    }

    // 👨‍🎓 Manejo de futuros élderes
    handleFuturosElderesChange() {
        const trabajaConFuturos = document.querySelector('input[name="trabajo_futuros_elderes"]:checked')?.value;
        const futurosElderesSection = document.getElementById('futurosElderesSection');

        if (trabajaConFuturos === 'si') {
            this.showSection(futurosElderesSection);
        } else {
            this.hideSection(futurosElderesSection);
            this.clearFuturosElderes();
        }

        this.updateProgress();
    }

    // 📋 Verificar caso especial: solo organización sin unidad
    checkSpecialCase() {
        const tieneOrganizaciones = document.querySelector('input[name="tiene_organizaciones"]:checked')?.value === 'si';
        const tieneUnidades = document.querySelector('input[name="tiene_unidades"]:checked')?.value === 'si';
        const organizacionesSeleccionadas = document.querySelectorAll('input[name="organizaciones"]:checked');

        const soloOrganizacionSection = document.getElementById('soloOrganizacionSection');

        // Caso especial: tiene exactamente una organización Y no tiene unidades
        if (tieneOrganizaciones && !tieneUnidades && organizacionesSeleccionadas.length === 1) {
            this.showSection(soloOrganizacionSection);
        } else {
            this.hideSection(soloOrganizacionSection);
        }
    }

    // ➕ Lista dinámica de futuros élderes
    createInitialFuturoElderField() {
        const container = document.getElementById('futurosElderesList');
        this.addFuturoElderField(container);
    }

    addFuturoElderField(container, value = '') {
        const fieldIndex = container.children.length;
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'dynamic-item fade-in';
        
        fieldDiv.innerHTML = `
            <input 
                type="text" 
                name="futuro_elder_${fieldIndex}" 
                class="form-input futuro-elder-input" 
                placeholder="Nombre del futuro élder"
                value="${value}"
            >
            ${fieldIndex > 0 ? '<button type="button" class="remove-item" onclick="formulario.removeFuturoElderField(this)">×</button>' : ''}
        `;

        const input = fieldDiv.querySelector('input');
        input.addEventListener('input', () => {
            this.handleFuturoElderInput(input, container);
            this.updateProgress();
        });

        container.appendChild(fieldDiv);
        // Ajustar alturas de las secciones abiertas para contener el nuevo campo
        this.adjustAncestorHeights(container);
        return input;
    }

    handleFuturoElderInput(input, container) {
        const allInputs = container.querySelectorAll('.futuro-elder-input');
        const hasEmptyField = Array.from(allInputs).some(inp => inp.value.trim() === '');

        // Si no hay campos vacíos, agregar uno nuevo
        if (!hasEmptyField) {
            this.addFuturoElderField(container);
        }
    }

    removeFuturoElderField(button) {
        const fieldDiv = button.parentElement;
        const container = fieldDiv.parentElement;
        
        fieldDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            fieldDiv.remove();
            this.updateProgress();
            // Ajustar alturas después de la eliminación
            this.adjustAncestorHeights(container);
        }, 300);
    }

    // Ajusta maxHeight de ancestros tipo 'conditional-section' o 'form-section' abiertos
    adjustAncestorHeights(el) {
        let node = el;
        while (node && node !== document.body) {
            if (node.classList && (node.classList.contains('conditional-section') || node.classList.contains('form-section'))) {
                if (!node.classList.contains('hidden')) {
                    // Forzar recálculo del height para que el contenedor crezca con su contenido
                    node.style.maxHeight = node.scrollHeight + 'px';
                    node.style.opacity = '1';
                }
            }
            node = node.parentElement;
        }
    }

    clearFuturosElderes() {
        const container = document.getElementById('futurosElderesList');
        container.innerHTML = '';
        this.addFuturoElderField(container);
    }

    // 👁️ Mostrar/ocultar secciones con animación
    showSection(section) {
        // Mostrar y permitir que el contenido expanda el contenedor de forma natural
        section.classList.remove('hidden');
        // Eliminar cualquier restricción previa de altura para que el box crezca con su contenido
        section.style.maxHeight = 'none';
        // Animar opacidad para una transición suave
        setTimeout(() => { section.style.opacity = '1'; }, 10);
    }

    hideSection(section) {
        // Animar opacidad y luego ocultar completamente
        section.style.opacity = '0';
        setTimeout(() => {
            // Restaurar estado oculto y limpiar maxHeight
            section.classList.add('hidden');
            section.style.maxHeight = '';
        }, 300);
    }

    // 📊 Actualizar barra de progreso
    updateProgress() {
        const totalFields = this.getTotalRequiredFields();
        const completedFields = this.getCompletedRequiredFields();
        const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

        this.progressBar.style.width = `${progress}%`;
    }

    getTotalRequiredFields() {
        let total = 2; // Nombre y apellido siempre requeridos

        const tieneUnidades = document.querySelector('input[name="tiene_unidades"]:checked')?.value === 'si';
        const tieneOrganizaciones = document.querySelector('input[name="tiene_organizaciones"]:checked')?.value === 'si';
        const organizacionesSeleccionadas = document.querySelectorAll('input[name="organizaciones"]:checked');

        // Si tiene unidades, el informe detallado es obligatorio
        if (tieneUnidades) {
            total += 1;
        }

        // Caso especial: solo organización sin unidad también requiere ciertos campos
        if (tieneOrganizaciones && !tieneUnidades && organizacionesSeleccionadas.length === 1) {
            // En este caso no hay campos adicionales obligatorios
        }

        return total;
    }

    getCompletedRequiredFields() {
        let completed = 0;

        // Verificar nombre y apellido
        if (document.getElementById('nombre').value.trim()) completed++;
        if (document.getElementById('apellido').value.trim()) completed++;

        const tieneUnidades = document.querySelector('input[name="tiene_unidades"]:checked')?.value === 'si';

        // Si tiene unidades, verificar informe detallado
        if (tieneUnidades) {
            const informeDetallado = document.getElementById('informeDetallado').value.trim();
            if (informeDetallado) completed++;
        }

        return completed;
    }

    // ✅ Validación del formulario
    validateForm() {
        const errors = [];
        this.clearValidationErrors();

        // Validar datos básicos
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();

        if (!nombre) {
            errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
        }

        if (!apellido) {
            errors.push({ field: 'apellido', message: 'El apellido es obligatorio' });
        }

        // Validar que se haya seleccionado organizaciones o unidades
        const tieneOrganizaciones = document.querySelector('input[name="tiene_organizaciones"]:checked');
        const tieneUnidades = document.querySelector('input[name="tiene_unidades"]:checked');

        if (!tieneOrganizaciones) {
            errors.push({ message: 'Debe indicar si tiene organizaciones asignadas' });
        }

        // Si indicó que tiene organizaciones, asegurar que seleccionó al menos una
        if (tieneOrganizaciones?.value === 'si') {
            const organizacionesSeleccionadas = document.querySelectorAll('input[name="organizaciones"]:checked');
            if (organizacionesSeleccionadas.length === 0) {
                errors.push({ message: 'Seleccione al menos una organización' });
            }
        }

        if (!tieneUnidades) {
            errors.push({ message: 'Debe indicar si tiene unidades asignadas' });
        }

        // Si tiene unidades, validar informe detallado
        if (tieneUnidades?.value === 'si') {
            const informeDetallado = document.getElementById('informeDetallado').value.trim();
            if (!informeDetallado) {
                errors.push({ 
                    field: 'informeDetallado', 
                    message: 'El informe detallado es obligatorio cuando tiene unidades asignadas' 
                });
            }
        }

        // Mostrar errores
        errors.forEach(error => {
            if (error.field) {
                this.showValidationError(error.field, error.message);
            } else {
                this.showMessage(error.message, 'error');
            }
        });

        return errors.length === 0;
    }

    clearValidationErrors() {
        document.querySelectorAll('.validation-error').forEach(error => {
            error.classList.remove('show');
        });
    }

    showValidationError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    // 📤 Envío del formulario
    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            this.showMessage('Por favor, corrija los errores antes de enviar', 'error');
            return;
        }

        // Mostrar estado de carga
        this.setSubmitLoading(true);

        try {
            const formData = this.collectFormData();
            const response = await this.submitForm(formData);

            if (response.success) {
                this.showMessage('¡Informe enviado exitosamente!', 'success');
                
                // Redirigir después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html?success=true';
                }, 2000);
            } else {
                throw new Error(response.message || 'Error al enviar el informe');
            }

        } catch (error) {
            console.error('Error enviando informe:', error);
            this.showMessage(error.message || 'Error al enviar el informe. Inténtelo nuevamente.', 'error');
        } finally {
            this.setSubmitLoading(false);
        }
    }

    collectFormData() {
        const data = {
            // Datos básicos
            nombre: document.getElementById('nombre').value.trim(),
            apellido: document.getElementById('apellido').value.trim(),

            // Organizaciones
            tiene_organizaciones: document.querySelector('input[name="tiene_organizaciones"]:checked')?.value === 'si',
            organizaciones: Array.from(document.querySelectorAll('input[name="organizaciones"]:checked')).map(cb => cb.value),

            // Unidades
            tiene_unidades: document.querySelector('input[name="tiene_unidades"]:checked')?.value === 'si',
            unidades: Array.from(document.querySelectorAll('input[name="unidades"]:checked')).map(cb => cb.value),

            // Futuros élderes
            trabajo_futuros_elderes: document.querySelector('input[name="trabajo_futuros_elderes"]:checked')?.value === 'si',
            futuros_elderes: this.collectFuturosElderes(),

            // Reunión de presidencia (puede ser de unidad o organización)
            reunion_presidencia: this.getReunionPresidenciaValue(),

            // Entrevistas de ministración
            entrevistas_ministracion: document.querySelector('input[name="entrevistas_ministracion"]:checked')?.value === 'si',

            // Informe detallado (puede ser de unidad o organización)
            informe_detallado: this.getInformeDetalladoValue()
        };

        return data;
    }

    collectFuturosElderes() {
        const inputs = document.querySelectorAll('.futuro-elder-input');
        return Array.from(inputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);
    }

    getReunionPresidenciaValue() {
        // Priorizar reunión de unidad si está visible
        const unidadReunion = document.querySelector('input[name="reunion_presidencia"]:checked');
        if (unidadReunion) {
            return unidadReunion.value === 'si';
        }

        // Si no, usar reunión de organización
        const orgReunion = document.querySelector('input[name="reunion_presidencia_org"]:checked');
        return orgReunion ? orgReunion.value === 'si' : false;
    }

    getInformeDetalladoValue() {
        // Priorizar informe de unidad si está visible
        const informeUnidad = document.getElementById('informeDetallado').value.trim();
        if (informeUnidad) {
            return informeUnidad;
        }

        // Si no, usar informe de organización
        const informeOrg = document.getElementById('informeOrganizacion')?.value.trim();
        return informeOrg || '';
    }

    async submitForm(data) {
        // If Firebase is available, write to Firestore (we allow unauthenticated creates when rules permit)
        const canUseFirebase = window.firebaseApp && typeof window.firebaseApp.sendInforme === 'function';

        if (canUseFirebase) {
            try {
                console.debug('formulario.submitForm: usando Firebase, data=', data);
                const res = await window.firebaseApp.sendInforme(data);
                console.debug('formulario.submitForm: firebase result=', res);
                this.showMessage('Informe guardado en Firestore (id: ' + (res.id || '') + ')', 'success');
                return { success: true, data: res };
            } catch (err) {
                console.error('formulario.submitForm Firebase error:', err);
                this.showMessage('Error guardando en Firebase: ' + (err.message || err.code || ''), 'error');
                throw new Error(err.message || 'Error guardando en Firebase');
            }
        }

        // Fallback to backend API (or when Firebase SDK present but user not authenticated)
        const response = await fetch('/api/informes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error del servidor');
        }

        return { success: true, data: result };
    }

    setSubmitLoading(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoading = document.getElementById('submitLoading');

        if (loading) {
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type} fade-in`;
        messageDiv.textContent = message;

        // Limpiar mensajes anteriores
        this.messageContainer.innerHTML = '';
        this.messageContainer.appendChild(messageDiv);

        // Auto-remover mensajes de éxito e info después de 5 segundos
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (messageDiv.parentElement) {
                    messageDiv.remove();
                }
            }, 5000);
        }

        // Scroll al mensaje
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Inicializar formulario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.formulario = new FormularioDinamico();
    
    // Agregar animación CSS para fadeOut
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
    `;
    document.head.appendChild(style);
});