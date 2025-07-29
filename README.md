# 🛡️ Container Security Analyzer

A modern full-stack web app for automated vulnerability analysis of Docker images.
**Scan any container image, compare security profiles, and get actionable vulnerability data—perfect for DevSecOps and portfolio projects.**

## 🚀 Features

- **Scan Any Docker Image:** Enter or select any Docker image and get a full vulnerability report.
- **Severity Prioritization:** Instantly see all critical and high vulnerabilities—never miss what matters.
- **Live Progress Tracking:** Real-time feedback on scan and analysis steps.
- **Comparison Dashboard:** Demo tabs highlight improvements between vulnerable and secure images.
- **Professional UI:** Responsive React + Bootstrap frontend.
- **DevSecOps Ready:** Easily extensible for CI/CD, dynamic scanning.

## 🏗️ Architecture

| Layer         | Technology           | Purpose                        |
|---------------|---------------------|--------------------------------|
| Frontend      | React + Vite        | Interactive UI                 |
| UI Framework  | React-Bootstrap     | Layout/components              |
| Backend API   | Flask, Flask-CORS   | REST API, orchestration, CORS  |
| Scanning      | Trivy               | Docker image vulnerability scans|
| Container     | Docker Engine       | Image pulling/management       |
| Data Format   | JSON                | Result transfer & processing   |

## 📚 How It Works

1. **User Inputs Image:** e.g. `python:3.11` or `nginx:1.21.6-alpine`
2. **Backend Pulls Image:** Flask API uses Docker CLI (requires Docker running).
3. **Trivy Scans Image:** Looks for vulnerabilities (CVEs, exploits).
4. **Results Processed:** Most severe issues always displayed.
5. **Frontend Displays:** UI shows summaries, details, comparisons.

## 🔧 Installation & Setup

### Prerequisites

- Docker (running locally)
- Node.js (v18+)
- Python 3.10+
- [Trivy](https://github.com/aquasecurity/trivy) installed (`trivy --version` works)

### Setup

1. Clone the project
git clone https://github.com/<your-username>/container-security-analyzer.git
cd container-security-analyzer

2. Set up backend
cd api
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors
cd ..
mkdir -p scan-results

3. Set up frontend
cd frontend
npm install

4. Start both servers in separate terminals
Terminal 1 (API backend)
cd api
python3 app.py

Terminal 2 (Frontend)
cd frontend
npm run dev


Then, visit [http://localhost:5173](http://localhost:5173) in your web browser.

## 🖥️ Usage

- **Dynamic Scan**: Enter any Docker image (eg: `nginx:1.21.6-alpine`) and start scan.
- **Demo Tabs**: See built-in comparisons (nginx vulnerable vs. secure, etc).
- **Progress:** Live results update as the scan proceeds.

## ⚠️ Important Notes

- **Docker engine must be running.**
- **Trivy** must be installed and on your `PATH`.
- First scan of a new image may take longer (for pull/cache).

## 🛠️ Customization

- Add to `/api/popular-images` for more quick-scan suggestions.
- Edit vulnerability prioritization logic in `api/app.py` if needed.
- Extend: Add reporting, integrations, or persistent scan history.

## 🤝 Contributing

Pull requests are welcome—please open issues for feature requests or bugs.

## 📄 License

MIT License

## 🙏 Credits

- **Trivy** (Aqua Security): Vulnerability scanning engine
- **Docker**: Container engine
- **React, Flask, Bootstrap**: Modern web stack foundation

---

> **Showcase:**  
> "Scan any Docker image, instantly see critical vulnerabilities, and compare best practices for secure containers—all in a portfolio-ready app."

---

**Built for security professionals, students, and DevSecOps teams.**
