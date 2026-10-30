export type QrImageAsset = {
  uri: string;
  fileName: string;
  exportImage: () => Promise<void>;
  dispose: () => void;
};

export function createQrImage(bytes: Uint8Array, token: string): QrImageAsset {
  const fileName = `fridiet-qr-${token}.png`;
  const uri = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
  let disposed = false;
  return {
    uri,
    fileName,
    exportImage: async () => {
      if (disposed) throw new Error("QR을 다시 생성해 주세요.");
      const link = document.createElement("a");
      link.href = uri;
      link.download = fileName;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      URL.revokeObjectURL(uri);
    },
  };
}
