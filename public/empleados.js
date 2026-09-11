import { AppState, calcularDiasDerechoLFT, getIniciales } from "/app.js";

let currentDepto = 'all';
let currentSearch = '';

export function renderEmpleadosPage(filtroDepto = currentDepto, searchQuery = currentSearch) {
    currentDepto = filtroDepto;
    currentSearch = searchQuery;

    const grid = document.getElementById('empleadosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtrados = AppState.empleados.filter(emp => {
        const deptoEmp = emp.depto || emp.area || 'General';
        const coincideDepto = (filtroDepto === 'all' || deptoEmp.toLowerCase() === filtroDepto.toLowerCase());
        const nombreEmp = emp.nombre || '';
        const cargoEmp = emp.cargo || '';
        const areaEmp = emp.area || emp.depto || '';
        const coincideBusqueda = nombreEmp.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cargoEmp.toLowerCase().includes(searchQuery.toLowerCase()) ||
            areaEmp.toLowerCase().includes(searchQuery.toLowerCase());
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
        const saldoTotal = emp.saldoTotal || 12;
        const saldoDisponible = emp.saldoDisponible ?? saldoTotal;
        const pct = Math.round((saldoDisponible / saldoTotal) * 100);
        const iniciales = emp.avatarIniciales || getIniciales(emp.nombre);
        const deptoNombre = emp.depto || emp.area || 'General';

        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-4';
        col.innerHTML = `
            <div class="p-4 rounded-4 bg-white border-0 shadow h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="avatar-circle" style="width: 46px; height: 46px; font-size: 1rem; background: ${emp.avatarBg || 'var(--primary-gradient)'};">${iniciales}</div>
                            <div>
                                <strong class="d-block text-dark fs-6 lh-1 mb-1">${emp.nombre}</strong>
                                <small class="text-muted d-block" style="font-size: 0.78rem;">${emp.cargo || 'Colaborador'}</small>
                            </div>
                        </div>
                        <span class="badge bg-success-subtle text-success rounded-pill" style="font-size: 0.7rem;">Activo</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="badge bg-light text-secondary border fw-normal" style="font-size: 0.75rem;"><i class="fa-solid fa-building me-1"></i> ${deptoNombre}</span>
                        <small class="fw-bold text-dark" style="font-size: 0.8rem;">Saldo: ${saldoDisponible} / ${saldoTotal} días</small>
                    </div>
                    <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar bg-danger" role="progressbar" style="width: ${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
                <div class="pt-2 border-top d-flex justify-content-between align-items-center">
                    <small class="text-muted" style="font-size: 0.72rem;">Proseinet 2026</small>
                    <button class="btn btn-sm btn-proseinet py-1 px-3 fw-semibold" style="font-size: 0.78rem; cursor: pointer;" data-bs-toggle="modal" data-bs-target="#modalEmpleado" onclick="verDetalleEmpleado('${emp.id}')">Ver Detalle</button>
                </div>
            </div>`;
        grid.appendChild(col);
    });
}

window.verDetalleEmpleado = function (id) {
    const emp = AppState.empleados.find(e => e.id === id);
    if (!emp) {
        console.error('No se encontró el empleado');
        return;
    }

    const avatarCircle = document.getElementById('modalAvatarCircle');
    if (avatarCircle) {
        avatarCircle.textContent = emp.avatarIniciales || getIniciales(emp.nombre);
        avatarCircle.style.background = emp.avatarBg || 'var(--primary-gradient)';
    }

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = emp.nombre;
    }

    const modalSubtitle = document.getElementById('modalSubtitle');
    if (modalSubtitle) {
        modalSubtitle.textContent = `${emp.cargo || 'Colaborador'} • ${emp.depto || emp.area || 'General'}`;
    }

    const modalBody = document.getElementById('modalEmpBody');
    if (!modalBody) return;

    const saldoTotal = emp.saldoTotal || 12;
    const saldoDisponible = emp.saldoDisponible ?? saldoTotal;
    const diasUsados = Math.max(0, saldoTotal - saldoDisponible);
    const pctUsado = saldoTotal > 0 ? Math.round((diasUsados / saldoTotal) * 100) : 0;
    const pctDisponible = 100 - pctUsado;

    let fechaIngresoTexto = 'No registrada';
    let antiguedadTexto = 'Pendiente';
    if (emp.fechaIngreso && emp.fechaIngreso !== 'No registrada') {
        try {
            const f = new Date(emp.fechaIngreso + 'T00:00:00');
            fechaIngresoTexto = f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            const hoy = new Date();
            let anios = hoy.getFullYear() - f.getFullYear();
            let m = hoy.getMonth() - f.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) {
                anios--;
                m += 12;
            }
            anios = Math.max(0, anios);
            antiguedadTexto = `${anios} año(s) ${m > 0 ? `${m}m` : ''}`;
        } catch (e) {
            fechaIngresoTexto = emp.fechaIngreso;
        }
    }

    modalBody.innerHTML = `
        <div class="p-3 mb-3 bg-light rounded-3">
            <div class="row g-3">
                <div class="col-6">
                    <small class="text-muted d-block mb-1 fw-semibold">Departamento</small>
                    <span class="text-dark fw-bold d-flex align-items-center gap-2">
                        <i class="fa-solid fa-building text-danger"></i> ${emp.depto || emp.area || 'General'}
                    </span>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block mb-1 fw-semibold">Puesto / Cargo</small>
                    <span class="text-dark fw-bold d-flex align-items-center gap-2">
                        <i class="fa-solid fa-briefcase text-danger"></i> ${emp.cargo || 'Colaborador'}
                    </span>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block mb-1 fw-semibold">Fecha de Ingreso</small>
                    <span class="text-dark fw-bold d-flex align-items-center gap-2">
                        <i class="fa-solid fa-calendar-day text-danger"></i> ${fechaIngresoTexto}
                    </span>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block mb-1 fw-semibold">Antigüedad Laboral</small>
                    <span class="text-dark fw-bold d-flex align-items-center gap-2">
                        <i class="fa-solid fa-clock-rotate-left text-danger"></i> ${antiguedadTexto}
                    </span>
                </div>
            </div>
        </div>

        <div class="p-3 mb-3 bg-light rounded-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center gap-2">
                    <i class="fa-solid fa-umbrella-beach text-danger fs-5"></i>
                    <strong class="text-dark">Saldos de Vacaciones 2026</strong>
                </div>
                <span class="badge bg-success-subtle text-success rounded-pill px-3 py-2">Activo</span>
            </div>

            <div class="row g-2 mb-3 text-center">
                <div class="col-4">
                    <div class="p-2 bg-white rounded-3 border">
                        <small class="text-muted d-block" style="font-size: 0.75rem;">Saldo Total</small>
                        <strong class="fs-6 text-dark">${saldoTotal} días</strong>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 bg-white rounded-3 border">
                        <small class="text-muted d-block" style="font-size: 0.75rem;">Disponibles</small>
                        <strong class="fs-6 text-success">${saldoDisponible} días</strong>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 bg-white rounded-3 border">
                        <small class="text-muted d-block" style="font-size: 0.75rem;">Utilizados</small>
                        <strong class="fs-6 text-muted">${diasUsados} días</strong>
                    </div>
                </div>
            </div>

            <div>
                <div class="d-flex justify-content-between small fw-semibold text-muted mb-1">
                    <span>Disponibilidad</span>
                    <span>${pctDisponible}% disponible</span>
                </div>
                <div class="progress" style="height: 8px; border-radius: 10px;">
                    <div class="progress-bar bg-danger" role="progressbar" style="width: ${pctDisponible}%;" aria-valuenow="${pctDisponible}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between mt-1 text-muted" style="font-size: 0.72rem;">
                    <span>0 días</span>
                    <span>${saldoTotal} días</span>
                </div>
            </div>
        </div>
    `;
};

export function initEmpleadosPage() {
    const filterBtns = document.querySelectorAll('.filter-depto-btn');
    const inputSearch = document.getElementById('inputBuscarEmpleadoDirectorio');

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'btn-proseinet');
                    b.classList.add('btn-light');
                });
                btn.classList.remove('btn-light');
                btn.classList.add('active', 'btn-proseinet');
                currentDepto = btn.getAttribute('data-depto') || 'all';
                renderEmpleadosPage(currentDepto, currentSearch);
            });
        });
    }

    if (inputSearch) {
        inputSearch.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderEmpleadosPage(currentDepto, currentSearch);
        });
    }
}

window.limpiarBusqueda = function () {
    const inputSearch = document.getElementById('inputBuscarEmpleadoDirectorio');
    if (inputSearch) {
        inputSearch.value = '';
    }
    currentSearch = '';
    renderEmpleadosPage(currentDepto, currentSearch);
};

document.addEventListener('DOMContentLoaded', () => {
    initEmpleadosPage();
    renderEmpleadosPage();
});
