<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';
require_once '../includes/auth.php';
require_once '../includes/functions.php';

requireLogin();

$db = getDB();
$error = '';
$success = '';

// Check if QR library exists
$qrlib_path = '../phpqrcode/qrlib.php';
if (!file_exists($qrlib_path)) {
    $error = "QR Library not found at: $qrlib_path";
} else {
    require_once $qrlib_path;
}

// Ensure qrcodes directory exists
$qrcodes_dir = '../qrcodes';
if (!file_exists($qrcodes_dir)) {
    mkdir($qrcodes_dir, 0755, true);
}

// Handle single QR code generation
if (isset($_GET['generate_single']) && isset($_GET['id'])) {
    $student_id = intval($_GET['id']);
    
    $stmt = $db->prepare("SELECT * FROM students WHERE id = ?");
    $stmt->bind_param('i', $student_id);
    $stmt->execute();
    $student = $stmt->get_result()->fetch_assoc();
    
    if ($student) {
        // Generate unique filename
        $qrFilename = 'qr_' . $student['student_id'] . '_' . time() . '.png';
        $qrFullPath = '../qrcodes/' . $qrFilename;
        
        try {
            // Generate QR code
            QRcode::png($student['student_id'], $qrFullPath, QR_ECLEVEL_H, 10, 2);
            
            // Check if file was created
            if (file_exists($qrFullPath)) {
                $qrImagePath = 'qrcodes/' . $qrFilename;
                $qrCode = $student['student_id'] . '_QR';
                
                // Deactivate old QR codes
                $db->query("UPDATE student_qr_codes SET is_active = 0 WHERE student_id = $student_id");
                
                // Insert new QR code
                $insert = $db->prepare("INSERT INTO student_qr_codes (student_id, qr_code, qr_data, qr_image_path, is_active, generated_at) VALUES (?, ?, ?, ?, 1, NOW())");
                $insert->bind_param('isss', $student_id, $qrCode, $student['student_id'], $qrImagePath);
                
                if ($insert->execute()) {
                    header("Location: qrcodes.php?success=1");
                    exit();
                } else {
                    $error = "Database error: " . $db->error;
                }
            } else {
                $error = "QR file was not created. Check folder permissions.";
            }
        } catch (Exception $e) {
            $error = "QR Generation error: " . $e->getMessage();
        }
    } else {
        $error = "Student not found";
    }
}

// Handle bulk QR code generation
if (isset($_POST['generate_bulk']) && isset($_POST['selected_students'])) {
    $selected_students = json_decode($_POST['selected_students'], true) ?? [];
    
    if (!empty($selected_students)) {
        $generated = 0;
        foreach ($selected_students as $student_id) {
            $stmt = $db->prepare("SELECT * FROM students WHERE id = ?");
            $stmt->bind_param('i', $student_id);
            $stmt->execute();
            $student = $stmt->get_result()->fetch_assoc();
            
            if ($student) {
                $qrFilename = 'qr_' . $student['student_id'] . '_' . time() . '_' . $student_id . '.png';
                $qrFullPath = '../qrcodes/' . $qrFilename;
                
                QRcode::png($student['student_id'], $qrFullPath, QR_ECLEVEL_H, 10, 2);
                
                if (file_exists($qrFullPath)) {
                    $qrImagePath = 'qrcodes/' . $qrFilename;
                    $qrCode = $student['student_id'] . '_QR';
                    
                    $db->query("UPDATE student_qr_codes SET is_active = 0 WHERE student_id = $student_id");
                    
                    $insert = $db->prepare("INSERT INTO student_qr_codes (student_id, qr_code, qr_data, qr_image_path, is_active, generated_at) VALUES (?, ?, ?, ?, 1, NOW())");
                    $insert->bind_param('isss', $student_id, $qrCode, $student['student_id'], $qrImagePath);
                    
                    if ($insert->execute()) {
                        $generated++;
                    }
                }
            }
        }
        header("Location: qrcodes.php?bulk_success=$generated");
        exit();
    }
}

// Handle download
if (isset($_GET['download']) && isset($_GET['qr_id'])) {
    $qr_id = intval($_GET['qr_id']);
    $result = $db->query("SELECT qr_image_path FROM student_qr_codes WHERE id = $qr_id");
    $qr = $result->fetch_assoc();
    
    if ($qr && file_exists('../' . $qr['qr_image_path'])) {
        header('Content-Type: image/png');
        header('Content-Disposition: attachment; filename="' . basename($qr['qr_image_path']) . '"');
        readfile('../' . $qr['qr_image_path']);
        exit();
    }
}

// Get success messages
if (isset($_GET['success'])) {
    $success = "QR Code generated successfully!";
}
if (isset($_GET['bulk_success'])) {
    $success = $_GET['bulk_success'] . " QR codes generated successfully!";
}

// Get all students with their QR codes
$students = $db->query("
    SELECT s.*, 
           sq.id as qr_id, 
           sq.qr_image_path, 
           sq.generated_at as qr_generated_at,
           sq.is_active as qr_active
    FROM students s 
    LEFT JOIN student_qr_codes sq ON s.id = sq.student_id AND sq.is_active = 1
    WHERE s.status = 'active'
    ORDER BY s.full_name
")->fetch_all(MYSQLI_ASSOC);

$total_students = count($students);
$has_qr = 0;
foreach ($students as $s) {
    if ($s['qr_image_path'] && file_exists('../' . $s['qr_image_path'])) {
        $has_qr++;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Codes - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .sidebar { background-color: #002368; }
        .nav-link:hover { background-color: #1e3a8a; }
        .nav-active { background-color: #1e40af; border-left: 4px solid #f59e0b; }
        .qr-card { transition: transform 0.2s; }
        .qr-card:hover { transform: translateY(-5px); }
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
            <a href="students.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-users w-5 mr-3"></i> Students
            </a>
            <a href="balances.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-wallet w-5 mr-3"></i> Balances
            </a>
            <a href="qrcodes.php" class="nav-active flex items-center px-4 py-3 rounded-lg mb-1">
                <i class="fas fa-qrcode w-5 mr-3"></i> QR Codes
            </a>
            <a href="import.php" class="nav-link flex items-center px-4 py-3 rounded-lg mb-1 hover:bg-blue-800">
                <i class="fas fa-file-excel w-5 mr-3"></i> Import Excel
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
        <div class="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-semibold text-gray-800">QR Code Management</h1>
                <p class="text-sm text-gray-500 mt-1">Generate and manage student QR codes for attendance scanning</p>
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-600">
                    <i class="fas fa-qrcode text-blue-600 mr-1"></i>
                    <?php echo $has_qr; ?> / <?php echo $total_students; ?> students have QR codes
                </p>
            </div>
        </div>
        
        <div class="p-8">
            <?php if ($error): ?>
                <div class="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <i class="fas fa-exclamation-triangle mr-2"></i> <?php echo $error; ?>
                </div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <i class="fas fa-check-circle mr-2"></i> <?php echo $success; ?>
                </div>
            <?php endif; ?>
            
            <!-- Bulk Action Bar -->
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
                <form method="POST" id="bulkForm">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="selectAll" onchange="toggleSelectAll()" class="mr-2 w-4 h-4">
                            <label for="selectAll" class="text-sm text-gray-600">Select All</label>
                        </div>
                        <button type="submit" name="generate_bulk" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-qrcode mr-2"></i> Generate QR for Selected
                        </button>
                        <div class="text-sm text-gray-500 ml-auto">
                            <i class="fas fa-info-circle mr-1"></i> QR code contains only Student ID for scanning
                        </div>
                    </div>
                    <input type="hidden" name="selected_students" id="selectedStudentsInput" value="">
                </form>
            </div>
            
            <!-- QR Codes Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <?php foreach ($students as $student): ?>
                    <div class="qr-card bg-white rounded-xl shadow-sm overflow-hidden">
                        <div class="p-4 text-center border-b border-gray-100">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs text-gray-500 font-mono"><?php echo $student['student_id']; ?></span>
                                <input type="checkbox" class="student-checkbox" value="<?php echo $student['id']; ?>" id="student_<?php echo $student['id']; ?>">
                            </div>
                            <h3 class="font-semibold text-gray-800"><?php echo htmlspecialchars($student['full_name']); ?></h3>
                            <p class="text-sm text-gray-500"><?php echo $student['bus_number'] ?? 'No bus assigned'; ?></p>
                            <p class="text-xs text-gray-400 mt-1">
                                Balance: <?php echo formatCurrency($student['current_balance']); ?>
                            </p>
                        </div>
                        
                        <div class="p-6 flex justify-center bg-gray-50">
                            <?php 
                            $image_path = null;
                            if ($student['qr_image_path']) {
                                $image_path = '../' . $student['qr_image_path'];
                                if (!file_exists($image_path)) {
                                    $image_path = null;
                                }
                            }
                            ?>
                            
                            <?php if ($image_path): ?>
                                <img src="<?php echo $image_path; ?>" 
                                     alt="QR Code" 
                                     class="w-40 h-40 border-2 border-gray-200 rounded-lg p-2 bg-white shadow-sm">
                            <?php else: ?>
                                <div class="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white">
                                    <i class="fas fa-qrcode text-gray-300 text-5xl mb-2"></i>
                                    <p class="text-xs text-gray-400">No QR Code</p>
                                </div>
                            <?php endif; ?>
                        </div>
                        
                        <div class="p-4 bg-white border-t border-gray-100 flex justify-center">
                            <?php if ($image_path): ?>
                                <a href="?generate_single=1&id=<?php echo $student['id']; ?>" 
                                   class="text-yellow-600 hover:text-yellow-800 text-sm transition mx-2">
                                    <i class="fas fa-sync-alt mr-1"></i> Regenerate
                                </a>
                            <?php else: ?>
                                <a href="?generate_single=1&id=<?php echo $student['id']; ?>" 
                                   class="text-blue-600 hover:text-blue-800 text-sm transition">
                                    <i class="fas fa-qrcode mr-1"></i> Generate QR Code
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            
            <?php if (empty($students)): ?>
                <div class="bg-white rounded-xl shadow-sm p-12 text-center">
                    <i class="fas fa-users text-gray-300 text-6xl mb-4"></i>
                    <p class="text-gray-500">No students found. Add students first to generate QR codes.</p>
                    <a href="import.php" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-file-excel mr-2"></i> Import Students
                    </a>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function toggleSelectAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = selectAll.checked;
            });
            updateSelectedStudents();
        }
        
        function updateSelectedStudents() {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            const selected = [];
            checkboxes.forEach(cb => {
                if (cb.checked) selected.push(cb.value);
            });
            document.getElementById('selectedStudentsInput').value = JSON.stringify(selected);
        }
        
        document.querySelectorAll('.student-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedStudents);
        });
    </script>
</body>
</html>