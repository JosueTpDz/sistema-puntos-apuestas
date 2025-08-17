from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import mysql.connector
import os
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'mbl_casa_apuestas_2024_secret_key'
CORS(app)

# Configuración de base de datos
DB_CONFIG = {
    'host': os.getenv("MYSQLHOST", "localhost"),
    'user': os.getenv("MYSQLUSER", "root"),
    'password': os.getenv("MYSQLPASSWORD", ""),
    'database': os.getenv("MYSQLDATABASE", "mbl_casino"),
    'port': int(os.getenv("MYSQLPORT", 3306))
}

def get_db_connection():
    """Crear conexión a la base de datos"""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as e:
        print(f"Error conectando a MySQL: {e}")
        raise

def init_database():
    """Inicializar todas las tablas necesarias"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Tabla usuarios MBL
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mbl_usuarios (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)
        
        # Tabla clientes MBL
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mbl_clientes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre_completo VARCHAR(255) NOT NULL,
            dni VARCHAR(8) UNIQUE NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            usuario_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id),
            INDEX idx_dni (dni),
            FOREIGN KEY (usuario_id) REFERENCES mbl_usuarios(id) ON DELETE CASCADE
        )
        """)
        
        # Tabla canjes MBL
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mbl_canjes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cliente_id INT NOT NULL,
            usuario_id INT NOT NULL,
            monto DECIMAL(10,2) NOT NULL,
            descripcion VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cliente (cliente_id),
            INDEX idx_usuario (usuario_id),
            INDEX idx_fecha (created_at),
            FOREIGN KEY (cliente_id) REFERENCES mbl_clientes(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES mbl_usuarios(id) ON DELETE CASCADE
        )
        """)
        
        # Tabla puntos (para sistema de puntos futuro)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS mbl_puntos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cliente_id INT NOT NULL,
            usuario_id INT NOT NULL,
            puntos_anteriores INT DEFAULT 0,
            puntos_cambio INT NOT NULL,
            puntos_nuevos INT NOT NULL,
            razon VARCHAR(255) NOT NULL,
            tipo ENUM('suma', 'resta') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cliente (cliente_id),
            INDEX idx_usuario (usuario_id),
            FOREIGN KEY (cliente_id) REFERENCES mbl_clientes(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES mbl_usuarios(id) ON DELETE CASCADE
        )
        """)
        
        # Insertar usuarios por defecto si no existen
        cursor.execute("SELECT COUNT(*) FROM mbl_usuarios")
        if cursor.fetchone()[0] == 0:
            usuarios_default = [
                ('admin', 'admin123', 'Administrador', True),
                ('user1', 'user123', 'Operador 1', False),
                ('user2', 'user123', 'Operador 2', False),
                ('user3', 'user123', 'Operador 3', False),
                ('user4', 'user123', 'Operador 4', False),
                ('user5', 'user123', 'Operador 5', False),
                ('user6', 'user123', 'Operador 6', False)
            ]
            
            for username, password, role, is_admin in usuarios_default:
                password_hash = generate_password_hash(password)
                cursor.execute(
                    "INSERT INTO mbl_usuarios (username, password_hash, role, is_admin) VALUES (%s, %s, %s, %s)",
                    (username, password_hash, role, is_admin)
                )
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Base de datos MBL Casa de Apuestas inicializada correctamente")
        
    except Exception as e:
        print(f"❌ Error al inicializar base de datos: {e}")
        raise

# ================================
# RUTAS PRINCIPALES
# ================================

@app.route('/')
def index():
    """Página de inicio - redirige a MBL"""
    return redirect('/mbl')

@app.route('/mbl')
def mbl_home():
    """Página principal del sistema MBL"""
    init_database()  # Asegurar que las tablas existan
    return render_template('mbl.html')

# ================================
# API ENDPOINTS - AUTENTICACIÓN
# ================================

@app.route('/api/mbl/login', methods=['POST'])
def api_login():
    """Endpoint para login de usuarios"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username y password son requeridos'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT id, username, password_hash, role, is_admin FROM mbl_usuarios WHERE username = %s",
            (username,)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            # Guardar en sesión
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            
            return jsonify({
                'success': True,
                'message': 'Login exitoso',
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'role': user['role'],
                    'is_admin': user['is_admin']
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Credenciales incorrectas'
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno: {str(e)}'
        }), 500

@app.route('/api/mbl/logout', methods=['POST'])
def api_logout():
    """Endpoint para logout"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logout exitoso'})

# ================================
# API ENDPOINTS - CLIENTES
# ================================

@app.route('/api/mbl/clientes/<int:user_id>', methods=['GET'])
def api_get_clientes(user_id):
    """Obtener clientes de un usuario específico"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el usuario actual puede ver estos clientes
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        # Admin puede ver todos, usuarios normales solo los suyos
        if not session.get('is_admin') and session['user_id'] != user_id:
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        cursor.execute("""
            SELECT id, nombre_completo, dni, telefono, created_at, updated_at
            FROM mbl_clientes 
            WHERE usuario_id = %s 
            ORDER BY created_at DESC
        """, (user_id,))
        
        clientes = cursor.fetchall()
        
        # Convertir datetime a string para JSON
        for cliente in clientes:
            if cliente['created_at']:
                cliente['created_at'] = cliente['created_at'].isoformat()
            if cliente['updated_at']:
                cliente['updated_at'] = cliente['updated_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'clientes': clientes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener clientes: {str(e)}'
        }), 500

@app.route('/api/mbl/clientes', methods=['POST'])
def api_add_cliente():
    """Agregar nuevo cliente"""
    try:
        data = request.get_json()
        
        # Validar datos
        required_fields = ['nombre_completo', 'dni', 'telefono', 'usuario_id']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({
                    'success': False,
                    'message': f'El campo {field} es requerido'
                }), 400
        
        nombre_completo = data['nombre_completo'].strip()
        dni = data['dni'].strip()
        telefono = data['telefono'].strip()
        usuario_id = int(data['usuario_id'])
        
        # Validar DNI
        if len(dni) != 8 or not dni.isdigit():
            return jsonify({
                'success': False,
                'message': 'El DNI debe tener exactamente 8 dígitos numéricos'
            }), 400
        
        # Verificar autorización
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        if not session.get('is_admin') and session['user_id'] != usuario_id:
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar si el DNI ya existe
        cursor.execute("SELECT id FROM mbl_clientes WHERE dni = %s", (dni,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Este DNI ya está registrado en el sistema'
            }), 409
        
        # Insertar cliente
        cursor.execute("""
            INSERT INTO mbl_clientes (nombre_completo, dni, telefono, usuario_id) 
            VALUES (%s, %s, %s, %s)
        """, (nombre_completo, dni, telefono, usuario_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Cliente agregado exitosamente'
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': 'Datos inválidos'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al agregar cliente: {str(e)}'
        }), 500

# ================================
# API ENDPOINTS - CANJES
# ================================

@app.route('/api/mbl/canjes/<int:user_id>', methods=['GET'])
def api_get_canjes(user_id):
    """Obtener canjes de un usuario específico"""
    try:
        # Verificar autorización
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        if not session.get('is_admin') and session['user_id'] != user_id:
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                c.id, c.monto, c.descripcion, c.created_at,
                cl.nombre_completo as cliente_nombre, 
                cl.dni as cliente_dni
            FROM mbl_canjes c
            JOIN mbl_clientes cl ON c.cliente_id = cl.id
            WHERE c.usuario_id = %s
            ORDER BY c.created_at DESC
            LIMIT 100
        """, (user_id,))
        
        canjes = cursor.fetchall()
        
        # Convertir datetime y Decimal para JSON
        for canje in canjes:
            if canje['created_at']:
                canje['created_at'] = canje['created_at'].isoformat()
            canje['monto'] = float(canje['monto'])
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'canjes': canjes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener canjes: {str(e)}'
        }), 500

@app.route('/api/mbl/canjes', methods=['POST'])
def api_add_canje():
    """Registrar nuevo canje"""
    try:
        data = request.get_json()
        
        # Validar datos
        required_fields = ['cliente_id', 'usuario_id', 'monto', 'descripcion']
        for field in required_fields:
            if field not in data or (isinstance(data[field], str) and not data[field].strip()):
                return jsonify({
                    'success': False,
                    'message': f'El campo {field} es requerido'
                }), 400
        
        cliente_id = int(data['cliente_id'])
        usuario_id = int(data['usuario_id'])
        monto = float(data['monto'])
        descripcion = data['descripcion'].strip()
        
        # Validar monto
        if monto <= 0:
            return jsonify({
                'success': False,
                'message': 'El monto debe ser mayor a cero'
            }), 400
        
        # Verificar autorización
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'No autenticado'}), 401
        
        if not session.get('is_admin') and session['user_id'] != usuario_id:
            return jsonify({'success': False, 'message': 'No autorizado'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar que el cliente existe y pertenece al usuario
        cursor.execute("""
            SELECT id FROM mbl_clientes 
            WHERE id = %s AND usuario_id = %s
        """, (cliente_id, usuario_id))
        
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Cliente no encontrado o no autorizado'
            }), 404
        
        # Insertar canje
        cursor.execute("""
            INSERT INTO mbl_canjes (cliente_id, usuario_id, monto, descripcion) 
            VALUES (%s, %s, %s, %s)
        """, (cliente_id, usuario_id, monto, descripcion))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Canje registrado exitosamente'
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': 'Datos numéricos inválidos'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al registrar canje: {str(e)}'
        }), 500

# ================================
# API ENDPOINTS - ADMINISTRACIÓN
# ================================

@app.route('/api/mbl/admin/stats', methods=['GET'])
def api_admin_stats():
    """Obtener estadísticas generales del sistema (solo admin)"""
    try:
        # Verificar que es admin
        if not session.get('is_admin'):
            return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total clientes
        cursor.execute("SELECT COUNT(*) FROM mbl_clientes")
        total_clientes = cursor.fetchone()[0]
        
        # Total canjes
        cursor.execute("SELECT COUNT(*) FROM mbl_canjes")
        total_canjes = cursor.fetchone()[0]
        
        # Monto total canjeado
        cursor.execute("SELECT COALESCE(SUM(monto), 0) FROM mbl_canjes")
        monto_total = float(cursor.fetchone()[0])
        
        # Estadísticas por usuario
        cursor.execute("""
            SELECT 
                u.username, u.role,
                COUNT(DISTINCT c.id) as clientes_count,
                COUNT(DISTINCT cj.id) as canjes_count,
                COALESCE(SUM(cj.monto), 0) as monto_total
            FROM mbl_usuarios u
            LEFT JOIN mbl_clientes c ON u.id = c.usuario_id
            LEFT JOIN mbl_canjes cj ON u.id = cj.usuario_id
            WHERE u.is_admin = FALSE
            GROUP BY u.id, u.username, u.role
            ORDER BY u.username
        """)
        
        stats_por_usuario = []
        for row in cursor.fetchall():
            stats_por_usuario.append({
                'username': row[0],
                'role': row[1],
                'clientes': row[2],
                'canjes': row[3],
                'monto_total': float(row[4])
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_clientes': total_clientes,
                'total_canjes': total_canjes,
                'monto_total': monto_total,
                'stats_por_usuario': stats_por_usuario
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener estadísticas: {str(e)}'
        }), 500

@app.route('/api/mbl/admin/canjes-recientes', methods=['GET'])
def api_admin_canjes_recientes():
    """Obtener canjes recientes de todo el sistema (solo admin)"""
    try:
        if not session.get('is_admin'):
            return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                cj.id, cj.monto, cj.descripcion, cj.created_at,
                c.nombre_completo as cliente_nombre,
                c.dni as cliente_dni,
                u.username, u.role
            FROM mbl_canjes cj
            JOIN mbl_clientes c ON cj.cliente_id = c.id
            JOIN mbl_usuarios u ON cj.usuario_id = u.id
            ORDER BY cj.created_at DESC
            LIMIT 50
        """)
        
        canjes = cursor.fetchall()
        
        for canje in canjes:
            if canje['created_at']:
                canje['created_at'] = canje['created_at'].isoformat()
            canje['monto'] = float(canje['monto'])
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'canjes': canjes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener canjes recientes: {str(e)}'
        }), 500

# ================================
# MANEJO DE ERRORES
# ================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint no encontrado'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'message': 'Método no permitido'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Error interno del servidor'
    }), 500

# ================================
# FUNCIONES DE UTILIDAD
# ================================

def validate_session():
    """Validar que el usuario esté autenticado"""
    return 'user_id' in session

def is_admin():
    """Verificar si el usuario actual es admin"""
    return session.get('is_admin', False)

def get_current_user_id():
    """Obtener el ID del usuario actual"""
    return session.get('user_id')

# ================================
# CONFIGURACIÓN Y ARRANQUE
# ================================

if __name__ == '__main__':
    # Asegurar que las tablas existan al iniciar
    try:
        init_database()
        print("🚀 Servidor MBL Casa de Apuestas iniciado correctamente")
        print(f"📊 Base de datos configurada: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        print("🌐 Accede a: http://localhost:5000/mbl")
        print("\n👤 Usuarios disponibles:")
        print("   - admin / admin123 (Administrador)")
        print("   - user1 / user123 (Operador 1)")
        print("   - user2 / user123 (Operador 2)")
        print("   - user3 / user123 (Operador 3)")
        print("   - user4 / user123 (Operador 4)")
        print("   - user5 / user123 (Operador 5)")
        print("   - user6 / user123 (Operador 6)")
    except Exception as e:
        print(f"❌ Error al inicializar: {e}")
        exit(1)
    
    # Configurar el servidor
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )