-- Tabla de usuarios del sistema MBL
CREATE TABLE IF NOT EXISTS mbl_usuarios (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes por usuario
CREATE TABLE IF NOT EXISTS mbl_clientes (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    nombre_completo VARCHAR(255) NOT NULL,
    dni VARCHAR(8) UNIQUE NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES mbl_usuarios(id)
);

-- Tabla de canjes
CREATE TABLE IF NOT EXISTS mbl_canjes (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    cliente_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES mbl_clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES mbl_usuarios(id)
);

-- Insertar usuarios por defecto
INSERT IGNORE INTO mbl_usuarios (username, password, role, is_admin) VALUES 
('admin', 'admin123', 'Administrador', TRUE),
('user1', 'user123', 'Operador 1', FALSE),
('user2', 'user123', 'Operador 2', FALSE),
('user3', 'user123', 'Operador 3', FALSE),
('user4', 'user123', 'Operador 4', FALSE),
('user5', 'user123', 'Operador 5', FALSE),
('user6', 'user123', 'Operador 6', FALSE);

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    puntos INTEGER DEFAULT 0
);

-- Crear tabla de premios
CREATE TABLE IF NOT EXISTS premios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    puntos_requeridos INTEGER NOT NULL
);

-- Insertar datos de ejemplo
INSERT INTO clientes (nombre, puntos) VALUES
('Juan Perez', 150),
('Maria Lopez', 300),
('Carlos Ramirez', 50);

INSERT INTO premios (nombre, puntos_requeridos) VALUES
('Polo Deportivo', 500),
('Camiseta Oficial', 800),
('Cerveza', 200),
('Gaseosa', 100),
('Llavero', 150),
('Gorra', 400),
('Vaso Térmico', 300);

