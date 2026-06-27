/**
 * SIMILARITY SERVICE — Text Vectorization & Link Analysis
 * Provides TF-IDF and Cosine Similarity logic to analyze evidence metadata overlaps.
 */

/**
 * Normalizes and tokenizes evidence metadata fields into semantic tokens.
 */
function getTokens(evidence) {
  const tokens = [];

  if (evidence.caseId) {
    tokens.push(`case:${evidence.caseId.toLowerCase().trim()}`);
  }
  if (evidence.officerId) {
    tokens.push(`officer:${evidence.officerId.toLowerCase().trim()}`);
  }
  if (evidence.fromOrg) {
    tokens.push(`org:${evidence.fromOrg.toLowerCase().trim()}`);
  }
  if (evidence.toOrg) {
    tokens.push(`org:${evidence.toOrg.toLowerCase().trim()}`);
  }
  
  // Split textual fields like location or reason into alphanumeric words
  const textField = [evidence.location, evidence.reason].filter(Boolean).join(' ');
  const words = textField.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2); // Exclude small words
  
  tokens.push(...words);

  return tokens;
}

/**
 * Computes TF-IDF vectors for all documents in the corpus.
 */
function computeTfIdf(corpus) {
  const docTokens = corpus.map(doc => getTokens(doc));
  const numDocs = corpus.length;

  // 1. Calculate Document Frequency (DF)
  const df = {};
  docTokens.forEach(tokens => {
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(token => {
      df[token] = (df[token] || 0) + 1;
    });
  });

  // 2. Calculate Inverse Document Frequency (IDF)
  const idf = {};
  Object.keys(df).forEach(token => {
    // Add 1 to numerator and denominator to avoid division by zero
    idf[token] = Math.log((numDocs + 1) / (df[token] + 1)) + 1;
  });

  // 3. Compute TF-IDF Vectors
  const vectors = docTokens.map((tokens, idx) => {
    const tf = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });

    const vector = {};
    Object.keys(tf).forEach(token => {
      // Normalize TF by dividing by total tokens in the document
      const normalizedTf = tf[token] / tokens.length;
      vector[token] = normalizedTf * idf[token];
    });

    return {
      evidenceId: corpus[idx].evidenceId,
      record: corpus[idx],
      vector
    };
  });

  return { vectors, idf };
}

/**
 * Calculates the Cosine Similarity between two TF-IDF vectors.
 */
function cosineSimilarity(vecA, vecB) {
  const intersection = Object.keys(vecA).filter(token => vecB[token] !== undefined);

  if (intersection.length === 0) return 0;

  // Dot product
  let dotProduct = 0;
  intersection.forEach(token => {
    dotProduct += vecA[token] * vecB[token];
  });

  // Magnitude A
  let magASq = 0;
  Object.values(vecA).forEach(val => { magASq += val * val; });
  const magA = Math.sqrt(magASq);

  // Magnitude B
  let magBSq = 0;
  Object.values(vecB).forEach(val => { magBSq += val * val; });
  const magB = Math.sqrt(magBSq);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

/**
 * Finds top matching evidence files by comparing a target evidence item to the rest of the ledger history.
 */
function findSimilarEvidence(targetId, allEvidence) {
  if (allEvidence.length < 2) return [];

  // Filter out any duplicate target definitions or null entries
  const cleanEvidence = allEvidence.filter(e => e && e.evidenceId);

  // Locate the target record
  const targetRecord = cleanEvidence.find(e => e.evidenceId === targetId);
  if (!targetRecord) return [];

  // Compute TF-IDF weights over the complete corpus
  const { vectors } = computeTfIdf(cleanEvidence);

  const targetVector = vectors.find(v => v.evidenceId === targetId)?.vector;
  if (!targetVector) return [];

  const results = [];

  vectors.forEach(v => {
    if (v.evidenceId === targetId) return; // Skip comparing against itself

    const score = cosineSimilarity(targetVector, v.vector);
    
    // Find overlapping token categories for detailed dashboard explanation
    const targetTokens = getTokens(targetRecord);
    const docTokens = getTokens(v.record);
    const overlappingTokens = targetTokens.filter(t => docTokens.includes(t));

    if (score > 0) {
      results.push({
        evidenceId: v.evidenceId,
        caseId: v.record.caseId,
        score: parseFloat(score.toFixed(4)),
        overlappingKeywords: overlappingTokens.map(t => {
          if (t.startsWith('case:')) return `Case Overlap (${t.split(':')[1].toUpperCase()})`;
          if (t.startsWith('officer:')) return `Same Officer (${t.split(':')[1]})`;
          if (t.startsWith('org:')) return `Custodian Activity (${t.split(':')[1]})`;
          return t;
        }),
        record: v.record
      });
    }
  });

  // Sort descending by similarity score
  return results.sort((a, b) => b.score - a.score);
}

module.exports = {
  findSimilarEvidence
};
