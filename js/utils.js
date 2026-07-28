const ImageUtils = {
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("ファイルを読み込めませんでした。"));
      reader.readAsDataURL(file);
    });
  },

  async compressTemplate(file) {
    const source = await this.fileToDataUrl(file);
    const image = await this.loadImage(source);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
      image.src = src;
    });
  },

  drawCover(context, image, x, y, width, height, focusY = 0.18) {
  const imgW = image.width;
  const imgH = image.height;

  const scale = Math.max(width / imgW, height / imgH);

  const cropW = width / scale;
  const cropH = height / scale;

  let sourceX = (imgW - cropW) / 2;
  let sourceY = (imgH - cropH) * focusY;

  sourceX = Math.max(0, Math.min(sourceX, imgW - cropW));
  sourceY = Math.max(0, Math.min(sourceY, imgH - cropH));

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropW,
    cropH,
    x,
    y,
    width,
    height
  );
},

  formatDateForFile(dateValue) {
    return String(dateValue || "").replaceAll("-", "");
  }
};
