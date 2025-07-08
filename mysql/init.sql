-- Script de inicialización para la base de datos de Dulcería Macam

-- 1. Crear todas las tablas primero
CREATE TABLE IF NOT EXISTS radcheck (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT ':=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radreply (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    tiempo_permitido INT NOT NULL COMMENT 'Tiempo permitido en segundos',
    isactive BOOLEAN NOT NULL DEFAULT 0 COMMENT 'Indica si el usuario tiene una sesión activa'
);

CREATE TABLE IF NOT EXISTS nas (
  id INT(10) NOT NULL AUTO_INCREMENT,
  nasname VARCHAR(128) NOT NULL,
  shortname VARCHAR(32),
  type VARCHAR(30) DEFAULT 'other',
  secret VARCHAR(60) NOT NULL,
  server VARCHAR(64),
  community VARCHAR(50),
  description VARCHAR(200),
  PRIMARY KEY (id)
);

-- 2. Luego los datos y deletes
-- Usuario demo para pruebas
DELETE FROM radcheck WHERE username = 'demo';
INSERT INTO radcheck (username, attribute, op, value)
VALUES ('demo', 'Cleartext-Password', ':=', 'demo123');

-- Usuario de prueba con 1 minuto de tiempo disponible
DELETE FROM radcheck WHERE username = 'test1min';
INSERT INTO radcheck (username, attribute, op, value)
VALUES ('test1min', 'Cleartext-Password', ':=', 'test123');

-- Demo: 2 horas = 7200 segundos
INSERT INTO usuarios (username, password, tiempo_permitido) VALUES ('demo', 'demo123', 7200)
    ON DUPLICATE KEY UPDATE password='demo123', tiempo_permitido=7200;

-- test1min: 1 minuto = 60 segundos
INSERT INTO usuarios (username, password, tiempo_permitido) VALUES ('test1min', 'test123', 60)
    ON DUPLICATE KEY UPDATE password='test123', tiempo_permitido=60;

-- Insert para nas
INSERT INTO nas (nasname, shortname, type, secret) VALUES ('0.0.0.0/0', 'public', 'other', 'testing123')
  ON DUPLICATE KEY UPDATE secret='testing123';