/**
 * BaseAdapter: templates should extend this and implement save/load logic.
 */
export class BaseAdapter {
  constructor(options = {}) {
    this.options = options;
  }

  // Load editor state or defaults.
  async load() {
    throw new Error('load() not implemented');
  }

  // Save editor state and return at least { gameId }.
  async save() {
    throw new Error('save() not implemented');
  }

  // Optional dirty check so callers can reuse links.
  isDirty() {
    return true;
  }
}





