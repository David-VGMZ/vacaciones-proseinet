// ==========================================
// GESTOR DE VACACIONES - PROSEINET (app.js)
// ==========================================

const AppState = {
    usuario: {
        nombre: "Juan Pérez",
        cargo: "Gerente de Operaciones",
        avatarIniciales: "JP",
        saldoDisponible: 15,
        saldoTotal: 20
    },
    empleados: [
        { id: 1, nombre: "Juan Pérez", cargo: "Gerente de Operaciones", depto: "Operaciones", iniciales: "JP", avatarBg: "linear-gradient(135deg, #dc2626, #991b1b)", saldoDisponible: 15, saldoTotal: 20, estado: "Trabajando" },
        { id: 2, nombre: "Carlos Rodríguez", cargo: "Soporte Técnico", depto: "IT", iniciales: "CR", avatarBg: "linear-gradient(135deg, #f59e0b, #d97706)", saldoDisponible: 10, saldoTotal: 15, estado: "Trabajando" },
        { id: 3, nombre: "Maria López", cargo: "Recursos Humanos", depto: "RH", iniciales: "ML", avatarBg: "linear-gradient(135deg, #10b981, #059669)", saldoDisponible: 12, saldoTotal: 20, estado: "Trabajando" },
        { id: 4, nombre: "Alejandro Hernández", cargo: "Desarrollo", depto: "IT", iniciales: "AH", avatarBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)", saldoDisponible: 15, saldoTotal: 20, estado: "Trabajando" },
        { id: 5, nombre: "Sofia Fuentes", cargo: "Ventas", depto: "Ventas", iniciales: "SF", avatarBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)", saldoDisponible: 10, saldoTotal: 15, estado: "Trabajando" },
        { id: 6, nombre: "Luis Gómez", cargo: "Infraestructura", depto: "IT", iniciales: "LG", avatarBg: "linear-gradient(135deg, #dc2626, #b91c1c)", saldoDisponible: 4, saldoTotal: 20, estado: "En Vacaciones" },
        { id: 7, nombre: "Ana Martínez", cargo: "Finanzas", depto: "Finanzas", iniciales: "AM", avatarBg: "linear-gradient(135deg, #0284c7, #0369a1)", saldoDisponible: 14, saldoTotal: 20, estado: "Trabajando" },
        { id: 8, nombre: "Daniel Torres", cargo: "Marketing", depto: "Ventas", iniciales: "DT", avatarBg: "linear-gradient(135deg, #059669, #047857)", saldoDisponible: 18, saldoTotal: 20, estado: "Trabajando" }
    ],
    solicitudes: [
        {
            id: 1,
            empleado: "Carlos Rodríguez",
            cargo: "Soporte Técnico",
            iniciales: "CR",
            avatarBg: "linear-gradient(135deg, #f59e0b, #d97706)",
            fechaInicio: "2026-08-18",
            fechaFin: "2026-08-25",
            fechasTexto: "18 Ago - 25 Ago 2026",
            dias: 6,
            tipo: "Vacaciones Pagadas",
            motivo: "Viaje de vacaciones familiares en la costa.",
            estado: "pendiente"
        },
        {
            id: 2,
            empleado: "Maria López",
            cargo: "Recursos Humanos",
            iniciales: "ML",
            avatarBg: "linear-gradient(135deg, #10b981, #059669)",
            fechaInicio: "2026-09-01",
            fechaFin: "2026-09-10",
            fechasTexto: "01 Sep - 10 Sep 2026",
            dias: 8,
            tipo: "Vacaciones Pagadas",
            motivo: "Descanso programado del periodo 2026.",
            estado: "aprobado"
        },
        {
            id: 3,
            empleado: "Alejandro Hernández",
            cargo: "Desarrollo",
            iniciales: "AH",
            avatarBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            fechaInicio: "2026-10-12",
            fechaFin: "2026-10-16",
            fechasTexto: "12 Oct - 16 Oct 2026",
            dias: 5,
            tipo: "Permiso Personal",
            motivo: "Trámites personales y asuntos familiares.",
            estado: "aprobado"
        },
        {
            id: 4,
            empleado: "Sofia Fuentes",
            cargo: "Ventas",
            iniciales: "SF",
            avatarBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            fechaInicio: "2026-11-02",
            fechaFin: "2026-11-06",
            fechasTexto: "02 Nov - 06 Nov 2026",
            dias: 5,
            tipo: "Vacaciones Pagadas",
            motivo: "Solicitud de descanso anual.",
            estado: "pendiente"
        }
    ],
    notificaciones: [
        { id: 1, texto: "Carlos Rodríguez solicitó 6 días de vacaciones", fecha: "Hace 2 horas", leida: false },
        { id: 2, texto: "La solicitud de María López fue aprobada", fecha: "Ayer", leida: true }
    ],
    filtroActual: "all"
};

// --- PERSISTENCIA CON LOCALSTORAGE ---
function guardarEstado() {
    try {
        localStorage.setItem('ProseinetAppState', JSON.stringify(AppState));
    } catch (e) {
        console.error('Error al guardar estado en localStorage:', e);
    }
}

function cargarEstado() {
    try {
        const saved = localStorage.getItem('ProseinetAppState');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.usuario) AppState.usuario = data.usuario;
            if (data.solicitudes) AppState.solicitudes = data.solicitudes;
            if (data.notificaciones) AppState.notificaciones = data.notificaciones;
            if (data.empleados) AppState.empleados = data.empleados;
        }
    } catch (e) {
        console.error('Error al cargar estado desde localStorage:', e);
    }
}

// Función para cerrar sesión
function cerrarSesion() {
    console.log('Cerrando Sesión...');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando App de Vacaciones Proseinet...');

    cargarEstado();

    renderRequestsTable();
    updateKPIs();
    notificaciones();
    initBuscadorEmpleado();

    // Inicializar vistas secundarias
    renderEmpleadosPage();
    initEmpleadosPage();

    // Inicializar gráficos y componentes
    initVacationChart();
    initTableFilters();
    initVacationCalculator();
    initDetailModal();

    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const mainSidebar = document.getElementById('mainSidebar');
    if (btnToggleSidebar && mainSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            mainSidebar.classList.toggle('show');
        });
    }
});

// --- RENDERIZADO DINÁMICO DE LA TABLA DE SOLICITUDES ---
function renderRequestsTable(filtro = AppState.filtroActual) {
    AppState.filtroActual = filtro;
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const solicitudesFiltradas = AppState.solicitudes.filter(req => {
        if (filtro === 'all') return true;
        return req.estado === filtro;
    });

    if (solicitudesFiltradas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-folder-open fs-3 mb-2 d-block opacity-50"></i>
                    No hay solicitudes registradas en esta categoría.
                </td>
            </tr>
        `;
        return;
    }

    solicitudesFiltradas.forEach(req => {
        let badgeHtml = '';
        if (req.estado === 'pendiente') {
            badgeHtml = `<span class="badge-status badge-pendiente"><i class="fa-solid fa-clock me-1"></i> Pendiente</span>`;
        } else if (req.estado === 'aprobado') {
            badgeHtml = `<span class="badge-status badge-aprobado"><i class="fa-solid fa-circle-check me-1"></i> Aprobada</span>`;
        } else if (req.estado === 'rechazado') {
            badgeHtml = `<span class="badge-status badge-rechazado text-danger bg-danger-subtle"><i class="fa-solid fa-circle-xmark me-1"></i> Rechazada</span>`;
        }

        const tr = document.createElement('tr');
        tr.setAttribute('data-status', req.estado);
        tr.innerHTML = `
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.8rem; background: ${req.avatarBg || 'var(--primary-gradient)'};">${req.iniciales}</div>
                <div>
                  <strong class="d-block text-dark lh-1">${req.empleado}</strong>
                  <small class="text-muted" style="font-size: 0.75rem;">${req.cargo}</small>
                </div>
              </div>
            </td>
            <td><strong>${req.fechasTexto}</strong></td>
            <td><span class="fw-bold">${req.dias}</span> días</td>
            <td>${badgeHtml}</td>
            <td class="text-end">
              <button class="btn btn-sm ${req.estado === 'pendiente' ? 'btn-proseinet-light' : 'btn-light'} py-1 px-2 text-muted btn-ver-detalle" 
                      data-id="${req.id}" 
                      title="Ver o Revisar Solicitud">
                <i class="fa-solid ${req.estado === 'pendiente' ? 'fa-eye text-danger' : 'fa-ellipsis-vertical'}"></i>
              </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateKPIs() {
    const kpiDias = document.getElementById('kpiDiasDisponibles');
    if (kpiDias) {
        kpiDias.innerHTML = `${AppState.usuario.saldoDisponible} <span class="fs-6 text-muted font-normal">días</span>`;
    }

    const badgeSaldo = document.getElementById('badgeSaldoDisponibilidad');
    if (badgeSaldo) {
        badgeSaldo.textContent = `Saldo actual: ${AppState.usuario.saldoDisponible} días`;
    }

    const sidebarBadgeSaldo = document.getElementById('sidebarBadgeSaldo');
    const sidebarProgressBar = document.getElementById('sidebarProgressBar');
    const sidebarSaldoTexto = document.getElementById('sidebarSaldoTexto');

    const pct = Math.round((AppState.usuario.saldoDisponible / AppState.usuario.saldoTotal) * 100);

    if (sidebarBadgeSaldo) sidebarBadgeSaldo.textContent = `${AppState.usuario.saldoDisponible} Días`;
    if (sidebarSaldoTexto) sidebarSaldoTexto.textContent = `${AppState.usuario.saldoDisponible} de ${AppState.usuario.saldoTotal} días disponibles`;
    if (sidebarProgressBar) {
        sidebarProgressBar.style.width = `${pct}%`;
        sidebarProgressBar.setAttribute('aria-valuenow', pct);
    }

    const pendientesCount = AppState.solicitudes.filter(s => s.estado === 'pendiente').length;
    const aprobadasCount = AppState.solicitudes.filter(s => s.estado === 'aprobado').length;

    const kpiPendientes = document.getElementById('kpiPendientes');
    if (kpiPendientes) kpiPendientes.textContent = pendientesCount;

    const kpiAprobadas = document.getElementById('kpiAprobadas');
    if (kpiAprobadas) kpiAprobadas.textContent = aprobadasCount;
}

// --- RENDERIZADO DE LA PÁGINA DE EMPLEADOS ---
function renderEmpleadosPage(filtroDepto = 'all', searchQuery = '') {
    const grid = document.getElementById('empleadosGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtrados = AppState.empleados.filter(emp => {
        const coincideDepto = (filtroDepto === 'all' || emp.depto === filtroDepto);
        const coincideBusqueda = emp.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || emp.cargo.toLowerCase().includes(searchQuery.toLowerCase());
        return coincideDepto && coincideBusqueda;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="fa-solid fa-user-slash fs-2 mb-2 d-block opacity-50"></i>
                No se encontraron empleados en esta categoría o búsqueda.
            </div>
        `;
        return;
    }

    filtrados.forEach(emp => {
        const pct = Math.round((emp.saldoDisponible / emp.saldoTotal) * 100);
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-4';
        col.innerHTML = `
            <div class="p-4 rounded-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="avatar-circle" style="width: 46px; height: 46px; font-size: 1rem; background: ${emp.avatarBg};">${emp.iniciales}</div>
                            <div>
                                <strong class="d-block text-dark fs-6 lh-1 mb-1">${emp.nombre}</strong>
                                <small class="text-muted d-block" style="font-size: 0.78rem;">${emp.cargo}</small>
                            </div>
                        </div>
                        <span class="badge ${emp.estado === 'En Vacaciones' ? 'bg-warning text-dark' : 'bg-success-subtle text-success'} rounded-pill" style="font-size: 0.7rem;">${emp.estado}</span>
                    </div>

                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="badge bg-light text-secondary border fw-normal" style="font-size: 0.75rem;"><i class="fa-solid fa-building me-1"></i> ${emp.depto}</span>
                        <small class="fw-bold text-dark" style="font-size: 0.8rem;">Saldo: ${emp.saldoDisponible} / ${emp.saldoTotal} días</small>
                    </div>

                    <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar bg-danger" role="progressbar" style="width: ${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>

                <div class="pt-2 border-top d-flex justify-content-between align-items-center">
                    <small class="text-muted" style="font-size: 0.72rem;">Proseinet 2026</small>
                    <button class="btn btn-sm btn-outline-danger py-1 px-3 fw-semibold" style="font-size: 0.78rem;">Ver Detalle</button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function initEmpleadosPage() {
    const filterBtns = document.querySelectorAll('.filter-depto-btn');
    const inputSearch = document.getElementById('inputBuscarEmpleadoDirectorio');

    let currentDepto = 'all';
    let currentSearch = '';

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'btn-proseinet');
                    b.classList.add('btn-light');
                });
                btn.classList.remove('btn-light');
                btn.classList.add('active', 'btn-proseinet');

                currentDepto = btn.getAttribute('data-depto');
                renderEmpleadosPage(currentDepto, currentSearch);
            });
        });
    }

    if (inputSearch) {
        inputSearch.addEventListener('keyup', (e) => {
            currentSearch = e.target.value;
            renderEmpleadosPage(currentDepto, currentSearch);
        });
    }
}

function initVacationChart() {
    const ctx = document.getElementById('vacationChart');
    if (!ctx) return;

    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(220, 38, 38, 0.85)');
    gradient.addColorStop(1, 'rgba(150, 24, 24, 0.85)');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [{
                label: 'Días de Vacaciones Tomados',
                data: [14, 10, 18, 24, 20, 38, 45, 32, 22, 16, 12, 30],
                backgroundColor: gradient,
                borderColor: '#dc2626',
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 56
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { family: 'Montserrat', size: 13, weight: 'bold' },
                    bodyFont: { family: 'Montserrat', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.y} días disfrutados por el equipo`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Montserrat', size: 11, weight: '600' }, color: '#64748b' }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { family: 'Montserrat', size: 11 }, color: '#64748b', stepSize: 10 },
                    beginAtZero: true
                }
            }
        }
    });
}

function initTableFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.add('btn-light');
            });

            btn.classList.remove('btn-light');
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            renderRequestsTable(filterValue);
        });
    });
}

function initVacationCalculator() {
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    const labelDias = document.getElementById('labelDiasCalculados');
    const form = document.getElementById('formSolicitudVacaciones');

    function calcularDias() {
        if (fechaInicio && fechaFin && fechaInicio.value && fechaFin.value) {
            const start = new Date(fechaInicio.value);
            const end = new Date(fechaFin.value);

            if (end >= start) {
                let count = 0;
                let curDate = new Date(start.getTime());

                while (curDate <= end) {
                    const dayOfWeek = curDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        count++;
                    }
                    curDate.setDate(curDate.getDate() + 1);
                }

                labelDias.textContent = `${count} ${count === 1 ? 'Día laborable' : 'Días laborables'}`;
                return count;
            } else {
                labelDias.textContent = 'Fecha final inválida';
                return 0;
            }
        }
        return 0;
    }

    if (fechaInicio && fechaFin) {
        fechaInicio.addEventListener('change', calcularDias);
        fechaFin.addEventListener('change', calcularDias);
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const diasSolicitados = calcularDias();
            if (diasSolicitados <= 0) {
                alert('Por favor selecciona un rango de fechas válido.');
                return;
            }

            if (diasSolicitados > AppState.usuario.saldoDisponible) {
                alert(`No tienes suficiente saldo de vacaciones. Solicitaste ${diasSolicitados} días y te quedan ${AppState.usuario.saldoDisponible} días.`);
                return;
            }

            const tipoSelect = document.getElementById('selectTipoAusencia');
            const tipoTexto = tipoSelect.options[tipoSelect.selectedIndex].text;
            const fInicio = fechaInicio.value;
            const fFin = fechaFin.value;
            const motivo = document.getElementById('motivoSolicitud').value || 'Sin observaciones adicionales.';

            const options = { day: '2-digit', month: 'short' };
            const dInicio = new Date(fInicio).toLocaleDateString('es-ES', options);
            const dFin = new Date(fFin).toLocaleDateString('es-ES', options);
            const fechasTexto = `${dInicio} - ${dFin} 2026`;

            const nuevaSolicitud = {
                id: Date.now(),
                empleado: AppState.usuario.nombre,
                cargo: AppState.usuario.cargo,
                iniciales: AppState.usuario.avatarIniciales,
                avatarBg: "linear-gradient(135deg, #dc2626, #991b1b)",
                fechaInicio: fInicio,
                fechaFin: fFin,
                fechasTexto: fechasTexto,
                dias: diasSolicitados,
                tipo: tipoTexto,
                motivo: motivo,
                estado: "pendiente"
            };

            AppState.solicitudes.unshift(nuevaSolicitud);

            AppState.notificaciones.unshift({
                id: Date.now(),
                texto: `Enviaste una solicitud de ${diasSolicitados} días de vacaciones.`,
                fecha: "Justo ahora",
                leida: false
            });

            guardarEstado();

            renderRequestsTable();
            updateKPIs();
            notificaciones();

            const modalEl = document.getElementById('modalNuevaSolicitud');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            form.reset();
            if (labelDias) labelDias.textContent = '0 Días';

            alert('¡Tu solicitud de vacaciones fue registrada exitosamente!');
        });
    }
}

function initDetailModal() {
    const tableBody = document.getElementById('requestsTableBody');
    const modalEl = document.getElementById('modalDetalleSolicitud');
    if (!tableBody || !modalEl) return;

    let solicitudSeleccionada = null;

    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-ver-detalle');
        if (!btn) return;

        const id = parseInt(btn.getAttribute('data-id'));
        solicitudSeleccionada = AppState.solicitudes.find(s => s.id === id);

        if (!solicitudSeleccionada) return;

        document.getElementById('detalleEmpleado').textContent = solicitudSeleccionada.empleado;
        document.getElementById('detalleCargo').textContent = solicitudSeleccionada.cargo;
        document.getElementById('detalleFechas').textContent = solicitudSeleccionada.fechasTexto;
        document.getElementById('detalleDias').textContent = `${solicitudSeleccionada.dias} días`;
        document.getElementById('detalleTipo').textContent = solicitudSeleccionada.tipo;
        document.getElementById('detalleMotivo').textContent = solicitudSeleccionada.motivo || 'Sin observaciones.';

        const avatar = document.getElementById('detalleAvatar');
        if (avatar) {
            avatar.textContent = solicitudSeleccionada.iniciales;
            avatar.style.background = solicitudSeleccionada.avatarBg || 'var(--primary-gradient)';
        }

        const estadoBadge = document.getElementById('detalleEstadoBadge');
        if (solicitudSeleccionada.estado === 'pendiente') {
            estadoBadge.innerHTML = `<span class="badge-status badge-pendiente"><i class="fa-solid fa-clock me-1"></i> Pendiente de Aprobación</span>`;
        } else if (solicitudSeleccionada.estado === 'aprobado') {
            estadoBadge.innerHTML = `<span class="badge-status badge-aprobado"><i class="fa-solid fa-circle-check me-1"></i> Aprobada</span>`;
        } else {
            estadoBadge.innerHTML = `<span class="badge bg-danger"><i class="fa-solid fa-circle-xmark me-1"></i> Rechazada</span>`;
        }

        const detalleAcciones = document.getElementById('detalleAcciones');
        if (solicitudSeleccionada.estado === 'pendiente') {
            detalleAcciones.style.display = 'flex';
        } else {
            detalleAcciones.style.display = 'none';
        }

        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    });

    const btnAprobar = document.getElementById('btnAprobarSolicitud');
    if (btnAprobar) {
        btnAprobar.addEventListener('click', () => {
            if (!solicitudSeleccionada) return;

            solicitudSeleccionada.estado = 'aprobado';

            if (solicitudSeleccionada.empleado === AppState.usuario.nombre) {
                AppState.usuario.saldoDisponible = Math.max(0, AppState.usuario.saldoDisponible - solicitudSeleccionada.dias);
            }

            AppState.notificaciones.unshift({
                id: Date.now(),
                texto: `Solicitud de ${solicitudSeleccionada.empleado} fue APROBADA (${solicitudSeleccionada.dias} días).`,
                fecha: "Justo ahora",
                leida: false
            });

            guardarEstado();

            renderRequestsTable();
            updateKPIs();
            notificaciones();

            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();

            alert(`Solicitud de ${solicitudSeleccionada.empleado} ha sido Aprobada.`);
        });
    }

    const btnRechazar = document.getElementById('btnRechazarSolicitud');
    if (btnRechazar) {
        btnRechazar.addEventListener('click', () => {
            if (!solicitudSeleccionada) return;

            solicitudSeleccionada.estado = 'rechazado';

            AppState.notificaciones.unshift({
                id: Date.now(),
                texto: `Solicitud de ${solicitudSeleccionada.empleado} fue RECHAZADA.`,
                fecha: "Justo ahora",
                leida: false
            });

            guardarEstado();

            renderRequestsTable();
            updateKPIs();
            notificaciones();

            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();

            alert(`Solicitud de ${solicitudSeleccionada.empleado} ha sido Rechazada.`);
        });
    }
}

function notificaciones() {
    const notiUI = document.getElementById('notiUI');
    if (!notiUI) return;

    if (AppState.notificaciones.length === 0) {
        notiUI.innerHTML = `<li class="p-2 text-center text-muted small">No hay notificaciones pendientes</li>`;
        return;
    }

    let html = '';
    AppState.notificaciones.forEach(n => {
        html += `
            <li>
                <a href="#" class="dropdown-item dropdown-item-custom d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                        <span class="d-block small text-dark font-semibold">${n.texto}</span>
                        <small class="text-muted" style="font-size: 0.7rem;">${n.fecha}</small>
                    </div>
                    ${!n.leida ? '<span class="badge bg-danger rounded-circle p-1 ms-2" style="width: 8px; height: 8px; display: inline-block;"></span>' : ''}
                </a>
            </li>
        `;
    });

    notiUI.innerHTML = html;
}

function initBuscadorEmpleado() {
    const input = document.getElementById('inputBuscarEmpleado');
    if (!input) return;
    input.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        const trs = document.querySelectorAll('#requestsTableBody tr');
        trs.forEach(tr => {
            const nombre = tr.querySelector('strong')?.textContent.toLowerCase() || '';
            tr.style.display = nombre.includes(query) ? '' : 'none';
        });
    });
}
