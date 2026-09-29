// src/parsers/graphParser.js

function parseGraphPayload(payload) {
  if (!payload || !payload.nodes || !payload.edges) {
    throw new Error("Invalid graph JSON structure: missing 'nodes' or 'edges' array.");
  }

  // Validate nodes
  for (const node of payload.nodes) {
    if (!node.id || !node.type) {
      throw new Error(`Invalid node found: Each node must have an 'id' and 'type'.`);
    }
  }

  // Validate edges
  for (const edge of payload.edges) {
    if (!edge.source || !edge.target) {
      throw new Error(`Invalid edge found: Each edge must have a 'source' and 'target'.`);
    }
  }

  return {
    nodeCount: payload.nodes.length,
    edgeCount: payload.edges.length,
    nodes: payload.nodes,
    edges: payload.edges,
    parsedAt: new Date().toISOString()
  };
}

module.exports = { parseGraphPayload };