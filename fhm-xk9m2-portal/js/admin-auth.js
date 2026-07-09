// Runs on login.html: handles the login form.
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('error-msg');
    const btn = document.getElementById('login-btn');
    errorEl.classList.remove('show');
    btn.disabled = true;
    btn.textContent = 'Logging in…';

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await AdminAPI.post('/auth/login', { email, password });
      AdminAPI.setToken(data.token);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed.';
      errorEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
}

// Called at the top of dashboard.html — redirects to login if there's no token,
// and double-checks the token is actually still valid with the backend.
async function guardDashboard() {
  if (!AdminAPI.getToken()) {
    window.location.href = 'login.html';
    return null;
  }
  try {
    const data = await AdminAPI.get('/auth/me');
    return data.admin;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }
}

function logout() {
  AdminAPI.clearToken();
  window.location.href = 'login.html';
}
