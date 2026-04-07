(function () {
  const API = '';

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function setAlert(message, type) {
    const el = document.querySelector('#auth-alert');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
    el.className = 'auth-alert' + (type ? ' ' + type : '');
  }

  async function updateNavAccountLink() {
    const link = document.querySelector('a[href="login.html"], a[href="account.html"]');
    if (!link) return;
    try {
      const data = await api('/api/auth/me');
      link.href = 'account.html';
      link.textContent = data.user.isAdmin ? 'Admin' : 'Account';
    } catch {
      link.href = 'login.html';
      link.textContent = 'Account';
    }
  }

  async function setupLoginPage() {
    const loginForm = document.querySelector('#login-form');
    if (!loginForm) return;
    const setupSection = document.querySelector('#mfa-setup');
    const challengeSection = document.querySelector('#mfa-challenge');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAlert('');
      const username = document.querySelector('#username').value.trim();
      const password = document.querySelector('#password').value;

      try {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        loginForm.hidden = true;
        if (data.next === 'setup-mfa') {
          const setup = await api('/api/auth/mfa/setup', { method: 'POST' });
          document.querySelector('#mfa-qr').src = setup.qrDataUrl;
          document.querySelector('#mfa-secret').textContent = setup.secret;
          setupSection.hidden = false;
        } else if (data.next === 'mfa') {
          challengeSection.hidden = false;
        } else {
          window.location.href = 'account.html';
        }
      } catch (error) {
        setAlert(error.message, 'error');
      }
    });

    const setupForm = document.querySelector('#mfa-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setAlert('');
        try {
          await api('/api/auth/mfa/verify-setup', {
            method: 'POST',
            body: JSON.stringify({ token: document.querySelector('#setup-token').value.trim() })
          });
          window.location.href = 'account.html';
        } catch (error) {
          setAlert(error.message, 'error');
        }
      });
    }

    const mfaForm = document.querySelector('#mfa-form');
    if (mfaForm) {
      mfaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setAlert('');
        try {
          await api('/api/auth/mfa/challenge', {
            method: 'POST',
            body: JSON.stringify({ token: document.querySelector('#mfa-token').value.trim() })
          });
          window.location.href = 'account.html';
        } catch (error) {
          setAlert(error.message, 'error');
        }
      });
    }
  }

  async function setupAccountPage() {
    const summary = document.querySelector('#account-summary');
    if (!summary) return;
    try {
      const data = await api('/api/auth/me');
      const user = data.user;
      summary.innerHTML = `
        <article class="info-card"><h3>Username</h3><p>${user.username}</p></article>
        <article class="info-card"><h3>Role</h3><p>${user.isAdmin ? 'Administrator' : 'Standard user'}</p></article>
        <article class="info-card"><h3>MFA</h3><p>${user.mfaEnabled ? 'Enabled' : 'Pending setup'}</p></article>
        <article class="info-card"><h3>Created</h3><p>${new Date(user.createdAt).toLocaleString()}</p></article>
      `;
      if (user.isAdmin) document.querySelector('#admin-link').hidden = false;
    } catch {
      window.location.href = 'login.html';
      return;
    }

    const logoutBtn = document.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
        window.location.href = 'login.html';
      });
    }
  }

  async function setupAdminPage() {
    const usersBody = document.querySelector('#users-body');
    const messagesBody = document.querySelector('#messages-body');
    const stats = document.querySelector('#admin-stats');
    if (!usersBody || !messagesBody || !stats) return;

    try {
      const [usersData, messagesData] = await Promise.all([
        api('/api/admin/users'),
        api('/api/admin/messages')
      ]);

      stats.innerHTML = `
        <article class="info-card"><h3>Total users</h3><p>${usersData.users.length}</p></article>
        <article class="info-card"><h3>MFA enabled</h3><p>${usersData.users.filter((u) => u.mfaEnabled).length}</p></article>
        <article class="info-card"><h3>Contact requests</h3><p>${messagesData.messages.length}</p></article>
      `;

      usersBody.innerHTML = usersData.users.map((user) => `
        <tr>
          <td>${user.username}</td>
          <td>${user.isAdmin ? 'Admin' : 'User'}</td>
          <td>${user.mfaEnabled ? 'Enabled' : 'Pending'}</td>
          <td>${new Date(user.createdAt).toLocaleString()}</td>
        </tr>
      `).join('');

      messagesBody.innerHTML = messagesData.messages.map((message) => `
        <tr>
          <td>${message.name}</td>
          <td>${message.email}</td>
          <td>${message.service || '—'}</td>
          <td>${new Date(message.createdAt).toLocaleString()}<br><span class="muted">${message.message}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="4">No contact submissions yet.</td></tr>';
    } catch {
      window.location.href = 'login.html';
    }
  }

  function setupContactForm() {
    const form = document.querySelector('#contact-form') || document.querySelector('#contact-form-card');
    const success = document.querySelector('.form-success');
    if (!form || !success) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      success.hidden = true;
      const payload = {
        name: form.querySelector('[name="name"]').value.trim(),
        email: form.querySelector('[name="email"]').value.trim(),
        phone: form.querySelector('[name="phone"]').value.trim(),
        service: form.querySelector('[name="service"]').value,
        message: form.querySelector('[name="message"]').value.trim(),
      };
      try {
        await api('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
        success.textContent = '✅ Message sent successfully. We stored it in the secure inbox for review.';
        success.hidden = false;
        form.reset();
      } catch (error) {
        success.textContent = '⚠️ ' + error.message;
        success.hidden = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateNavAccountLink();
    setupLoginPage();
    setupAccountPage();
    setupAdminPage();
    setupContactForm();
  });
})();
