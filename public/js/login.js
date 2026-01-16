const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    }
});
