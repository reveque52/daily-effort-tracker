((global) => {
  "use strict";

  const COLLECTIONS = Object.freeze(["entries", "tasks", "people", "jiraItems", "reminders"]);
  const records = new Map(COLLECTIONS.map((name) => [name, []]));
  let changeHandler = null;
  let suspendDepth = 0;

  function clone(value) {
    if (typeof global.structuredClone === "function") return global.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function assertCollection(name) {
    if (!COLLECTIONS.includes(name)) throw new Error(`Bilinmeyen bulut koleksiyonu: ${name}`);
  }

  function read(name) {
    assertCollection(name);
    return clone(records.get(name));
  }

  function write(name, nextRows) {
    assertCollection(name);
    if (!Array.isArray(nextRows)) throw new Error(`${name} koleksiyonu dizi olmalıdır.`);
    const previousRows = records.get(name);
    const normalizedRows = clone(nextRows);
    records.set(name, normalizedRows);
    if (suspendDepth || typeof changeHandler !== "function") return;

    const previousById = new Map(previousRows.map((row) => [String(row?.id || ""), row]));
    const nextById = new Map(normalizedRows.map((row) => [String(row?.id || ""), row]));
    const upserts = normalizedRows.filter((row) => {
      const previous = previousById.get(String(row?.id || ""));
      return !previous || JSON.stringify(previous) !== JSON.stringify(row);
    });
    const deletedIds = previousRows
      .map((row) => String(row?.id || ""))
      .filter((id) => id && !nextById.has(id));
    if (upserts.length || deletedIds.length) {
      changeHandler({ collection: name, upserts: clone(upserts), deletedIds });
    }
  }

  function suspend(callback) {
    suspendDepth += 1;
    try { return callback(); }
    finally { suspendDepth -= 1; }
  }

  function replaceBundle(bundle = {}) {
    return suspend(() => {
      COLLECTIONS.forEach((name) => write(name, Array.isArray(bundle[name]) ? bundle[name] : []));
    });
  }

  function clear() {
    replaceBundle({});
  }

  function setChangeHandler(handler) {
    changeHandler = typeof handler === "function" ? handler : null;
  }

  global.CloudDataRuntime = Object.freeze({ COLLECTIONS, read, write, suspend, replaceBundle, clear, setChangeHandler });
})(window);
