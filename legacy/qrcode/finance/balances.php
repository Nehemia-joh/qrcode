<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$error = '';
$success = '';

// Get filter parameters
$status_filter = $_GET['status'] ?? 'all';
$credit_filter = $_GET['credit'] ?? 'all';
$bus_filter = $_GET['bus'] ?? '';
$search = $_GET['search'] ?? '';

// Build query
$where_conditions = [];
$params = [];
$types = '';

if ($status_filter !== 'all') {
    $where_conditions[] = "s.status = ?";
    $params[] = $status_filter;
    $types .= 's';
}

if ($credit_filter === 'credit') {
    $where_conditions[] = "s.is_in_credit = 1";
} elseif ($credit_filter === 'positive') {
    $where_conditions[] = "s.is_in_credit = 0 AND s.current_balance > 0";
} elseif ($credit_filter === 'zero') {
    $where_conditions[] = "s.current_balance = 0";
}

if ($bus_filter) {
    $where_conditions[] = "s.bus_number = ?";
    $params[] = $bus_filter;
    $types .= 's';
}

if ($search) {
    $where_conditions[] = "(s.full_name LIKE ? OR s.student_id LIKE ? OR s.parent_phone LIKE ?)";
    $search_param = "%$search%";
    $params[] = $search_param;
    $params[] = $search_param;
    $params[] = $search_param;
    $types .= 'sss';
}

$where_sql = empty($where_conditions) ? '' : 'WHERE ' . implode(' AND ', $where_conditions);

// Get all students with balances
$sql = "SELECT s.*, 
        (SELECT COUNT(*) FROM deduction_log WHERE student_id = s.id AND deduction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as deductions_30d,
        (SELECT SUM(amount_deducted) FROM deduction_log WHERE student_id = s.id AND deduction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as total_deducted_30d
        FROM students s 
        $where_sql 
        ORDER BY s.current_balance ASC";

$stmt = $db->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$students = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Calculate summary statistics
$total_balance = 0;
$total_credit = 0;
$total_positive = 0;
$credit_count = 0;
$positive_count = 0;

foreach ($students as $student) {
    $total_balance += $student['current_balance'];
    if ($student['current_balance'] < 0) {
        $total_credit += abs($student['current_balance']);
        $credit_count++;
    } else {
        $total_positive += $student['current_balance'];
        $positive_count++;
    }
}

// Get unique bus numbers for filter
$buses = $db->query("SELECT DISTINCT bus_number FROM students WHERE bus_number IS NOT NULL AND bus_number != '' ORDER BY bus_number")->fetch_all(MYSQLI_ASSOC);

// Handle bulk payment action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['bulk_payment'])) {
    $selected_students = $_POST['selected_students'] ?? [];
    $payment_amount = floatval($_POST['payment_amount']);
    $payment_notes = sanitize($_POST['payment_notes']);
    
    if (!empty($selected_students) && $payment_amount > 0) {
        $updated = 0;
        foreach ($selected_students as $student_id) {
            // Add payment
            $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, notes, created_by) VALUES (?, ?, CURDATE(), 'bulk', ?, ?)");
            $payStmt->bind_param('idss', $student_id, $payment_amount, $payment_notes, $_SESSION['username']);
            $payStmt->execute();
            
            // Update balance
            $updateStmt = $db->prepare("UPDATE students SET current_balance = current_balance + ? WHERE id = ?");
            $updateStmt->bind_param('di', $payment_amount, $student_id);
            $updateStmt->execute();
            
            // Update credit status
            $db->query("UPDATE students SET is_in_credit = CASE WHEN current_balance < 0 THEN 1 ELSE 0 END, consecutive_overdue_days = CASE WHEN current_balance >= 0 THEN 0 ELSE consecutive_overdue_days + 1 END WHERE id = $student_id");
            
            $updated++;
        }
        $success = "Added payment of " . formatCurrency($payment_amount) . " to $updated student(s)";
        
        // Log batch operation
        $logStmt = $db->prepare("INSERT INTO batch_operations_log (operation_type, rows_affected, status, performed_by) VALUES ('bulk_payment', ?, 'success', ?)");
        $logStmt->bind_param('is', $updated, $_SESSION['username']);
        $logStmt->execute();
        
        // Refresh data
        header("Location: balances.php?status=$status_filter&credit=$credit_filter&bus=$bus_filter&search=" . urlencode($search));
        exit();
    } else {
        $error = "Please select at least one student and enter a valid amount";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Balances - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .sidebar { background-color: #002368; }
        .nav-link:hover { background-color: #1e3a8a; }
        .nav-active { background-color: #1e40af; border-left: 4px solid #f59e0b; }
        .credit-row { background-color: #fef2f2; }
        .positive-row { background-color: #f0fdf4; }
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
            <a href="students.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-users w-5 mr-3"></i> Students
            </a>
            <a href="import.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-file-excel w-5 mr-3"></i> Import Excel
            </a>
            <a href="balances.php" class="nav-active flex items-center px-4 py-3 rounded-lg mb-1">
                <i class="fas fa-wallet w-5 mr-3"></i> Balances
            </a>
            <a href="batch-edit.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-layer-group w-5 mr-3"></i> Batch Edit
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
            <h1 class="text-2xl font-semibold text-gray-800">Student Balances</h1>
        </div>
        
        <div class="p-8">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Total Balance</p>
                    <p class="text-2xl font-bold text-blue-600"><?php echo formatCurrency($total_balance); ?></p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Positive Balance</p>
                    <p class="text-2xl font-bold text-green-600"><?php echo formatCurrency($total_positive); ?></p>
                    <p class="text-xs text-gray-500"><?php echo $positive_count; ?> students</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Negative Balance (Credit)</p>
                    <p class="text-2xl font-bold text-red-600"><?php echo formatCurrency($total_credit); ?></p>
                    <p class="text-xs text-gray-500"><?php echo $credit_count; ?> students</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <p class="text-gray-500 text-sm">Net Position</p>
                    <p class="text-2xl font-bold <?php echo $total_balance >= 0 ? 'text-green-600' : 'text-red-600'; ?>">
                        <?php echo formatCurrency($total_balance); ?>
                    </p>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
                <form method="GET" class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="all" <?php echo $status_filter == 'all' ? 'selected' : ''; ?>>All Status</option>
                            <option value="active" <?php echo $status_filter == 'active' ? 'selected' : ''; ?>>Active</option>
                            <option value="inactive" <?php echo $status_filter == 'inactive' ? 'selected' : ''; ?>>Inactive</option>
                            <option value="graduated" <?php echo $status_filter == 'graduated' ? 'selected' : ''; ?>>Graduated</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Balance Type</label>
                        <select name="credit" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="all" <?php echo $credit_filter == 'all' ? 'selected' : ''; ?>>All Balances</option>
                            <option value="credit" <?php echo $credit_filter == 'credit' ? 'selected' : ''; ?>>In Credit (Negative)</option>
                            <option value="positive" <?php echo $credit_filter == 'positive' ? 'selected' : ''; ?>>Positive</option>
                            <option value="zero" <?php echo $credit_filter == 'zero' ? 'selected' : ''; ?>>Zero Balance</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Bus</label>
                        <select name="bus" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Buses</option>
                            <?php foreach ($buses as $bus): ?>
                                <option value="<?php echo $bus['bus_number']; ?>" <?php echo $bus_filter == $bus['bus_number'] ? 'selected' : ''; ?>>
                                    <?php echo $bus['bus_number']; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>" 
                               placeholder="Name, ID, Phone..." 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                            <i class="fas fa-filter mr-1"></i> Apply Filters
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Bulk Payment Form -->
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6" id="bulkPaymentForm" style="display: none;">
                <form method="POST">
                    <input type="hidden" name="selected_students" id="selectedStudentsInput" value="">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
                            <input type="number" name="payment_amount" step="0.01" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <input type="text" name="payment_notes" placeholder="Bulk payment" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div class="flex items-end space-x-2">
                            <button type="submit" name="bulk_payment" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-check-circle mr-1"></i> Apply Payment
                            </button>
                            <button type="button" onclick="hideBulkPayment()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            
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
            
            <!-- Students Table -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-800">Student Balance List</h2>
                    <div class="flex space-x-2">
                        <button onclick="selectAll()" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                            Select All
                        </button>
                        <button onclick="showBulkPayment()" class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            Bulk Payment
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <form id="studentSelectionForm">
                        <table class="w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                                        <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()">
                                    </th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Balance</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue Days</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <?php if (empty($students)): ?>
                                    <tr>
                                        <td colspan="9" class="px-4 py-8 text-center text-gray-500">No students found</td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($students as $student): ?>
                                        <tr class="<?php echo $student['is_in_credit'] ? 'credit-row' : ($student['current_balance'] > 0 ? 'positive-row' : ''); ?> hover:bg-gray-50">
                                            <td class="px-4 py-3">
                                                <input type="checkbox" name="student_ids[]" value="<?php echo $student['id']; ?>" class="student-checkbox">
                                            </td>
                                            <td class="px-4 py-3 text-sm font-mono text-gray-600"><?php echo $student['student_id']; ?></td>
                                            <td class="px-4 py-3">
                                                <div class="font-medium text-gray-800"><?php echo htmlspecialchars($student['full_name']); ?></div>
                                                <div class="text-xs text-gray-500"><?php echo ucfirst($student['status']); ?></div>
                                            </td>
                                            <td class="px-4 py-3 text-sm text-gray-600"><?php echo $student['parent_phone'] ?? '-'; ?></td>
                                            <td class="px-4 py-3 text-sm text-gray-600"><?php echo $student['bus_number'] ?? '-'; ?></td>
                                            <td class="px-4 py-3">
                                                <?php if ($student['is_in_credit']): ?>
                                                    <span class="text-red-600 font-bold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                                    <span class="ml-1 text-xs text-red-500">(Credit)</span>
                                                <?php else: ?>
                                                    <span class="text-green-600 font-semibold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="px-4 py-3 text-sm text-gray-600"><?php echo formatCurrency($student['daily_deduction_rate']); ?>/day</td>
                                            <td class="px-4 py-3">
                                                <?php if ($student['consecutive_overdue_days'] > 0): ?>
                                                    <span class="text-red-600 text-sm font-medium"><?php echo $student['consecutive_overdue_days']; ?> days</span>
                                                <?php else: ?>
                                                    <span class="text-gray-400 text-sm">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="px-4 py-3">
                                                <div class="flex space-x-2">
                                                    <a href="edit-student.php?id=<?php echo $student['id']; ?>" 
                                                       class="text-blue-600 hover:text-blue-800" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <a href="transactions.php?id=<?php echo $student['id']; ?>" 
                                                       class="text-green-600 hover:text-green-800" title="Transactions">
                                                        <i class="fas fa-history"></i>
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Track selected students for bulk payment
        let selectedStudents = [];
        
        function toggleSelectAll() {
            const selectAll = document.getElementById('selectAllCheckbox');
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = selectAll.checked;
            });
            updateSelectedStudents();
        }
        
        function selectAll() {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = true;
            });
            updateSelectedStudents();
        }
        
        function updateSelectedStudents() {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            selectedStudents = [];
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    selectedStudents.push(cb.value);
                }
            });
            document.getElementById('selectedStudentsInput').value = JSON.stringify(selectedStudents);
        }
        
        function showBulkPayment() {
            updateSelectedStudents();
            if (selectedStudents.length === 0) {
                alert('Please select at least one student first');
                return;
            }
            document.getElementById('bulkPaymentForm').style.display = 'block';
            document.getElementById('selectedStudentsInput').value = JSON.stringify(selectedStudents);
        }
        
        function hideBulkPayment() {
            document.getElementById('bulkPaymentForm').style.display = 'none';
        }
        
        // Add event listeners to all checkboxes
        document.querySelectorAll('.student-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedStudents);
        });
        
        // Handle form submission for bulk payment
        document.querySelector('#studentSelectionForm')?.addEventListener('submit', function(e) {
            updateSelectedStudents();
            if (selectedStudents.length === 0) {
                e.preventDefault();
                alert('Please select at least one student');
            }
        });
    </script>
</body>
</html>