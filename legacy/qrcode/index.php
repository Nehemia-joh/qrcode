<?php
require_once 'config/database.php';
require_once 'includes/auth.php';
require_once 'includes/functions.php';

// Handle logout
if (isset($_GET['logout'])) {
    logoutUser();
    header('Location: index.php');
    exit();
}

// Handle login
$login_error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (loginUser($username, $password)) {
        header('Location: index.php');
        exit();
    } else {
        $login_error = 'Invalid username or password';
    }
}

// Check if user is logged in to show dashboard
$is_logged_in = isLoggedIn();
if ($is_logged_in && !checkSessionTimeout()) {
    logoutUser();
    $is_logged_in = false;
    header('Location: index.php?error=session_expired');
    exit();
}

// Get dashboard data if logged in
$stats = [];
$recent_students = [];
$credit_students = [];
$current_user = null;

if ($is_logged_in) {
    $stats = getDashboardStats();
    $recent_students = getRecentStudents(10);
    $credit_students = getCreditStudents();
    $current_user = getCurrentUser();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Inter', sans-serif; }
        body { background-color: #f3f4f6; }
        .login-card { background: linear-gradient(135deg, #002368 0%, #001845 100%); }
        .sidebar { background-color: #002368; }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .credit-badge { background-color: #dc2626; color: white; }
        .positive-badge { background-color: #10b981; color: white; }
        .nav-link:hover { background-color: #1e3a8a; }
        .nav-active { background-color: #1e40af; border-left: 4px solid #f59e0b; }
    </style>
</head>
<body>

<?php if (!$is_logged_in): ?>
    <!-- LOGIN PAGE -->
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="max-w-md w-full mx-4">
            <!-- Logo/Brand -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-4">
                    <i class="fas fa-bus text-3xl" style="color: #002368;"></i>
                </div>
                <h1 class="text-3xl font-bold" style="color: #002368;"><?php echo SITE_NAME; ?></h1>
                <p class="text-gray-500 mt-2">Login to access the dashboard</p>
            </div>
            
            <!-- Login Card -->
            <div class="login-card rounded-2xl shadow-2xl p-8 text-white">
                <div class="text-center mb-6">
                    <i class="fas fa-user-circle text-5xl text-white opacity-80"></i>
                    <h2 class="text-2xl font-semibold mt-3">Welcome Back</h2>
                    <p class="text-white opacity-75 text-sm mt-1">Please enter your credentials</p>
                </div>
                
                <?php if ($login_error): ?>
                    <div class="mb-4 p-3 bg-red-500 bg-opacity-20 rounded-lg border border-red-400 text-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i> <?php echo $login_error; ?>
                    </div>
                <?php endif; ?>
                
                <?php if (isset($_GET['error']) && $_GET['error'] == 'session_expired'): ?>
                    <div class="mb-4 p-3 bg-yellow-500 bg-opacity-20 rounded-lg border border-yellow-400 text-center">
                        <i class="fas fa-clock mr-2"></i> Session expired. Please login again.
                    </div>
                <?php endif; ?>
                
                <form method="POST" action="">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">
                            <i class="fas fa-user mr-2"></i> Username
                        </label>
                        <input type="text" name="username" required 
                               class="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                               placeholder="Enter your username">
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">
                            <i class="fas fa-lock mr-2"></i> Password
                        </label>
                        <input type="password" name="password" required 
                               class="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                               placeholder="Enter your password">
                    </div>
                    
                    <button type="submit" name="login" 
                            class="w-full py-3 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i> Login
                    </button>
                </form>
                
                <div class="mt-6 text-center text-sm text-white opacity-75">
                    <p>Demo credentials: admin / admin123</p>
                </div>
            </div>
            
            <div class="text-center mt-6 text-gray-500 text-sm">
                <p>&copy; <?php echo date('Y'); ?> <?php echo SITE_NAME; ?>. All rights reserved.</p>
            </div>
        </div>
    </div>

<?php else: ?>
    <!-- DASHBOARD (Logged In) -->
    <?php require_once 'includes/ops_link.php'; render_ops_return_bar(); ?>
    
    <!-- Sidebar -->
    <div class="sidebar fixed left-0 top-0 h-full w-64 text-white z-20">
        <div class="p-6">
            <div class="flex items-center space-x-2 mb-6">
                <i class="fas fa-bus text-2xl text-yellow-400"></i>
                <span class="text-xl font-bold">BusTrack</span>
            </div>
            <div class="border-t border-blue-800 my-4"></div>
        </div>
        
        <nav class="px-3">
            <a href="index.php" class="nav-link nav-active flex items-center px-4 py-3 rounded-lg mb-1 transition">
                <i class="fas fa-tachometer-alt w-5 mr-3"></i> Dashboard
            </a>
            <a href="finance/balances.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-wallet w-5 mr-3"></i> Balances
            </a>
            <a href="finance/import.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-file-excel w-5 mr-3"></i> Import Excel
            </a>
            <a href="finance/batch-edit.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-layer-group w-5 mr-3"></i> Batch Edit
            </a>
            <a href="finance/students.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-users w-5 mr-3"></i> Students
            </a>
            <a href="finance/qrcodes.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
    <i class="fas fa-qrcode w-5 mr-3"></i> QR Codes
</a>
            <a href="#" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-bus w-5 mr-3"></i> Bus Routes
            </a>
            <a href="attendance/records.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 transition hover:bg-blue-800">
                <i class="fas fa-clipboard-list w-5 mr-3"></i> Attendance
            </a>
        </nav>
        
        <div class="absolute bottom-0 left-0 right-0 p-6 border-t border-blue-800">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium"><?php echo htmlspecialchars($current_user['full_name'] ?? $current_user['username']); ?></p>
                    <p class="text-xs text-blue-300"><?php echo $current_user['role']; ?></p>
                </div>
                <a href="?logout=1" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-sign-out-alt text-xl"></i>
                </a>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="ml-64 min-h-screen">
        <!-- Top Bar -->
        <div class="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
            <h1 class="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <div class="flex items-center space-x-4">
                <span class="text-gray-500 text-sm">
                    <i class="far fa-calendar-alt mr-1"></i> <?php echo date('l, F j, Y'); ?>
                </span>
            </div>
        </div>
        
        <!-- Content -->
        <div class="p-8">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="stat-card bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-sm">Total Students</p>
                            <p class="text-3xl font-bold text-gray-800"><?php echo $stats['total_students']; ?></p>
                        </div>
                        <div class="p-3 bg-blue-100 rounded-lg">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-sm">In Credit (Overdue)</p>
                            <p class="text-3xl font-bold text-red-600"><?php echo $stats['credit_students']; ?></p>
                        </div>
                        <div class="p-3 bg-red-100 rounded-lg">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-sm">Total Balance</p>
                            <p class="text-3xl font-bold text-green-600"><?php echo formatCurrency($stats['total_balance']); ?></p>
                        </div>
                        <div class="p-3 bg-green-100 rounded-lg">
                            <i class="fas fa-wallet text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-sm">Monthly Deductions</p>
                            <p class="text-3xl font-bold text-yellow-600"><?php echo formatCurrency($stats['monthly_deductions']); ?></p>
                        </div>
                        <div class="p-3 bg-yellow-100 rounded-lg">
                            <i class="fas fa-chart-line text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Two Column Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Recent Students -->
                <div class="bg-white rounded-xl shadow-sm">
                    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-user-plus mr-2 text-blue-600"></i> Recent Students
                        </h2>
                        <a href="finance/students.php" class="text-sm text-blue-600 hover:underline">View All →</a>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <?php foreach ($recent_students as $student): ?>
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-3 text-sm font-mono text-gray-600"><?php echo $student['student_id']; ?></td>
                                    <td class="px-6 py-3 text-sm font-medium text-gray-800"><?php echo htmlspecialchars($student['full_name']); ?></td>
                                    <td class="px-6 py-3 text-sm">
                                        <?php if ($student['is_in_credit']): ?>
                                            <span class="credit-badge px-2 py-1 rounded-full text-xs font-semibold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                        <?php else: ?>
                                            <span class="positive-badge px-2 py-1 rounded-full text-xs font-semibold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="px-6 py-3 text-sm text-gray-600"><?php echo formatCurrency($student['daily_deduction_rate']); ?>/day</td>
                                </tr>
                                <?php endforeach; ?>
                                <?php if (empty($recent_students)): ?>
                                <tr>
                                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">No students found</td>
                                </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Credit Students Alert -->
                <div class="bg-white rounded-xl shadow-sm">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h2 class="text-lg font-semibold text-red-600">
                            <i class="fas fa-bell mr-2"></i> Students in Credit (Overdue)
                        </h2>
                    </div>
                    <div class="p-6">
                        <?php if (empty($credit_students)): ?>
                            <div class="text-center py-8">
                                <i class="fas fa-check-circle text-green-500 text-5xl mb-3"></i>
                                <p class="text-gray-500">No students in credit. All balances are positive!</p>
                            </div>
                        <?php else: ?>
                            <div class="space-y-3">
                                <?php foreach ($credit_students as $student): ?>
                                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="font-semibold text-gray-800"><?php echo htmlspecialchars($student['full_name']); ?></p>
                                            <p class="text-sm text-gray-500 font-mono"><?php echo $student['student_id']; ?></p>
                                            <p class="text-sm text-gray-500 mt-1">
                                                <i class="fas fa-phone mr-1"></i> <?php echo $student['parent_phone'] ?? 'No phone'; ?>
                                            </p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-2xl font-bold text-red-600"><?php echo formatCurrency($student['current_balance']); ?></p>
                                            <p class="text-xs text-red-500"><?php echo $student['consecutive_overdue_days']; ?> days overdue</p>
                                        </div>
                                    </div>
                                    <div class="mt-3 flex justify-end">
                                        <a href="finance/edit-student.php?id=<?php echo $student['id']; ?>" 
                                           class="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition">
                                            <i class="fas fa-edit mr-1"></i> Record Payment
                                        </a>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <!-- System Info -->
            <div class="mt-8 bg-white rounded-xl shadow-sm p-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold text-gray-800">System Status</h3>
                        <p class="text-sm text-gray-500 mt-1">
                            Deduction Mode: <span class="font-medium"><?php echo ucfirst(getSystemSetting('deduction_mode', 'automatic')); ?></span> |
                            Deduction Time: <span class="font-medium"><?php echo getSystemSetting('deduction_time', '23:40'); ?></span> |
                            School Days: <span class="font-medium">Mon-Fri</span>
                        </p>
                    </div>
                    <div class="flex space-x-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <i class="fas fa-circle text-green-500 text-xs mr-1"></i> System Online
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

<?php endif; ?>

</body>
</html>