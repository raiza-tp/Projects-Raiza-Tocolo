CREATE DATABASE IF NOT EXISTS practica_ebs;
USE practica_ebs;

CREATE TABLE personas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email  VARCHAR(100) NOT NULL
);

INSERT INTO personas (nombre, email) VALUES
('Lea',   'lea@example.com'),
('Albert','albert@example.com'),
('Raiza', 'raiza@example.com');
