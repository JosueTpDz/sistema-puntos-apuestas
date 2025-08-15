from flask import Flask, render_template
from flask_cors import CORS
import mysql.connector
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Indicar ruta de templates (fuera de backend)
template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
app = Flask(__name__, template_folder=template_path)
CORS(app)

# Ruta principal
@app.route('/')
def inicio():
    # Conectar a MySQL con credenciales de Railway
    conn = mysql.connector.connect(
        host=os.getenv("MYSQLHOST"),
        user=os.getenv("MYSQLUSER"),
        password=os.getenv("MYSQLPASSWORD"),
        database=os.getenv("MYSQLDATABASE"),
        port=int(os.getenv("MYSQLPORT"))
    )
    cursor = conn.cursor()

    # Traer clientes y puntos
    cursor.execute("SELECT id, nombre, puntos FROM clientes")
    clientes = cursor.fetchall()

    # Traer premios
    cursor.execute("SELECT id, nombre, puntos_requeridos FROM premios")
    premios = cursor.fetchall()

    conn.close()
    
    # Renderizar index.html con datos
    return render_template("index.html", clientes=clientes, premios=premios)

if __name__ == '__main__':
    app.run(debug=True)
