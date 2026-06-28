const config = require('../config');

/**
 * Initialize fabricService - check if Gateway API is reachable.
 */
async function initFabric() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/all`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Fabric Gateway returned status: ${response.status}`);
    }
    console.log(`Successfully connected to Blockchain Gateway at: ${config.REST_GATEWAY_URL}`);

    // Seed the AI ACL on the live ledger (idempotent — chaincode skips duplicates)
    try {
      await fetch(`${config.REST_GATEWAY_URL}/api/ai/manage-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: 'DCP_Rajesh', action: 'add' })
      });
      await fetch(`${config.REST_GATEWAY_URL}/api/ai/manage-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: 'SP_Ananya', action: 'add' })
      });
      console.log('Sentinel AI: Seeded authorized officers on ledger ACL.');
    } catch (e) {
      console.warn('Sentinel AI: Could not seed ACL on live ledger (non-critical).');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Blockchain Gateway is offline or unreachable: ${error.message}`);
  }
}

/**
 * Call gateway to register new evidence on chain.
 */
async function registerEvidence(evidenceId, caseId, officerId, ipfsCID, sha256Hash, timestamp) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidenceId, caseId, officerId, ipfsCID, sha256Hash, timestamp })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register evidence');
  }
  return data;
}

/**
 * Call gateway to transfer custody of an evidence item.
 */
async function transferCustody(evidenceId, fromOrg, toOrg, reason, timestamp) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidenceId, fromOrg, toOrg, reason, timestamp })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to transfer custody');
  }
  return data;
}

/**
 * Call gateway to verify evidence integrity.
 */
async function verifyIntegrity(evidenceId, providedHash) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidenceId, providedHash })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify integrity');
  }
  return data;
}

/**
 * Call gateway to fetch evidence history.
 */
async function getEvidenceHistory(evidenceId) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/history/${evidenceId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve evidence history');
  }
  return data;
}

/**
 * Check if an officer is authorized to use the AI analytics layer.
 */
async function checkAIAccess(officerId) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/ai/check-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check AI access');
  }
  return data.authorized;
}

/**
 * Add or remove an officer from the AI access list.
 */
async function manageAIAccess(officerId, action) {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/ai/manage-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, action })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to manage AI access');
  }
  return data;
}

/**
 * Fetch all evidence records from the ledger for AI context building.
 */
async function getAllEvidence() {
  const response = await fetch(`${config.REST_GATEWAY_URL}/api/evidence/all`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get all evidence');
  }
  return data.evidence || [];
}

/**
 * Fetch all custody histories for AI analysis.
 */
async function getAllHistories() {
  const allEvidence = await getAllEvidence();
  const histories = {};

  for (const evidence of allEvidence) {
    try {
      const historyData = await getEvidenceHistory(evidence.evidenceId);
      histories[evidence.evidenceId] = historyData.history || [];
    } catch (e) {
      histories[evidence.evidenceId] = [];
    }
  }

  return histories;
}

module.exports = {
  initFabric,
  registerEvidence,
  transferCustody,
  verifyIntegrity,
  getEvidenceHistory,
  checkAIAccess,
  manageAIAccess,
  getAllEvidence,
  getAllHistories,
  isMockLedger: () => false
};
