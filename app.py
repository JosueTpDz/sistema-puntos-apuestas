from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash
import sqlite3
import hashlib
from datetime import datetime, timedelta
import os
from functools import wraps
import json

app = Flask(__name__)
app.secret_key = 'mbl_casa_apuestas_2024_secret_key'

DATABASE = 'backend/database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
        return f(*args, **kwargs)
    return decorated_function

# RUTAS PRINCIPALES
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

# API AUTHENTICATION
@app.route('/api/mbl/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Usuario y contraseña requeridos'})
        
        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM mbl_usuarios WHERE username = ? AND password = ?',
            (username, hash_password(password))
        ).fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return jsonify({
                'success': True,
                'message': 'Login exitoso',
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'role': user['role']
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Credenciales inválidas'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logout exitoso'})

# API CLIENTES
@app.route('/api/mbl/clientes', methods=['GET'])
@login_required
def get_clientes():
    try:
        conn = get_db_connection()
        clientes = conn.execute('SELECT * FROM mbl_clientes ORDER BY fecha_registro DESC').fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'clientes': [dict(cliente) for cliente in clientes]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/clientes', methods=['POST'])
@login_required
def create_cliente():
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('nombre') or not data.get('cedula'):
            return jsonify({'success': False, 'message': 'Nombre y cédula son requeridos'})
        
        conn = get_db_connection()
        
        # Verificar si ya existe
        existing = conn.execute('SELECT id FROM mbl_clientes WHERE cedula = ?', (data['cedula'],)).fetchone()
        if existing:
            conn.close()
            return jsonify({'success': False, 'message': 'Cliente ya existe con esa cédula'})
        
        # Crear cliente
        conn.execute('''
            INSERT INTO mbl_clientes (nombre, cedula, telefono, email, fecha_registro, activo)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['nombre'],
            data['cedula'],
            data.get('telefono', ''),
            data.get('email', ''),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            1
        ))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Cliente creado exitosamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/clientes/<int:cliente_id>', methods=['PUT'])
@login_required
def update_cliente(cliente_id):
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        conn.execute('''
            UPDATE mbl_clientes 
            SET nombre = ?, telefono = ?, email = ?
            WHERE id = ?
        ''', (data['nombre'], data.get('telefono', ''), data.get('email', ''), cliente_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Cliente actualizado exitosamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/clientes/<int:cliente_id>', methods=['DELETE'])
@login_required
def delete_cliente(cliente_id):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM mbl_clientes WHERE id = ?', (cliente_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Cliente eliminado exitosamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# API CANJES
@app.route('/api/mbl/canjes', methods=['GET'])
@login_required
def get_canjes():
    try:
        conn = get_db_connection()
        canjes = conn.execute('''
            SELECT c.*, cl.nombre as cliente_nombre, cl.cedula as cliente_cedula
            FROM mbl_canjes c
            LEFT JOIN mbl_clientes cl ON c.cliente_id = cl.id
            ORDER BY c.fecha_canje DESC
        ''').fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'canjes': [dict(canje) for canje in canjes]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/canjes', methods=['POST'])
@login_required
def create_canje():
    try:
        data = request.get_json()
        
        if not data.get('cliente_id') or not data.get('monto'):
            return jsonify({'success': False, 'message': 'Cliente y monto son requeridos'})
        
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO mbl_canjes (cliente_id, monto, descripcion, fecha_canje, usuario_registro)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['cliente_id'],
            float(data['monto']),
            data.get('descripcion', ''),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            session['username']
        ))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Canje registrado exitosamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# API ADMIN - ESTADÍSTICAS BÁSICAS
@app.route('/api/mbl/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    try:
        conn = get_db_connection()
        
        # Estadísticas básicas
        total_clientes = conn.execute('SELECT COUNT(*) as count FROM mbl_clientes').fetchone()['count']
        total_canjes = conn.execute('SELECT COUNT(*) as count FROM mbl_canjes').fetchone()['count']
        total_monto = conn.execute('SELECT COALESCE(SUM(monto), 0) as total FROM mbl_canjes').fetchone()['total']
        
        # Canjes hoy
        today = datetime.now().strftime('%Y-%m-%d')
        canjes_hoy = conn.execute(
            'SELECT COUNT(*) as count FROM mbl_canjes WHERE DATE(fecha_canje) = ?', 
            (today,)
        ).fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_clientes': total_clientes,
                'total_canjes': total_canjes,
                'total_monto': float(total_monto),
                'canjes_hoy': canjes_hoy
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# ============ NUEVOS ENDPOINTS ANALYTICS ============

@app.route('/api/mbl/analytics/daily-sales', methods=['GET'])
@login_required
def get_daily_sales():
    """Ventas diarias últimos 30 días"""
    try:
        days = int(request.args.get('days', 30))
        
        conn = get_db_connection()
        
        # Obtener ventas por día
        daily_sales = conn.execute('''
            SELECT 
                DATE(fecha_canje) as fecha,
                COUNT(*) as total_canjes,
                COALESCE(SUM(monto), 0) as total_monto
            FROM mbl_canjes 
            WHERE fecha_canje >= datetime('now', '-{} days')
            GROUP BY DATE(fecha_canje)
            ORDER BY fecha DESC
        '''.format(days)).fetchall()
        
        conn.close()
        
        # Convertir a formato para Chart.js
        labels = []
        canjes_data = []
        montos_data = []
        
        for row in daily_sales:
            # Formatear fecha para mostrar
            fecha_obj = datetime.strptime(row['fecha'], '%Y-%m-%d')
            labels.append(fecha_obj.strftime('%d/%m'))
            canjes_data.append(row['total_canjes'])
            montos_data.append(float(row['total_monto']))
        
        # Revertir para mostrar cronológicamente
        labels.reverse()
        canjes_data.reverse()
        montos_data.reverse()
        
        return jsonify({
            'success': True,
            'data': {
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Canjes Diarios',
                        'data': canjes_data,
                        'borderColor': '#8B5CF6',
                        'backgroundColor': 'rgba(139, 92, 246, 0.1)',
                        'tension': 0.4
                    },
                    {
                        'label': 'Monto Diario ($)',
                        'data': montos_data,
                        'borderColor': '#10B981',
                        'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                        'tension': 0.4,
                        'yAxisID': 'y1'
                    }
                ]
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/analytics/top-clients', methods=['GET'])
@login_required
def get_top_clients():
    """Top clientes por monto canjeado"""
    try:
        limit = int(request.args.get('limit', 10))
        
        conn = get_db_connection()
        
        top_clients = conn.execute('''
            SELECT 
                cl.nombre,
                cl.cedula,
                COUNT(c.id) as total_canjes,
                COALESCE(SUM(c.monto), 0) as total_monto
            FROM mbl_clientes cl
            LEFT JOIN mbl_canjes c ON cl.id = c.cliente_id
            GROUP BY cl.id, cl.nombre, cl.cedula
            HAVING total_monto > 0
            ORDER BY total_monto DESC
            LIMIT ?
        ''', (limit,)).fetchall()
        
        conn.close()
        
        # Formatear para Chart.js
        labels = []
        data = []
        colors = [
            '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
            '#EC4899', '#8B5A2B', '#6366F1', '#84CC16', '#F97316'
        ]
        
        for i, client in enumerate(top_clients):
            labels.append(f"{client['nombre'][:20]}...")
            data.append(float(client['total_monto']))
        
        return jsonify({
            'success': True,
            'data': {
                'labels': labels,
                'datasets': [{
                    'label': 'Monto Total Canjeado',
                    'data': data,
                    'backgroundColor': colors[:len(data)],
                    'borderWidth': 0
                }]
            },
            'clients_detail': [dict(client) for client in top_clients]
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/analytics/trends', methods=['GET'])
@login_required
def get_trends():
    """Tendencias y comparativas"""
    try:
        conn = get_db_connection()
        
        # Comparativa semanal
        current_week = conn.execute('''
            SELECT 
                COUNT(*) as canjes,
                COALESCE(SUM(monto), 0) as monto
            FROM mbl_canjes 
            WHERE fecha_canje >= datetime('now', '-7 days')
        ''').fetchone()
        
        previous_week = conn.execute('''
            SELECT 
                COUNT(*) as canjes,
                COALESCE(SUM(monto), 0) as monto
            FROM mbl_canjes 
            WHERE fecha_canje >= datetime('now', '-14 days')
            AND fecha_canje < datetime('now', '-7 days')
        ''').fetchone()
        
        # Promedio por hora del día
        hourly_avg = conn.execute('''
            SELECT 
                strftime('%H', fecha_canje) as hora,
                COUNT(*) as total_canjes,
                AVG(monto) as promedio_monto
            FROM mbl_canjes
            WHERE fecha_canje >= datetime('now', '-30 days')
            GROUP BY strftime('%H', fecha_canje)
            ORDER BY hora
        ''').fetchall()
        
        # Top días de la semana
        weekday_stats = conn.execute('''
            SELECT 
                CASE strftime('%w', fecha_canje)
                    WHEN '0' THEN 'Domingo'
                    WHEN '1' THEN 'Lunes'
                    WHEN '2' THEN 'Martes'
                    WHEN '3' THEN 'Miércoles'
                    WHEN '4' THEN 'Jueves'
                    WHEN '5' THEN 'Viernes'
                    WHEN '6' THEN 'Sábado'
                END as dia_semana,
                COUNT(*) as total_canjes,
                AVG(monto) as promedio_monto
            FROM mbl_canjes
            WHERE fecha_canje >= datetime('now', '-30 days')
            GROUP BY strftime('%w', fecha_canje)
            ORDER BY total_canjes DESC
        ''').fetchall()
        
        conn.close()
        
        # Calcular variaciones
        canjes_change = 0
        monto_change = 0
        
        if previous_week['canjes'] > 0:
            canjes_change = ((current_week['canjes'] - previous_week['canjes']) / previous_week['canjes']) * 100
        
        if previous_week['monto'] > 0:
            monto_change = ((current_week['monto'] - previous_week['monto']) / previous_week['monto']) * 100
        
        return jsonify({
            'success': True,
            'trends': {
                'weekly_comparison': {
                    'current_week': {
                        'canjes': current_week['canjes'],
                        'monto': float(current_week['monto'])
                    },
                    'previous_week': {
                        'canjes': previous_week['canjes'],
                        'monto': float(previous_week['monto'])
                    },
                    'changes': {
                        'canjes_percent': round(canjes_change, 1),
                        'monto_percent': round(monto_change, 1)
                    }
                },
                'hourly_pattern': {
                    'labels': [f"{row['hora']}:00" for row in hourly_avg],
                    'canjes': [row['total_canjes'] for row in hourly_avg],
                    'montos': [float(row['promedio_monto']) for row in hourly_avg]
                },
                'weekday_ranking': [dict(row) for row in weekday_stats]
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/mbl/analytics/kpis', methods=['GET'])
@login_required
def get_kpis():
    """KPIs principales en tiempo real"""
    try:
        conn = get_db_connection()
        
        today = datetime.now().strftime('%Y-%m-%d')
        current_month = datetime.now().strftime('%Y-%m')
        
        # KPIs del día
        today_stats = conn.execute('''
            SELECT 
                COUNT(*) as canjes_hoy,
                COALESCE(SUM(monto), 0) as monto_hoy,
                COALESCE(AVG(monto), 0) as promedio_hoy
            FROM mbl_canjes
            WHERE DATE(fecha_canje) = ?
        ''', (today,)).fetchone()
        
        # KPIs del mes
        month_stats = conn.execute('''
            SELECT 
                COUNT(*) as canjes_mes,
                COALESCE(SUM(monto), 0) as monto_mes,
                COUNT(DISTINCT cliente_id) as clientes_activos_mes
            FROM mbl_canjes
            WHERE strftime('%Y-%m', fecha_canje) = ?
        ''', (current_month,)).fetchone()
        
        # Cliente más activo del mes
        top_client_month = conn.execute('''
            SELECT 
                cl.nombre,
                COUNT(c.id) as total_canjes,
                SUM(c.monto) as total_monto
            FROM mbl_canjes c
            JOIN mbl_clientes cl ON c.cliente_id = cl.id
            WHERE strftime('%Y-%m', c.fecha_canje) = ?
            GROUP BY c.cliente_id, cl.nombre
            ORDER BY total_canjes DESC
            LIMIT 1
        ''', (current_month,)).fetchone()
        
        # Crecimiento mensual
        previous_month = (datetime.now() - timedelta(days=30)).strftime('%Y-%m')
        previous_month_stats = conn.execute('''
            SELECT 
                COUNT(*) as canjes,
                COALESCE(SUM(monto), 0) as monto
            FROM mbl_canjes
            WHERE strftime('%Y-%m', fecha_canje) = ?
        ''', (previous_month,)).fetchone()
        
        conn.close()
        
        # Calcular crecimiento
        growth_canjes = 0
        growth_monto = 0
        
        if previous_month_stats and previous_month_stats['canjes'] > 0:
            growth_canjes = ((month_stats['canjes_mes'] - previous_month_stats['canjes']) / previous_month_stats['canjes']) * 100
        
        if previous_month_stats and previous_month_stats['monto'] > 0:
            growth_monto = ((month_stats['monto_mes'] - previous_month_stats['monto']) / previous_month_stats['monto']) * 100
        
        return jsonify({
            'success': True,
            'kpis': {
                'today': {
                    'canjes': today_stats['canjes_hoy'],
                    'monto': float(today_stats['monto_hoy']),
                    'promedio': float(today_stats['promedio_hoy'])
                },
                'month': {
                    'canjes': month_stats['canjes_mes'],
                    'monto': float(month_stats['monto_mes']),
                    'clientes_activos': month_stats['clientes_activos_mes'],
                    'growth_canjes': round(growth_canjes, 1),
                    'growth_monto': round(growth_monto, 1)
                },
                'top_client': dict(top_client_month) if top_client_month else None
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))