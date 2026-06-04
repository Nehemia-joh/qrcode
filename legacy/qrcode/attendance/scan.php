<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$error = '';
$success = '';
$scanned_data = null;

// Handle QR code scan (from mobile or web)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $qr_data = $_POST['qr_data'] ?? '';
    $attendance_type = $_POST['attendance_type'] ?? 'morning_pickup';
    $device_id = $_POST['device_id'] ?? 'web_scanner';
    $latitude = $_POST['latitude'] ?? null;
    $longitude = $_POST['longitude'] ?? null;
    
    if ($qr_data) {
        // Find student by QR data (student_id)
        $stmt = $db->prepare("SELECT * FROM students WHERE student_id = ? AND status = 'active'");
        $stmt->bind_param('s', $qr_data);
        $stmt->execute();
        $student = $stmt->get_result()->fetch_assoc();
        
        if ($student) {
            // Get bus route info
            $bus_info = null;
            if ($student['bus_number']) {
                $busStmt = $db->prepare("SELECT * FROM bus_routes WHERE bus_number = ? AND status = 'active'");
                $busStmt->bind_param('s', $student['bus_number']);
                $busStmt->execute();
                $bus_info = $busStmt->get_result()->fetch_assoc();
            }
            
            // Check if already marked for this attendance type today
            $checkStmt = $db->prepare("SELECT id FROM attendance_records WHERE student_id = ? AND attendance_date = CURDATE() AND attendance_type = ?");
            $checkStmt->bind_param('is', $student['id'], $attendance_type);
            $checkStmt->execute();
            $existing = $checkStmt->get_result()->fetch_assoc();
            
            if ($existing) {
                $error = "Student already marked for " . str_replace('_', ' ', $attendance_type) . " today";
            } else {
                // Get QR code from database
                $qrStmt = $db->prepare("SELECT qr_code FROM student_qr_codes WHERE student_id = ? AND is_active = 1");
                $qrStmt->bind_param('i', $student['id']);
                $qrStmt->execute();
                $qr_result = $qrStmt->get_result()->fetch_assoc();
                $qr_code = $qr_result['qr_code'] ?? $student['student_id'] . '_QR';
                
                // Record attendance
                $insertStmt = $db->prepare("
                    INSERT INTO attendance_records 
                    (student_id, qr_code, bus_number, route_number, attendance_type, attendance_time, attendance_date, 
                     latitude, longitude, device_id, recorded_by, status, sync_status) 
                    VALUES (?, ?, ?, ?, ?, NOW(), CURDATE(), ?, ?, ?, ?, 'present', 'synced')
                ");
                
                $route_number = $bus_info['route_number'] ?? '';
                $recorded_by = $_SESSION['username'];
                
                $insertStmt->bind_param(
                    'issssddsss',
                    $student['id'],
                    $qr_code,
                    $student['bus_number'],
                    $route_number,
                    $attendance_type,
                    $latitude,
                    $longitude,
                    $device_id,
                    $recorded_by
                );
                
                if ($insertStmt->execute()) {
                    $success = "Attendance marked for " . htmlspecialchars($student['full_name']);
                    $scanned_data = [
                        'student' => $student,
                        'attendance_type' => $attendance_type,
                        'time' => date('h:i A')
                    ];
                    
                    // Check if student is in credit
                    if ($student['is_in_credit']) {
                        $success .= " ⚠️ Student is in credit (Balance: " . formatCurrency($student['current_balance']) . ")";
                    }
                } else {
                    $error = "Failed to record attendance: " . $db->error;
                }
            }
        } else {
            $error = "Invalid QR Code. Student not found.";
        }
    } else {
        $error = "No QR data received";
    }
}

// Get today's attendance records
$today_records = $db->query("
    SELECT a.*, s.full_name, s.student_id, s.current_balance, s.is_in_credit
    FROM attendance_records a
    JOIN students s ON a.student_id = s.id
    WHERE DATE(a.attendance_date) = CURDATE()
    ORDER BY a.attendance_time DESC
")->fetch_all(MYSQLI_ASSOC);

// Get attendance statistics for today
$stats = [
    'total' => count($today_records),
    'morning_pickup' => 0,
    'morning_drop' => 0,
    'evening_pickup' => 0,
    'evening_drop' => 0
];

foreach ($today_records as $record) {
    $stats[$record['attendance_type']]++;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Scanner - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .sidebar { background-color: #002368; }
        .nav-link:hover { background-color: #1e3a8a; }
        .nav-active { background-color: #1e40af; border-left: 4px solid #f59e0b; }
        .scanner-area { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .credit-warning { background-color: #fee2e2; border-left: 4px solid #dc2626; }
    </style>
</head>
<body class="bg-gray-100">
    <!-- Sidebar -->
    <div class="sidebar fixed left-0 top-0 h-full w-64 text-white z-20">
        <div class="p-6">
            <div class="flex items-center space-x-2 mb-6">
                <i class="fas fa-bus text-2xl text-yellow-400"></i>
                <span class="text-xl font-bold">BusTrack</span>
            </div>
        </div>
        
        <nav class="px-3">
            <a href="../index.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-tachometer-alt w-5 mr-3"></i> Dashboard
            </a>
            <a href="scan.php" class="nav-active flex items-center px-4 py-3 rounded-lg mb-1">
                <i class="fas fa-camera w-5 mr-3"></i> Scan QR
            </a>
            <a href="records.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-history w-5 mr-3"></i> Attendance Records
            </a>
            <a href="../finance/students.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-users w-5 mr-3"></i> Students
            </a>
            <a href="../finance/balances.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-wallet w-5 mr-3"></i> Balances
            </a>
        </nav>
        
        <div class="absolute bottom-0 left-0 right-0 p-6 border-t border-blue-800">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium"><?php echo htmlspecialchars($_SESSION['full_name'] ?? $_SESSION['username']); ?></p>
                    <p class="text-xs text-blue-300"><?php echo $_SESSION['role']; ?></p>
                </div>
                <a href="../index.php?logout=1" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-sign-out-alt text-xl"></i>
                </a>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">QR Code Attendance Scanner</h1>
            <p class="text-sm text-gray-500 mt-1">Scan student QR codes to mark attendance</p>
        </div>
        
        <div class="p-8">
            <!-- Scanner Card -->
            <div class="scanner-area rounded-xl shadow-lg p-8 mb-6 text-white">
                <div class="max-w-md mx-auto text-center">
                    <i class="fas fa-qrcode text-6xl mb-4"></i>
                    <h2 class="text-2xl font-bold mb-4">Scan QR Code</h2>
                    
                    <!-- Manual Input Form (for web testing) -->
                    <form method="POST" class="bg-white rounded-lg p-4 text-gray-800">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">QR Code Data (or Student ID)</label>
                            <input type="text" name="qr_data" required 
                                   placeholder="Scan QR code or enter Student ID"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono">
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Attendance Type</label>
                            <select name="attendance_type" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="morning_pickup">Morning Pickup (Going to School)</option>
                                <option value="morning_drop">Morning Drop (Arrived at School)</option>
                                <option value="evening_pickup">Evening Pickup (Leaving School)</option>
                                <option value="evening_drop">Evening Drop (Arrived Home)</option>
                            </select>
                        </div>
                        
                        <input type="hidden" name="device_id" value="web_scanner">
                        
                        <button type="submit" class="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-check-circle mr-2"></i> Record Attendance
                        </button>
                    </form>
                    
                    <p class="text-sm text-gray-300 mt-4">
                        <i class="fas fa-info-circle mr-1"></i> 
                        For mobile app: Use camera to scan QR codes
                    </p>
                </div>
            </div>
            
            <!-- Messages -->
            <?php if ($success): ?>
                <div class="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <i class="fas fa-check-circle mr-2"></i> <?php echo $success; ?>
                </div>
            <?php endif; ?>
            
            <?php if ($error): ?>
                <div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <i class="fas fa-exclamation-triangle mr-2"></i> <?php echo $error; ?>
                </div>
            <?php endif; ?>
            
            <!-- Scan Result -->
            <?php if ($scanned_data): ?>
                <div class="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <i class="fas fa-user-check text-2xl mr-3"></i>
                            <span class="font-semibold"><?php echo htmlspecialchars($scanned_data['student']['full_name']); ?></span>
                            <span class="text-sm">(<?php echo $scanned_data['student']['student_id']; ?>)</span>
                            <p class="text-sm mt-1">
                                <?php echo ucfirst(str_replace('_', ' ', $scanned_data['attendance_type'])); ?> at <?php echo $scanned_data['time']; ?>
                            </p>
                        </div>
                        <?php if ($scanned_data['student']['is_in_credit']): ?>
                            <div class="credit-warning px-3 py-1 rounded-full text-sm">
                                Credit: <?php echo formatCurrency($scanned_data['student']['current_balance']); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif; ?>
            
            <!-- Today's Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Total Today</p>
                    <p class="text-2xl font-bold text-blue-600"><?php echo $stats['total']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Morning Pickup</p>
                    <p class="text-2xl font-bold text-green-600"><?php echo $stats['morning_pickup']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Morning Drop</p>
                    <p class="text-2xl font-bold text-yellow-600"><?php echo $stats['morning_drop']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Evening Total</p>
                    <p class="text-2xl font-bold text-purple-600"><?php echo $stats['evening_pickup'] + $stats['evening_drop']; ?></p>
                </div>
            </div>
            
            <!-- Today's Records -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 class="text-lg font-semibold text-gray-800">
                        <i class="fas fa-clock mr-2"></i> Today's Attendance Records
                    </h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php foreach ($today_records as $record): ?>
                                <tr class="hover:bg-gray-50 <?php echo $record['is_in_credit'] ? 'bg-red-50' : ''; ?>">
                                    <td class="px-4 py-3 text-sm text-gray-600">
                                        <?php echo date('h:i A', strtotime($record['attendance_time'])); ?>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium text-gray-800"><?php echo htmlspecialchars($record['full_name']); ?></div>
                                        <div class="text-xs text-gray-500"><?php echo $record['student_id']; ?></div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                            <?php echo ucfirst(str_replace('_', ' ', $record['attendance_type'])); ?>
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600"><?php echo $record['bus_number'] ?? '-'; ?></td>
                                    <td class="px-4 py-3">
                                        <?php if ($record['is_in_credit']): ?>
                                            <span class="text-red-600 text-xs font-medium">
                                                <i class="fas fa-exclamation-triangle mr-1"></i> Credit: <?php echo formatCurrency($record['current_balance']); ?>
                                            </span>
                                        <?php else: ?>
                                            <span class="text-green-600 text-xs">✓ Present</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (empty($today_records)): ?>
                                <tr>
                                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">No attendance records for today</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>