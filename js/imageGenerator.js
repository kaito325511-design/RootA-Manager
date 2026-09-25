const ShiftImageGenerator = {
  lastDataUrl: null,

  getPaths(storeName) {
    if (storeName === "エクラス") {
      return {
        background: "assets/templates/eclas_background.png?v=2",
        overlay: "assets/templates/eclas_overlay.png?v=2"
      };
    }

    return {
      background: null,
      overlay: null
    };
  },

  async generate({ templateData, casts, storeName, dateValue }) {
    if (!templateData && storeName !== "エクラス") {
      throw new Error("先に背景テンプレートを設定してください。");
    }

    if (!casts.length) {
      throw new Error("画像に入れるキャストを選択してください。");
    }

    const paths = this.getPaths(storeName);

    const backgroundSource =
      paths.background || templateData;

    const overlaySource = paths.overlay;

    const background =
      await ImageUtils.loadImage(backgroundSource);

    const overlay = overlaySource
      ? await ImageUtils.loadImage(overlaySource)
      : null;

    const canvas = document.createElement("canvas");

    canvas.width =
      background.naturalWidth || background.width;

    canvas.height =
      background.naturalHeight || background.height;

    const context = canvas.getContext("2d");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // 1. 背景
    context.drawImage(
      background,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const slots =
      this.getSlots(canvas.width, canvas.height, storeName);

    const selectedCasts = casts.slice(0, 6);

    // 2. 写真だけ描画
    for (
      let index = 0;
      index < selectedCasts.length;
      index += 1
    ) {
      await this.drawCastPhoto(
        context,
        selectedCasts[index],
        slots[index]
      );
    }

    // 3. 装飾を写真より上に描画
    if (overlay) {
      context.drawImage(
        overlay,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    // 4. 名前を最後に描画
    for (
      let index = 0;
      index < selectedCasts.length;
      index += 1
    ) {
      this.drawCastName(
        context,
        selectedCasts[index],
        slots[index],
        storeName
      );
    }

    this.lastDataUrl =
      canvas.toDataURL("image/png");

    return this.lastDataUrl;
  },

  getSlots(width, height, storeName) {
    const scaleX = width / 1024;
    const scaleY = height / 1536;

    if (storeName === "エクラス") {
      const positions = [
        { x: 67,  y: 456, width: 266, height: 341 },
        { x: 394, y: 456, width: 256, height: 341 },
        { x: 696, y: 456, width: 264, height: 341 },

        { x: 67,  y: 909, width: 266, height: 347 },
        { x: 394, y: 909, width: 256, height: 347 },
        { x: 696, y: 909, width: 264, height: 347 }
      ];

      return positions.map((slot) => ({
        x: slot.x * scaleX,
        y: slot.y * scaleY,
        width: slot.width * scaleX,
        height: slot.height * scaleY
      }));
    }

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

  async drawCastPhoto(context, cast, slot) {
    context.save();

    context.beginPath();
    context.rect(
      slot.x,
      slot.y,
      slot.width,
      slot.height
    );
    context.clip();

    if (cast.photo_data) {
      const image =
        await ImageUtils.loadImage(cast.photo_data);

      ImageUtils.drawCover(
        context,
        image,
        slot.x,
        slot.y,
        slot.width,
        slot.height,
        0.05
      );
    } else {
      context.fillStyle = "rgba(15,15,20,0.96)";

      context.fillRect(
        slot.x,
        slot.y,
        slot.width,
        slot.height
      );

      context.fillStyle =
        "rgba(255,255,255,0.6)";

      context.textAlign = "center";
      context.textBaseline = "middle";

      context.font =
        `700 ${Math.max(
          20,
          slot.width * 0.09
        )}px sans-serif`;

      context.fillText(
        "写真なし",
        slot.x + slot.width / 2,
        slot.y + slot.height / 2
      );
    }

    context.restore();
  },

  drawCastName(context, cast, slot, storeName) {
    context.save();

    context.textAlign = "center";
    context.textBaseline = "middle";

    if (storeName === "エクラス") {
      // エクラスのNAMEプレート中央
      const nameX =
        slot.x + slot.width / 2;

      const nameY =
        slot.y + slot.height + slot.height * 0.095;

      context.fillStyle = "#18243a";

      context.shadowColor =
        "rgba(255,255,255,0.85)";

      context.shadowBlur = 2;

      context.font =
        `700 ${Math.max(
          18,
          slot.width * 0.075
        )}px "Noto Sans JP", sans-serif`;

      this.fillTextFit(
        context,
        cast.name || "",
        nameX,
        nameY,
        slot.width * 0.72
      );
    } else {
      const labelHeight =
        slot.height * 0.16;

      context.fillStyle = "#ffffff";

      context.shadowColor =
        "rgba(0,0,0,0.95)";

      context.shadowBlur = 8;

      context.font =
        `800 ${Math.max(
          24,
          slot.width * 0.105
        )}px "Noto Sans JP", sans-serif`;

      this.fillTextFit(
        context,
        cast.name || "",
        slot.x + slot.width / 2,
        slot.y + slot.height - labelHeight / 2,
        slot.width * 0.88
      );
    }

    context.restore();
  },

  fillTextFit(context, text, x, y, maxWidth) {
    text = String(text || "");

    if (!text) return;

    const match =
      context.font.match(/(\d+(?:\.\d+)?)px/);

    const originalSize =
      Number.parseFloat(
        match?.[1] || "24"
      );

    let size = originalSize;

    while (
      context.measureText(text).width > maxWidth &&
      size > 12
    ) {
      size -= 2;

      context.font =
        context.font.replace(
          /(\d+(?:\.\d+)?)px/,
          `${size}px`
        );
    }

    context.fillText(text, x, y);
  },

  download({ storeName, dateValue }) {
    if (!this.lastDataUrl) {
      throw new Error(
        "先に出勤画像を作成してください。"
      );
    }

    const link =
      document.createElement("a");

    const safeStoreName =
      String(storeName || "店舗").replace(
        /[\\/:*?"<>|]/g,
        "-"
      );

    link.href = this.lastDataUrl;

    link.download =
      `${safeStoreName}_${dateValue || "shift"}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
