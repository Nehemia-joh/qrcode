<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();

// Get filter parameters
$date_filter = $_GET['date'] ?? date('Y-m-d');
$student_filter = $_GET['student'] ?? '';
$type_filter = $_GET['type'] ?? '';

// Build query
$query = "
    SELECT a.*, s.full_name, s.student_id, s.bus_number, s.current_balance, s.is_in_credit
    FROM attendance_records a
    JOIN students s ON a.student_id = s.id
    WHERE 1=1
";

$params = [];
$types = '';

if ($date_filter) {
    $query .= " AND DATE(a.attendance_date) = ?";
    $params[] = $date_filter;
    $types .= 's';
}

if ($student_filter) {
    $query .= " AND (s.full_name LIKE ? OR s.student_id LIKE ?)";
    $params[] = "%$student_filter%";
    $params[] = "%$student_filter%";
    $types .= 'ss';
}

if ($type_filter) {
    $query .= " AND a.attendance_type = ?";
    $params[] = $type_filter;
    $types .= 's';
}

$query .= " ORDER BY a.attendance_time DESC LIMIT 200";

$stmt = $db->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$records = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Get summary statistics
$summary = [
    'total' => count($records),
    'morning_pickup' => 0,
    'morning_drop' => 0,
    'evening_pickup' => 0,
    'evening_drop' => 0,
    'credit_count' => 0
];

foreach ($records as $record) {
    $summary[$record['attendance_type']]++;
    if ($record['is_in_credit']) $summary['credit_count']++;
}

// Get unique students for filter
$students = $db->query("SELECT id, student_id, full_name FROM students WHERE status = 'active' ORDER BY full_name")->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Records - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .sidebar { background-color: #002368; }
        .nav-link:hover { background-color: #1e3a8a; }
        .nav-active { background-color: #1e40af; border-left: 4px solid #f59e0b; }
    </style>
</head>
<body class="bg-gray-100">
    <?php require_once __DIR__ . '/../includes/ops_link.php'; render_ops_return_bar(); ?>
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
            <a href="scan.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-camera w-5 mr-3"></i> Scan QR
            </a>
            <a href="records.php" class="nav-active flex items-center px-4 py-3 rounded-lg mb-1">
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
            <h1 class="text-2xl font-semibold text-gray-800">Attendance Records</h1>
            <p class="text-sm text-gray-500 mt-1">View and filter attendance history</p>
        </div>
        
        <div class="p-8">
            <!-- Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Total</p>
                    <p class="text-xl font-bold text-blue-600"><?php echo $summary['total']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Morning Pickup</p>
                    <p class="text-xl font-bold text-green-600"><?php echo $summary['morning_pickup']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Morning Drop</p>
                    <p class="text-xl font-bold text-yellow-600"><?php echo $summary['morning_drop']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Evening Pickup</p>
                    <p class="text-xl font-bold text-purple-600"><?php echo $summary['evening_pickup']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Evening Drop</p>
                    <p class="text-xl font-bold text-indigo-600"><?php echo $summary['evening_drop']; ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center">
                    <p class="text-gray-500 text-xs">Credit Students</p>
                    <p class="text-xl font-bold text-red-600"><?php echo $summary['credit_count']; ?></p>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
                <form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                        <input type="date" name="date" value="<?php echo $date_filter; ?>" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Student</label>
                        <select name="student" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Students</option>
                            <?php foreach ($students as $student): ?>
                                <option value="<?php echo $student['student_id']; ?>" <?php echo $student_filter == $student['student_id'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($student['full_name']); ?> (<?php echo $student['student_id']; ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Attendance Type</label>
                        <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Types</option>
                            <option value="morning_pickup" <?php echo $type_filter == 'morning_pickup' ? 'selected' : ''; ?>>Morning Pickup</option>
                            <option value="morning_drop" <?php echo $type_filter == 'morning_drop' ? 'selected' : ''; ?>>Morning Drop</option>
                            <option value="evening_pickup" <?php echo $type_filter == 'evening_pickup' ? 'selected' : ''; ?>>Evening Pickup</option>
                            <option value="evening_drop" <?php echo $type_filter == 'evening_drop' ? 'selected' : ''; ?>>Evening Drop</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                            <i class="fas fa-filter mr-1"></i> Apply Filters
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Records Table -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php foreach ($records as $record): ?>
                                <tr class="hover:bg-gray-50 <?php echo $record['is_in_credit'] ? 'bg-red-50' : ''; ?>">
                                    <td class="px-4 py-3 text-sm text-gray-600">
                                        <?php echo formatDate($record['attendance_date']); ?><br>
                                        <span class="text-xs"><?php echo date('h:i A', strtotime($record['attendance_time'])); ?></span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium text-gray-800"><?php echo htmlspecialchars($record['full_name']); ?></div>
                                    </td>
                                    <td class="px-4 py-3 text-sm font-mono text-gray-600"><?php echo $record['student_id']; ?></td>
                                    <td class="px-4 py-3">
                                        <span class="px-2 py-1 text-xs rounded-full 
                                            <?php echo $record['attendance_type'] == 'morning_pickup' ? 'bg-green-100 text-green-700' : 
                                                ($record['attendance_type'] == 'morning_drop' ? 'bg-yellow-100 text-yellow-700' :
                                                ($record['attendance_type'] == 'evening_pickup' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700')); ?>">
                                            <?php echo ucfirst(str_replace('_', ' ', $record['attendance_type'])); ?>
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600"><?php echo $record['bus_number'] ?? '-'; ?></td>
                                    <td class="px-4 py-3 text-sm text-gray-600"><?php echo $record['recorded_by']; ?></td>
                                    <td class="px-4 py-3 text-sm">
                                        <?php if ($record['is_in_credit']): ?>
                                            <span class="text-red-600 font-medium"><?php echo formatCurrency($record['current_balance']); ?></span>
                                        <?php else: ?>
                                            <span class="text-green-600"><?php echo formatCurrency($record['current_balance']); ?></span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (empty($records)): ?>
                                <tr>
                                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">No attendance records found</td>
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