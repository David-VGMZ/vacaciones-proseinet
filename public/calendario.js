import { AppState, cargarInfoUsuarios, nombresFeriados, FERIADOS_OFICIALES_MX, renderProximoFeriado } from '/app.js';

let currentDate = new Date();

/* function renderUserInfo() {
    if (!document.getElementById('userNameCalendar')) return;
    document.getElementById('userNameCalendar').textContent = AppState.usuario.nombre || 'Usuario';
    document.getElementById('userRoleCalendar').textContent = AppState.usuario.cargo || 'Cargo';
    document.getElementById('userAvatar').textContent = AppState.usuario.iniciales || 'US';

    const total = AppState.usuario.saldoTotal || 0;
    const pendientes = AppState.usuario.saldoDisponible || 0;
    let tomados = Math.max(0, total - pendientes);

    if (document.getElementById('calDiasTotal')) document.getElementById('calDiasTotal').textContent = total;
    if (document.getElementById('calDiasTomados')) document.getElementById('calDiasTomados').textContent = tomados;
    if (document.getElementById('calDiasPendientes')) document.getElementById('calDiasPendientes').textContent = pendientes;

    const listaFechas = document.getElementById('calFechasList');
    if (listaFechas) {
        listaFechas.innerHTML = '';
        const misVacaciones = AppState.solicitudes.filter(req =>
            req.empleado === AppState.usuario.nombre && req.estado === 'aprobado'
        );

        if (misVacaciones.length === 0) {
            listaFechas.innerHTML = `<li class="text-muted small fst-italic">No hay fechas registradas.</li>`;
        } else {
            misVacaciones.forEach(req => {
                const li = document.createElement('li');
                li.className = 'p-2 mb-2 bg-light rounded border-start border-danger border-3';
                li.innerHTML = `
                <strong class="d-block text-dark lh-1" style="font-size: 0.75rem;">${req.fechasTexto}</strong>
                <small class="text-muted" style="font-size: 0.65rem;">${req.dias} días - ${req.tipo}</small>
            `;
                listaFechas.appendChild(li);
            });
        }
    }
} */

export function renderCalendar() {
    const calendarBody = document.getElementById('calendarBody');
    const monthYearDisplay = document.getElementById('monthYearDisplay');
    if (!calendarBody) return;

    calendarBody.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    if (monthYearDisplay) monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    let firstDayJS = new Date(year, month, 1).getDay();
    const firstDay = firstDayJS === 0 ? 6 : firstDayJS - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty';
        calendarBody.appendChild(emptyCell);
    }

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const mesStr = String(month + 1).padStart(2, '0');
        const diaStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${mesStr}-${diaStr}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        const esFeriado = FERIADOS_OFICIALES_MX.includes(dateStr);
        const nombreFeriado = esFeriado ? (nombresFeriados[dateStr] || 'Día Inhábil') : '';

        if (esFeriado) {
            cell.style.backgroundColor = '#fef2f2';
            cell.title = nombreFeriado;
        }

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        let cellHTML = `
            <div class="d-flex justify-content-between align-items-start mb-1">
                ${esFeriado ? `<span class="text-secondary fw-bold pe-1 mx-" style="font-size: 0.65rem;" title="${nombreFeriado}"><br>* ${nombreFeriado}</span>` : '<span></span>'}
                <span class="fw-bold ${esFeriado ? 'text-danger' : 'text-muted'}" style="font-size: 0.8rem;">${day}</span>
            </div>`;

        const dailyRequests = AppState.solicitudes.filter(req => {
            if (req.estado === 'rechazado') return false;
            const start = new Date(req.fechaInicio + 'T00:00:00');
            const end = new Date(req.fechaFin + 'T23:59:59');
            return cellDate >= start && cellDate <= end;
        });

        dailyRequests.forEach(req => {
            const statusClass = req.estado === 'aprobado' ? 'vacation-aprobado' : 'vacation-pendiente';
            const icon = req.estado === 'aprobado' ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-clock"></i>';
            cellHTML += `
                <div class="vacation-badge ${statusClass}" title="${req.empleado} - ${req.tipo}">
                    ${icon} ${req.iniciales}
                </div>`;
        });

        cell.innerHTML = cellHTML;
        calendarBody.appendChild(cell);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    renderCalendar();
    cargarInfoUsuarios();
    renderProximoFeriado();
});