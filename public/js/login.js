const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const captchaInput = document.getElementById('captcha-input');
const refreshCaptchaBtn = document.getElementById('refresh-captcha');

// Refresh captcha on button click
if (refreshCaptchaBtn) {
    refreshCaptchaBtn.addEventListener('click', () => {
        if (typeof drawCaptcha === 'function') {
            drawCaptcha();
        }
        if (captchaInput) captchaInput.value = '';
    });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate Canvas Captcha (case-insensitive)
    if (captchaInput && window.__captchaCode) {
        const userAnswer = captchaInput.value.trim().toUpperCase();
        if (userAnswer !== window.__captchaCode) {
            errorMsg.textContent = 'Incorrect captcha. Please try again.';
            errorMsg.style.display = 'block';
            if (typeof drawCaptcha === 'function') drawCaptcha();
            captchaInput.value = '';
            captchaInput.focus();
            return;
        }
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await axios.post('/auth/login', { username, password });
        if (res.data.status) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = '/';
        }
    } catch (err) {
        errorMsg.textContent = err.response?.data?.message || 'Login failed';
        errorMsg.style.display = 'block';
        if (typeof drawCaptcha === 'function') drawCaptcha();
        if (captchaInput) captchaInput.value = '';
    }
});
