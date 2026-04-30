# B&G Fast Food — Static Demo

This is a small static web demo for "B&G Fast Food" — a local restaurant offering plates, pap, braaied meat, pork, beef and chicken. The project is a single-page static site resembling simple food ordering apps (like Uber Eats) for demonstration and prototyping.

Files
- `index.html` — Main page
- `styles.css` — Styling (black + red theme)
- `app.js` — Menu data, cart logic, DOM interactions

How to run

Open `index.html` in a browser. For a better local development experience you can run a simple static server. In PowerShell you can run:

```powershell
# From the project folder
python -m http.server 8000
# or with PowerShell 5.1
Start-Process "python" -ArgumentList '-m','http.server','8000'
```

Then open http://localhost:8000 in your browser.

Notes & next steps
- This is intentionally static and small. To make it production-ready: add backend API, authentication, persistent orders, proper images, and payment integration.
- I included a clean black & red visual theme and responsive layout.

Enjoy!