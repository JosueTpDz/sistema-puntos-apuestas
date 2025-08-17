// Continuación del código JavaScript
            this.showMessage('clientMessage', 'Cliente eliminado exitosamente', 'success');
        }
    }

    // === CANJE MANAGEMENT ===
    handleAddCanje(e) {
        e.preventDefault();
        const clientId = parseInt(document.getElementById('canjeClient').value);
        const amount = parseFloat(document.getElementById('canjeAmount').value);
        const description = document.getElementById('canjeDescription').value.trim();

        if (!clientId || amount <= 0 || !description) {
            this.showMessage('canjeMessage', 'Por favor complete todos los campos correctamente', 'error');
            return;
        }

        const canje = {
            id: this.generateId(),
            clientId,
            amount,
            description,
            user: this.currentUser,
            createdAt: new Date().toLocaleString()
        };

        this.canjesData[this.currentUser].push(canje);
        this.showMessage('canjeMessage', 'Canje registrado exitosamente', 'success');
        document.getElementById('canjeForm').reset();
        this.updateAllData();
    }

    updateCanjeClientSelect() {
        const select = document.getElementById('canjeClient');
        const clients = this.clientsData[this.currentUser] || [];

        select.innerHTML = '<option value="">Seleccione un cliente</option>';
        clients.forEach(client => {
            select.innerHTML += `<option value="${client.id}">${client.name} - ${client.dni}</option>`;
        });
    }

    renderCanjes() {
        const container = document.getElementById('canjesList');
        const canjes = this.canjesData[this.currentUser] || [];

        if (canjes.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 40px;">No hay canjes registrados</p>';
            return;
        }

        container.innerHTML = canjes.map(canje => {
            const client = this.clientsData[this.currentUser].find(c => c.id === canje.clientId);
            return `
                <div class="list-item">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${client ? client.name : 'Cliente no encontrado'}</div>
                            <div class="item-subtitle">Canje registrado: ${canje.createdAt}</div>
                        </div>
                        <div class="item-actions">
                            <button onclick="casinoApp.deleteCanje(${canje.id})" class="btn btn-danger" title="Eliminar Canje">
                                <span class="btn-icon">🗑️</span>
                            </button>
                        </div>
                    </div>
                    <div class="item-info">
                        <div class="info-item">
                            <div class="info-label">Monto</div>
                            <div class="info-value amount-display">S/ ${canje.amount.toFixed(2)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Descripción</div>
                            <div class="info-value">${canje.description}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Cliente DNI</div>
                            <div class="info-value">${client ? client.dni : 'N/A'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteCanje(canjeId) {
        if (confirm('¿Está seguro de eliminar este canje?')) {
            this.canjesData[this.currentUser] = this.canjesData[this.currentUser].filter(canje => canje.id !== canjeId);
            this.updateAllData();
            this.showMessage('canjeMessage', 'Canje eliminado exitosamente', 'success');
        }
    }

    // === POINTS MANAGEMENT ===
    handleAddPoints(e) {
        e.preventDefault();
        const clientId = parseInt(document.getElementById('pointsClient').value);
        const points = parseInt(document.getElementById('pointsAmount').value);
        const reason = document.getElementById('pointsReason').value.trim();

        if (!clientId || !points || !reason) {
            this.showMessage('pointsMessage', 'Por favor complete todos los campos', 'error');
            return;
        }

        this.addPointsToClient(clientId, points, 'add', reason);
        document.getElementById('pointsForm').reset();
    }

    subtractPoints() {
        const clientId = parseInt(document.getElementById('pointsClient').value);
        const points = parseInt(document.getElementById('pointsAmount').value);
        const reason = document.getElementById('pointsReason').value.trim();

        if (!clientId || !points || !reason) {
            this.showMessage('pointsMessage', 'Por favor complete todos los campos', 'error');
            return;
        }

        if (points > 0) {
            this.addPointsToClient(clientId, -points, 'subtract', reason);
            document.getElementById('pointsForm').reset();
        }
    }

    addPointsToClient(clientId, points, action, reason) {
        const client = this.clientsData[this.currentUser].find(c => c.id === clientId);
        
        if (!client) {
            this.showMessage('pointsMessage', 'Cliente no encontrado', 'error');
            return;
        }

        if (action === 'subtract' && client.points < Math.abs(points)) {
            this.showMessage('pointsMessage', 'El cliente no tiene suficientes puntos', 'error');
            return;
        }

        client.points += points;
        this.addPointsHistory(clientId, points, action, reason);

        const message = points > 0 ? 'Puntos agregados exitosamente' : 'Puntos descontados exitosamente';
        this.showMessage('pointsMessage', message, 'success');
        this.updateAllData();
    }

    addPointsHistory(clientId, points, action, reason) {
        const history = {
            id: this.generateId(),
            clientId,
            points: Math.abs(points),
            action,
            reason,
            user: this.currentUser,
            createdAt: new Date().toLocaleString()
        };

        this.pointsHistory[this.currentUser].push(history);
    }

    updatePointsClientSelect() {
        const select = document.getElementById('pointsClient');
        const clients = this.clientsData[this.currentUser] || [];

        select.innerHTML = '<option value="">Seleccione un cliente</option>';
        clients.forEach(client => {
            select.innerHTML += `<option value="${client.id}">${client.name} - ${client.points} puntos</option>`;
        });
    }

    renderPointsHistory() {
        const container = document.getElementById('pointsHistory');
        const history = this.pointsHistory[this.currentUser] || [];

        if (history.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 40px;">No hay historial de puntos</p>';
            return;
        }

        container.innerHTML = history.map(record => {
            const client = this.clientsData[this.currentUser].find(c => c.id === record.clientId);
            const actionIcon = record.action === 'add' ? '➕' : '➖';
            const actionColor = record.action === 'add' ? 'var(--success-color)' : 'var(--warning-color)';

            return `
                <div class="list-item">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${client ? client.name : 'Cliente no encontrado'}</div>
                            <div class="item-subtitle">${record.createdAt}</div>
                        </div>
                        <div style="color: ${actionColor}; font-size: 1.5rem;">${actionIcon}</div>
                    </div>
                    <div class="item-info">
                        <div class="info-item">
                            <div class="info-label">Puntos</div>
                            <div class="info-value" style="color: ${actionColor};">${record.points}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Razón</div>
                            <div class="info-value">${record.reason}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Acción</div>
                            <div class="info-value">${record.action === 'add' ? 'Agregar' : 'Descontar'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === PRIZE MANAGEMENT ===
    handleAddPrize(e) {
        e.preventDefault();
        const name = document.getElementById('prizeName').value.trim();
        const points = parseInt(document.getElementById('prizePoints').value);
        const description = document.getElementById('prizeDescription').value.trim();

        if (!name || !points || points <= 0) {
            this.showMessage('prizeMessage', 'Por favor complete los campos requeridos', 'error');
            return;
        }

        const prize = {
            id: this.generateId(),
            name,
            points,
            description: description || `Premio ${name}`
        };

        this.prizes.push(prize);
        this.showMessage('prizeMessage', 'Premio agregado exitosamente', 'success');
        document.getElementById('prizeForm').reset();
        this.renderPrizes();
    }

    renderPrizes() {
        const container = document.getElementById('prizesList');

        if (this.prizes.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 40px;">No hay premios disponibles</p>';
            return;
        }

        container.innerHTML = this.prizes.map(prize => `
            <div class="list-item">
                <div class="item-header">
                    <div>
                        <div class="item-title">${prize.name}</div>
                        <div class="item-subtitle">${prize.description}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="casinoApp.showRedeemModal(${prize.id})" class="btn btn-warning" title="Canjear Premio">
                            <span class="btn-icon">🎁</span>
                        </button>
                        <button onclick="casinoApp.deletePrize(${prize.id})" class="btn btn-danger" title="Eliminar Premio">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </div>
                <div class="item-info">
                    <div class="info-item">
                        <div class="info-label">Puntos Requeridos</div>
                        <div class="info-value points-display">${prize.points}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    deletePrize(prizeId) {
        if (confirm('¿Está seguro de eliminar este premio?')) {
            this.prizes = this.prizes.filter(prize => prize.id !== prizeId);
            this.renderPrizes();
            this.showMessage('prizeMessage', 'Premio eliminado exitosamente', 'success');
        }
    }

    // === PRIZE REDEEM SYSTEM ===
    showRedeemModal(prizeId) {
        const prize = this.prizes.find(p => p.id === prizeId);
        if (!prize) return;

        const clients = this.clientsData[this.currentUser] || [];
        const eligibleClients = clients.filter(client => client.points >= prize.points);

        if (eligibleClients.length === 0) {
            alert('No hay clientes con suficientes puntos para este premio');
            return;
        }

        let clientOptions = eligibleClients.map(client => 
            `<option value="${client.id}">${client.name} (${client.points} puntos)</option>`
        ).join('');

        document.getElementById('redeemMessage').innerHTML = `
            <h4>🏆 ${prize.name}</h4>
            <p><strong>Puntos requeridos:</strong> ${prize.points}</p>
            <p><strong>Descripción:</strong> ${prize.description}</p>
            <br>
            <label for="redeemClientSelect">Seleccione el cliente:</label>
            <select id="redeemClientSelect" class="form-control" style="margin-top: 10px;">
                <option value="">Seleccione un cliente</option>
                ${clientOptions}
            </select>
        `;

        this.currentRedeem = { prizeId, prize };
        document.getElementById('redeemModal').style.display = 'flex';
    }

    closeRedeemModal() {
        document.getElementById('redeemModal').style.display = 'none';
        this.currentRedeem = null;
    }

    confirmPrizeRedeem() {
        if (!this.currentRedeem) return;

        const clientId = parseInt(document.getElementById('redeemClientSelect').value);
        if (!clientId) {
            alert('Por favor seleccione un cliente');
            return;
        }

        const client = this.clientsData[this.currentUser].find(c => c.id === clientId);
        const prize = this.currentRedeem.prize;

        if (!client || client.points < prize.points) {
            alert('El cliente no tiene suficientes puntos');
            return;
        }

        // Descontar puntos
        client.points -= prize.points;

        // Registrar el canje
        const redeem = {
            id: this.generateId(),
            clientId,
            prizeId: prize.id,
            pointsUsed: prize.points,
            user: this.currentUser,
            createdAt: new Date().toLocaleString()
        };

        this.redeemHistory[this.currentUser].push(redeem);

        // Agregar al historial de puntos
        this.addPointsHistory(clientId, -prize.points, 'subtract', `Canje: ${prize.name}`);

        this.showMessage('prizeMessage', `¡Premio canjeado exitosamente para ${client.name}!`, 'success');
        this.updateAllData();
        this.closeRedeemModal();
    }

    // === ADMIN PANEL ===
    renderAdminData() {
        if (!this.users[this.currentUser].isAdmin) return;

        // Calcular estadísticas generales
        let totalClients = 0;
        let totalCanjes = 0;
        let totalAmount = 0;
        let totalPoints = 0;

        for (let user in this.clientsData) {
            totalClients += this.clientsData[user].length;
            totalCanjes += this.canjesData[user].length;
            
            this.canjesData[user].forEach(canje => {
                totalAmount += canje.amount;
            });

            this.clientsData[user].forEach(client => {
                totalPoints += client.points;
            });
        }

        document.getElementById('adminTotalClients').textContent = totalClients;
        document.getElementById('adminTotalCanjes').textContent = totalCanjes;
        document.getElementById('adminTotalAmount').textContent = `S/ ${totalAmount.toFixed(2)}`;
        document.getElementById('adminTotalPoints').textContent = totalPoints;

        // Estadísticas por usuario
        this.renderUserStats();
        this.renderRecentRedeems();
    }

    renderUserStats() {
        const container = document.getElementById('adminUserStats');
        let html = '';

        for (let username in this.users) {
            const user = this.users[username];
            const clients = this.clientsData[username] || [];
            const canjes = this.canjesData[username] || [];
            const totalAmount = canjes.reduce((sum, canje) => sum + canje.amount, 0);

            html += `
                <div class="admin-user-item">
                    <div>
                        <div class="user-name">${user.role}</div>
                        <div class="user-stats">${clients.length} clientes • ${canjes.length} canjes</div>
                    </div>
                    <div class="user-totals">S/ ${totalAmount.toFixed(2)}</div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderRecentRedeems() {
        const container = document.getElementById('adminRecentRedeems');
        let allRedeems = [];

        for (let user in this.redeemHistory) {
            this.redeemHistory[user].forEach(redeem => {
                const client = this.clientsData[user].find(c => c.id === redeem.clientId);
                const prize = this.prizes.find(p => p.id === redeem.prizeId);
                allRedeems.push({
                    ...redeem,
                    clientName: client ? client.name : 'Cliente no encontrado',
                    prizeName: prize ? prize.name : 'Premio no encontrado',
                    username: user
                });
            });
        }

        // Ordenar por fecha (más recientes primero)
        allRedeems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (allRedeems.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay canjes de premios registrados</p>';
            return;
        }

        container.innerHTML = allRedeems.slice(0, 10).map(redeem => `
            <div class="admin-activity-item">
                <div>
                    <div style="font-weight: 600;">${redeem.clientName}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${redeem.prizeName} • ${redeem.createdAt} • ${this.users[redeem.username].role}
                    </div>
                </div>
                <div style="color: var(--warning-color); font-weight: bold;">
                    ${redeem.pointsUsed} pts
                </div>
            </div>
        `).join('');
    }

    // === UTILITY FUNCTIONS ===
    generateId() {
        return Date.now() + Math.random();
    }

    updateAllData() {
        this.renderClients();
        this.renderCanjes();
        this.renderPointsHistory();
        this.renderPrizes();
        this.updateCanjeClientSelect();
        this.updatePointsClientSelect();
        this.updateStats();
        
        if (this.users[this.currentUser].isAdmin) {
            this.renderAdminData();
        }
    }

    updateStats() {
        const clients = this.clientsData[this.currentUser] || [];
        const canjes = this.canjesData[this.currentUser] || [];
        const totalPoints = clients.reduce((sum, client) => sum + client.points, 0);

        document.getElementById('totalClientsCount').textContent = clients.length;
        document.getElementById('totalCanjesCount').textContent = canjes.length;
        document.getElementById('totalPointsCount').textContent = totalPoints;
        document.getElementById('totalPrizesCount').textContent = this.prizes.length;
    }

    showMessage(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `message ${type}`;
        element.classList.remove('hidden');

        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// Inicializar la aplicación
let casinoApp;
document.addEventListener('DOMContentLoaded', () => {
    casinoApp = new CasinoSystem();
});

// Funciones globales para los eventos del HTML
function showTab(tabName) {
    casinoApp.showTab(tabName);
}

function logout() {
    casinoApp.logout();
}

function subtractPoints() {
    casinoApp.subtractPoints();
}

function closeRedeemModal() {
    casinoApp.closeRedeemModal();
}

function confirmPrizeRedeem() {
    casinoApp.confirmPrizeRedeem();
}