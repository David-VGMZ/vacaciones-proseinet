import { AppState, calcularDiasDerechoLFT, getIniciales, notifyReveal, fechaLocalStr } from '/app.js';
import { db } from '/firebase-config.js';
import { doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentConfigDepto = 'all';
let currentConfigSearch = '';
let empleadoSeleccionado = null;

export function calcularAntiguedadExacta(fechaIngresoStr) {
    if (!fechaIngresoStr) {
        return {
            anios: 0,
            meses: 0,
            dias: 0,
            totalDiasDerecho: 0,
            detalleAniversarios: [],
            proximoAniversario: null,
            diasParaProximo: 0
        };
    }

    const fechaIng = new Date(fechaIngresoStr + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (isNaN(fechaIng.getTime()) || fechaIng > hoy) {
        return {
            anios: 0,
            meses: 0,
            dias: 0,
            totalDiasDerecho: 0,
            detalleAniversarios: [],
            proximoAniversario: null,
            diasParaProximo: 0
        };
    }

    let anios = hoy.getFullYear() - fechaIng.getFullYear();
    let m = hoy.getMonth() - fechaIng.getMonth();
    let d = hoy.getDate() - fechaIng.getDate();

    if (d < 0) {
        m--;
        const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
        d += ultimoDiaMesAnterior;
    }

    if (m < 0) {
        anios--;
        m += 12;
    }

    const aniosAntiguedad = Math.max(0, anios);
    const mesesAntiguedad = Math.max(0, m);
    const diasAntiguedad = Math.max(0, d);

    // Días que corresponden según LFT para la antigüedad actual del colaborador
    const totalDiasDerecho = calcularDiasDerechoLFT(aniosAntiguedad);
    const detalleAniversarios = [];

    for (let i = 1; i <= aniosAntiguedad; i++) {
        const diasAnio = calcularDiasDerechoLFT(i);

        // Fecha en que se cumplió este aniversario
        const fechaCumplida = new Date(fechaIng);
        fechaCumplida.setFullYear(fechaIng.getFullYear() + i);

        detalleAniversarios.push({
            anio: i,
            dias: diasAnio,
            esActual: i === aniosAntiguedad,
            fecha: fechaCumplida.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        });
    }

    // Próximo aniversario
    const proximoAnio = fechaIng.getFullYear() + aniosAntiguedad + 1;
    const proximoAnivFecha = new Date(fechaIng);
    proximoAnivFecha.setFullYear(proximoAnio);

    const diffMs = proximoAnivFecha.getTime() - hoy.getTime();
    const diasParaProximo = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const diasProximoGanara = calcularDiasDerechoLFT(aniosAntiguedad + 1);

    return {
        anios: aniosAntiguedad,
        meses: mesesAntiguedad,
        dias: diasAntiguedad,
        totalDiasDerecho,
        detalleAniversarios,
        proximoAniversario: {
            fecha: proximoAnivFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
            diasFaltantes: diasParaProximo,
            diasAGanar: diasProximoGanara,
            proximoAnioNumero: aniosAntiguedad + 1
        }
    };
}

export function verificarRolOperador() {
    const rol = AppState.usuario?.rol ? AppState.usuario.rol.toString().trim().toLowerCase() : '';
    return rol === 'operador';
}

export function renderConfiguracionPage() {
    const container = document.getElementById('configuracionContainer');
    if (!container) return;

    if (AppState.cargando && AppState.cargando.feriado) {
        // Ya se maneja en renderProximoFeriado, pero también podemos mostrar spinner aquí
        // si la sección de configuración muestra el feriado
        return;
    }

    const esOperador = verificarRolOperador();

    // Actualizar badge de rol en el banner superior
    const rolBadge = document.getElementById('rolIndicatorBadge');
    if (rolBadge) {
        if (esOperador) {
            rolBadge.innerHTML = `
                <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill fw-semibold" style="font-size: 0.85rem;">
                    <i class="fa-solid fa-shield-halved me-1"></i> Rol: Operador (Acceso Total)
                </span>`;
        } else {
            rolBadge.innerHTML = `
                <span class="badge bg-warning-subtle text-dark border border-warning-subtle px-3 py-2 rounded-pill fw-semibold" style="font-size: 0.85rem;">
                    <i class="fa-solid fa-lock me-1"></i> Rol: ${AppState.usuario.rol || 'Colaborador'} (Solo Lectura)
                </span>`;
        }
    }

    // Mostrar u ocultar alerta si no es operador
    const alertaNoOperador = document.getElementById('alertaNoOperador');
    if (alertaNoOperador) {
        if (!esOperador && AppState.usuario.uid) {
            alertaNoOperador.classList.remove('d-none');
        } else {
            alertaNoOperador.classList.add('d-none');
        }
    }

    // Actualizar KPIs
    actualizarKPIsConfig();

    // Renderizar tabla de empleados
    renderTablaEmpleadosConfig();
}

function actualizarKPIsConfig() {
    const empleados = AppState.empleados || [];
    const total = empleados.length;
    const conFecha = empleados.filter(e => e.fechaIngreso && e.fechaIngreso !== 'No registrada').length;
    const sinFecha = total - conFecha;

    let totalDiasLFT = 0;
    empleados.forEach(e => {
        if (e.fechaIngreso && e.fechaIngreso !== 'No registrada') {
            const calculo = calcularAntiguedadExacta(e.fechaIngreso);
            totalDiasLFT += calculo.totalDiasDerecho;
        }
    });

    const kpiTotal = document.getElementById('kpiTotalEmpleados');
    const kpiCon = document.getElementById('kpiConFecha');
    const kpiSin = document.getElementById('kpiSinFecha');
    const kpiDias = document.getElementById('kpiDiasAcreditados');

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiCon) kpiCon.textContent = conFecha;
    if (kpiSin) kpiSin.textContent = sinFecha;
    if (kpiDias) kpiDias.innerHTML = `${totalDiasLFT} <span class="fs-6 text-muted font-normal">días</span>`;
}

export function renderTablaEmpleadosConfig(filtroDepto = currentConfigDepto, searchQuery = currentConfigSearch) {
    currentConfigDepto = filtroDepto;
    currentConfigSearch = searchQuery;

    if (AppState.cargando && AppState.cargando.empleados) {
        const tbody = document.getElementById('configEmpleadosTableBody');
        if (tbody) {
            const filas = Array.from({ length: 4 }, () => `
                <tr class="skeleton-row">
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="skeleton" style="width: 38px; height: 38px; border-radius: 50%;"></div>
                            <div>
                                <span class="skeleton block" style="width: 150px; height: 0.85rem; margin-bottom: 0.4rem;"></span>
                                <span class="skeleton block" style="width: 110px; height: 0.7rem;"></span>
                            </div>
                        </div>
                    </td>
                    <td><span class="skeleton skel-bar" style="width: 70px; height: 1.3rem;"></span></td>
                    <td><span class="skeleton" style="width: 96px; height: 1rem;"></span></td>
                    <td><span class="skeleton skel-bar" style="width: 80px; height: 1.3rem;"></span></td>
                    <td><span class="skeleton" style="width: 74px; height: 1rem;"></span></td>
                    <td class="text-end">
                        <span class="skeleton" style="width: 110px; height: 2rem; border-radius: 10px;"></span>
                    </td>
                </tr>`).join('');
            tbody.innerHTML = filas;
        }
        return;
    }

    const tbody = document.getElementById('configEmpleadosTableBody');
    if (!tbody) return;

    const esOperador = verificarRolOperador();
    const empleados = AppState.empleados || [];

    const filtrados = empleados.filter(emp => {
        const deptoEmp = emp.depto || emp.area || 'General';
        const tieneFecha = emp.fechaIngreso && emp.fechaIngreso !== 'No registrada';

        let coincideDepto = true;
        if (filtroDepto === 'sin_fecha') {
            coincideDepto = !tieneFecha;
        } else if (filtroDepto !== 'all') {
            coincideDepto = deptoEmp.toLowerCase() === filtroDepto.toLowerCase();
        }

        const nombreEmp = emp.nombre || '';
        const cargoEmp = emp.cargo || '';
        const coincideBusqueda = nombreEmp.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cargoEmp.toLowerCase().includes(searchQuery.toLowerCase()) ||
            deptoEmp.toLowerCase().includes(searchQuery.toLowerCase());

        return coincideDepto && coincideBusqueda;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-users-slash fs-2 mb-2 d-block opacity-50"></i>
                    No se encontraron colaboradores bajo el filtro o término de búsqueda seleccionado.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filtrados.forEach(emp => {
        const iniciales = emp.avatarIniciales || getIniciales(emp.nombre);
        const depto = emp.depto || emp.area || 'General';
        const rolEmp = emp.rol || 'Empleado';
        const tieneFecha = emp.fechaIngreso && emp.fechaIngreso !== 'No registrada';

        let fechaTexto = '<span class="badge badge-pendiente border border-warning-subtle px-2 py-1"><i class="fa-solid fa-clock me-1"></i>Sin registrar</span>';
        let antiguedadTexto = '<span class="text-muted fst-italic">Pendiente</span>';

        if (tieneFecha) {
            try {
                const f = new Date(emp.fechaIngreso + 'T00:00:00');
                fechaTexto = `<strong class="text-dark">${f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>`;
                const calc = calcularAntiguedadExacta(emp.fechaIngreso);
                if (calc.anios === 0 && calc.meses === 0) {
                    antiguedadTexto = `<span class="badge bg-light text-secondary border">${calc.dias} días</span>`;
                } else if (calc.anios === 0) {
                    antiguedadTexto = `<span class="badge bg-light text-secondary border">${calc.meses} mes(es)</span>`;
                } else {
                    antiguedadTexto = `<span class="badge badge-aprobado border border-success-subtle fw-bold">${calc.anios} año(s) ${calc.meses > 0 ? `${calc.meses}m` : ''}</span>`;
                }
            } catch (e) {
                fechaTexto = emp.fechaIngreso;
            }
        }

        const saldoTotal = emp.saldoTotal ?? 0;
        const saldoDisponible = emp.saldoDisponible ?? saldoTotal;

        const rolBadge = rolEmp.toLowerCase() === 'operador'
            ? `<span class="badge badge-rechazado fw-semibold px-2 py-1"><i class="fa-solid fa-shield-halved me-1"></i>Operador</span>`
            : `<span class="badge bg-light text-muted border px-2 py-1">${rolEmp}</span>`;

        const btnAccion = esOperador
            ? `<button class="btn btn-sm btn-outline-danger fw-semibold py-1 px-3 d-flex align-items-center gap-1 ms-auto" onclick="abrirModalFechaIngreso('${emp.id}')">
                 <i class="fa-solid fa-calendar-pen"></i> Asignar Fecha
               </button>`
            : `<button class="btn btn-sm btn-light text-muted py-1 px-3 ms-auto" disabled title="Requiere rol de Operador">
                 <i class="fa-solid fa-lock me-1"></i> Restringido
               </button>`;

        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar-circle" style="width: 38px; height: 38px; font-size: 0.85rem; background: ${emp.avatarBg || 'var(--primary-gradient)'};">${iniciales}</div>
                        <div>
                            <strong class="d-block text-dark lh-1 mb-1">${emp.nombre}</strong>
                            <small class="text-muted d-block" style="font-size: 0.75rem;">${emp.cargo || 'Colaborador'} • <span class="fw-semibold text-secondary">${depto}</span></small>
                        </div>
                    </div>
                </td>
                <td>${rolBadge}</td>
                <td>${fechaTexto}</td>
                <td>${antiguedadTexto}</td>
                <td>
                    <span class="fw-bold text-success">${saldoDisponible}</span> <span class="text-muted">/ ${saldoTotal} días</span>
                </td>
                <td class="text-end">
                    ${btnAccion}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    notifyReveal(tbody);
}

window.abrirModalFechaIngreso = function (empId) {
    const esOperador = verificarRolOperador();
    if (!esOperador) {
        Swal.fire({
            icon: 'warning',
            title: 'Acceso Restringido',
            text: 'Únicamente los usuarios con el rol Operador pueden asignar o modificar fechas de ingreso.',
            confirmButtonColor: '#c71c1c'
        });
        return;
    }

    const emp = AppState.empleados.find(e => e.id === empId);
    if (!emp) {
        console.error("Empleado no encontrado con ID:", empId);
        return;
    }

    empleadoSeleccionado = emp;

    const modalEl = document.getElementById('modalAsignarFecha');
    if (!modalEl) return;

    // Rellenar datos del empleado en el modal
    document.getElementById('modalEmpNombre').textContent = emp.nombre;
    document.getElementById('modalEmpDetalle').textContent = `${emp.cargo || 'Colaborador'} • ${emp.depto || emp.area || 'General'}`;
    const avatar = document.getElementById('modalEmpAvatar');
    if (avatar) {
        avatar.textContent = emp.avatarIniciales || getIniciales(emp.nombre);
        avatar.style.background = emp.avatarBg || 'var(--primary-gradient)';
    }

    // Asignar fecha actual si existe
    const inputFecha = document.getElementById('inputFechaIngresoModal');
    if (inputFecha) {
        if (emp.fechaIngreso && emp.fechaIngreso !== 'No registrada' && /^\d{4}-\d{2}-\d{2}$/.test(emp.fechaIngreso)) {
            inputFecha.value = emp.fechaIngreso;
        } else {
            inputFecha.value = '';
        }
    }

    // Actualizar previsualización en vivo
    actualizarPreviewModal(inputFecha ? inputFecha.value : '');

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
};

function actualizarPreviewModal(fechaIngresoStr) {
    if (!empleadoSeleccionado) return;

    const calculo = calcularAntiguedadExacta(fechaIngresoStr);

    const badgeAntiguedad = document.getElementById('previewBadgeAntiguedad');
    const textoAntiguedad = document.getElementById('previewAntiguedadTexto');
    const proximoAnivEl = document.getElementById('previewProximoAniversario');
    const totalLFTEl = document.getElementById('previewDiasLFTTotal');
    const diasUsadosEl = document.getElementById('previewDiasUsados');
    const desgloseContainer = document.getElementById('desgloseAniversariosContainer');
    const nuevoSaldoDispEl = document.getElementById('previewNuevoSaldoDisponible');
    const nuevoSaldoTotalEl = document.getElementById('previewNuevoSaldoTotal');

    // Calcular días ya usados por el colaborador (a través de solicitudes aprobadas o histórico)
    let diasUsados = 0;
    if (AppState.solicitudes && AppState.solicitudes.length > 0) {
        const misAprobadas = AppState.solicitudes.filter(s =>
            (s.uid_empleado && s.uid_empleado === empleadoSeleccionado.id && s.estado === 'aprobado') ||
            (s.empleado && s.empleado.trim().toLowerCase() === empleadoSeleccionado.nombre.trim().toLowerCase() && s.estado === 'aprobado')
        );
        diasUsados = misAprobadas.reduce((sum, s) => sum + (Number(s.dias) || 0), 0);
    } else {
        const totalActual = empleadoSeleccionado.saldoTotal || 0;
        const dispActual = empleadoSeleccionado.saldoDisponible ?? totalActual;
        diasUsados = Math.max(0, totalActual - dispActual);
    }

    const nuevoSaldoTotal = calculo.totalDiasDerecho;
    const nuevoSaldoDisponible = Math.max(0, nuevoSaldoTotal - diasUsados);

    if (badgeAntiguedad) {
        badgeAntiguedad.textContent = `${calculo.anios} ${calculo.anios === 1 ? 'Año' : 'Años'}`;
    }

    if (textoAntiguedad) {
        if (!fechaIngresoStr) {
            textoAntiguedad.textContent = 'Sin fecha';
        } else if (calculo.anios === 0 && calculo.meses === 0) {
            textoAntiguedad.textContent = `${calculo.dias} días`;
        } else {
            textoAntiguedad.textContent = `${calculo.anios}a, ${calculo.meses}m`;
        }
    }

    if (proximoAnivEl) {
        if (calculo.proximoAniversario) {
            proximoAnivEl.innerHTML = `<span style="font-size: 0.8rem;">${calculo.proximoAniversario.fecha}</span><small class="text-muted d-block" style="font-size: 0.68rem;">(+${calculo.proximoAniversario.diasAGanar}d en ${calculo.proximoAniversario.diasFaltantes} días)</small>`;
        } else {
            proximoAnivEl.textContent = 'N/A';
        }
    }

    if (totalLFTEl) totalLFTEl.textContent = `${nuevoSaldoTotal} días`;
    if (diasUsadosEl) diasUsadosEl.textContent = `${diasUsados} días`;
    if (nuevoSaldoTotalEl) nuevoSaldoTotalEl.textContent = nuevoSaldoTotal;
    if (nuevoSaldoDispEl) nuevoSaldoDispEl.textContent = nuevoSaldoDisponible;

    // Desglose de cada aniversario cumplido
    if (desgloseContainer) {
        if (calculo.detalleAniversarios.length === 0) {
            desgloseContainer.innerHTML = `
                <div class="text-muted small text-center py-2">
                    ${fechaIngresoStr ? 'Aún no ha cumplido su primer aniversario (1 año). Al cumplirlo le corresponderán 12 días.' : 'Ingresa una fecha para ver el cálculo.'}
                </div>`;
        } else {
            let itemsHtml = '<ul class="list-group list-group-flush small mb-0">';
            calculo.detalleAniversarios.forEach(item => {
                const esVigente = item.esActual;
                itemsHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-2 bg-transparent ${esVigente ? 'bg-danger-subtle rounded-2' : ''}">
                        <div>
                            <i class="fa-solid ${esVigente ? 'fa-star text-danger' : 'fa-check text-muted'} me-1"></i>
                            <span class="${esVigente ? 'fw-bold text-danger' : 'text-dark'}">Aniversario ${item.anio}</span>
                            <small class="text-muted fw-normal ms-1">(${item.fecha})</small>
                        </div>
                        <span class="badge ${esVigente ? 'bg-danger text-white' : 'bg-light text-secondary border'} fw-bold">${item.dias} días ${esVigente ? '(Vigente)' : ''}</span>
                    </li>`;
            });
            itemsHtml += '</ul>';
            desgloseContainer.innerHTML = itemsHtml;
        }
    }
}

export function initConfiguracionPage() {
    // Filtros de departamento
    const filterBtns = document.querySelectorAll('.filter-config-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'btn-proseinet');
                    b.classList.add('btn-light');
                });
                btn.classList.remove('btn-light');
                btn.classList.add('active', 'btn-proseinet');
                currentConfigDepto = btn.getAttribute('data-depto') || 'all';
                renderTablaEmpleadosConfig(currentConfigDepto, currentConfigSearch);
            });
        });
    }

    // Buscador
    const inputSearch = document.getElementById('inputBuscarEmpleadoConfig');
    if (inputSearch) {
        inputSearch.addEventListener('input', (e) => {
            currentConfigSearch = e.target.value;
            renderTablaEmpleadosConfig(currentConfigDepto, currentConfigSearch);
        });
    }

    // Listener para actualizar previsualización al cambiar la fecha
    const inputFechaModal = document.getElementById('inputFechaIngresoModal');
    if (inputFechaModal) {
        inputFechaModal.addEventListener('input', (e) => {
            actualizarPreviewModal(e.target.value);
        });
        inputFechaModal.addEventListener('change', (e) => {
            actualizarPreviewModal(e.target.value);
        });
    }

    // Botón para guardar y aplicar cálculo
    const btnGuardar = document.getElementById('btnGuardarFechaIngreso');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async () => {
            if (!empleadoSeleccionado) return;

            const esOperador = verificarRolOperador();
            if (!esOperador) {
                Swal.fire('Acceso Denegado', 'Únicamente los usuarios con el rol Operador pueden asignar o modificar fechas de ingreso.', 'error');
                return;
            }

            const inputFecha = document.getElementById('inputFechaIngresoModal');
            const fechaStr = inputFecha ? inputFecha.value : '';

            if (!fechaStr) {
                Swal.fire('Fecha Requerida', 'Por favor selecciona una fecha de ingreso válida.', 'warning');
                return;
            }

            const hoyStr = fechaLocalStr();
            if (fechaStr > hoyStr) {
                Swal.fire('Fecha Inválida', 'La fecha de ingreso laboral no puede ser una fecha futura.', 'warning');
                return;
            }

            // Realizar cálculo final
            const calculo = calcularAntiguedadExacta(fechaStr);

            let diasUsados = 0;
            if (AppState.solicitudes && AppState.solicitudes.length > 0) {
                const misAprobadas = AppState.solicitudes.filter(s =>
                    (s.uid_empleado && s.uid_empleado === empleadoSeleccionado.id && s.estado === 'aprobado') ||
                    (s.empleado && s.empleado.trim().toLowerCase() === empleadoSeleccionado.nombre.trim().toLowerCase() && s.estado === 'aprobado')
                );
                diasUsados = misAprobadas.reduce((sum, s) => sum + (Number(s.dias) || 0), 0);
            } else {
                const totalActual = empleadoSeleccionado.saldoTotal || 0;
                const dispActual = empleadoSeleccionado.saldoDisponible ?? totalActual;
                diasUsados = Math.max(0, totalActual - dispActual);
            }

            const nuevoSaldoTotal = calculo.totalDiasDerecho;
            const nuevoSaldoDisponible = Math.max(0, nuevoSaldoTotal - diasUsados);
            const ultimoAnioAcreditado = calculo.anios;

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Guardando...';

            try {
                const userRef = doc(db, "usuarios", empleadoSeleccionado.id);
                await updateDoc(userRef, {
                    fechaIngreso: fechaStr,
                    saldoTotal: nuevoSaldoTotal,
                    saldoDisponible: nuevoSaldoDisponible,
                    ultimoAnioAcreditado: ultimoAnioAcreditado,
                    antiguedadAnios: calculo.anios,
                    actualizadoPor: AppState.usuario.nombre || AppState.usuario.uid,
                    actualizadoEn: new Date().toISOString()
                });

                // Actualizar en memoria local
                empleadoSeleccionado.fechaIngreso = fechaStr;
                empleadoSeleccionado.saldoTotal = nuevoSaldoTotal;
                empleadoSeleccionado.saldoDisponible = nuevoSaldoDisponible;
                empleadoSeleccionado.ultimoAnioAcreditado = ultimoAnioAcreditado;

                // Si el empleado editado es el mismo que está logueado, actualizar AppState.usuario
                if (AppState.usuario && AppState.usuario.uid === empleadoSeleccionado.id) {
                    AppState.usuario.fechaIngreso = fechaStr;
                    AppState.usuario.saldoTotal = nuevoSaldoTotal;
                    AppState.usuario.saldoDisponible = nuevoSaldoDisponible;
                    AppState.usuario.ultimoAnioAcreditado = ultimoAnioAcreditado;

                    const sidebarBadge = document.getElementById('sidebarBadgeSaldo');
                    const sidebarTexto = document.getElementById('sidebarSaldoTexto');
                    const sidebarBar = document.getElementById('sidebarProgressBar');
                    if (sidebarBadge) sidebarBadge.textContent = `${nuevoSaldoDisponible} Días`;
                    if (sidebarTexto) sidebarTexto.textContent = `${nuevoSaldoDisponible} de ${nuevoSaldoTotal} días disponibles`;
                    if (sidebarBar && nuevoSaldoTotal > 0) {
                        const pct = Math.round((nuevoSaldoDisponible / nuevoSaldoTotal) * 100);
                        sidebarBar.style.width = `${pct}%`;
                    }
                }

                // Cerrar modal
                const modalEl = document.getElementById('modalAsignarFecha');
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();

                // Re-renderizar
                actualizarKPIsConfig();
                renderTablaEmpleadosConfig();

                Swal.fire({
                    icon: 'success',
                    title: '¡Fecha y Saldos Actualizados!',
                    html: `Se asignó la fecha <strong>${fechaStr}</strong> a <strong>${empleadoSeleccionado.nombre}</strong>.<br>Antigüedad: <strong>${calculo.anios} año(s)</strong>.<br>Nuevo Saldo Total: <strong>${nuevoSaldoTotal} días</strong>.<br>Saldo Disponible: <strong>${nuevoSaldoDisponible} días</strong>.`,
                    confirmButtonColor: '#c71c1c'
                });

            } catch (error) {
                console.error("Error al actualizar fecha de ingreso en Firestore:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Guardar',
                    text: 'Ocurrió un error al actualizar la información en la base de datos: ' + (error.message || error),
                    confirmButtonColor: '#c71c1c'
                });
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Guardar y Aplicar Cálculo';
            }
        });
    }
}

window.limpiarBusquedaConfig = function () {
    const input = document.getElementById('inputBuscarEmpleadoConfig');
    if (input) input.value = '';
    currentConfigSearch = '';
    renderTablaEmpleadosConfig(currentConfigDepto, currentConfigSearch);
};

// Auto-inicialización si el elemento está presente
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('configuracionContainer')) {
        initConfiguracionPage();
        renderConfiguracionPage();
    }
});
