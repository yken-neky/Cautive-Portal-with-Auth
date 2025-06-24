-- Script de inicialización para la base de datos de Dulcería Macam
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    tiempo_permitido INT NOT NULL COMMENT 'Tiempo permitido en horas'
);

-- Ejemplo de usuario
INSERT INTO usuarios (username, password, tiempo_permitido) VALUES ('demo', 'demo123', 2);
