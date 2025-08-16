from flask import Flask, render_template
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

# Conexión MySQL usando variables de entorno
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQLHOST"),
        user=os.getenv("MYSQLUSER"),
        password=os.getenv("MYSQLPASSWORD"),
        database=os.getenv("MYSQLDATABASE"),
        port=int(os.getenv("MYSQLPORT", 3306))
    )

# Función para crear tablas si no existen
def init_database():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Crear tabla clientes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            nombre TEXT NOT NULL,
            puntos INTEGER DEFAULT 0
        )
        """)
        
        # Crear tabla premios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS premios (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            nombre TEXT NOT NULL,
            puntos_requeridos INTEGER NOT NULL
        )
        """)
        
        # Insertar datos de ejemplo si las tablas están vacías
        cursor.execute("SELECT COUNT(*) FROM clientes")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO clientes (nombre, puntos) VALUES (%s, %s)", ('Juan Perez', 150))
            cursor.execute("INSERT INTO clientes (nombre, puntos) VALUES (%s, %s)", ('Maria Lopez', 300))
            cursor.execute("INSERT INTO clientes (nombre, puntos) VALUES (%s, %s)", ('Carlos Ramirez', 50))
        
        cursor.execute("SELECT COUNT(*) FROM premios")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Polo Deportivo', 500))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Camiseta Oficial', 800))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Cerveza', 200))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Gaseosa', 100))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Llavero', 150))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Gorra', 400))
            cursor.execute("INSERT INTO premios (nombre, puntos_requeridos) VALUES (%s, %s)", ('Vaso Térmico', 300))
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Base de datos inicializada correctamente")
        
    except Exception as e:
        print(f"❌ Error al inicializar base de datos: {e}")

@app.route('/')
def inicio():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, nombre, puntos FROM clientes")
        clientes = cursor.fetchall()
        
        cursor.execute("SELECT id, nombre, puntos_requeridos FROM premios")
        premios = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return render_template("index.html", clientes=clientes, premios=premios)
        
    except Exception as e:
        return f"Error de base de datos: {str(e)}", 500

if __name__ == '__main__':
    init_database()  # Crear tablas al iniciar
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)