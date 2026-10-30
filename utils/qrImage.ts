import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export type QrImageAsset = {
  uri: string;
  fileName: string;
  exportImage: () => Promise<void>;
  dispose: () => void;
};

export function createQrImage(bytes: Uint8Array, token: string): QrImageAsset {
  const fileName = `fridiet-qr-${token}.png`;
  const file = new File(Paths.cache, fileName);
  let disposed = false;
  let sharing = false;
  const removeFile = () => {
    try {
      if (file.exists) file.delete();
    } catch {
      // The OS can evict cache files independently of this screen.
    }
  };
  try {
    file.write(bytes);
  } catch (error) {
    removeFile();
    throw error;
  }
  return {
    uri: file.uri,
    fileName,
    exportImage: async () => {
      if (disposed) throw new Error("QR을 다시 생성해 주세요.");
      sharing = true;
      try {
        if (!await Sharing.isAvailableAsync()) {
          throw new Error("이 기기에서는 파일 공유를 지원하지 않아요. 웹에서 QR을 다운로드해 주세요.");
        }
        await Sharing.shareAsync(file.uri, {
          mimeType: "image/png",
          UTI: "public.png",
          dialogTitle: "용기 QR 저장·공유",
        });
      } finally {
        sharing = false;
        if (disposed) removeFile();
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (!sharing) removeFile();
    },
  };
}
