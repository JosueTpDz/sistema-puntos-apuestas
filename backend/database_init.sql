-- =============================================
-- MBL CASA DE APUESTAS - BD LIMPIA
-- Archivo: backend/database_init.sql
-- =============================================

-- 1. CREAR TABLAS PRINCIPALES
-- ==============================================

-- Tabla usuarios (login multiusuario)
CREATE TABLE mbl_usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla clientes (gestión completa CRUD)
CREATE TABLE mbl_clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cedula TEXT UNIQUE NOT NULL,
    telefono TEXT,
    email TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT 1
);

-- Tabla canjes (sistema con montos)
CREATE TABLE mbl_canjes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    puntos_utilizados INTEGER DEFAULT 0,
    fecha_canje DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_registro TEXT,
    FOREIGN KEY (cliente_id) REFERENCES mbl_clientes (id)
);

-- Tabla puntos (sistema de puntos)
CREATE TABLE mbl_puntos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    puntos INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- 'ganado', 'canjeado', 'bonus'
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES mbl_clientes (id)
);

-- 2. ÍNDICES PARA ANALYTICS (RENDIMIENTO)
-- ==============================================
CREATE INDEX idx_mbl_canjes_fecha ON mbl_canjes(fecha_canje);
CREATE INDEX idx_mbl_canjes_cliente ON mbl_canjes(cliente_id);
CREATE INDEX idx_mbl_puntos_cliente ON mbl_puntos(cliente_id);
CREATE INDEX idx_mbl_puntos_fecha ON mbl_puntos(fecha);

-- Cache analytics
CREATE TABLE mbl_analytics_cache (
    id INTEGER PRIMARY KEY,
    metric_key TEXT UNIQUE,
    metric_value TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSERTAR DATOS INICIALES
-- ==============================================

-- Usuarios por defecto (passwords hasheados SHA256)
-- admin/admin123, user1-6/user123
INSERT INTO mbl_usuarios (username, password, role) VALUES 
('admin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'admin'),
('user1', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user'),
('user2', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user'),
('user3', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user'),
('user4', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user'),
('user5', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user'),
('user6', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'user');

-- Clientes de ejemplo
INSERT INTO mbl_clientes (nombre, cedula, telefono, email) VALUES 
('Juan Pérez', '12345678', '987654321', 'juan@email.com'),
('María García', '87654321', '123456789', 'maria@email.com'),
('Carlos López', '11223344', '555666777', 'carlos@email.com'),
('Ana Martínez', '44332211', '777888999', 'ana@email.com'),
('Roberto Silva', '99887766', '111222333', 'roberto@email.com');

-- Puntos iniciales para clientes (bonus bienvenida)
INSERT INTO mbl_puntos (cliente_id, puntos, tipo, descripcion) VALUES 
(1, 100, 'ganado', 'Bonus bienvenida'),
(2, 150, 'ganado', 'Bonus bienvenida'),
(3, 200, 'ganado', 'Bonus bienvenida'),
(4, 100, 'ganado', 'Bonus bienvenida'),
(5, 300, 'ganado', 'Bonus bienvenida');

-- Canjes de ejemplo para analytics (fechas variadas últimos días)
INSERT INTO mbl_canjes (cliente_id, descripcion, monto, puntos_utilizados, usuario_registro, fecha_canje) VALUES 
(1, 'Apuesta fútbol', 50.00, 50, 'admin', datetime('now', '-5 days')),
(2, 'Apuesta básquet', 75.50, 75, 'user1', datetime('now', '-4 days')),
(3, 'Apuesta tenis', 100.00, 100, 'admin', datetime('now', '-3 days')),
(1, 'Apuesta póker', 25.00, 25, 'user2', datetime('now', '-2 days')),
(4, 'Apuesta casino', 150.00, 150, 'admin', datetime('now', '-1 days')),
(2, 'Apuesta deportes', 60.00, 60, 'user1', datetime('now'));

-- Descontar puntos usados en canjes
INSERT INTO mbl_puntos (cliente_id, puntos, tipo, descripcion, fecha) VALUES 
(1, 50, 'canjeado', 'Canje: Apuesta fútbol', datetime('now', '-5 days')),
(2, 75, 'canjeado', 'Canje: Apuesta básquet', datetime('now', '-4 days')),
(3, 100, 'canjeado', 'Canje: Apuesta tenis', datetime('now', '-3 days')),
(1, 25, 'canjeado', 'Canje: Apuesta póker', datetime('now', '-2 days')),
(4, 150, 'canjeado', 'Canje: Apuesta casino', datetime('now', '-1 days')),
(2, 60, 'canjeado', 'Canje: Apuesta deportes', datetime('now'));

-- 4. VERIFICACIÓN FINAL
-- ==============================================
-- (Comentarios para verificar manualmente después)