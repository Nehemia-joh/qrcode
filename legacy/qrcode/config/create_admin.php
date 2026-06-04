<?php
require_once 'database.php';

$db = getDB();

// Check if admin exists
$check = $db->query("SELECT id FROM users WHERE username = 'admin'");

if ($check->num_rows == 0) {
    // Insert admin user
    $password = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (username, password, email, role, full_name, status) VALUES (?, ?, ?, 'admin', 'System Administrator', 'active')");
    $stmt->bind_param('sss', 'admin', $password, 'admin@schoolbus.com');
    
    if ($stmt->execute()) {
        echo "✅ Admin user created successfully!<br>";
        echo "Username: <strong>admin</strong><br>";
        echo "Password: <strong>admin123</strong><br>";
    } else {
        echo "❌ Error creating admin: " . $db->error;
    }
} else {
    // Update existing admin password
    $password = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
    $stmt->bind_param('s', $password);
    
    if ($stmt->execute()) {
        echo "✅ Admin password updated!<br>";
        echo "Username: <strong>admin</strong><br>";
        echo "Password: <strong>admin123</strong><br>";
    } else {
        echo "❌ Error updating password: " . $db->error;
    }
}

// Show all users
$result = $db->query("SELECT id, username, email, role FROM users");
echo "<br><strong>Current users in database:</strong><br>";
while ($row = $result->fetch_assoc()) {
    echo "- " . $row['username'] . " (" . $row['role'] . ")<br>";
}
?>