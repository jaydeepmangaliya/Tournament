# 🎮 LocalEsport - Competitive Gaming & Tournament Platform

A production-ready esports tournament platform engineered for **Free Fire**, **BGMI / PUBG Mobile**, featuring real-time custom room delivery, dynamic slot booking, wallet ledgers, affiliate systems, and full Indian regulatory compliance (Section 194BA 30% TDS, 18+ KYC, Entry 34 State Geo-Blocking).

---

## ⚡ The Standard Docker Deployment Flow

This project is fully containerized with a multi-stage production Docker build.

### 1. First-Time Setup on Server (AWS EC2 / VPS)

```bash
# 1. Clone the repository
git clone https://github.com/jaydeepmangaliya/Tournament.git
cd Tournament

# 2. Configure environment variables
cp BE/.env.example BE/.env
nano BE/.env   # Enter your AWS RDS endpoint, DB password, and Razorpay Live keys

# 3. Import MySQL database schema to AWS RDS
mysql -h <your-rds-endpoint> -P 3306 -u admin -p < BE/schema.sql

# 4. Build and start in background
docker compose up -d --build
```

---

### 2. Daily Continuous Update Flow (Whenever You Push Code)

Whenever you commit and push new updates to GitHub from your laptop, run this on your server:

```bash
# Pull new code and rebuild the container seamlessly
git pull origin main && docker compose up -d --build
```

---

### 3. Essential Docker Server Commands

| Action | Command |
| :--- | :--- |
| **Start & Rebuild in Background** | `docker compose up -d --build` |
| **Stop Platform** | `docker compose down` |
| **View Real-Time Live Server Logs** | `docker compose logs -f app` |
| **Check Container Status** | `docker compose ps` |
| **Restart Platform** | `docker compose restart` |

---

## 🏗️ Architecture & Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Three.js / Vanta.js particles.
* **Backend:** Node.js, Express, `mysql2` connection pool, JSON Web Tokens (JWT), bcrypt.
* **Database:** MySQL 8.0 (Optimized for **Amazon RDS for MySQL** Free Tier / Aurora MySQL).
* **Payments:** Razorpay Gateway with cryptographic SHA256 timing-safe webhook verification.
* **Notifications:** Native Web Push Service Worker (`/sw.js`), Web Audio API chime, and 1-Click WhatsApp Community Broadcaster.

---

## ⚖️ Legal & Regulatory Compliance (India RMG)

1. **Non-Wagering Model (100% Skill-Based):**
   * Protected under Article 19(1)(g) of the Constitution of India and Supreme Court precedents (*State of Bombay v. R.M.D. Chamarbaugwala*, *Dr. K.R. Lakshmanan v. State of Tamil Nadu*).
   * Fixed entry fee with pre-announced, guaranteed prize pools based strictly on in-game performance (kills & placement). Zero spectator or odds-based betting.
2. **State-Specific Geo-Restrictions (Entry 34 State List):**
   * Real-money contests are restricted for residents of **Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, and Sikkim**.
3. **Age & KYC Verification (IT Rules & DPDP Act):**
   * Strictly 18+ adults only.
   * Mandatory PAN card format validation (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`) and state verification before cash withdrawals.
4. **Tax Compliance (Section 194BA Income Tax Act):**
   * Automated **30% TDS** deduction computed on net winnings at the time of withdrawal with transparent audit records.

---

## 🔑 Default Organizer Access

* **Admin Portal URL:** `http://YOUR_SERVER_IP/admin/login`
* **War Room URL:** `http://YOUR_SERVER_IP/admin`

