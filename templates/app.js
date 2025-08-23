// ============ SISTEMA MBL CASA APUESTAS - APP.JS ============
// Variables globales
let currentUser = null;
let charts = {}; // Almacenar instancias de Chart.js
let analyticsData = {};

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Verificar autenticación
    if (!checkAuth()) return;
    
    // Configurar eventos
    setupEventListeners();
    
    // Cargar datos iniciales
    loadUserData();
    loadInitialData();
    
    // Inicializar analytics
    initializeAnalytics();
    loadDashboardData();
}

function checkAuth() {
    const token = localStorage.getItem('mbl_token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// ============ GESTIÓN DE USUARIO ============
function loadUserData() {
    const username = localStorage.getItem('mbl_username');
    const role = localStorage.getItem('mbl_role');
    
    if (username) {
        document.getElementById('username-display').textContent = username;
        currentUser = { username, role };
        
        // Mostrar tab admin si es admin
        if (role === 'admin') {
            document.getElementById('admin-tab').style.display = 'block';
        }
    }
}

// ============ EVENTOS PRINCIPALES ============
function setupEventListeners() {
    // Tabs navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Clientes
    document.getElementById('new-client-btn').addEventListener('click', openClientModal);
    document.getElementById('client-search').addEventListener('input', searchClients);
    document.getElementById('client-form').addEventListener('submit', saveClient);
    
    // Canjes
    document.getElementById('new-canje-btn').addEventListener('click', openCanjeModal);
    document.getElementById('canje-form').addEventListener('submit', saveCanje);
    
    // Modals
    setupModalEvents();
    
    // ============ NUEVOS EVENTOS ANALYTICS ============
    setupAnalyticsEvents();
}

function setupAnalyticsEvents() {
    // Refresh analytics
    document.getElementById('refresh-analytics').addEventListener('click', refreshAnalytics);
    
    // Cambio de período
    document.getElementById('analytics-period').addEventListener('change', function() {
        refreshAnalytics();
    });
    
    // Cambio límite top clientes
    document.getElementById('top-clients-limit').addEventListener('change', function() {
        loadTopClients();
    });
}

function setupModalEvents() {
    // Cliente modal
    document.getElementById('client-modal-close').addEventListener('click', closeClientModal);
    document.getElementById('client-cancel-btn').addEventListener('click', closeClientModal);
    
    // Canje modal
    document.getElementById('canje-modal-close').addEventListener('click', closeCanjeModal);
    document.getElementById('canje-cancel-btn').addEventListener('click', closeCanjeModal);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============ NAVEGACIÓN TABS ============
function switchTab(tabName) {
    // Remover active de todos los tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Activar tab seleccionado
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Cargar datos específicos del tab
    switch(tabName) {
        case 'dashboard':
            refreshAnalytics();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'canjes':
            loadCanjes();
            loadClientesForSelect();
            break;
        case 'admin':
            loadAdminStats();
            break;
    }
}

// ============ FUNCIONES ANALYTICS ============

function initializeAnalytics() {
    console.log('Inicializando Analytics Dashboard...');
    
    // Configurar Chart.js defaults
    Chart.defaults.color = '#E5E7EB';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.legend.display = false;
    
    // Crear contenedores de gráficos
    createChartContainers();
}

function createChartContainers() {
    // Los canvas ya están en el HTML, solo verificamos que existan
    const dailySalesCanvas = document.getElementById('daily-sales-chart');
    const topClientsCanvas = document.getElementById('top-clients-chart');
    const hourlyPatternCanvas = document.getElementById('hourly-pattern-chart');
    
    if (!dailySalesCanvas || !topClientsCanvas || !hourlyPatternCanvas) {
        console.error('Canvas elements not found');
        return;
    }
    
    console.log('Canvas elements found, ready to create charts');
}

async function loadDashboardData() {
    showLoading('Cargando dashboard...');
    
    try {
        // Cargar todos los datos en paralelo
        await Promise.all([
            loadKPIs(),
            loadDailySales(),
            loadTopClients(),
            loadTrends()
        ]);
        
        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error cargando datos del dashboard', 'error');
    } finally {
        hideLoading();
    }
}

async function loadKPIs() {
    try {
        const response = await fetch('/api/mbl/analytics/kpis');
        const data = await response.json();
        
        if (data.success) {
            updateKPIs(data.kpis);
            analyticsData.kpis = data.kpis;
        }
    } catch (error) {
        console.error('Error loading KPIs:', error);
    }
}

function updateKPIs(kpis) {
    // KPIs Hoy
    document.getElementById('canjes-hoy').textContent = kpis.today.canjes;
    document.getElementById('monto-hoy').textContent = `$${formatNumber(kpis.today.monto)}`;
    
    // KPIs Mes
    document.getElementById('canjes-mes').textContent = kpis.month.canjes;
    document.getElementById('monto-mes').textContent = `$${formatNumber(kpis.month.monto)}`;
    
    // Crecimiento mes
    const growthElement = document.getElementById('growth-mes');
    const growthPercent = kpis.month.growth_monto;
    const growthIcon = growthPercent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const growthClass = growthPercent >= 0 ? 'positive' : 'negative';
    
    growthElement.innerHTML = `
        <i class="fas ${growthIcon}"></i> ${Math.abs(growthPercent)}%
    `;
    growthElement.className = `kpi-growth ${growthClass}`;
    
    // Clientes activos
    document.getElementById('clientes-activos').textContent = kpis.month.clientes_activos;
    document.getElementById('promedio-canje').textContent = `$${formatNumber(kpis.today.promedio)} promedio`;
    
    // Top cliente
    if (kpis.top_client) {
        document.getElementById('top-cliente-nombre').textContent = kpis.top_client.nombre.substring(0, 20) + '...';
        document.getElementById('top-cliente-canjes').textContent = `${kpis.top_client.total_canjes} canjes`;
        document.getElementById('top-cliente-monto').textContent = `$${formatNumber(kpis.top_client.total_monto)}`;
    }
}

async function loadDailySales() {
    const period = document.getElementById('analytics-period').value;
    const loadingElement = document.getElementById('daily-sales-loading');
    
    try {
        loadingElement.style.display = 'flex';
        
        const response = await fetch(`/api/mbl/analytics/daily-sales?days=${period}`);
        const data = await response.json();
        
        if (data.success) {
            createDailySalesChart(data.data);
            analyticsData.dailySales = data.data;
        }
    } catch (error) {
        console.error('Error loading daily sales:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

function createDailySalesChart(data) {
    const ctx = document.getElementById('daily-sales-chart').getContext('2d');
    
    // Destruir gráfico existente
    if (charts.dailySales) {
        charts.dailySales.destroy();
    }
    
    charts.dailySales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Canjes Diarios',
                    data: data.datasets[0].data,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#8B5CF6',
                    pointBorderColor: '#8B5CF6',
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Monto Diario ($)',
                    data: data.datasets[1].data,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#10B981',
                    pointHoverRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Usamos nuestra propia leyenda
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 1) {
                                label += '$' + formatNumber(context.parsed.y);
                            } else {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#9CA3AF',
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            }
        }
    });
}

async function loadTopClients() {
    const limit = document.getElementById('top-clients-limit').value;
    const loadingElement = document.getElementById('top-clients-loading');
    
    try {
        loadingElement.style.display = 'flex';
        
        const response = await fetch(`/api/mbl/analytics/top-clients?limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
            createTopClientsChart(data.data);
            analyticsData.topClients = data;
        }
    } catch (error) {
        console.error('Error loading top clients:', error);
    } finally {
        loadingElement.style.display = 'none';
    }
}

function createTopClientsChart(data) {
    const ctx = document.getElementById('top-clients-chart').getContext('2d');
    
    // Destruir gráfico existente
    if (charts.topClients) {
        charts.topClients.destroy();
    }
    
    charts.topClients = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Monto Total Canjeado',
                data: data.datasets[0].data,
                backgroundColor: data.datasets[0].backgroundColor,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Barras horizontales
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'Total: $' + formatNumber(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF',
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

async function loadTrends() {
    try {
        const response = await fetch('/api/mbl/analytics/trends');
        const data = await response.json();
        
        if (data.success) {
            updateTrendsSection(data.trends);
            createHourlyPatternChart(data.trends.hourly_pattern);
            analyticsData.trends = data.trends;
        }
    } catch (error) {
        console.error('Error loading trends:', error);
    }
}

function updateTrendsSection(trends) {
    // Comparativa semanal
    const weeklyComparison = trends.weekly_comparison;
    
    document.getElementById('current-week-canjes').textContent = `${weeklyComparison.current_week.canjes} canjes`;
    document.getElementById('current-week-monto').textContent = `$${formatNumber(weeklyComparison.current_week.monto)}`;
    
    document.getElementById('previous-week-canjes').textContent = `${weeklyComparison.previous_week.canjes} canjes`;
    document.getElementById('previous-week-monto').textContent = `$${formatNumber(weeklyComparison.previous_week.monto)}`;
    
    // Cambios porcentuales
    updateChangeIndicator('canjes-change', weeklyComparison.changes.canjes_percent, 'Canjes');
    updateChangeIndicator('monto-change', weeklyComparison.changes.monto_percent, 'Monto');
    
    // Ranking días de la semana
    updateWeekdayRanking(trends.weekday_ranking);
}

function updateChangeIndicator(elementId, percent, label) {
    const element = document.getElementById(elementId);
    const isPositive = percent >= 0;
    const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    const className = isPositive ? 'positive' : 'negative';
    
    element.innerHTML = `<i class="fas ${icon}"></i> ${Math.abs(percent)}% ${label}`;
    element.className = `change-item ${className}`;
}

function updateWeekdayRanking(weekdayData) {
    const container = document.getElementById('weekday-ranking');
    
    container.innerHTML = weekdayData.map((day, index) => `
        <div class="weekday-item">
            <div class="weekday-rank">${index + 1}</div>
            <div class="weekday-name">${day.dia_semana}</div>
            <div class="weekday-stats">
                <span class="weekday-canjes">${day.total_canjes} canjes</span>
                <span class="weekday-avg">$${formatNumber(day.promedio_monto)} promedio</span>
            </div>
        </div>
    `).join('');
}

function createHourlyPatternChart(hourlyData) {
    const ctx = document.getElementById('hourly-pattern-chart').getContext('2d');
    
    // Destruir gráfico existente
    if (charts.hourlyPattern) {
        charts.hourlyPattern.destroy();
    }
    
    charts.hourlyPattern = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.labels,
            datasets: [{
                label: 'Canjes por Hora',
                data: hourlyData.canjes,
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#F59E0B',
                pointBorderColor: '#F59E0B',
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#374151',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF',
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#9CA3AF',
                        font: {
                            size: 10
                        },
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

async function refreshAnalytics() {
    console.log('Refreshing analytics...');
    showNotification('Actualizando datos...', 'info');
    
    try {
        await loadDashboardData();
        showNotification('Datos actualizados correctamente', 'success');
    } catch (error) {
        console.error('Error refreshing analytics:', error);
        showNotification('Error actualizando datos', 'error');
    }
}

// ============ FUNCIONES CLIENTES ============
async function loadClientes() {
    try {
        const response = await fetch('/api/mbl/clientes');
        const data = await response.json();
        
        if (data.success) {
            displayClientes(data.clientes);
        }
    } catch (error) {
        console.error('Error loading clientes:', error);
        showNotification('Error cargando clientes', 'error');
    }
}

function displayClientes(clientes) {
    const tbody = document.getElementById('clients-tbody');
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay clientes registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(cliente => `
        <tr>
            <td>${cliente.nombre}</td>
            <td>${cliente.cedula}</td>
            <td>${cliente.telefono || '-'}</td>
            <td>${cliente.email || '-'}</td>
            <td>${formatDate(cliente.fecha_registro)}</td>
            <td class="actions">
                <button class="btn-icon edit-btn" onclick="editClient(${cliente.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-btn" onclick="deleteClient(${cliente.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function searchClients() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    const rows = document.querySelectorAll('#clients-tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function openClientModal(clientData = null) {
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');
    const form = document.getElementById('client-form');
    
    if (clientData) {
        title.textContent = 'Editar Cliente';
        document.getElementById('client-id').value = clientData.id;
        document.getElementById('client-nombre').value = clientData.nombre;
        document.getElementById('client-cedula').value = clientData.cedula;
        document.getElementById('client-telefono').value = clientData.telefono || '';
        document.getElementById('client-email').value = clientData.email || '';
        document.getElementById('client-cedula').disabled = true;
    } else {
        title.textContent = 'Nuevo Cliente';
        form.reset();
        document.getElementById('client-cedula').disabled = false;
    }
    
    modal.style.display = 'flex';
    document.getElementById('client-nombre').focus();
}

function closeClientModal() {
    document.getElementById('client-modal').style.display = 'none';
}

async function saveClient(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('client-id').value;
    const clientData = {
        nombre: document.getElementById('client-nombre').value,
        cedula: document.getElementById('client-cedula').value,
        telefono: document.getElementById('client-telefono').value,
        email: document.getElementById('client-email').value
    };
    
    try {
        const url = clientId ? `/api/mbl/clientes/${clientId}` : '/api/mbl/clientes';
        const method = clientId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            closeClientModal();
            loadClientes();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving client:', error);
        showNotification('Error guardando cliente', 'error');
    }
}

async function editClient(clientId) {
    try {
        const response = await fetch('/api/mbl/clientes');
        const data = await response.json();
        
        if (data.success) {
            const client = data.clientes.find(c => c.id === clientId);
            if (client) {
                openClientModal(client);
            }
        }
    } catch (error) {
        console.error('Error loading client data:', error);
    }
}

async function deleteClient(clientId) {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
        const response = await fetch(`/api/mbl/clientes/${clientId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadClientes();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showNotification('Error eliminando cliente', 'error');
    }
}

// ============ FUNCIONES CANJES ============
async function loadCanjes() {
    try {
        const response = await fetch('/api/mbl/canjes');
        const data = await response.json();
        
        if (data.success) {
            displayCanjes(data.canjes);
        }
    } catch (error) {
        console.error('Error loading canjes:', error);
        showNotification('Error cargando canjes', 'error');
    }
}

function displayCanjes(canjes) {
    const tbody = document.getElementById('canjes-tbody');
    
    if (canjes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay canjes registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = canjes.map(canje => `
        <tr>
            <td>${formatDate(canje.fecha_canje)}</td>
            <td>${canje.cliente_nombre} (${canje.cliente_cedula})</td>
            <td class="amount">$${formatNumber(canje.monto)}</td>
            <td>${canje.descripcion || '-'}</td>
            <td>${canje.usuario_registro}</td>
            <td class="actions">
                <button class="btn-icon delete-btn" onclick="deleteCanje(${canje.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadClientesForSelect() {
    try {
        const response = await fetch('/api/mbl/clientes');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('canje-cliente');
            select.innerHTML = '<option value="">Seleccionar cliente...</option>';
            
            data.clientes.forEach(cliente => {
                select.innerHTML += `<option value="${cliente.id}">${cliente.nombre} - ${cliente.cedula}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading clients for select:', error);
    }
}

function openCanjeModal() {
    const modal = document.getElementById('canje-modal');
    document.getElementById('canje-form').reset();
    modal.style.display = 'flex';
    document.getElementById('canje-cliente').focus();
}

function closeCanjeModal() {
    document.getElementById('canje-modal').style.display = 'none';
}

async function saveCanje(e) {
    e.preventDefault();
    
    const canjeData = {
        cliente_id: document.getElementById('canje-cliente').value,
        monto: document.getElementById('canje-monto').value,
        descripcion: document.getElementById('canje-descripcion').value
    };
    
    try {
        const response = await fetch('/api/mbl/canjes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(canjeData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            closeCanjeModal();
            loadCanjes();
            // Actualizar analytics si estamos en dashboard
            if (document.getElementById('dashboard').classList.contains('active')) {
                refreshAnalytics();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving canje:', error);
        showNotification('Error registrando canje', 'error');
    }
}

async function deleteCanje(canjeId) {
    if (!confirm('¿Está seguro de eliminar este canje?')) return;
    
    try {
        const response = await fetch(`/api/mbl/canjes/${canjeId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadCanjes();
            // Actualizar analytics
            if (document.getElementById('dashboard').classList.contains('active')) {
                refreshAnalytics();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting canje:', error);
        showNotification('Error eliminando canje', 'error');
    }
}

// ============ FUNCIONES ADMIN ============
async function loadAdminStats() {
    try {
        const response = await fetch('/api/mbl/admin/stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            document.getElementById('admin-total-clientes').textContent = stats.total_clientes;
            document.getElementById('admin-total-canjes').textContent = stats.total_canjes;
            document.getElementById('admin-total-monto').textContent = `${formatNumber(stats.total_monto)}`;
            document.getElementById('admin-canjes-hoy').textContent = stats.canjes_hoy;
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showNotification('Error cargando estadísticas', 'error');
    }
}

// ============ FUNCIONES DE UTILIDAD ============
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(message = 'Cargando...') {
    const overlay = document.getElementById('loading-overlay');
    const text = overlay.querySelector('p');
    text.textContent = message;
    overlay.style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
}

function loadInitialData() {
    // Cargar datos según el tab activo
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        switch(activeTab.id) {
            case 'dashboard':
                // Ya se carga en initializeAnalytics
                break;
            case 'clientes':
                loadClientes();
                break;
            case 'canjes':
                loadCanjes();
                loadClientesForSelect();
                break;
            case 'admin':
                if (currentUser && currentUser.role === 'admin') {
                    loadAdminStats();
                }
                break;
        }
    }
}

async function logout() {
    try {
        const response = await fetch('/api/mbl/logout', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Limpiar storage
            localStorage.removeItem('mbl_token');
            localStorage.removeItem('mbl_username');
            localStorage.removeItem('mbl_role');
            
            // Destruir gráficos
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            
            // Redireccionar
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error during logout:', error);
        // Forzar logout local
        localStorage.clear();
        window.location.href = '/login';
    }
}

// ============ EVENTOS GLOBALES ============
window.addEventListener('resize', function() {
    // Redimensionar gráficos
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
});

// Actualizar analytics cada 5 minutos si está en dashboard
setInterval(() => {
    const dashboardTab = document.getElementById('dashboard');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        console.log('Auto-refreshing analytics...');
        loadKPIs(); // Solo KPIs para no sobrecargar
    }
}, 5 * 60 * 1000);

// ============ FUNCIONES EXPUESTAS GLOBALMENTE ============
// Para uso desde HTML onclick eventos
window.editClient = editClient;
window.deleteClient = deleteClient;
window.deleteCanje = deleteCanje;
window.refreshAnalytics = refreshAnalytics;

// ============ MANEJO DE ERRORES GLOBALES ============
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('Error de conexión', 'error');
});

// ============ CONFIGURACIÓN CHART.JS RESPONSIVE ============
Chart.register({
    id: 'customResponsive',
    beforeDraw: function(chart) {
        // Configuraciones adicionales para responsive
        if (window.innerWidth < 768) {
            // Mobile adjustments
            chart.options.plugins.tooltip.enabled = true;
            chart.options.scales.x.ticks.maxRotation = 45;
            chart.options.scales.y.ticks.font.size = 10;
        } else {
            // Desktop adjustments
            chart.options.scales.x.ticks.maxRotation = 0;
            chart.options.scales.y.ticks.font.size = 12;
        }
    }
});

console.log('MBL Casa Apuestas - App.js loaded successfully with Analytics support');