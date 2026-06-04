<?php
require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$error = '';
$success = '';
$preview_data = [];
$conflicts = [];
$imported_count = 0;
$updated_count = 0;
$conflict_count = 0;

// Handle import confirmation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirm_import'])) {
    $data = json_decode($_POST['import_data'], true);
    
    foreach ($data as $row) {
        $db = getDB();
        
        // Find student by ID or name
        $student_id = null;
        
        if (!empty($row['student_id'])) {
            $stmt = $db->prepare("SELECT id, current_balance, daily_deduction_rate FROM students WHERE student_id = ?");
            $stmt->bind_param('s', $row['student_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            $existing = $result->fetch_assoc();
            if ($existing) {
                $student_id = $existing['id'];
            }
        }
        
        if (!$student_id && !empty($row['name'])) {
            $stmt = $db->prepare("SELECT id, current_balance, daily_deduction_rate FROM students WHERE full_name = ?");
            $stmt->bind_param('s', $row['name']);
            $stmt->execute();
            $result = $stmt->get_result();
            $existing = $result->fetch_assoc();
            if ($existing) {
                $student_id = $existing['id'];
            }
        }
        
        if ($student_id) {
            // Update existing student
            $updates = [];
            $params = [];
            $types = '';
            
            if (!empty($row['amount_paid']) && $row['amount_paid'] > 0) {
                $updates[] = "current_balance = current_balance + ?";
                $params[] = $row['amount_paid'];
                $types .= 'd';
                
                // Record payment
                $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, created_by) VALUES (?, ?, CURDATE(), 'excel', ?)");
                $createdBy = $_SESSION['username'];
                $payStmt->bind_param('dss', $student_id, $row['amount_paid'], $createdBy);
                $payStmt->execute();
            }
            
            if (!empty($row['daily_rate']) && $row['daily_rate'] > 0) {
                // Get old rate
                $oldRate = $existing['daily_deduction_rate'];
                $updates[] = "daily_deduction_rate = ?";
                $updates[] = "rate_effective_from = CURDATE()";
                $params[] = $row['daily_rate'];
                $types .= 'd';
                
                // Log rate change
                $rateStmt = $db->prepare("INSERT INTO rate_change_log (student_id, old_rate, new_rate, effective_from, changed_by, source) VALUES (?, ?, ?, CURDATE(), ?, 'excel')");
                $rateStmt->bind_param('iddss', $student_id, $oldRate, $row['daily_rate'], $_SESSION['username']);
                $rateStmt->execute();
            }
            
            if (!empty($updates)) {
                $sql = "UPDATE students SET " . implode(', ', $updates) . " WHERE id = ?";
                $params[] = $student_id;
                $types .= 'i';
                $stmt = $db->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $updated_count++;
            }
        } else {
            // Create new student
            $student_id = generateStudentId();
            $full_name = $row['name'];
            $daily_rate = $row['daily_rate'] ?? 50;
            $current_balance = $row['amount_paid'] ?? 0;
            
            $stmt = $db->prepare("INSERT INTO students (student_id, full_name, parent_phone, current_balance, daily_deduction_rate, registration_date) VALUES (?, ?, ?, ?, ?, CURDATE())");
            $stmt->bind_param('sssdd', $student_id, $full_name, $row['phone'], $current_balance, $daily_rate);
            $stmt->execute();
            $new_student_id = $db->insert_id;
            $imported_count++;
            
            if ($current_balance > 0) {
                $payStmt = $db->prepare("INSERT INTO payment_transactions (student_id, amount, payment_date, source, created_by) VALUES (?, ?, CURDATE(), 'excel', ?)");
                $payStmt->bind_param('dss', $new_student_id, $current_balance, $_SESSION['username']);
                $payStmt->execute();
            }
        }
    }
    
    // Log batch operation
    $logStmt = $db->prepare("INSERT INTO batch_operations_log (operation_type, file_name, rows_affected, status, performed_by) VALUES ('import', ?, ?, 'success', ?)");
    $logStmt->bind_param('sis', $_POST['file_name'], ($imported_count + $updated_count), $_SESSION['username']);
    $logStmt->execute();
    
    $success = "Import completed! Added: $imported_count, Updated: $updated_count";
}

// Handle Excel file upload and preview
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['excel_file']) && $_FILES['excel_file']['error'] === UPLOAD_ERR_OK) {
    require_once '../vendor/autoload.php'; // PhpSpreadsheet
    
    $fileName = $_FILES['excel_file']['name'];
    $tmpName = $_FILES['excel_file']['tmp_name'];
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tmpName);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        
        $headers = array_shift($rows);
        
        // Map headers to expected columns
        $name_col = null;
        $amount_col = null;
        $rate_col = null;
        $id_col = null;
        $phone_col = null;
        
        foreach ($headers as $index => $header) {
            $header_lower = strtolower(trim($header));
            if (strpos($header_lower, 'name') !== false) $name_col = $index;
            if (strpos($header_lower, 'amount') !== false) $amount_col = $index;
            if (strpos($header_lower, 'daily') !== false || strpos($header_lower, 'rate') !== false) $rate_col = $index;
            if (strpos($header_lower, 'id') !== false) $id_col = $index;
            if (strpos($header_lower, 'phone') !== false) $phone_col = $index;
        }
        
        if ($name_col === null) {
            $error = "Excel file must contain a 'Name' column";
        } else {
            $db = getDB();
            $all_students = $db->query("SELECT id, student_id, full_name FROM students")->fetch_all(MYSQLI_ASSOC);
            $existing_names = array_column($all_students, 'full_name', 'student_id');
            
            foreach ($rows as $row_index => $row) {
                if (empty($row[$name_col])) continue;
                
                $student_name = trim($row[$name_col]);
                $amount_paid = !empty($row[$amount_col]) ? floatval($row[$amount_col]) : 0;
                $daily_rate = !empty($row[$rate_col]) ? floatval($row[$rate_col]) : 0;
                $student_id = !empty($row[$id_col]) ? trim($row[$id_col]) : '';
                $phone = !empty($row[$phone_col]) ? trim($row[$phone_col]) : '';
                
                // Check for exact match
                $exact_match = null;
                foreach ($all_students as $student) {
                    if (strtolower($student['full_name']) === strtolower($student_name)) {
                        $exact_match = $student;
                        break;
                    }
                }
                
                if (!$exact_match && !$student_id) {
                    // Fuzzy matching for potential typos
                    $best_match = null;
                    $best_score = 0;
                    foreach ($all_students as $student) {
                        similar_text(strtolower($student_name), strtolower($student['full_name']), $similarity);
                        if ($similarity > 80 && $similarity > $best_score) {
                            $best_score = $similarity;
                            $best_match = $student;
                        }
                    }
                    
                    if ($best_match && $best_score > 80) {
                        $conflicts[] = [
                            'excel_name' => $student_name,
                            'matched_student' => $best_match,
                            'amount_paid' => $amount_paid,
                            'daily_rate' => $daily_rate,
                            'phone' => $phone
                        ];
                        $conflict_count++;
                        continue;
                    }
                }
                
                $preview_data[] = [
                    'name' => $student_name,
                    'student_id' => $student_id,
                    'amount_paid' => $amount_paid,
                    'daily_rate' => $daily_rate,
                    'phone' => $phone,
                    'exists' => $exact_match ? true : false
                ];
            }
        }
    } catch (Exception $e) {
        $error = "Error reading Excel file: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import Excel - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="ml-64 min-h-screen">
        <div class="bg-white shadow-sm px-8 py-4">
            <h1 class="text-2xl font-semibold text-gray-800">Import Finance Excel</h1>
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
            
            <!-- Upload Form -->
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">Upload Excel File</h2>
                <form method="POST" enctype="multipart/form-data">
                    <div class="flex items-center space-x-4">
                        <input type="file" name="excel_file" accept=".xlsx,.xls,.csv" required 
                               class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-upload mr-2"></i> Preview
                        </button>
                    </div>
                </form>
                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p class="text-sm text-gray-600"><i class="fas fa-info-circle mr-1"></i> Expected Excel format:</p>
                    <p class="text-sm text-gray-500 mt-1">Columns: <strong>Name</strong>, <strong>Amount Paid</strong> (optional), <strong>Daily Rate</strong> (optional)</p>
                    <p class="text-sm text-gray-500">Optional: Student ID, Phone columns for better matching</p>
                </div>
            </div>
            
            <!-- Conflicts Resolution -->
            <?php if (!empty($conflicts)): ?>
            <div class="bg-yellow-50 border border-yellow-400 rounded-xl p-6 mb-6">
                <h2 class="text-lg font-semibold text-yellow-800 mb-4">
                    <i class="fas fa-exclamation-triangle mr-2"></i> Name Conflicts Found
                </h2>
                <p class="text-sm text-yellow-700 mb-4">These names have potential typos. Please select the correct student or add as new.</p>
                
                <?php foreach ($conflicts as $conflict): ?>
                <div class="bg-white rounded-lg p-4 mb-3">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-medium text-gray-800">Excel Name: <span class="text-red-600"><?php echo htmlspecialchars($conflict['excel_name']); ?></span></p>
                            <p class="text-sm text-gray-600 mt-1">Matched: <?php echo $conflict['matched_student']['full_name']; ?> (<?php echo $conflict['matched_student']['student_id']; ?>)</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="resolveConflict('<?php echo htmlspecialchars(json_encode($conflict)); ?>', 'match')" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                                <i class="fas fa-check mr-1"></i> Use Match
                            </button>
                            <button onclick="resolveConflict('<?php echo htmlspecialchars(json_encode($conflict)); ?>', 'new')" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                                <i class="fas fa-plus mr-1"></i> Add New
                            </button>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
            
            <!-- Preview Data -->
            <?php if (!empty($preview_data)): ?>
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 class="text-lg font-semibold text-gray-800">Preview Import Data</h2>
                    <p class="text-sm text-gray-500"><?php echo count($preview_data); ?> records ready to import</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <?php foreach ($preview_data as $row): ?>
                            <tr>
                                <td class="px-6 py-3 text-sm font-medium text-gray-800"><?php echo htmlspecialchars($row['name']); ?></td>
                                <td class="px-6 py-3 text-sm font-mono text-gray-600"><?php echo $row['student_id'] ?: '-'; ?></td>
                                <td class="px-6 py-3 text-sm text-green-600 font-semibold"><?php echo $row['amount_paid'] > 0 ? formatCurrency($row['amount_paid']) : '-'; ?></td>
                                <td class="px-6 py-3 text-sm text-blue-600 font-semibold"><?php echo $row['daily_rate'] > 0 ? formatCurrency($row['daily_rate']) . '/day' : '-'; ?></td>
                                <td class="px-6 py-3 text-sm">
                                    <?php if ($row['exists']): ?>
                                        <span class="text-green-600"><i class="fas fa-sync-alt mr-1"></i> Update</span>
                                    <?php else: ?>
                                        <span class="text-blue-600"><i class="fas fa-plus mr-1"></i> New</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <form method="POST">
                        <input type="hidden" name="import_data" value='<?php echo htmlspecialchars(json_encode($preview_data)); ?>'>
                        <input type="hidden" name="confirm_import" value="1">
                        <input type="hidden" name="file_name" value="<?php echo htmlspecialchars($fileName ?? ''); ?>">
                        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-check-circle mr-2"></i> Confirm Import
                        </button>
                    </form>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
    
    <script>
    function resolveConflict(conflictData, action) {
        const conflict = JSON.parse(conflictData);
        console.log('Resolving conflict:', conflict, action);
        // This would handle conflict resolution
        alert('Conflict resolution feature: ' + action + ' - ' + conflict.excel_name);
    }
    </script>
</body>
</html>

<?php
function generateStudentId() {
    $year = date('Y');
    $random = strtoupper(substr(uniqid(), -6));
    return 'STU' . $year . $random;
}
?>