# Schoo-AI Chatbot

Chatbot berbasis **Google Gemini** dengan backend **Express** dan respons *streaming* (teks mengalir seperti ChatGPT). Tampilan gelap bergaya editorial dengan objek 3D (Three.js) di layar awal.

## Fitur

- Respons streaming dari Gemini
- Retry otomatis saat server Google sibuk (503)
- Riwayat percakapan agar AI mengingat konteks
- Render markdown ringan (judul, daftar, teks tebal)
- Responsif di desktop dan HP

## Menjalankan di lokal

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
# isi GEMINI_API_KEY di file .env
npm start
```

Buka <http://localhost:3000>.

API key gratis: <https://aistudio.google.com/app/apikey>

## Struktur

```
index.js        server Express + endpoint POST /api/chat
public/         frontend (index.html, style.css, script.js, scene3d.js)
.env.example    contoh konfigurasi
```

## Deploy

GitHub Pages **tidak bisa** menjalankan backend Node.js. Deploy ke layanan yang mendukung Node, misalnya [Render](https://render.com):

1. Push repo ini ke GitHub
2. Render → **New Web Service** → pilih repo
3. Build Command: `npm install`, Start Command: `npm start`
4. Tambahkan Environment Variable `GEMINI_API_KEY`

> API key tidak boleh masuk ke repo. File `.env` sudah ada di `.gitignore`.
