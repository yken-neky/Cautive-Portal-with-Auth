-- Script de inicialización para la base de datos de Dulcería Macam

-- Tablas estándar de FreeRADIUS para autenticación con MySQL
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

-- Usuario demo para pruebas
DELETE FROM radcheck WHERE username = 'demo';
INSERT INTO radcheck (username, attribute, op, value)
VALUES ('demo', 'Cleartext-Password', ':=', 'demo123');

-- Tabla de usuarios personalizada (opcional, para tu lógica interna)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    tiempo_permitido INT NOT NULL COMMENT 'Tiempo permitido en horas'
);

INSERT INTO usuarios (username, password, tiempo_permitido) VALUES ('demo', 'demo123', 2)
    ON DUPLICATE KEY UPDATE password='demo123', tiempo_permitido=2;

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

-- Cliente local para pruebas
INSERT INTO nas (nasname, shortname, type, secret) VALUES ('127.0.0.1', 'localhost', 'other', 'testing123')
  ON DUPLICATE KEY UPDATE secret='testing123';

INSERT INTO nas (nasname, shortname, type, secret) VALUES ('172.20.0.4', 'portal', 'other', 'testing123')
  ON DUPLICATE KEY UPDATE secret='testing123';

INSERT INTO nas (nasname, shortname, type, secret) VALUES ('172.19.0.4', 'portal', 'other', 'testing123')
  ON DUPLICATE KEY UPDATE secret='testing123';
