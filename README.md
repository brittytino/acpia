# ACPIA (Advanced Child Protection Intelligence Agency)

ACPIA is a production-ready, intelligence-grade forensic platform designed to bridge the gap between citizen reporting and law enforcement investigation. 

Built on the core principle that **"AI never becomes the evidence; AI produces intelligence about the evidence,"** the platform separates immutable evidence storage from recomputable AI analysis.

---

## 🏗 System Architecture

ACPIA consists of three main microservices:

1. **ACPIA SEAL (Citizen Portal)**: A highly sensitive, public-facing Next.js portal where civilians report exploitation material securely. It generates cryptographic SHA-256 fingerprints upon upload.
2. **ACPIA Police Console**: A high-density, forensic intelligence Next.js dashboard used by law enforcement to analyze AI-flagged leads, temporal events, and entity correlations.
3. **Backend Intelligence Pipeline**: A Python FastAPI backend running a hash-linked chain-of-custody ledger, local RAG/Embeddings via PostgreSQL `pgvector`, and Contradiction/Dispute engines.

## 🚀 Quick Start (Docker / Production)

The fastest and most reliable way to run ACPIA on an Ubuntu VPS or Azure Linux VM is using Docker Compose.

### Prerequisites
* Docker & Docker Compose
* PostgreSQL 15+ (if running outside of Docker)

### Deployment

1. Clone the repository and configure your environment:
```bash
git clone https://github.com/organization/acpia.git
cd acpia
cp .env.example .env
# Edit .env with your specific deployment keys
```

2. Start the full multi-tier application in detached mode:
```bash
docker-compose up -d --build
```

### Accessing the Portals
Once the containers are running, you can access:
* **Police Console:** `http://<your-server-ip>:47804` (Demo credentials: `investigator1` / `password123`)
* **SEAL Public App:** `http://<your-server-ip>:47803`
* **FastAPI Backend / Swagger Docs:** `http://<your-server-ip>:47802/docs`

## 🔄 CI/CD & Automated Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically redeploys the application to your Azure Virtual Machine whenever code is pushed to the `main` branch.

To enable this, add the following **Repository Secrets** in your GitHub settings (`Settings` > `Secrets and variables` > `Actions`):
* `AZURE_VM_IP`: The public IP address of your Azure VM.
* `AZURE_VM_USERNAME`: The SSH username (e.g., `azureuser`).
* `AZURE_VM_SSH_KEY`: The private SSH key (`.pem` or `id_rsa`) to access the VM.

## 🛠 Tech Stack

* **Backend:** Python 3.11, FastAPI, Uvicorn, SQLAlchemy
* **Frontend:** Next.js 14, React 18, Tailwind CSS
* **Database:** PostgreSQL with `pgvector` extension
* **Forensic Security:** Ed25519 Signatures, SHA-256 Hashing, Append-only Ledger

## 📖 Contributing

We welcome contributions! Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for branching strategies, code formatting guidelines, and pull request workflows.

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
