<?php
// Conexión a la BD usando variables de entorno de Beanstalk

$dbhost = getenv('DB_HOST');
$dbuser = getenv('DB_USER');
$dbpass = getenv('DB_PASS');
$dbname = getenv('DB_NAME');
$dbport = '3306';  // El puerto por defecto de MySQL

$charset = 'utf8';
$dsn = "mysql:host={$dbhost};port={$dbport};dbname={$dbname};charset={$charset}";

try {
    // Creo conexión PDO
    $pdo = new PDO($dsn, $dbuser, $dbpass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Para consultar la tabla personas
    $stmt = $pdo->query("SELECT id, nombre, email FROM personas ORDER BY id ASC");
    $personas = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Si hay error de conexión o de consulta, lo mostro
    die("Error de conexión o consulta: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Listado de Personas</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
        }
        h1 {
            text-align: center;
        }
        table {
            border-collapse: collapse;
            margin: 20px auto;
            width: 60%;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 8px 10px;
            text-align: left;
        }
        th {
            background: #f0f0f0;
        }
    </style>
</head>
<body>

<h1>Listado de Personas</h1>

<table>
    <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Email</th>
    </tr>

    <?php foreach ($personas as $p): ?>
        <tr>
            <td><?= htmlspecialchars($p['id']) ?></td>
            <td><?= htmlspecialchars($p['nombre']) ?></td>
            <td><?= htmlspecialchars($p['email']) ?></td>
        </tr>
    <?php endforeach; ?>
</table>

</body>
</html>
