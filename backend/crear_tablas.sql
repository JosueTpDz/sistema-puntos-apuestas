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
