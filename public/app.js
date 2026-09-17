import { renderEmpleadosPage, initEmpleadosPage } from '/empleados.js';
import { renderCalendar } from '/calendario.js';
import { renderConfiguracionPage, initConfiguracionPage, verificarRolOperador } from '/configuracion.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, getDocs, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

// ==========================================
// GESTOR DE VACACIONES - PROSEINET
// ==========================================

export const nombresFeriados = {
    '2026-01-01': 'Año Nuevo',
    '2026-02-02': 'Constitución Mexicana',
    '2026-03-16': 'Natalicio Benito Juárez',
    '2026-05-01': 'Día del Trabajo',
    '2026-09-16': 'Día de la Independencia',
    '2026-11-16': 'Revolución Mexicana',
    '2026-12-25': 'Navidad',
    '2027-01-01': 'Año Nuevo',
    '2027-02-01': 'Constitución Mexicana',
    '2027-03-15': 'Natalicio Benito Juárez',
    '2027-05-01': 'Día del Trabajo',
    '2027-09-16': 'Día de la Independencia',
    '2027-11-15': 'Revolución Mexicana',
    '2027-12-25': 'Navidad'
};

export const FERIADOS_OFICIALES_MX = Object.keys(nombresFeriados);

export const AppState = {
    usuario: {},
    empleados: [],
    solicitudes: [],
    notificaciones: [],
    filtroActual: "all",
    cargando: {
        empleados: true
    },
    solicitudesCargadas: false
};

// --- ESQUELETOS DE CARGA (shimmer) ---

function skeletonFilaSolicitud(w1, w2) {
    return `
        <tr class="skeleton-row">
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="skeleton" style="width: 32px; height: 32px; border-radius: 50%;"></div>
                    <div>
                        <span class="skeleton block" style="width: ${w1}; height: 0.85rem; margin-bottom: 0.4rem;"></span>
                        <span class="skeleton block" style="width: ${w2}; height: 0.7rem;"></span>
                    </div>
                </div>
            </td>
            <td><span class="skeleton" style="width: 150px; height: 1rem;"></span></td>
            <td><span class="skeleton" style="width: 52px; height: 1rem;"></span></td>
            <td><span class="skeleton skel-bar" style="width: 96px; height: 1.4rem;"></span></td>
            <td class="text-end">
                <span class="skeleton" style="width: 34px; height: 34px; border-radius: 10px;"></span>
            </td>
        </tr>`;
}

function skeletonFilasSolicitudes() {
    return skeletonFilaSolicitud("130px", "82px") +
        skeletonFilaSolicitud("140px", "90px") +
        skeletonFilaSolicitud("120px", "76px");
}

function skeletonItemAusencia(w1, w2) {
    return `
        <div class="d-flex justify-content-between align-items-center gap-3 py-2">
            <div class="d-flex align-items-center gap-3">
                <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
                <div>
                    <span class="skeleton block" style="width: ${w1}; height: 0.85rem; margin-bottom: 0.45rem;"></span>
                    <span class="skeleton block" style="width: ${w2}; height: 0.7rem;"></span>
                </div>
            </div>
            <div class="text-end">
                <span class="skeleton block skel-bar" style="width: 64px; height: 1.3rem; margin-bottom: 0.35rem;"></span>
                <span class="skeleton block" style="width: 56px; height: 0.7rem; margin-left: auto;"></span>
            </div>
        </div>`;
}

function skeletonItemsAusencias() {
    return skeletonItemAusencia("150px", "90px") +
        skeletonItemAusencia("135px", "100px") +
        skeletonItemAusencia("160px", "86px") +
        skeletonItemAusencia("128px", "94px");
}

export function notifyReveal(el) {
    if (!el) return;
    el.classList.remove('reveal-content');
    void el.offsetWidth;
    el.classList.add('reveal-content');
}

function rellenarTexto(el, valor) {
    if (!el) return;
    const teniaEsqueleto = !!(el.querySelector && el.querySelector('.skeleton'));
    el.textContent = valor;
    if (teniaEsqueleto) notifyReveal(el);
}

export function calcularDiasDerechoLFT(aniosAntiguedad) {
    if (aniosAntiguedad < 1) return 0;
    if (aniosAntiguedad === 1) return 12;
    if (aniosAntiguedad === 2) return 14;
    if (aniosAntiguedad === 3) return 16;
    if (aniosAntiguedad === 4) return 18;
    if (aniosAntiguedad === 5) return 20;
    if (aniosAntiguedad >= 6 && aniosAntiguedad <= 10) return 22;
    if (aniosAntiguedad >= 11 && aniosAntiguedad <= 15) return 24;
    if (aniosAntiguedad >= 16 && aniosAntiguedad <= 20) return 26;
    if (aniosAntiguedad >= 21 && aniosAntiguedad <= 25) return 28;
    if (aniosAntiguedad >= 26 && aniosAntiguedad <= 30) return 30;
    return 32;
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (!window.location.href.includes('login')) {
            window.location.href = '/login.html';
        }
    } else {
        console.log("Usuario autenticado:", user.email);

        await cargarPerfilUsuario(user.uid);
        suscribirSolicitudesFirestore();
        await cargarEmpleadosDesdeFirestore();
        inicializarUI();
    }
});

export async function cargarPerfilUsuario(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();

            let aniosAntiguedad = 0;
            let mesesAntiguedad = 0;

            if (data.fechaIngreso) {
                const fechaIng = new Date(data.fechaIngreso + 'T00:00:00');
                const hoy = new Date();

                let edad = hoy.getFullYear() - fechaIng.getFullYear();
                const m = hoy.getMonth() - fechaIng.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaIng.getDate())) {
                    edad--;
                }
                aniosAntiguedad = Math.max(0, edad);

                const diferenciaMs = hoy.getTime() - fechaIng.getTime();
                mesesAntiguedad = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24 * 30.44));
            }

            let saldoDisponible = data.saldoDisponible ?? 0;
            let saldoTotal = data.saldoTotal ?? 0;
            let ultimoAnioAcreditado = data.ultimoAnioAcreditado ?? 0;
            let requiereActualizacionBD = false;

            // Empleado ha cumplido 1 año o más desde su ingreso laboral
            if (data.fechaIngreso && aniosAntiguedad > 0) {
                const diasCorrespondientes = calcularDiasDerechoLFT(aniosAntiguedad);

                if (ultimoAnioAcreditado === 0 || saldoTotal > diasCorrespondientes) {
                    const diasTomados = Math.max(0, (data.saldoTotal || 0) - (data.saldoDisponible ?? (data.saldoTotal || 0)));
                    saldoTotal = diasCorrespondientes;
                    saldoDisponible = Math.max(0, diasCorrespondientes - diasTomados);
                    ultimoAnioAcreditado = aniosAntiguedad;
                    requiereActualizacionBD = true;
                } else if (aniosAntiguedad > ultimoAnioAcreditado) {
                    const diasAnteriores = calcularDiasDerechoLFT(ultimoAnioAcreditado);
                    const incremento = Math.max(0, diasCorrespondientes - diasAnteriores);
                    saldoTotal = diasCorrespondientes;
                    saldoDisponible = saldoDisponible + incremento;
                    ultimoAnioAcreditado = aniosAntiguedad;
                    requiereActualizacionBD = true;
                }
            }

            if (requiereActualizacionBD) {
                await updateDoc(userRef, {
                    saldoDisponible: saldoDisponible,
                    saldoTotal: saldoTotal,
                    ultimoAnioAcreditado: ultimoAnioAcreditado
                });
                console.log(`Se detectó Aniversario. Se sumaron nuevos dias al saldo.`);
            }

            AppState.usuario = {
                uid: uid,
                nombre: data.nombre,
                cargo: data.cargo,
                area: data.area,
                iniciales: data.avatarIniciales || getIniciales(data.nombre),
                saldoDisponible: saldoDisponible,
                saldoTotal: saldoTotal,
                rol: data.rol,
                fechaIngreso: data.fechaIngreso || "No registrada"
            };

            console.log("Perfil cargado correctamente:", AppState.usuario);
        }
    } catch (error) {
        console.error("Error al cargar perfil de Firestore:", error);
    }
}

export function getIniciales(nombre = "") {
    if (!nombre) return 'US';
    return nombre.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
}

export function fechaLocalStr(d = new Date()) {
    if (typeof d === 'string') d = new Date(d + 'T00:00:00');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

export async function cargarEmpleadosDesdeFirestore() {
    try {
        const q = query(collection(db, "usuarios"));
        onSnapshot(q, (snapshot) => {
            AppState.empleados = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const nombre = data.nombre || 'Sin Nombre';
                const cargo = data.cargo || 'Colaborador';
                const area = data.area || data.depto || 'General';
                const saldoTotal = data.saldoTotal || 0;
                const saldoDisponible = data.saldoDisponible ?? saldoTotal;
                const avatarIniciales = data.avatarIniciales || getIniciales(nombre);
                const avatarBg = data.avatarBg || 'linear-gradient(135deg, #dc2626, #991b1b)';

                return {
                    id: docSnap.id,
                    ...data,
                    nombre,
                    cargo,
                    area,
                    depto: area,
                    saldoTotal,
                    saldoDisponible,
                    avatarIniciales,
                    avatarBg
                };
            });

            console.log("Empleados cargados desde Firestore:", AppState.empleados);

            AppState.cargando.empleados = false;

            if (document.getElementById('empleadosGrid')) {
                renderEmpleadosPage();
            }

            if (document.getElementById('configuracionContainer')) {
                renderConfiguracionPage();
            }
        }, (error) => {
            console.error("Error en listener de empleados:", error);
        });
    } catch (error) {
        console.error("Error al cargar empleados desde Firestore", error);
    }
}

function suscribirSolicitudesFirestore() {
    const q = query(collection(db, "solicitudes"));
    onSnapshot(q, (snapshot) => {
        AppState.solicitudes = snapshot.docs.map(docSnap => ({
            idFirestore: docSnap.id,
            ...docSnap.data()
        }));

        AppState.solicitudesCargadas = true;

        renderRequestsTable();
        updateKPIs();
        renderProximasAusencias();
        renderProximoFeriado();
        notificaciones();
        cargarInfoUsuarios();
        if (document.getElementById('calendarBody')) {
            renderCalendar();
        }
    }, (error) => {
        console.error("Error en listener de solicitudes:", error);
    });
}

function inicializarUI() {
    console.log('Inicializando App de Vacaciones Proseinet...');

    cargarInfoUsuarios();
    initModalPerfil();
    updateKPIs();
    notificaciones();

    if (document.getElementById('calendarBody')) {
        renderCalendar();
    }

    if (document.getElementById('requestsTableBody')) {
        renderRequestsTable();
        initTableFilters();
        initVacationCalculator();
        initDetailModal();
        initBuscadorEmpleado();
        renderProximasAusencias();
        renderProximoFeriado();
    }

    if (document.getElementById('empleadosGrid')) {
        renderEmpleadosPage();
    }

    if (document.getElementById('configuracionContainer')) {
        initConfiguracionPage();
        renderConfiguracionPage();
    }

    const btnToggle = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('mainSidebar');
    if (btnToggle && sidebar) {
        let backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);

        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            backdrop.classList.toggle('active');
        });

        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('show');
            backdrop.classList.remove('active');
        });

        sidebar.querySelectorAll('.nav-link-custom').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('show');
                backdrop.classList.remove('active');
            });
        });
    }
}

// Función para cerrar sesión
window.cerrarSesion = async function () {
    console.log('Cerrando Sesión...');
    try {
        await signOut(auth);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// --- RENDERIZADO DINÁMICO DE LA TABLA DE SOLICITUDES ---
function esSolicitudVisibleParaElUsuario(s) {
    if (!AppState.usuario || !AppState.usuario.uid) return false;
    if (verificarRolOperador()) return true;
    return (s.uid_empleado && s.uid_empleado === AppState.usuario.uid) ||
        (s.empleado && AppState.usuario.nombre &&
         s.empleado.trim().toLowerCase() === AppState.usuario.nombre.trim().toLowerCase());
}

function renderRequestsTable(filtro = AppState.filtroActual) {
    AppState.filtroActual = filtro;
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!AppState.solicitudesCargadas) {
        tableBody.innerHTML = skeletonFilasSolicitudes();
        return;
    }

    const solicitudesFiltradas = AppState.solicitudes.filter(req => {
        if (!esSolicitudVisibleParaElUsuario(req)) return false;
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
        notifyReveal(tableBody);
        return;
    }

    solicitudesFiltradas.forEach(req => {
        let badgeHtml = '';
        if (req.estado === 'pendiente') {
            badgeHtml = `<span class="badge-status badge-pendiente"><i class="fa-solid fa-clock me-1"></i> Pendiente</span>`;
        } else if (req.estado === 'aprobado') {
            badgeHtml = `<span class="badge-status badge-aprobado"><i class="fa-solid fa-circle-check me-1"></i> Aprobada</span>`;
        } else if (req.estado === 'rechazado') {
            badgeHtml = `<span class="badge-status badge-rechazado"><i class="fa-solid fa-circle-xmark me-1"></i> Rechazada</span>`;
        }

        const tr = document.createElement('tr');
        tr.setAttribute('data-status', req.estado);
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-2">
                <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.8rem; background: ${req.avatarBg || 'var(--primary-gradient)'};">${req.iniciales || 'US'}</div>
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
                        data-id="${req.idFirestore}"
                        title="Ver o Revisar Solicitud">
                <i class="fa-solid ${req.estado === 'pendiente' ? 'fa-eye text-danger' : 'fa-ellipsis-vertical'}"></i>
                </button>
            </td>
            `;
        tableBody.appendChild(tr);
    });

    notifyReveal(tableBody);
}

function updateKPIs() {
    const kpiDias = document.getElementById('kpiDiasDisponibles');
    if (kpiDias) {
        kpiDias.innerHTML = `${AppState.usuario.saldoDisponible} <span class="fs-6 text-muted font-normal">días</span>`;
        notifyReveal(kpiDias);
    }

    const badgeSaldo = document.getElementById('badgeSaldoDisponibilidad');
    if (badgeSaldo) {
        badgeSaldo.textContent = `Saldo actual: ${AppState.usuario.saldoDisponible} días`;
    }

    const sidebarBadgeSaldo = document.getElementById('sidebarBadgeSaldo');
    const sidebarProgressBar = document.getElementById('sidebarProgressBar');
    const sidebarSaldoTexto = document.getElementById('sidebarSaldoTexto');

    const total = AppState.usuario.saldoTotal || 0;
    const disponible = AppState.usuario.saldoDisponible ?? total;
    const pct = Math.round((disponible / total) * 100);

    if (sidebarBadgeSaldo) sidebarBadgeSaldo.textContent = `${disponible} Días`;
    if (sidebarSaldoTexto) sidebarSaldoTexto.textContent = `${disponible} de ${total} días disponibles`;
    if (sidebarProgressBar) {
        sidebarProgressBar.style.width = `${pct}%`;
        sidebarProgressBar.setAttribute('aria-valuenow', pct);
    }

    if (!AppState.solicitudesCargadas) return;

    const solicitudesVisibles = AppState.solicitudes.filter(s => esSolicitudVisibleParaElUsuario(s));
    const pendientesCount = solicitudesVisibles.filter(s => s.estado === 'pendiente').length;
    const aprobadasCount = solicitudesVisibles.filter(s => s.estado === 'aprobado').length;

    const hoyStr = fechaLocalStr();
    const enVacacionesHoy = solicitudesVisibles.filter(s => {
        return s.estado === 'aprobado' && s.fechaInicio <= hoyStr && s.fechaFin >= hoyStr;
    }).length;

    const kpiPendientes = document.getElementById('kpiPendientes');
    const kpiAprobadas = document.getElementById('kpiAprobadas');
    const kpiEnVacaciones = document.getElementById('kpiEnVacaciones');

    if (kpiPendientes) { kpiPendientes.textContent = pendientesCount; notifyReveal(kpiPendientes); }
    if (kpiAprobadas) { kpiAprobadas.textContent = aprobadasCount; notifyReveal(kpiAprobadas); }
    if (kpiEnVacaciones) { kpiEnVacaciones.innerHTML = `${enVacacionesHoy} <span class="fs-6 text-muted font-normal">personas</span>`; notifyReveal(kpiEnVacaciones); }
}

function initVacationCalculator() {
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    const labelDias = document.getElementById('labelDiasCalculados');
    const form = document.getElementById('formSolicitudVacaciones');

    function calcularDias() {
        if (fechaInicio && fechaFin && fechaInicio.value && fechaFin.value) {
            const start = new Date(fechaInicio.value + 'T00:00:00');
            const end = new Date(fechaFin.value + 'T00:00:00');

            if (end >= start) {
                let count = 0;
                let curDate = new Date(start.getTime());

                while (curDate <= end) {
                    const dayOfWeek = curDate.getDay();
                    const dateString = curDate.toISOString().split('T')[0];
                    if (dayOfWeek !== 0 && !FERIADOS_OFICIALES_MX.includes(dateString)) {
                        count++;
                    }
                    curDate.setDate(curDate.getDate() + 1);
                }

                if (labelDias) labelDias.textContent = `${count} ${count === 1 ? 'Día laborable' : 'Días laborables'}`;
                return count;
            } else {
                if (labelDias) labelDias.textContent = 'Fecha final inválida';
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
        let guardandoSolicitud = false;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (guardandoSolicitud) return;

            const diasSolicitados = calcularDias();
            if (diasSolicitados <= 0) {
                Swal.fire('Error', 'Por favor selecciona un rango de fechas válido y laborable.', 'error');
                return;
            }

            if (diasSolicitados > AppState.usuario.saldoDisponible) {
                Swal.fire('Saldo insuficiente', `Solicitaste ${diasSolicitados} días y solo dispones de ${AppState.usuario.saldoDisponible} días.`, 'error');
                return;
            }

            const tipoSelect = document.getElementById('selectTipoAusencia');
            const tipoTexto = tipoSelect.options[tipoSelect.selectedIndex].text;
            const fInicio = fechaInicio.value;
            const fFin = fechaFin.value;
            const motivo = document.getElementById('motivoSolicitud').value || 'Sin observaciones adicionales.';

            const options = { day: '2-digit', month: 'short' };
            const dInicio = new Date(fInicio + 'T00:00:00').toLocaleDateString('es-MX', options);
            const dFin = new Date(fFin + 'T00:00:00').toLocaleDateString('es-MX', options);
            const año = new Date(fInicio + 'T00:00:00').getFullYear();
            const fechasTexto = `${dInicio} - ${dFin} ${año}`;

            const nuevaSolicitud = {
                uid_empleado: AppState.usuario.uid,
                empleado: AppState.usuario.nombre,
                cargo: AppState.usuario.cargo,
                iniciales: AppState.usuario.iniciales,
                avatarBg: "linear-gradient(135deg, #dc2626, #991b1b)",
                fechaInicio: fInicio,
                fechaFin: fFin,
                fechasTexto: fechasTexto,
                dias: diasSolicitados,
                tipo: tipoTexto,
                motivo: motivo,
                estado: "pendiente",
                creadoEn: new Date().toISOString()
            };

            try {
                guardandoSolicitud = true;
                const btnEnviar = form.querySelector('button[type="submit"]');
                if (btnEnviar) {
                    btnEnviar.setAttribute('disabled', 'disabled');
                    btnEnviar.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Enviando...';
                }

                await addDoc(collection(db, "solicitudes"), nuevaSolicitud);

                AppState.notificaciones.unshift({
                    id: Date.now(),
                    texto: `Enviaste una solicitud de ${diasSolicitados} días.`,
                    fecha: "Justo ahora",
                    leida: false
                });

                const modalEl = document.getElementById('modalNuevaSolicitud');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
                if (labelDias) labelDias.textContent = '0 Días';

                Swal.fire('Éxito', '¡Tu solicitud de vacaciones fue registrada exitosamente!', 'success');

            } catch (error) {
                console.error("Error al guardar la solicitud:", error);
                Swal.fire('Error', 'Hubo un error al registrar tu solicitud.', 'error');
            } finally {
                guardandoSolicitud = false;
                const btnEnviar = form.querySelector('button[type="submit"]');
                if (btnEnviar) {
                    btnEnviar.removeAttribute('disabled');
                    btnEnviar.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> Enviar Solicitud';
                }
            }
        });
    }
}

let solicitudSeleccionada = null;

function mostrarDetalleSolicitud(solicitud) {
    if (!solicitud) return;
    solicitudSeleccionada = solicitud;

    const modalEl = document.getElementById('modalDetalleSolicitud');
    if (!modalEl) return;

    if (document.getElementById('detalleEmpleado')) document.getElementById('detalleEmpleado').textContent = solicitud.empleado || '-';
    if (document.getElementById('detalleCargo')) document.getElementById('detalleCargo').textContent = solicitud.cargo || '-';
    if (document.getElementById('detalleFechas')) document.getElementById('detalleFechas').textContent = solicitud.fechasTexto || `${solicitud.fechaInicio} - ${solicitud.fechaFin}`;
    if (document.getElementById('detalleDias')) document.getElementById('detalleDias').textContent = `${solicitud.dias} días`;
    if (document.getElementById('detalleTipo')) document.getElementById('detalleTipo').textContent = solicitud.tipo || 'Vacaciones';
    if (document.getElementById('detalleMotivo')) document.getElementById('detalleMotivo').textContent = solicitud.motivo || 'Sin observaciones.';

    const avatar = document.getElementById('detalleAvatar');
    if (avatar) {
        avatar.textContent = solicitud.iniciales || (solicitud.empleado ? solicitud.empleado.substring(0, 2).toUpperCase() : 'US');
        avatar.style.background = solicitud.avatarBg || 'var(--primary-gradient)';
    }

    const estadoLower = (solicitud.estado || 'pendiente').toString().trim().toLowerCase();

    const estadoBadge = document.getElementById('detalleEstadoBadge');
    if (estadoBadge) {
        if (estadoLower === 'pendiente') {
            estadoBadge.innerHTML = `<span class="badge-status badge-pendiente"><i class="fa-solid fa-clock me-1"></i> Pendiente de Aprobación</span>`;
        } else if (estadoLower === 'aprobado' || estadoLower === 'aprobada') {
            estadoBadge.innerHTML = `<span class="badge-status badge-aprobado"><i class="fa-solid fa-circle-check me-1"></i> Aprobada</span>`;
        } else if (estadoLower.includes('cancel')) {
            estadoBadge.innerHTML = `<span class="badge bg-danger"><i class="fa-solid fa-circle-xmark me-1"></i> Cancelada</span>`;
        } else {
            estadoBadge.innerHTML = `<span class="badge bg-danger"><i class="fa-solid fa-circle-xmark me-1"></i> Rechazada</span>`;
        }
    }

    const detalleAcciones = document.getElementById('detalleAcciones');
    const btnAprobar = document.getElementById('btnAprobarSolicitud');
    const btnCancelar = document.getElementById('btnCancelarSolicitud');

    const esOperador = verificarRolOperador();
    console.log('DEBUG rol:', AppState.usuario.rol, '| esOperador:', esOperador);
    const esMiSolicitud = AppState.usuario && (
        (solicitud.uid_empleado && solicitud.uid_empleado === AppState.usuario.uid) ||
        (solicitud.empleado && AppState.usuario.nombre && solicitud.empleado.trim().toLowerCase() === AppState.usuario.nombre.trim().toLowerCase())
    );

    console.log('DEBUG detalleAcciones: ', detalleAcciones, '| estadoLower:', estadoLower, '| esMiSolicitud', esMiSolicitud);
    if (detalleAcciones) {
        if (esOperador) {
            detalleAcciones.style.display = 'flex';

            if (estadoLower === 'pendiente') {
                if (btnAprobar) {
                    btnAprobar.style.display = 'inline-block';
                    btnAprobar.disabled = false;
                    btnAprobar.className = 'btn btn-success fw-semibold';
                    btnAprobar.innerHTML = '<i class="fa-solid fa-check me-1"></i> Aprobar Solicitud';
                }
                if (btnCancelar) {
                    btnCancelar.style.display = 'inline-block';
                    btnCancelar.disabled = false;
                    btnCancelar.className = 'btn btn-danger fw-semibold';
                    btnCancelar.innerHTML = 'Cancelar Solicitud';
                }
            } else if (estadoLower === 'aprobado' || estadoLower === 'aprobada') {
                if (btnAprobar) {
                    btnAprobar.style.display = 'inline-block';
                    btnAprobar.disabled = true;
                    btnAprobar.className = 'btn btn-success fw-semibold';
                    btnAprobar.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i> Aprobada';
                }
                if (btnCancelar) {
                    btnCancelar.style.display = 'none';
                }
            } else {
                if (btnAprobar) {
                    btnAprobar.style.display = 'inline-block';
                    btnAprobar.disabled = true;
                    btnAprobar.className = 'btn btn-secondary fw-semibold';
                    btnAprobar.innerHTML = `<i class="fa-solid fa-circle-xmark me-1"></i> ${estadoLower.includes('cancel') ? 'Cancelada' : 'Rechazada'}`;
                }
                if (btnCancelar) {
                    btnCancelar.style.display = 'none';
                }
            }
        } else if (esMiSolicitud && estadoLower === 'pendiente') {
            detalleAcciones.style.display = 'flex';
            if (btnAprobar) btnAprobar.style.display = 'none';
            if (btnCancelar) {
                btnCancelar.style.display = 'inline-block';
                btnCancelar.disabled = false;
                btnCancelar.className = 'btn btn-danger fw-semibold';
                btnCancelar.innerHTML = 'Cancelar Solicitud';
            }
        } else {
            detalleAcciones.style.display = 'none';
            if (btnAprobar) btnAprobar.style.display = 'none';
            if (btnCancelar) btnCancelar.style.display = 'none';
        }
    }

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
}

function initDetailModal() {
    const tableBody = document.getElementById('requestsTableBody');
    const modalEl = document.getElementById('modalDetalleSolicitud');
    if (!modalEl) return;

    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-ver-detalle');
            if (!btn) return;

            const idFirestore = btn.getAttribute('data-id');
            const sol = AppState.solicitudes.find(s => s.idFirestore === idFirestore);
            if (sol) {
                mostrarDetalleSolicitud(sol);
            }
        });
    }

    const btnAprobar = document.getElementById('btnAprobarSolicitud');
    const btnCancelar = document.getElementById('btnCancelarSolicitud');

    if (btnAprobar) {
        btnAprobar.addEventListener('click', async () => {
            if (!solicitudSeleccionada) return;

            const esOperador = verificarRolOperador();
            if (!esOperador) {
                Swal.fire('Error', 'Únicamente los usuarios con el rol Operador pueden aprobar solicitudes.', 'error');
                return;
            }

            try {
                const solRef = doc(db, "solicitudes", solicitudSeleccionada.idFirestore);
                await updateDoc(solRef, { estado: "aprobado" });

                const userRef = doc(db, "usuarios", solicitudSeleccionada.uid_empleado);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const actualSaldo = userSnap.data().saldoDisponible ?? 0;
                    const nuevoSaldo = Math.max(0, actualSaldo - solicitudSeleccionada.dias);
                    await updateDoc(userRef, { saldoDisponible: nuevoSaldo });
                    if (solicitudSeleccionada.uid_empleado === AppState.usuario.uid) {
                        AppState.usuario.saldoDisponible = nuevoSaldo;
                    }
                }

                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
                Swal.fire('Aprobada', `Solicitud de ${solicitudSeleccionada.empleado} ha sido Aprobada.`, 'success');
            } catch (error) {
                console.error("Error al aprobar solicitud en Firestore:", error);
                Swal.fire('Error', 'Hubo un error al aprobar la solicitud.', 'error');
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', async () => {
            if (!solicitudSeleccionada) return;

            try {
                const solRef = doc(db, "solicitudes", solicitudSeleccionada.idFirestore);
                await updateDoc(solRef, { estado: "rechazado" });

                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
                Swal.fire('Cancelada', `Solicitud de ${solicitudSeleccionada.empleado} ha sido Cancelada.`, 'success');
            } catch (error) {
                console.error("Error al cancelar solicitud en Firestore:", error);
                Swal.fire('Error', 'Hubo un error al cancelar la solicitud.', 'error');
            }
        });
    }
}

function renderProximasAusencias() {
    const container = document.querySelector('.absence-list');
    if (!container) return;

    if (!AppState.solicitudesCargadas) {
        container.innerHTML = skeletonItemsAusencias();
        return;
    }

    const hoyStr = fechaLocalStr();
    const ausencias = AppState.solicitudes
        .filter(s => s.estado === 'aprobado' && s.fechaFin >= hoyStr)
        .sort((a, b) => new Date(a.fechaInicio + 'T00:00:00') - new Date(b.fechaInicio + 'T00:00:00'))
        .slice(0, 4);

    if (ausencias.length === 0) {
        container.innerHTML = `<div class="text-center text-muted small py-3">No hay ausencias programadas próximamente</div>`;
        notifyReveal(container);
        return;
    }

    let html = '';
    ausencias.forEach(a => {
        const enCurso = a.fechaInicio <= hoyStr && a.fechaFin >= hoyStr;
        const badgeText = enCurso ?
            `<small class="d-block text-success fw-bold" style="font-size: 0.7rem;"><i class="fa-solid fa-plane-departure me-1"></i>En Curso</small>` :
            `<small class="d-block text-muted" style="font-size: 0.7rem;"><i class="fa-solid fa-calendar me-1"></i>Próximamente</small>`;

        html += `
            <div class="absence-item">
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-circle" style="width: 36px; height: 36px; font-size: 0.85rem; background: ${a.avatarBg || '#0284c7'};">${a.iniciales}</div>
                    <div>
                        <strong class="d-block text-dark lh-1" style="font-size: 0.875rem;">${a.empleado}</strong>
                        <small class="text-muted" style="font-size: 0.75rem;">${a.cargo}</small>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge bg-light text-dark border fw-semibold mb-1 d-inline-block">${a.fechasTexto.split(' 20')[0]}</span>
                    ${badgeText}
                </div>
            </div>`;
    });
    container.innerHTML = html;
    notifyReveal(container);
}

export function renderProximoFeriado() {
    const cardFeriado = document.querySelector('.dashboard-card .p-3.rounded-3');
    if (!cardFeriado) return;

    const hoy = fechaLocalStr();
    const proximo = FERIADOS_OFICIALES_MX.find(f => f >= hoy);

    if (proximo) {
        const fechaObj = new Date(proximo + 'T00:00:00');
        const dia = fechaObj.getDate();
        const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
        const mes = meses[fechaObj.getMonth()];
        const nombre = nombresFeriados[proximo] || 'Día Inhábil Oficial';

        cardFeriado.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-3 bg-white text-danger rounded-3 shadow-sm text-center" style="min-width: 55px;">
                    <strong class="d-block fs-4 lh-1">${dia}</strong>
                    <small class="fw-bold text-uppercase" style="font-size: 0.65rem;">${mes}</small>
                </div>
                <div>
                    <h6 class="fw-bold text-dark mb-1">${nombre}</h6>
                    <p class="text-muted small mb-0">Día de descanso obligatorio (LFT México) (${fechaObj.getFullYear()}.)</p>
                </div>
            </div>`;
    }
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
            renderRequestsTable(btn.getAttribute('data-filter'));
        });
    });
}

export function notificaciones() {
    const notiUI = document.getElementById('notiUI');
    const badgeNotiUI = document.getElementById('badgeNotiUI');

    // Generar notificaciones únicamente cuando un usuario realice una solicitud de vacaciones
    const solicitudesVisibles = (AppState.solicitudes || []).filter(s => esSolicitudVisibleParaElUsuario(s));
    if (solicitudesVisibles.length === 0) {
        AppState.notificaciones = [];
        if (badgeNotiUI) badgeNotiUI.classList.add('d-none');
        if (notiUI) {
            notiUI.innerHTML = `
                <li class="p-3 text-center text-muted small">
                    <i class="fa-solid fa-bell-slash d-block fs-5 mb-2 opacity-50"></i>
                    No hay notificaciones de solicitudes
                </li>`;
        }
        return;
    }

    // Ordenar solicitudes por fecha de creación (más recientes primero)
    const solicitudesOrdenadas = [...solicitudesVisibles].sort((a, b) => {
        const fechaA = a.creadoEn ? new Date(a.creadoEn) : 0;
        const fechaB = b.creadoEn ? new Date(b.creadoEn) : 0;
        return fechaB - fechaA;
    });

    AppState.notificaciones = solicitudesOrdenadas.map(req => {
        const esPropia = AppState.usuario && req.uid_empleado === AppState.usuario.uid;
        const texto = esPropia
            ? `Enviaste una solicitud de ${req.dias} día(s) de ${req.tipo || 'vacaciones'}`
            : `${req.empleado || 'Un colaborador'} solicitó ${req.dias} día(s) de ${req.tipo || 'vacaciones'}`;

        let fechaTexto = 'Reciente';
        if (req.creadoEn) {
            try {
                const f = new Date(req.creadoEn);
                fechaTexto = f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' ' + f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                fechaTexto = req.fechasTexto || 'Reciente';
            }
        }

        let badgeClass = 'badge-pendiente';
        if (req.estado === 'aprobado') badgeClass = 'bg-success-subtle text-success';
        if (req.estado === 'rechazado') badgeClass = 'bg-danger-subtle text-danger';

        return {
            id: req.idFirestore,
            texto: texto,
            fecha: fechaTexto,
            estado: req.estado || 'pendiente',
            badgeClass: badgeClass,
            empleado: req.empleado
        };
    });

    if (badgeNotiUI) {
        if (AppState.notificaciones.length > 0) {
            badgeNotiUI.classList.remove('d-none');
        } else {
            badgeNotiUI.classList.add('d-none');
        }
    }

    if (notiUI) {
        let html = `
            <li class="dropdown-header px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-light">
                <span class="fw-bold text-dark" style="font-size: 0.8rem;">Solicitudes de Vacaciones</span>
                <span class="badge bg-danger rounded-pill">${AppState.notificaciones.length}</span>
            </li>
        `;

        AppState.notificaciones.forEach(n => {
            html += `
                <li>
                    <a href="#" 
                       class="dropdown-item dropdown-item-custom d-flex justify-content-between align-items-center py-2 px-3 border-bottom text-wrap"
                       onclick="abrirDetalleDesdeNotificacion('${n.id}')">
                        <div class="pe-2" style="max-width: 220px;">
                            <span class="d-block small text-dark fw-semibold mb-1" style="line-height: 1.25;">${n.texto}</span>
                            <small class="text-muted d-block" style="font-size: 0.7rem;"><i class="fa-regular fa-clock me-1"></i>${n.fecha}</small>
                        </div>
                        <span class="badge ${n.badgeClass} rounded-pill text-capitalize" style="font-size: 0.65rem;">${n.estado}</span>
                    </a>
                </li>`;
        });

        notiUI.innerHTML = html;
    }
}

window.abrirDetalleDesdeNotificacion = function (idFirestore) {
    const solicitud = AppState.solicitudes.find(s => s.idFirestore === idFirestore);
    if (!solicitud) return;
    mostrarDetalleSolicitud(solicitud);
};

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

export function cargarInfoUsuarios() {
    if (!AppState.usuario) return;

    rellenarTexto(document.getElementById('userNameUI'), AppState.usuario.nombre || 'Usuario');
    rellenarTexto(document.getElementById('userRoleUI'), AppState.usuario.cargo || 'Colaborador');
    rellenarTexto(document.getElementById('userNameTitle'), AppState.usuario.nombre ? AppState.usuario.nombre.split(' ')[0] : '');
    rellenarTexto(document.getElementById('userIniciales'), AppState.usuario.iniciales || 'US');

    rellenarTexto(document.getElementById('userNameCalendar'), AppState.usuario.nombre || 'Usuario');
    rellenarTexto(document.getElementById('userRoleCalendar'), AppState.usuario.cargo || 'Colaborador');
    rellenarTexto(document.getElementById('userInicialesCalendar'), AppState.usuario.iniciales || 'US');

    // Rellenar información de días en el panel izquierdo del calendario
    const total = AppState.usuario.saldoTotal || 0;
    const pendientes = AppState.usuario.saldoDisponible ?? total;
    const tomados = Math.max(0, total - pendientes);

    rellenarTexto(document.getElementById('calDiasTotal'), total);
    rellenarTexto(document.getElementById('calDiasTomados'), tomados);
    rellenarTexto(document.getElementById('calDiasPendientes'), pendientes);

    // Rellenar la lista de fechas tomadas/solicitadas
    const listaFechas = document.getElementById('calFechasList');
    if (listaFechas) {
        if (!AppState.solicitudesCargadas) {
            listaFechas.innerHTML = `
                <li class="skeleton" style="display: block; height: 3.1rem; border-radius: 10px; margin-bottom: 0.5rem;"></li>
                <li class="skeleton" style="display: block; height: 3.1rem; border-radius: 10px; margin-bottom: 0.5rem;"></li>
                <li class="skeleton" style="display: block; height: 3.1rem; border-radius: 10px;"></li>`;
            return;
        }

        listaFechas.innerHTML = '';
        const misVacaciones = (AppState.solicitudes || []).filter(req => {
            const esMismaPersona = (req.uid_empleado && AppState.usuario.uid && req.uid_empleado === AppState.usuario.uid) ||
                (req.empleado && AppState.usuario.nombre && req.empleado.trim().toLowerCase() === AppState.usuario.nombre.trim().toLowerCase());
            return esMismaPersona;
        });

        if (misVacaciones.length === 0) {
            listaFechas.innerHTML = `<li class="text-muted small fst-italic py-2">No hay fechas registradas.</li>`;
        } else {
            misVacaciones.forEach(req => {
                const li = document.createElement('li');
                let badgeEstado = '<span class="badge badge-pendiente ms-1" style="font-size: 0.6rem;">Pendiente</span>';
                if (req.estado === 'aprobado') {
                    badgeEstado = '<span class="badge bg-success-subtle text-success ms-1" style="font-size: 0.6rem;">Aprobado</span>';
                } else if (req.estado === 'rechazado') {
                    badgeEstado = '<span class="badge bg-danger-subtle text-danger ms-1" style="font-size: 0.6rem;">Rechazado</span>';
                }

                li.className = 'p-2 mb-2 bg-light rounded border-start border-danger border-3 shadow-sm';
                li.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-dark lh-1" style="font-size: 0.75rem;">${req.fechasTexto || `${req.fechaInicio} - ${req.fechaFin}`}</strong>
                        ${badgeEstado}
                    </div>
                    <small class="text-muted d-block" style="font-size: 0.68rem;">${req.dias} día(s) • ${req.tipo || 'Vacaciones'}</small>
                `;
                listaFechas.appendChild(li);
            });
        }
        notifyReveal(listaFechas);
    }
}

export function initModalPerfil() {
    const modalEl = document.getElementById('modalPerfilUsuario');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', () => {
            rellenarPerfilUsuario();
        });

        modalEl.addEventListener('hidden.bs.modal', () => {
            const modalesAbiertos = document.querySelectorAll('.modal.show');
            if (modalesAbiertos.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '';
                document.body.style.overflow = '';
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            }
        });
    }
}

export function rellenarPerfilUsuario() {
    if (!AppState.usuario) return;
    const modalEl = document.getElementById('modalPerfilUsuario');
    if (!modalEl) return;

    const u = AppState.usuario;

    const avatar = document.getElementById('perfilAvatar');
    if (avatar) {
        avatar.textContent = u.iniciales || getIniciales(u.nombre);
        avatar.style.background = u.avatar || 'var(--primary-gradient)';
    }

    rellenarTexto(document.getElementById('perfilNombre'), u.nombre || 'Usuario');
    rellenarTexto(document.getElementById('perfilCargo'), `${u.cargo || 'Colaborador'} | ${u.area || u.depto || 'General'}`);

    const rolBadge = document.getElementById('perfilRolBadge');
    if (rolBadge) {
        const esOp = (u.rol || '').toLowerCase().trim() === 'operador';
        rolBadge.className = esOp ? 'badge badge-rechazado' : 'badge bg-light text-secondary';
        rolBadge.textContent = u.rol || 'Empleado';
    }

    if (document.getElementById('perfilArea')) {
        document.getElementById('perfilArea').innerHTML = `<i class="fa-solid fa-building text-danger"></i>${u.area || u.depto || 'General'}`;
    }
    if (document.getElementById('perfilPuesto')) {
        document.getElementById('perfilPuesto').innerHTML = `<i class="fa-solid fa-briefcase text-danger"></i>${u.cargo || 'Colaborador'}`;
    }
    if (document.getElementById('perfilRolTexto')) {
        document.getElementById('perfilRolTexto').innerHTML = `<i class="fa-solid fa-user-shield text-danger"></i>${u.rol || 'Empleado'}`;
    }
    if (document.getElementById('perfilUid')) {
        document.getElementById('perfilUid').textContent = u.uid || '-';
    }

    let fechaTexto = 'No registrada';
    let antiguedadTexto = 'Sin registrar';

    if (u.fechaIngreso && u.fechaIngreso !== 'No registrada') {
        try {
            const f = new Date(u.fechaIngreso + 'T00:00:00');
            fechaTexto = f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

            const hoy = new Date();
            let anios = hoy.getFullYear() - f.getFullYear();
            let m = hoy.getMonth() - f.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) {
                anios--;
                m += 12;
            }
            anios = Math.max(0, anios);
            if (anios === 0 && m === 0) {
                antiguedadTexto = 'Menos de 1 mes';
            } else {
                antiguedadTexto = `${anios} año(s)${m > 0 ? ` y ${m} mes(es)` : ''}`;
            }
        } catch (error) {
            fechaTexto = u.fechaIngreso;
        }
    }

    if (document.getElementById('perfilFechaIngreso')) {
        document.getElementById('perfilFechaIngreso').innerHTML = `<i class="fa-solid fa-calendar text-danger"></i>${fechaTexto}`;
    }
    if (document.getElementById('perfilAntiguedad')) {
        document.getElementById('perfilAntiguedad').innerHTML = `<i class="fa-solid fa-clock-rotate text-danger"></i>${antiguedadTexto}`;
    }

    const total = u.saldoTotal;
    const disponible = u.saldoDisponible ?? total;
    const tomados = Math.max(0, total - disponible);
    const pct = total > 0 ? Math.round((disponible / total) * 100) : 0;

    if (document.getElementById('perfilSaldoTotal')) document.getElementById('perfilSaldoTotal').textContent = `${total} dias`;
    if (document.getElementById('perfilSaldoDisponible')) document.getElementById('perfilSaldoDisponible').textContent = `${disponible} dias`;
    if (document.getElementById('perfilSaldoTomados')) document.getElementById('perfilSaldoTomados').textContent = `${tomados} dias`;
    if (document.getElementById('perfilPctTexto')) document.getElementById('perfilPctTexto').textContent = `${pct}% disponible`;

    const bar = document.getElementById('perfilProgressBar');
    if (bar) {
        bar.style.width = `${pct}%`;
        bar.setAttribute('aria-valuenow', pct);
    }
}

export function mostrarPerfilUsuario() {
    const modalEl = document.getElementById('modalPerfilUsuario');
    if (!modalEl) return;

    rellenarPerfilUsuario();

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
}

window.mostrarPerfilUsuario = mostrarPerfilUsuario;
