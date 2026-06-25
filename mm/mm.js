// ==================== KONFIGURASI API ====================
const API_URL = 'https://backend-delta-steel-38.vercel.app/api/balance';
const API_KEY = 'sb_secret_Ok9VVXILGV6zybDzN0zVpA_U5k___GF';

// ==================== UTILITY FUNCTIONS ====================
function showMessage(message, type = 'error') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
    
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

function getDeviceId() {
    let deviceId = localStorage.getItem('device_fingerprint');
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem('device_fingerprint', deviceId);
    }
    return deviceId;
}

function generateDeviceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const navigatorData = navigator.userAgent;
    
    let hash = 0;
    const str = `${timestamp}-${random}-${screenData}-${navigatorData}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `DEV_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

// ==================== VALIDASI NOMOR WA ====================
function validatePhoneNumber(phone) {
    let cleanedPhone = phone.replace(/\s/g, '');
    
    const numberRegex = /^[0-9]+$/;
    if (!numberRegex.test(cleanedPhone)) {
        return { valid: false, message: '❌ Nomor WhatsApp hanya boleh berisi angka!' };
    }
    
    const countryCodeRegex = /^[1-9][0-9]{0,2}/;
    if (!countryCodeRegex.test(cleanedPhone)) {
        return { valid: false, message: '❌ Nomor harus diawali dengan kode negara (contoh: 62 untuk Indonesia)' };
    }
    
    let countryCode = '';
    const validCountryCodes = ['62', '60', '65', '63', '66', '61', '64', '1', '44', '81', '82', '86', '91', '33', '49', '39', '34', '7', '55', '52', '54'];
    for (let i = 1; i <= 3; i++) {
        const potentialCode = cleanedPhone.substring(0, i);
        if (validCountryCodes.includes(potentialCode)) {
            countryCode = potentialCode;
            break;
        }
    }
    
    if (!countryCode) {
        return { valid: false, message: '❌ Kode negara tidak valid! Contoh: 62 untuk Indonesia' };
    }
    
    const numberAfterCode = cleanedPhone.substring(countryCode.length);
    
    if (numberAfterCode.length < 6) {
        return { valid: false, message: '❌ Nomor WhatsApp terlalu pendek! Minimal 6 digit setelah kode negara.' };
    }
    
    if (numberAfterCode.length > 13) {
        return { valid: false, message: '❌ Nomor WhatsApp terlalu panjang! Maksimal 13 digit setelah kode negara.' };
    }
    
    if (numberAfterCode.startsWith('0')) {
        return { valid: false, message: '❌ Nomor tidak boleh diawali 0! Gunakan format: kode negara + nomor (contoh: 628123456789)' };
    }
    
    return { 
        valid: true, 
        message: 'Nomor valid',
        formatted: cleanedPhone,
        countryCode: countryCode,
        localNumber: numberAfterCode
    };
}

// ==================== API CALL FUNCTION ====================
async function callApi(action, data) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Koneksi gagal. Periksa jaringan Anda.' };
    }
}

// ==================== LOGIN FUNCTION ====================
async function handleLogin() {
    const usernameInput = document.getElementById('authUsername');
    const passwordInput = document.getElementById('authPassword');
    const loginBtn = document.getElementById('authBtn');
    
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value;
    
    if (!username || !password) {
        showMessage('❌ Username dan password wajib diisi!', 'error');
        return;
    }
    
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<div class="loading-spinner"></div> Memproses...';
    loginBtn.disabled = true;
    
    try {
        const deviceId = getDeviceId();
        
        const result = await callApi('login', {
            username: username.toLowerCase(),
            password: password
        });
        
        if (!result.success) {
            showMessage(result.message || '❌ Login gagal!', 'error');
            return;
        }
        
        const user = result.data;
        
        const userData = {
            id: user.id,
            username: user.username,
            phone: user.phone,
            role: user.role || 'user',
            balance: user.balance || 0,
            device_id: user.device_id || deviceId,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('app_user', JSON.stringify(userData));
        
        if (!user.device_id) {
            await callApi('update_device_id', {
                username: user.username,
                device_id: deviceId
            });
        }
        
        showMessage('✅ Login berhasil! Mengalihkan...', 'success');
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('❌ Error: ' + (error.message || 'Terjadi kesalahan'), 'error');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// ==================== REGISTER FUNCTION (KIRIM LENGKAP) ====================
async function handleRegister() {
    const usernameInput = document.getElementById('regUsername');
    const phoneInput = document.getElementById('regPhone');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('regConfirmPassword');
    const registerBtn = document.getElementById('regBtn');
    
    let username = usernameInput?.value?.trim();
    let phone = phoneInput?.value?.trim();
    const password = passwordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    
    if (!username) {
        showMessage('⚠️ Username wajib diisi!', 'error');
        return;
    }
    
    if (username.length < 3) {
        showMessage('⚠️ Username minimal 3 karakter!', 'error');
        return;
    }
    
    if (!phone) {
        showMessage('⚠️ Nomor WhatsApp wajib diisi!', 'error');
        return;
    }
    
    let rawPhone = phone.replace(/[\s+\-]/g, '');
    phoneInput.value = rawPhone;
    
    const phoneValidation = validatePhoneNumber(rawPhone);
    if (!phoneValidation.valid) {
        showMessage(phoneValidation.message + ' Contoh: 628123456789', 'error');
        return;
    }
    
    if (!password) {
        showMessage('⚠️ Password wajib diisi!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('⚠️ Password minimal 6 karakter!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('⚠️ Password dan konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<div class="loading-spinner"></div> Memproses...';
    registerBtn.disabled = true;
    
    try {
        const deviceId = getDeviceId();
        
        const checkUser = await callApi('search_user', { query: username.toLowerCase() });
        
        if (checkUser.success && checkUser.data) {
            showMessage('❌ Username sudah terdaftar! Gunakan username lain.', 'error');
            return;
        }
        
        // ✅ KIRIM LENGKAP SEMUA FIELD
        const result = await callApi('register', {
            username: username.toLowerCase(),
            phone: phoneValidation.formatted,
            password: password,
            email: `${username.toLowerCase()}@example.com`,
            device_id: deviceId,
            country_code: phoneValidation.countryCode,
            balance: 0,
            role: 'user',
            is_active: true
        });
        
        if (result && result.success) {
            showMessage('✅ Registrasi berhasil! Silakan login.', 'success');
            
            usernameInput.value = '';
            phoneInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            
            setTimeout(() => {
                const loginTab = document.querySelector('.tab-btn[data-tab="tab1"]');
                if (loginTab) loginTab.click();
            }, 1000);
        } else {
            showMessage(result?.message || '❌ Registrasi gagal. Silakan coba lagi.', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('❌ Error: ' + (error.message || 'Terjadi kesalahan'), 'error');
    } finally {
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    }
}

// ==================== AUTO-FORMAT PHONE INPUT ====================
function setupPhoneInputFormatting() {
    const phoneInput = document.getElementById('regPhone');
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', function(e) {
        let value = this.value.replace(/[^0-9]/g, '');
        if (value.length > 15) {
            value = value.substring(0, 15);
        }
        this.value = value;
    });
    
    phoneInput.placeholder = '6281234567890';
}

// ==================== TAB SWITCHING ====================
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetTab) {
                    panel.classList.add('active');
                }
            });
            
            const messageBox = document.getElementById('messageBox');
            if (messageBox) {
                messageBox.style.display = 'none';
                messageBox.className = 'message-box';
            }
        });
    });
}

// ==================== ENTER KEY SUPPORT ====================
function initEnterKeySupport() {
    const authPassword = document.getElementById('authPassword');
    const regConfirmPassword = document.getElementById('regConfirmPassword');
    
    if (authPassword) {
        authPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
    
    if (regConfirmPassword) {
        regConfirmPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleRegister();
            }
        });
    }
}

// ==================== CHECK EXISTING SESSION ====================
function checkExistingSession() {
    const userData = localStorage.getItem('app_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('Session ditemukan untuk user:', user.username);
        } catch (e) {}
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    getDeviceId();
    setupPhoneInputFormatting();
    initTabs();
    initEnterKeySupport();
    
    const loginBtn = document.getElementById('authBtn');
    const registerBtn = document.getElementById('regBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
    }
    
    checkExistingSession();
    
    console.log('✅ Sistem siap! API:', API_URL);
});

window.apiUrl = API_URL;
window.showMessage = showMessage;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.validatePhoneNumber = validatePhoneNumber;