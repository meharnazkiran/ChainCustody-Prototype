const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

let wallet;
let caClient;

/**
 * Initialize CA client and wallet.
 */
async function initCA() {
  try {
    // Initialize FileSystem Wallet
    wallet = await Wallets.newFileSystemWallet(config.WALLET_PATH);
    console.log(`Fabric Wallet initialized at: ${config.WALLET_PATH}`);
    
    // Load Org1 CA's TLS certificate
    const caTLSCertPath = path.resolve('C:/Users/mages/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem');
    let pem;
    try {
      pem = await fs.readFile(caTLSCertPath, 'utf8');
      console.log('Loaded CA TLS certificate PEM successfully.');
    } catch (err) {
      // Fallback inside WSL or custom relative paths
      pem = await fs.readFile('/mnt/c/Users/mages/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem', 'utf8');
    }

    // Initialize Fabric CA Client using TLS
    const secureCAUrl = config.CA_URL.replace('http:', 'https:');
    console.log(`Connecting to Fabric CA at: ${secureCAUrl}`);
    caClient = new FabricCAServices(secureCAUrl, { trustedRoots: [pem], verify: false }, config.CA_NAME);
    
    // Check if CA socket is open
    const net = require('net');
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(7054, '127.0.0.1', () => {
        socket.end();
        resolve();
      });
      socket.on('error', reject);
      setTimeout(() => { socket.destroy(); reject(new Error('Timeout')); }, 1500);
    });
    console.log('Fabric CA server port is reachable.');
  } catch (error) {
    console.error(`[ERROR] Failed to initialize Fabric CA SDK: ${error.message}. strict-ca-mode active.`);
    throw new Error(`Fabric CA server is offline or unreachable: ${error.message}`);
  }
}

/**
 * Enroll Admin Registrar (required to register users).
 */
async function enrollAdmin() {
  if (!wallet) await initCA();

  const adminExists = await wallet.get('admin');
  if (adminExists) {
    console.log('Admin identity already exists in wallet.');
    return;
  }

  console.log('Enrolling admin registrar with CA...');
  const enrollment = await caClient.enroll({
    enrollmentID: 'admin',
    enrollmentSecret: 'adminpw'
  });

  const x509Identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: 'Org1MSP',
    type: 'X.509',
  };

  await wallet.put('admin', x509Identity);
  console.log('Successfully enrolled admin registrar and saved to wallet.');
}

/**
 * Register a new Officer/Lab with the CA.
 * @param {string} username 
 * @param {string} userRole (e.g. officer, lab)
 * @returns {Promise<string>} Enrollment secret
 */
async function registerUser(username, userRole = 'client') {
  if (!wallet) await initCA();
  await enrollAdmin();

  const assignedRole = (userRole === 'lab' || username.toLowerCase().includes('lab')) ? 'lab' : 'officer';

  const userExists = await wallet.get(username);
  if (userExists) {
    throw new Error(`Identity '${username}' already exists in wallet.`);
  }

  const adminIdentity = await wallet.get('admin');
  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, 'admin');

  const secret = await caClient.register({
    affiliation: 'org1.department1',
    enrollmentID: username,
    role: 'client',
    attrs: [
      { name: 'evidex.role', value: assignedRole, ecert: true }
    ]
  }, adminUser);

  console.log(`Successfully registered user ${username} with CA (Role: ${assignedRole}). Secret generated.`);
  return secret;
}

/**
 * Enroll a registered user to obtain certs and keys.
 * @param {string} username 
 * @param {string} secret 
 */
async function enrollUser(username, secret) {
  if (!wallet) await initCA();

  const enrollment = await caClient.enroll({
    enrollmentID: username,
    enrollmentSecret: secret
  });

  const x509Identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: 'Org1MSP',
    type: 'X.509',
  };

  await wallet.put(username, x509Identity);
  console.log(`Successfully enrolled user ${username} and saved to wallet.`);
  return x509Identity;
}

/**
 * Verify if an identity is enrolled in the wallet.
 * @param {string} username 
 * @returns {Promise<boolean>}
 */
async function isEnrolled(username) {
  if (!wallet) await initCA();
  const identity = await wallet.get(username);
  return !!identity;
}

module.exports = {
  initCA,
  enrollAdmin,
  registerUser,
  enrollUser,
  isEnrolled,
  getWallet: () => wallet,
  isMock: () => false
};
