<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$students = $db->query("SELECT id, student_id, full_name, parent_phone, bus_number, current_balance, daily_deduction_rate, is_in_credit, status 
                        FROM students 
                        ORDER BY full_name")->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Students - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <?php require_once __DIR__ . '/../includes/ops_link.php'; render_ops_return_bar(); ?>
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">All Students</h1>
        </div>
        
        <div class="p-8">
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php foreach ($students as $student): ?>
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-3 text-sm font-mono text-gray-600"><?php echo $student['student_id']; ?></td>
                                <td class="px-6 py-3 text-sm font-medium text-gray-800"><?php echo htmlspecialchars($student['full_name']); ?></td>
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo $student['parent_phone'] ?? '-'; ?></td>
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo $student['bus_number'] ?? '-'; ?></td>
                                <td class="px-6 py-3 text-sm">
                                    <?php if ($student['is_in_credit']): ?>
                                        <span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                    <?php else: ?>
                                        <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold"><?php echo formatCurrency($student['current_balance']); ?></span>
                                    <?php endif; ?>
                                </td>
                                <td class="px-6 py-3 text-sm text-gray-600"><?php echo formatCurrency($student['daily_deduction_rate']); ?>/day</td>
                                <td class="px-6 py-3">
                                    <span class="px-2 py-1 rounded-full text-xs font-semibold <?php echo $student['status'] == 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'; ?>">
                                        <?php echo ucfirst($student['status']); ?>
                                    </span>
                                </td>
                                <td class="px-6 py-3">
                                    <a href="edit-student.php?id=<?php echo $student['id']; ?>" class="text-blue-600 hover:text-blue-800">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>