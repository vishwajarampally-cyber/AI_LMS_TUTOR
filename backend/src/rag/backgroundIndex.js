import { indexMaterial } from "./indexMaterial.js";

const queue = [];
let draining = false;

async function drainQueue() {
  if (draining) return;
  draining = true;

  while (queue.length) {
    const { material, course } = queue.shift();
    try {
      await indexMaterial({ material, course });
    } catch (error) {
      material.status = "failed";
      material.error = error.message;
      await material.save();
      console.error(`Indexing failed for ${material._id}: ${error.message}`);
    }
  }

  draining = false;
}

/** Index one material at a time to avoid out-of-memory crashes. */
export function scheduleMaterialIndexing(material, course) {
  queue.push({ material, course });
  setImmediate(() => {
    drainQueue().catch((error) => console.error(`Index queue error: ${error.message}`));
  });
}

export function indexingQueueLength() {
  return queue.length + (draining ? 1 : 0);
}
