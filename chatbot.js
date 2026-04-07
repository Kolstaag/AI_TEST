(function () {
  const CHAT_API_URL = '/api/chat';

  const state = {
    open: false,
    loading: false,
    messages: [
      {
        role: 'assistant',
        content: 'Hi! I am the SkyTech assistant. I can help you compare drones, rentals, repairs, and point you to the right page.'
      }
    ]
  };

  function injectStyles() {
    if (document.getElementById('skytech-chatbot-styles')) return;
    const style = document.createElement('style');
    style.id = 'skytech-chatbot-styles';
    style.textContent = `
      .skytech-chatbot-launcher {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2000;
        border: 1px solid var(--line, rgba(15,23,42,.12));
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(34,197,94,.12)), var(--panel, #fff);
        color: var(--text, #0f172a);
        box-shadow: 0 18px 50px rgba(2,6,23,.18);
        padding: 0.9rem 1rem;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .skytech-chatbot-panel {
        position: fixed;
        right: 20px;
        bottom: 84px;
        width: min(380px, calc(100vw - 24px));
        height: min(620px, calc(100vh - 110px));
        z-index: 2000;
        display: none;
        flex-direction: column;
        border-radius: 24px;
        border: 1px solid var(--line, rgba(15,23,42,.12));
        background: var(--panel, #fff);
        color: var(--text, #0f172a);
        overflow: hidden;
        box-shadow: 0 18px 50px rgba(2,6,23,.22);
      }
      .skytech-chatbot-panel.open { display: flex; }
      .skytech-chatbot-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1rem 0.85rem;
        border-bottom: 1px solid var(--line, rgba(15,23,42,.12));
        background: var(--panel2, #f1f5f9);
      }
      .skytech-chatbot-title { font-size: 1rem; font-weight: 800; }
      .skytech-chatbot-subtitle { font-size: 0.88rem; opacity: 0.75; margin-top: 0.15rem; }
      .skytech-chatbot-close {
        border: 1px solid var(--line, rgba(15,23,42,.12));
        background: transparent;
        color: inherit;
        border-radius: 999px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        font: inherit;
      }
      .skytech-chatbot-messages {
        flex: 1;
        overflow: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: var(--bg, #f7fafc);
      }
      .skytech-chatbot-message {
        max-width: 85%;
        padding: 0.8rem 0.9rem;
        border-radius: 18px;
        line-height: 1.45;
        white-space: pre-wrap;
      }
      .skytech-chatbot-message.assistant {
        align-self: flex-start;
        background: var(--panel2, #f1f5f9);
        border: 1px solid var(--line, rgba(15,23,42,.12));
      }
      .skytech-chatbot-message.user {
        align-self: flex-end;
        background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(34,197,94,.12));
        border: 1px solid var(--line, rgba(15,23,42,.12));
      }
      .skytech-chatbot-links {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.45rem;
      }
      .skytech-chatbot-links a {
        text-decoration: none;
        border: 1px solid var(--line, rgba(15,23,42,.12));
        border-radius: 999px;
        padding: 0.35rem 0.65rem;
        font-size: 0.85rem;
      }
      .skytech-chatbot-form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.6rem;
        padding: 0.9rem;
        border-top: 1px solid var(--line, rgba(15,23,42,.12));
        background: var(--panel, #fff);
      }
      .skytech-chatbot-input {
        width: 100%;
        border: 1px solid var(--line, rgba(15,23,42,.12));
        border-radius: 16px;
        background: var(--input-bg, rgba(255,255,255,.85));
        color: inherit;
        padding: 0.8rem 0.9rem;
        font: inherit;
      }
      .skytech-chatbot-send {
        border: 1px solid var(--line, rgba(15,23,42,.12));
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(34,197,94,.12));
        color: inherit;
        font: inherit;
        font-weight: 700;
        padding: 0.8rem 1rem;
        cursor: pointer;
      }
      .skytech-chatbot-send[disabled] { opacity: 0.6; cursor: wait; }
    `;
    document.head.appendChild(style);
  }

  function createUI() {
    injectStyles();

    const launcher = document.createElement('button');
    launcher.className = 'skytech-chatbot-launcher';
    launcher.type = 'button';
    launcher.textContent = 'Chat with SkyTech';

    const panel = document.createElement('section');
    panel.className = 'skytech-chatbot-panel';
    panel.setAttribute('aria-label', 'SkyTech chatbot');

    panel.innerHTML = `
      <div class="skytech-chatbot-head">
        <div>
          <div class="skytech-chatbot-title">SkyTech Assistant</div>
          <div class="skytech-chatbot-subtitle">Real AI chat for sales and support</div>
        </div>
        <button class="skytech-chatbot-close" type="button" aria-label="Close chat">×</button>
      </div>
      <div class="skytech-chatbot-messages" aria-live="polite"></div>
      <form class="skytech-chatbot-form">
        <input class="skytech-chatbot-input" name="message" placeholder="Ask about drones, repairs, rentals..." autocomplete="off" />
        <button class="skytech-chatbot-send" type="submit">Send</button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.skytech-chatbot-close');
    const messagesEl = panel.querySelector('.skytech-chatbot-messages');
    const form = panel.querySelector('.skytech-chatbot-form');
    const input = panel.querySelector('.skytech-chatbot-input');
    const sendBtn = panel.querySelector('.skytech-chatbot-send');

    function renderMessages() {
      messagesEl.innerHTML = '';
      state.messages.forEach((message, index) => {
        const div = document.createElement('div');
        div.className = `skytech-chatbot-message ${message.role}`;
        div.textContent = message.content;

        if (message.role === 'assistant' && index === 0) {
          const links = document.createElement('div');
          links.className = 'skytech-chatbot-links';
          links.innerHTML = `
            <a href="purchase.html">Buy a drone</a>
            <a href="contact.html">Contact support</a>
          `;
          div.appendChild(links);
        }

        messagesEl.appendChild(div);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setOpen(open) {
      state.open = open;
      panel.classList.toggle('open', open);
      if (open) window.setTimeout(() => input.focus(), 50);
    }

    async function submitMessage(text) {
      const trimmed = text.trim();
      if (!trimmed || state.loading) return;

      state.loading = true;
      sendBtn.disabled = true;
      input.disabled = true;

      state.messages.push({ role: 'user', content: trimmed });
      renderMessages();

      try {
        const response = await fetch(CHAT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: state.messages })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || data?.error || 'Request failed');

        state.messages.push({ role: 'assistant', content: data.reply || 'Sorry, no reply was returned.' });
      } catch (error) {
        state.messages.push({
          role: 'assistant',
          content: 'I could not reach the AI service right now. Please try again in a moment, or use the contact page for help.'
        });
        console.error(error);
      } finally {
        state.loading = false;
        sendBtn.disabled = false;
        input.disabled = false;
        input.value = '';
        renderMessages();
      }
    }

    launcher.addEventListener('click', () => setOpen(!state.open));
    closeBtn.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitMessage(input.value);
    });

    renderMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }
})();
