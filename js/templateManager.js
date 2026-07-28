const ShiftTemplateManager = {
  init({ getStoreId, onTemplateChanged }) {
    this.getStoreId = getStoreId;
    this.onTemplateChanged = onTemplateChanged;
    this.fileInput = document.getElementById("templateFileInput");
    this.changeButton = document.getElementById("changeTemplateButton");

    this.changeButton.addEventListener("click", () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener("change", async () => {
      const file = this.fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選んでください。");
        this.fileInput.value = "";
        return;
      }

      const storeId = this.getStoreId();
      if (!storeId) {
        alert("先に店舗を選んでください。");
        this.fileInput.value = "";
        return;
      }

      try {
        const imageData = await ImageUtils.compressTemplate(file);
        TemplateStorage.save(storeId, imageData);
        this.fileInput.value = "";
        this.onTemplateChanged(imageData);
        alert(`${storeId}の背景テンプレートを保存しました。`);
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });
  },

  load(storeId) {
    return TemplateStorage.load(storeId);
  }
};
