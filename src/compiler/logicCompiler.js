// src/compiler/logicCompiler.js

function compileGraph(nodes, edges) {
  // 1. Map nodes for quick lookup
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, dependencies: [], dependents: [] });
  });

  // 2. Build dependency graph (adjacency list)
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      throw new Error(`Edge references unknown node: ${edge.source} -> ${edge.target}`);
    }

    sourceNode.dependents.push(edge.target);
    targetNode.dependencies.push(edge.source);
  });

  // 3. Simple Topological Sort (Kahn's Algorithm or queue-based)
  const inDegree = new Map();
  nodeMap.forEach((node, id) => {
    inDegree.set(id, node.dependencies.length);
  });

  const queue = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  const executionOrder = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    executionOrder.push(currentId);

    const currentNode = nodeMap.get(currentId);
    currentNode.dependents.forEach(dependentId => {
      inDegree.set(dependentId, inDegree.get(dependentId) - 1);
      if (inDegree.get(dependentId) === 0) {
        queue.push(dependentId);
      }
    });
  }

  // Check for cycles (deadlocks in the workflow)
  if (executionOrder.length !== nodes.length) {
    throw new Error("Compilation Error: Cyclic dependency detected in the graph workflow.");
  }

  return {
    compiledSuccessfully: true,
    totalSteps: executionOrder.length,
    executionPlan: executionOrder,
    compiledAt: new Date().toISOString()
  };
}

module.exports = { compileGraph };