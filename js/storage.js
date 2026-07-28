const TemplateStorage = {
  getKey(storeId) {
    return `shift-image-template:${storeId}`;
  },

  save(storeId, imageData) {
    if (!storeId || !imageData) return;
    localStorage.setItem(this.getKey(storeId), imageData);
  },

  load(storeId) {
    if (!storeId) return null;
    return localStorage.getItem(this.getKey(storeId));
  },

  remove(storeId) {
    if (!storeId) return;
    localStorage.removeItem(this.getKey(storeId));
  }
};
