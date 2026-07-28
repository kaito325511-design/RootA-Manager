  const ShiftImageGenerator = {
  lastDataUrl: null,

  async generate({ templateData, casts, storeName, dateValue }) {
    if (!templateData) {
      throw new Error("先に背景テンプレートを設定してください。");
    }

    if (!casts.length) {
      throw new Error("画像に入れるキャストを選択してください。");
    }

    const background = await ImageUtils.loadImage(templateData);
    const canvas = document.createElement("canvas");

    canvas.width = background.naturalWidth || background.width;
    canvas.height = background.naturalHeight || background.height;

    const context = canvas.getContext("2d");
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    const slots = this.getSlots(canvas.width, canvas.height);
    const selectedCasts = casts.slice(0, 6);

    for (let index = 0; index < selectedCasts.length; index += 1) {
      const cast = selectedCasts[index];
      const slot = slots[index];

      await this.drawCast(context, cast, slot, canvas.width);
    }

    this.lastDataUrl = canvas.toDataURL("image/png");
    return this.lastDataUrl;
  },

  getSlots(width, height) {
    const scaleX = width / 1024;
    const scaleY = height / 1536;

    const positions = [
  { x: 58,  y: 438, width: 268, height: 390 },
  { x: 379, y: 438, width: 268, height: 390 },
  { x: 699, y: 438, width: 268, height: 390 },

  { x: 58,  y: 939, width: 268, height: 399 },
  { x: 379, y: 939, width: 268, height: 399 },
  { x: 699, y: 939, width: 268, height: 399 }
];

    return positions.map((slot) => ({
      x: slot.x * scaleX,
      y: slot.y * scaleY,
      width: slot.width * scaleX,
      height: slot.height * scaleY
    }));
  },

  async drawCast(context, cast, slot, canvasWidth) {
    const labelHeight = slot.height * 0.16;

    context.save();

    context.beginPath();
    context.rect(slot.x, slot.y, slot.width, slot.height);
    context.clip();

    if (cast.photo_data) {
      const image = await ImageUtils.loadImage(cast.photo_data);

      ImageUtils.drawCover(context, image, slot.x, slot.y, slot.width, slot.height, 0.38);
    } else {
      context.fillStyle = "rgba(15, 15, 20, 0.96)";
      context.fillRect(slot.x, slot.y, slot.width, slot.height);

      context.fillStyle = "rgba(255,255,255,0.6)";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `700 ${Math.max(20, slot.width * 0.09)}px sans-serif`;

      context.fillText(
        "写真なし",
        slot.x + slot.width / 2,
        slot.y + slot.height / 2
      );
    }

    const gradient = context.createLinearGradient(
      0,
      slot.y + slot.height - labelHeight * 1.8,
      0,
      slot.y + slot.height
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.9)");

    context.fillStyle = gradient;

    context.fillRect(
      slot.x,
      slot.y + slot.height - labelHeight * 1.8,
      slot.width,
      labelHeight * 1.8
    );

    context.restore();

    context.save();

    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0,0,0,0.95)";
    context.shadowBlur = 8;

    context.font =
      `800 ${Math.max(24, slot.width * 0.105)}px "Noto Sans JP", sans-serif`;

    this.fillTextFit(
      context,
      cast.name,
      slot.x + slot.width / 2,
      slot.y + slot.height - labelHeight / 2,
      slot.width * 0.88
    );

    context.restore();
  },

  fillTextFit(context, text, x, y, maxWidth) {
    const match = context.font.match(/([\d.]+)px/);
    const originalSize = Number.parseFloat(match?.[1] || "24");

    let size = originalSize;

    while (context.measureText(text).width > maxWidth && size > 14) {
      size -= 2;
      context.font = context.font.replace(/[\d.]+px/, `${size}px`);
    }

    context.fillText(text, x, y);
  },

  download({ storeName, dateValue }) {
    if (!this.lastDataUrl) {
      throw new Error("先に出勤画像を作成してください。");
    }

    const link = document.createElement("a");

    const safeStoreName = String(storeName || "店舗").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    link.href = this.lastDataUrl;
    link.download =
      `${safeStoreName}_出勤画像_${ImageUtils.formatDateForFile(dateValue)}.png`;

    link.click();
  }
};