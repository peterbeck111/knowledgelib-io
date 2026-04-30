// Input:  tasks = ["a","b","c","d"], deps = [["a","b"],["a","c"],["b","d"]]
// Output: ["a", "b", "c", "d"] or ["a", "c", "b", "d"]
// deps format: [prerequisite, dependent] -- prerequisite must come before dependent

function buildOrder(tasks, deps) {
  const adj = new Map();
  const inDeg = new Map();
  for (const t of tasks) { adj.set(t, []); inDeg.set(t, 0); }

  for (const [pre, dep] of deps) {
    adj.get(pre).push(dep);
    inDeg.set(dep, inDeg.get(dep) + 1);
  }

  const queue = tasks.filter(t => inDeg.get(t) === 0);
  const order = [];
  let i = 0;

  while (i < queue.length) {
    const node = queue[i++];
    order.push(node);
    for (const neighbor of adj.get(node)) {
      inDeg.set(neighbor, inDeg.get(neighbor) - 1);
      if (inDeg.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  if (order.length !== tasks.length) throw new Error("Cycle detected");
  return order;
}
