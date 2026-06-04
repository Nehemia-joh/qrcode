<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$student_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$error = '';
$success = '';

// Get student data
$stmt = $db->prepare("SELECT * FROM students WHERE id = ?");
$stmt->bind_param('i', $student_id);
$stmt->execute();
$student = $stmt->get_result()->fetch_assoc();

if (!$student) {
    header('Location: students.php');
    exit();
}

// Get payment history
$payments = $db->prepare("SELECT * FROM payment_transactions WHERE student_id = ? ORDER BY payment_date DESC LIMIT 20");
$payments->bind_param('i', $student_id);
$payments->execute();
$payment_history = $payments->get_result()->fetch_all(MYSQLI_ASSOC);

// Get deduction history
$deductions = $db->prepare("SELECT * FROM deduction_log WHERE student_id = ? ORDER BY deduction_date DESC LIMIT 20");
$deductions->bind_param('i', $student_id);
$deductions->execute();
$deduction_history = $deductions->get_result()->fetch_all(MYSQLI_ASSOC);

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['update_student'])) {
        $full_name = sanitize($_POST['full_name']);
        $parent_phone = sanitize($_POST['parent_phone']);
        $gender = $_POST['gender'];
        $bus_number = sanitize($_POST['bus_number']);
        $daily_deduction_rate = floatval($_POST['daily_deduction_rate']);
        $status = $_POST['status'];
        
        // Check if rate changed
        if ($daily_deduction_rate != $student['daily_deduction_rate']) {
            $rateStmt = $db->prepare("INSERT INTO rate_change_log (student_id, old_rate, new_rate, effective_from, changed_by, source) VALUES (?, ?, ?, CURDATE(), ?, 'manual')");
            $rateStmt->bind_param('iddss', $student_id, $student['daily_deduction_rate'], $daily_deduction_rate, $_SESSION['username']);
            $rateStmt->execute();
        }
        
        $updateStmt = $db->prepare("UPDATE students SET full_name = ?, parent_phone = ?, gender = ?, bus_number = ?, daily_deduction_rate = ?, status = ? WHERE id = ?");
        $updateStmt->bind_param('ssssssi', $full_name, $parent_phone, $gender, $bus_number, $daily_deduction_rate, $status, $student_id);
        
        if ($updateStmt->execute()) {
            $success = "Student information updated successfully";
            // Refresh student data
            $stmt->execute();
            $student = $stmt->get_result()->fetch_assoc();
        } else {
            $error = "Failed to update student";
        }
    }
    
    if (isset($_POST['add_payment'])) {
        $amount = floatval($_POST['amount']);
        $notes = sanitize($_POST['notes']);
        
        if ($amount > 0) {
            $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, notes, created_by) VALUES (?, ?, CURDATE(), 'manual', ?, ?)");
            $payStmt->bind_param('idss', $student_id, $amount, $notes, $_SESSION['username']);
            
            if ($payStmt->execute()) {
                // Update balance
                $balanceStmt = $db->prepare("UPDATE students SET current_balance = current_balance + ? WHERE id = ?");
                $balanceStmt->bind_param('di', $amount, $student_id);
                $balanceStmt->execute();
                
                // Update credit status
                $db->query("UPDATE students SET is_in_credit = CASE WHEN current_balance < 0 THEN 1 ELSE 0 END, consecutive_overdue_days = CASE WHEN current_balance >= 0 THEN 0 ELSE consecutive_overdue_days + 1 END WHERE id = $student_id");
                
                $success = "Payment of " . formatCurrency($amount) . " added successfully";
                // Refresh data
                $stmt->execute();
                $student = $stmt->get_result()->fetch_assoc();
                $payments->execute();
                $payment_history = $payments->get_result()->fetch_all(MYSQLI_ASSOC);
            } else {
                $error = "Failed to add payment";
            }
        } else {
            $error = "Amount must be greater than 0";
        }
    }
    
    if (isset($_POST['adjust_balance'])) {
        $adjustment = floatval($_POST['adjustment']);
        $reason = sanitize($_POST['reason']);
        
        if ($adjustment != 0) {
            $balanceStmt = $db->prepare("UPDATE students SET current_balance = current_balance + ? WHERE id = ?");
            $balanceStmt->bind_param('di', $adjustment, $student_id);
            $balanceStmt->execute();
            
            // Log as a special transaction
            $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, notes, created_by) VALUES (?, ?, CURDATE(), 'adjustment', ?, ?)");
            $payStmt->bind_param('dsss', $student_id, $adjustment, $reason, $_SESSION['username']);
            $payStmt->execute();
            
            // Update credit status
            $db->query("UPDATE students SET is_in_credit = CASE WHEN current_balance < 0 THEN 1 ELSE 0 END, consecutive_overdue_days = CASE WHEN current_balance >= 0 THEN 0 ELSE consecutive_overdue_days + 1 END WHERE id = $student_id");
            
            $success = "Balance adjusted by " . formatCurrency($adjustment);
            // Refresh data
            $stmt->execute();
            $student = $stmt->get_result()->fetch_assoc();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Student - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">Edit Student</h1>
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
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Student Info -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 class="text-lg font-semibold text-gray-800 mb-4">Student Information</h2>
                        <form method="POST">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                                    <input type="text" value="<?php echo $student['student_id']; ?>" disabled class="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                                    <input type="text" value="<?php echo formatDate($student['registration_date']); ?>" disabled class="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input type="text" name="full_name" required value="<?php echo htmlspecialchars($student['full_name']); ?>" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                                    <input type="text" name="parent_phone" value="<?php echo $student['parent_phone']; ?>" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select name="gender" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select</option>
                                        <option value="male" <?php echo $student['gender'] == 'male' ? 'selected' : ''; ?>>Male</option>
                                        <option value="female" <?php echo $student['gender'] == 'female' ? 'selected' : ''; ?>>Female</option>
                                        <option value="other" <?php echo $student['gender'] == 'other' ? 'selected' : ''; ?>>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Bus Number</label>
                                    <input type="text" name="bus_number" value="<?php echo $student['bus_number']; ?>" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Daily Deduction Rate</label>
                                    <input type="number" name="daily_deduction_rate" step="0.01" value="<?php echo $student['daily_deduction_rate']; ?>" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select name="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="active" <?php echo $student['status'] == 'active' ? 'selected' : ''; ?>>Active</option>
                                        <option value="inactive" <?php echo $student['status'] == 'inactive' ? 'selected' : ''; ?>>Inactive</option>
                                        <option value="graduated" <?php echo $student['status'] == 'graduated' ? 'selected' : ''; ?>>Graduated</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mt-4">
                                <button type="submit" name="update_student" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                    <i class="fas fa-save mr-2"></i> Update Student
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Payment History -->
                    <div class="bg-white rounded-xl shadow-sm p-6">
                        <h2 class="text-lg font-semibold text-gray-800 mb-4">Payment History</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    <?php foreach ($payment_history as $payment): ?>
                                    <tr>
                                        <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatDate($payment['payment_date']); ?></td>
                                        <td class="px-4 py-2 text-sm font-semibold text-green-600"><?php echo formatCurrency($payment['amount']); ?></td>
                                        <td class="px-4 py-2 text-sm text-gray-600"><?php echo ucfirst($payment['source']); ?></td>
                                        <td class="px-4 py-2 text-sm text-gray-500"><?php echo $payment['notes'] ?: '-'; ?></td>
                                    </tr>
                                    <?php endforeach; ?>
                                    <?php if (empty($payment_history)): ?>
                                    <tr>
                                        <td colspan="4" class="px-4 py-4 text-center text-gray-500">No payment records</td>
                                    </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Balance & Actions -->
                <div>
                    <!-- Current Balance Card -->
                    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 class="text-lg font-semibold text-gray-800 mb-4">Current Balance</h2>
                        <div class="text-center">
                            <?php if ($student['is_in_credit']): ?>
                                <p class="text-5xl font-bold text-red-600"><?php echo formatCurrency($student['current_balance']); ?></p>
                                <p class="text-sm text-red-500 mt-2">⚠️ Student is in credit (overdue)</p>
                                <p class="text-sm text-gray-500 mt-1">Consecutive overdue days: <?php echo $student['consecutive_overdue_days']; ?></p>
                                <p class="text-sm text-gray-500">Total overdue days: <?php echo $student['total_overdue_days']; ?></p>
                            <?php else: ?>
                                <p class="text-5xl font-bold text-green-600"><?php echo formatCurrency($student['current_balance']); ?></p>
                                <p class="text-sm text-gray-500 mt-2">Balance is positive</p>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <!-- Add Payment -->
                    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 class="text-lg font-semibold text-gray-800 mb-4">Add Payment</h2>
                        <form method="POST">
                            <div class="mb-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                <input type="number" name="amount" step="0.01" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="mb-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea name="notes" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                            </div>
                            <button type="submit" name="add_payment" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                                <i class="fas fa-plus-circle mr-2"></i> Add Payment
                            </button>
                        </form>
                    </div>
                    
                    <!-- Balance Adjustment -->
                    <div class="bg-white rounded-xl shadow-sm p-6">
                        <h2 class="text-lg font-semibold text-gray-800 mb-4">Balance Adjustment</h2>
                        <form method="POST">
                            <div class="mb-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Adjustment Amount</label>
                                <input type="number" name="adjustment" step="0.01" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <p class="text-xs text-gray-500 mt-1">Use positive to add, negative to deduct</p>
                            </div>
                            <div class="mb-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <input type="text" name="reason" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <button type="submit" name="adjust_balance" class="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                                <i class="fas fa-sliders-h mr-2"></i> Adjust Balance
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Deduction History -->
            <div class="mt-6 bg-white rounded-xl shadow-sm p-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Deduction History</h2>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deducted</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance Before</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php foreach ($deduction_history as $deduction): ?>
                            <tr>
                                <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatDate($deduction['deduction_date']); ?></td>
                                <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatCurrency($deduction['daily_rate']); ?>/day</td>
                                <td class="px-4 py-2 text-sm font-semibold text-red-600"><?php echo formatCurrency($deduction['amount_deducted']); ?></td>
                                <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatCurrency($deduction['balance_before']); ?></td>
                                <td class="px-4 py-2 text-sm font-semibold <?php echo $deduction['balance_after'] < 0 ? 'text-red-600' : 'text-green-600'; ?>">
                                    <?php echo formatCurrency($deduction['balance_after']); ?>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                            <?php if (empty($deduction_history)): ?>
                            <tr>
                                <td colspan="5" class="px-4 py-4 text-center text-gray-500">No deduction records</td>
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