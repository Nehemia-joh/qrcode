<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$error = '';
$success = '';
$operation_result = [];

// Handle batch operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $operation = $_POST['operation'] ?? '';
    
    if ($operation === 'update_rate') {
        $new_rate = floatval($_POST['new_rate']);
        $bus_filter = $_POST['bus_filter'] ?? '';
        
        if ($new_rate > 0) {
            if ($bus_filter) {
                $stmt = $db->prepare("SELECT id, daily_deduction_rate FROM students WHERE status = 'active' AND bus_number = ?");
                $stmt->bind_param('s', $bus_filter);
            } else {
                $stmt = $db->prepare("SELECT id, daily_deduction_rate FROM students WHERE status = 'active'");
            }
            $stmt->execute();
            $students = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            $updated = 0;
            foreach ($students as $student) {
                $rateStmt = $db->prepare("INSERT INTO rate_change_log (student_id, old_rate, new_rate, effective_from, changed_by, source) VALUES (?, ?, ?, CURDATE(), ?, 'batch')");
                $rateStmt->bind_param('iddss', $student['id'], $student['daily_deduction_rate'], $new_rate, $_SESSION['username']);
                $rateStmt->execute();
                
                $updateStmt = $db->prepare("UPDATE students SET daily_deduction_rate = ?, rate_effective_from = CURDATE() WHERE id = ?");
                $updateStmt->bind_param('di', $new_rate, $student['id']);
                $updateStmt->execute();
                $updated++;
            }
            
            $success = "Updated daily rate for $updated students to " . formatCurrency($new_rate);
            
            // Log batch operation
            $logStmt = $db->prepare("INSERT INTO batch_operations_log (operation_type, rows_affected, status, performed_by) VALUES ('update_rate', ?, 'success', ?)");
            $logStmt->bind_param('is', $updated, $_SESSION['username']);
            $logStmt->execute();
        } else {
            $error = "Rate must be greater than 0";
        }
    }
    
    if ($operation === 'add_balance') {
        $amount = floatval($_POST['amount']);
        $bus_filter = $_POST['bus_filter'] ?? '';
        
        if ($amount != 0) {
            if ($bus_filter) {
                $stmt = $db->prepare("SELECT id, current_balance FROM students WHERE status = 'active' AND bus_number = ?");
                $stmt->bind_param('s', $bus_filter);
            } else {
                $stmt = $db->prepare("SELECT id, current_balance FROM students WHERE status = 'active'");
            }
            $stmt->execute();
            $students = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            $updated = 0;
            foreach ($students as $student) {
                $updateStmt = $db->prepare("UPDATE students SET current_balance = current_balance + ? WHERE id = ?");
                $updateStmt->bind_param('di', $amount, $student['id']);
                $updateStmt->execute();
                
                // Log as adjustment
                $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, notes, created_by) VALUES (?, ?, CURDATE(), 'batch_adjustment', ?, ?)");
                $notes = "Batch adjustment: " . ($amount > 0 ? "Added" : "Deducted") . " " . formatCurrency(abs($amount));
                $payStmt->bind_param('idsss', $student['id'], $amount, $notes, $_SESSION['username']);
                $payStmt->execute();
                $updated++;
            }
            
            $success = "Adjusted balance for $updated students by " . formatCurrency($amount);
            
            $logStmt = $db->prepare("INSERT INTO batch_operations_log (operation_type, rows_affected, status, performed_by) VALUES ('add_balance', ?, 'success', ?)");
            $logStmt->bind_param('is', $updated, $_SESSION['username']);
            $logStmt->execute();
        } else {
            $error = "Amount must be non-zero";
        }
    }
    
    if ($operation === 'clear_credit') {
        $bus_filter = $_POST['bus_filter'] ?? '';
        
        if ($bus_filter) {
            $stmt = $db->prepare("UPDATE students SET is_in_credit = 0, consecutive_overdue_days = 0 WHERE status = 'active' AND is_in_credit = 1 AND bus_number = ?");
            $stmt->bind_param('s', $bus_filter);
        } else {
            $stmt = $db->prepare("UPDATE students SET is_in_credit = 0, consecutive_overdue_days = 0 WHERE status = 'active' AND is_in_credit = 1");
        }
        $stmt->execute();
        $updated = $stmt->affected_rows;
        
        $success = "Cleared credit status for $updated students";
        
        $logStmt = $db->prepare("INSERT INTO batch_operations_log (operation_type, rows_affected, status, performed_by) VALUES ('clear_credit', ?, 'success', ?)");
        $logStmt->bind_param('is', $updated, $_SESSION['username']);
        $logStmt->execute();
    }
}

// Get buses for filter
$buses = $db->query("SELECT DISTINCT bus_number FROM students WHERE bus_number IS NOT NULL AND bus_number != ''")->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Batch Operations - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">Batch Operations</h1>
        </div>
        
        <div class="p-8">
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
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Batch Update Rate -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">
                        <i class="fas fa-dollar-sign text-yellow-600 mr-2"></i> Batch Update Daily Rate
                    </h2>
                    <form method="POST">
                        <input type="hidden" name="operation" value="update_rate">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">New Daily Rate (₹)</label>
                            <input type="number" name="new_rate" step="0.01" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Bus (Optional)</label>
                            <select name="bus_filter" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">All Buses</option>
                                <?php foreach ($buses as $bus): ?>
                                    <option value="<?php echo $bus['bus_number']; ?>"><?php echo $bus['bus_number']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-save mr-2"></i> Update Rates
                        </button>
                    </form>
                </div>
                
                <!-- Batch Balance Adjustment -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">
                        <i class="fas fa-wallet text-green-600 mr-2"></i> Batch Balance Adjustment
                    </h2>
                    <form method="POST">
                        <input type="hidden" name="operation" value="add_balance">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Amount to Add/Deduct (₹)</label>
                            <input type="number" name="amount" step="0.01" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <p class="text-xs text-gray-500 mt-1">Use positive to add, negative to deduct</p>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Bus (Optional)</label>
                            <select name="bus_filter" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">All Buses</option>
                                <?php foreach ($buses as $bus): ?>
                                    <option value="<?php echo $bus['bus_number']; ?>"><?php echo $bus['bus_number']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            <i class="fas fa-adjust mr-2"></i> Adjust Balances
                        </button>
                    </form>
                </div>
                
                <!-- Clear Credit Status -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">
                        <i class="fas fa-eraser text-red-600 mr-2"></i> Clear Credit Status
                    </h2>
                    <form method="POST">
                        <input type="hidden" name="operation" value="clear_credit">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Bus (Optional)</label>
                            <select name="bus_filter" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">All Buses</option>
                                <?php foreach ($buses as $bus): ?>
                                    <option value="<?php echo $bus['bus_number']; ?>"><?php echo $bus['bus_number']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <p class="text-sm text-red-600 mb-4">
                            <i class="fas fa-exclamation-triangle mr-1"></i> 
                            This will reset credit status and overdue counters for selected students.
                        </p>
                        <button type="submit" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                            <i class="fas fa-check-double mr-2"></i> Clear Credit Status
                        </button>
                    </form>
                </div>
                
                <!-- Export Data -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">
                        <i class="fas fa-download text-blue-600 mr-2"></i> Export Data
                    </h2>
                    <div class="space-y-3">
                        <a href="export.php?type=students" class="block w-full px-4 py-2 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                            <i class="fas fa-users mr-2"></i> Export Students
                        </a>
                        <a href="export.php?type=transactions" class="block w-full px-4 py-2 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                            <i class="fas fa-history mr-2"></i> Export Transactions
                        </a>
                        <a href="export.php?type=deductions" class="block w-full px-4 py-2 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                            <i class="fas fa-chart-line mr-2"></i> Export Deductions
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Recent Batch Operations Log -->
            <div class="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 class="text-lg font-semibold text-gray-800">Recent Batch Operations</h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rows Affected</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php 
                            $logs = $db->query("SELECT * FROM batch_operations_log ORDER BY created_at DESC LIMIT 20")->fetch_all(MYSQLI_ASSOC);
                            foreach ($logs as $log): ?>
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo formatDate($log['created_at']); ?> <?php echo date('H:i', strtotime($log['created_at'])); ?></td>
                                <td class="px-6 py-3 text-sm text-gray-800"><?php echo str_replace('_', ' ', ucfirst($log['operation_type'])); ?></td>
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo $log['rows_affected']; ?></td>
                                <td class="px-6 py-3">
                                    <span class="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><?php echo ucfirst($log['status']); ?></span>
                                </td>
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo $log['performed_by']; ?></td>
                            </tr>
                            <?php endforeach; ?>
                            <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No batch operations logged yet</td>
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