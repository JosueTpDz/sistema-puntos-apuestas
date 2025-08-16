from flask import Flask, render_template
from flask_cors import CORS
import mysql.connector
import os

# Indicar ruta de templates
template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
app = Flask(__name__, template_folder=template_path)
CORS(app)

# Conexión MySQL usando variables de entorno
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQLHOST"),
        user=os.getenv("MYSQLUSER"),
        password=os.getenv("MYSQLPASSWORD"),
        database=os.getenv("MYSQLDATABASE"),
        port=int(os.getenv("MYSQLPORT", 3306))  # ✅ conversión a int
    )

@app.route('/')
def inicio():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, nombre, puntos FROM clientes")
    clientes = cursor.fetchall()

    cursor.execute("SELECT id, nombre, puntos_requeridos FROM premios")
    premios = cursor.fetchall()

    cursor.close()  # ✅ cerrar cursor
    conn.close()    # ✅ cerrar conexión
    return render_template("index.html", clientes=clientes, premios=premios)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
