<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$student_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Get student info
$stmt = $db->prepare("SELECT * FROM students WHERE id = ?");
$stmt->bind_param('i', $student_id);
$stmt->execute();
$student = $stmt->get_result()->fetch_assoc();

if (!$student) {
    header('Location: balances.php');
    exit();
}

// Get payment transactions
$payments = $db->prepare("SELECT * FROM payment_transactions WHERE student_id = ? ORDER BY payment_date DESC");
$payments->bind_param('i', $student_id);
$payments->execute();
$payment_history = $payments->get_result()->fetch_all(MYSQLI_ASSOC);

// Get deduction history
$deductions = $db->prepare("SELECT * FROM deduction_log WHERE student_id = ? ORDER BY deduction_date DESC");
$deductions->bind_param('i', $student_id);
$deductions->execute();
$deduction_history = $deductions->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions - <?php echo htmlspecialchars($student['full_name']); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">
                Transactions: <?php echo htmlspecialchars($student['full_name']); ?>
            </h1>
            <p class="text-sm text-gray-500"><?php echo $student['student_id']; ?></p>
        </div>
        
        <div class="p-8">
            <!-- Current Balance Card -->
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-gray-500 text-sm">Current Balance</p>
                        <p class="text-3xl font-bold <?php echo $student['current_balance'] < 0 ? 'text-red-600' : 'text-green-600'; ?>">
                            <?php echo formatCurrency($student['current_balance']); ?>
                        </p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-sm">Daily Deduction Rate</p>
                        <p class="text-xl font-semibold text-blue-600"><?php echo formatCurrency($student['daily_deduction_rate']); ?>/day</p>
                    </div>
                    <a href="edit-student.php?id=<?php echo $student_id; ?>" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-edit mr-2"></i> Edit Student
                    </a>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Payment History -->
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-plus-circle text-green-600 mr-2"></i> Payment History
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-100">
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
                                        <td class="px-4 py-2 text-sm font-semibold text-green-600">+<?php echo formatCurrency($payment['amount']); ?></td>
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
                
                <!-- Deduction History -->
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-minus-circle text-red-600 mr-2"></i> Deduction History
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deducted</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <?php foreach ($deduction_history as $deduction): ?>
                                    <tr>
                                        <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatDate($deduction['deduction_date']); ?></td>
                                        <td class="px-4 py-2 text-sm text-gray-600"><?php echo formatCurrency($deduction['daily_rate']); ?>/day</td>
                                        <td class="px-4 py-2 text-sm font-semibold text-red-600">-<?php echo formatCurrency($deduction['amount_deducted']); ?></td>
                                        <td class="px-4 py-2 text-sm <?php echo $deduction['balance_after'] < 0 ? 'text-red-600' : 'text-green-600'; ?>">
                                            <?php echo formatCurrency($deduction['balance_after']); ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($deduction_history)): ?>
                                    <tr>
                                        <td colspan="4" class="px-4 py-4 text-center text-gray-500">No deduction records</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="mt-4">
                <a href="balances.php" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-arrow-left mr-1"></i> Back to Balances
                </a>
            </div>
        </div>
    </div>
</body>
</html>