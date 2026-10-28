import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
export function createStore(directory) {
  const dir = resolve(directory),
    file = resolve(dir, "transactions.json");
  let queue = Promise.resolve();
  async function read() {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
  }
  return {
    read: async () => {
      await queue;
      return read();
    },
    add: (transaction) => {
      const task = queue.then(async () => {
        await mkdir(dir, { recursive: true, mode: 0o700 });
        const list = await read();
        if (list.some((t) => t.id === transaction.id)) return false;
        list.push(transaction);
        await writeFile(file + ".tmp", JSON.stringify(list), { mode: 0o600 });
        await rename(file + ".tmp", file);
        return true;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
