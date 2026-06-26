# Evidex Blockchain Core - Chain of Custody System

This repository contains the Smart Contract (Go Chaincode) and the REST API Gateway (Node.js/Express) for the Evidex Chain of Custody System.

---

## 🛠️ Prerequisites & System Requirements

To run this network locally, your team members need the following installed:

### Windows Users (Required)
* **WSL2 (Windows Subsystem for Linux)** with an Ubuntu distribution.
* **Docker** installed inside WSL2 (or Docker Desktop with WSL2 integration enabled).

### All Operating Systems (Linux, macOS, WSL2)
* **Go** (v1.20 or higher)
* **Node.js** (v18 or higher) and `npm`
* **jq** (command-line JSON parser)
* **Git** and **curl**

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Start Docker & Setup Socket Permissions (WSL/Linux)
Open your terminal (WSL Ubuntu for Windows) and ensure the Docker socket is accessible:
```bash
# Start the Docker service
sudo service docker start

# Grant permissions to the Docker socket
sudo chmod 666 /var/run/docker.sock
```

### Step 2: Download the Hyperledger Fabric Binaries
In your home directory (e.g., `~/`), run the bootstrap script to download Fabric samples and docker images:
```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh 2.5.4 1.5.7
```

### Step 3: Launch the Test Network
Navigate to the Fabric test network folder and bring up the nodes:
```bash
cd ~/fabric-samples/test-network

# Set the socket path override environment variable (Crucial for WSL2 stability)
export DOCKER_SOCK=/run/docker.sock

# Clean any old container states
./network.sh down

# Bring up the network and create the channel
./network.sh up createChannel -c mychannel -ca
```

### Step 4: Deploy the Go Chaincode (as a Service)
Deploy the contract to the network from your local project repository path:
```bash
# Replace /path/to/your/project/chaincode with the absolute path to your cloned repo's chaincode folder
./network.sh deployCCAAS -ccn evidence -ccp /path/to/your/project/chaincode
```
*Note: Using `deployCCAAS` compiles and runs the Go code directly in a container on the host Docker daemon, making it highly stable on virtualized environments.*

---

## 🌐 Running the REST API Gateway

The Gateway bridges your backend application (Person 2) and the blockchain network.

1. Open a new terminal on your host machine.
2. Navigate to the `gateway` directory in this repository:
   ```bash
   cd gateway
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
The Gateway API will start running at `http://localhost:3000`.

---

## 🧪 REST API Endpoints & Payloads

### 1. Register Evidence
* **Method & URL**: `POST /api/evidence/register`
* **Body**:
  ```json
  {
    "evidenceId": "EVID-992",
    "caseId": "CASE-701",
    "officerId": "Officer_Smith",
    "ipfsCID": "QmXoypizjW3WknFixtdKLw51n7sGdNi419Qx23zFAM2rqk",
    "sha256Hash": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "timestamp": "1719390000"
  }
  ```

### 2. Transfer Custody
* **Method & URL**: `POST /api/evidence/transfer`
* **Body**:
  ```json
  {
    "evidenceId": "EVID-992",
    "fromOrg": "PoliceDept",
    "toOrg": "ForensicsLab",
    "reason": "Chemical testing",
    "timestamp": "1719393600"
  }
  ```

### 3. Verify Integrity (Tampering Check)
* **Method & URL**: `POST /api/evidence/verify`
* **Body**:
  ```json
  {
    "evidenceId": "EVID-992",
    "providedHash": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
  }
  ```

### 4. Fetch Chain of Custody History
* **Method & URL**: `GET /api/evidence/history/:evidenceId`
* **Example**: `GET /api/evidence/history/EVID-992`
