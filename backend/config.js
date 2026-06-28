require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 4000,
  REST_GATEWAY_URL: process.env.REST_GATEWAY_URL || 'http://127.0.0.1:3000',
  IPFS_RPC_URL: process.env.IPFS_RPC_URL || 'http://127.0.0.1:5001',
  CA_URL: process.env.CA_URL || 'http://127.0.0.1:7054',
  CA_NAME: process.env.CA_NAME || 'ca-org1',
  WALLET_PATH: path.resolve(__dirname, process.env.WALLET_PATH || './wallet'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AI_SESSION_SECRET: process.env.AI_SESSION_SECRET || 'evidex-sentinel-default-secret'
};
