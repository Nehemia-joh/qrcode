<?php
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

// Check session timeout
function checkSessionTimeout() {
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT)) {
        session_unset();
        session_destroy();
        return false;
    }
    $_SESSION['last_activity'] = time();
    return true;
}

// Require login (redirect if not logged in)
function requireLogin() {
    if (!isLoggedIn() || !checkSessionTimeout()) {
        header('Location: ' . SITE_URL . 'index.php?error=session_expired');
        exit();
    }
}

// Login user
function loginUser($username, $password) {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT id, username, password, email, role, full_name, status FROM users WHERE username = ? AND status = 'active'");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['logged_in'] = true;
        $_SESSION['last_activity'] = time();
        
        // Update last login
        $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $updateStmt->bind_param('i', $user['id']);
        $updateStmt->execute();
        
        return true;
    }
    return false;
}

// Log in by username only (SSO from Silverleaf Operations Manager)
function loginUserByUsername($username) {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, username, email, role, full_name FROM users WHERE username = ? AND status = 'active'");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) {
        return false;
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['logged_in'] = true;
    $_SESSION['last_activity'] = time();
    $_SESSION['sso_from_ops'] = true;

    $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $updateStmt->bind_param('i', $user['id']);
    $updateStmt->execute();

    return true;
}

// Logout user
function logoutUser() {
    session_unset();
    session_destroy();
    return true;
}

// Get current user info
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'email' => $_SESSION['email'],
        'role' => $_SESSION['role'],
        'full_name' => $_SESSION['full_name']
    ];
}

// Check if user has specific role
function hasRole($role) {
    $user = getCurrentUser();
    if (!$user) return false;
    
    if (is_array($role)) {
        return in_array($user['role'], $role);
    }
    return $user['role'] === $role;
}
?>