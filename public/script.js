const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-chat');
const welcomeCard = document.getElementById('welcome-card');
const clockEl = document.getElementById('clock');

// Jam di sidebar
function updateClock() {
  clockEl.textContent = new Date()
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    .replace('.', ':');
}
updateClock();
setInterval(updateClock, 30000);

// Riwayat percakapan untuk konteks memori Gemini
let conversationHistory = [];
let isLoading = false;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (message && !isLoading) sendMessage(message);
});

// Pertanyaan cepat di layar awal
document.querySelectorAll('.prompt').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt && !isLoading) sendMessage(prompt);
  });
});

// Obrolan baru
clearBtn.addEventListener('click', () => {
  if (isLoading) return;
  conversationHistory = [];
  chatBox.querySelectorAll('.entry').forEach((el) => el.remove());
  welcomeCard.style.display = '';
  document.body.classList.remove('chatting');
  input.focus();
});

async function sendMessage(userText) {
  welcomeCard.style.display = 'none';
  document.body.classList.add('chatting');

  appendEntry('user', userText);
  input.value = '';
  conversationHistory.push({ role: 'user', text: userText });

  const { body } = appendEntry('bot', '');
  body.innerHTML = '<span class="caret"></span>';

  setLoading(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: conversationHistory })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(errData.error ?? `HTTP ${response.status}`));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fullReply += decoder.decode(value, { stream: true });
      body.innerHTML = renderMarkdown(fullReply);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    conversationHistory.push({ role: 'model', text: fullReply });
  } catch (error) {
    // Pesan gagal tidak boleh masuk riwayat agar request berikutnya tetap valid
    conversationHistory.pop();
    body.innerHTML = friendlyError(error.message);
  } finally {
    setLoading(false);
  }
}

function friendlyError(message) {
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return '<p class="notice">Kuota API gratis sedang habis. Coba lagi beberapa saat lagi.</p>';
  }
  if (/503|UNAVAILABLE|high demand/i.test(message)) {
    return '<p class="notice">Server Google sedang padat. Coba kirim ulang beberapa detik lagi.</p>';
  }
  return `<p class="notice">Terjadi kesalahan: ${escapeHtml(message)}</p>`;
}

// Satu entri pesan: label pengirim + waktu + isi
function appendEntry(sender, text) {
  const entry = document.createElement('article');
  entry.className = `entry ${sender}`;

  const meta = document.createElement('header');
  meta.className = 'entry-meta';

  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = sender === 'user' ? 'Kamu' : 'Schoo-AI';

  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  meta.append(who, time);

  const body = document.createElement('div');
  body.className = 'entry-body';
  if (text) body.textContent = text;

  entry.append(meta, body);
  chatBox.appendChild(entry);
  chatBox.scrollTop = chatBox.scrollHeight;

  return { entry, body };
}

// Markdown ringan: heading, daftar, tebal, miring, kode, garis pemisah
function renderMarkdown(src) {
  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');

  const lines = escapeHtml(src).split('\n');
  let html = '';
  let list = null;
  let para = [];

  const flushPara = () => {
    if (para.length) html += `<p>${inline(para.join('<br>'))}</p>`;
    para = [];
  };
  const closeList = () => {
    if (list) html += `</${list}>`;
    list = null;
  };
  const openList = (type) => {
    if (list !== type) {
      closeList();
      html += `<${type}>`;
      list = type;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;

    if (!line.trim()) { flushPara(); closeList(); continue; }
    if (/^-{3,}$/.test(line.trim())) { flushPara(); closeList(); html += '<hr>'; continue; }

    if ((m = line.match(/^#{1,4}\s+(.*)$/))) {
      flushPara(); closeList();
      html += `<h4>${inline(m[1])}</h4>`;
      continue;
    }
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      flushPara(); openList('ul');
      html += `<li>${inline(m[1])}</li>`;
      continue;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara(); openList('ol');
      html += `<li>${inline(m[1])}</li>`;
      continue;
    }

    closeList();
    para.push(line);
  }
  flushPara();
  closeList();

  return html || '<span class="caret"></span>';
}

// Escape HTML agar aman dari XSS
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setLoading(state) {
  isLoading = state;
  input.disabled = state;
  sendBtn.disabled = state;
  if (!state) input.focus();
}
