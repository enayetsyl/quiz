import multer from "multer";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1
  }
});

