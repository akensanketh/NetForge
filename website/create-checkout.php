<?php
/**
 * NETFORGE VPN - Payments.lk Checkout Creation API
 * Connects securely to https://api.payments.lk/v1/checkouts using Secret Key
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$apiKey = 'sk_test_LSACke4Q4sFQdSYq6Na0tq5KOkmlDZXi';

$raw = file_get_contents('php://input');
$body = json_decode($raw, true) ?: [];

$plans = [
    '1month' => [
        'name' => '1-Month Standard',
        'cents' => 420000,
        'lkr' => 'Rs. 4,200',
        'usd' => '$12.99'
    ],
    '1year' => [
        'name' => '1-Year Security',
        'cents' => 2250000,
        'lkr' => 'Rs. 22,500',
        'usd' => '$71.88'
    ],
    '2year' => [
        'name' => '2-Year Pro Shield',
        'cents' => 2450000,
        'lkr' => 'Rs. 24,500',
        'usd' => '$78.96'
    ]
];

$planKey = isset($body['plan']) && isset($plans[$body['plan']]) ? $body['plan'] : '2year';
$selectedPlan = $plans[$planKey];

$orderRef = 'NF-ORD-' . strtoupper(substr(uniqid(), -6));
if (!empty($body['order_id'])) {
    $orderRef = preg_replace('/[^A-Za-z0-9_-]/', '', $body['order_id']);
}

// Compute return URLs dynamically
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['SERVER_PORT'] ?? 80) == 443) ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$reqUri = $_SERVER['REQUEST_URI'] ?? '/';
$dir = rtrim(dirname($reqUri), '/\\');
$baseUrl = $protocol . $host . ($dir ? $dir : '');

$successUrl = $baseUrl . '/purchase.html?payment=success&ref=' . urlencode($orderRef) . '&plan=' . urlencode($planKey);
$cancelUrl = $baseUrl . '/purchase.html?payment=cancelled&ref=' . urlencode($orderRef);

$customerName = !empty($body['name']) ? trim($body['name']) : 'NETFORGE Member';
$customerEmail = !empty($body['email']) ? trim($body['email']) : 'alex@netforge.internal';

$payload = [
    'amountCents' => $selectedPlan['cents'],
    'description' => 'NETFORGE VPN - ' . $selectedPlan['name'],
    'reference' => $orderRef,
    'customer' => [
        'name' => $customerName,
        'email' => $customerEmail
    ],
    'successUrl' => $successUrl,
    'cancelUrl' => $cancelUrl
];

$idempotencyKey = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? ('NF-IDEM-' . bin2hex(random_bytes(10)));

$response = null;
$httpCode = 0;
$curlErr = '';

if (function_exists('curl_init')) {
    $ch = curl_init('https://api.payments.lk/v1/checkouts');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Idempotency-Key: ' . $idempotencyKey,
            'User-Agent: NETFORGE-VPN/1.0'
        ],
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => false // compatibility with shared hosting ca-bundles
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
}

// Fallback to stream context if cURL is disabled or failed
if (empty($response) || $httpCode < 200 || $httpCode >= 300) {
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer {$apiKey}\r\n" .
                        "Content-Type: application/json\r\n" .
                        "Idempotency-Key: {$idempotencyKey}\r\n" .
                        "User-Agent: NETFORGE-VPN/1.0\r\n",
            'content' => json_encode($payload),
            'timeout' => 25,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    $ctx = stream_context_create($opts);
    $streamRes = @file_get_contents('https://api.payments.lk/v1/checkouts', false, $ctx);
    if ($streamRes) {
        $response = $streamRes;
    }
}

$resData = json_decode($response, true);

if (!empty($resData['url'])) {
    http_response_code(200);
    echo json_encode([
        'url' => $resData['url'],
        'id' => $resData['id'] ?? null,
        'orderRef' => $orderRef,
        'amountCents' => $selectedPlan['cents'],
        'plan' => $selectedPlan['name']
    ]);
} else {
    http_response_code(502);
    echo json_encode([
        'message' => $resData['message'] ?? 'Unable to connect to Payments.lk gateway.',
        'details' => $resData ?: ($curlErr ?: 'Gateway unreachable')
    ]);
}
