import { StatusCodes } from "http-status-codes";

import { uploadMetadataSchema, uploadListQuerySchema } from "./uploads.schema";
import {
  createUpload,
  getUploadById,
  listUploadsByChapter,
  validatePdfAndExtractPageCount,
} from "./uploads.service";

import { catchAsync } from "@/lib/catchAsync";
import { ApiError } from "@/lib/apiError";
import { sendResponse } from "@/lib/sendResponse";

export const createUploadHandler = catchAsync(async (req, res) => {
  const authUser = res.locals.authUser;
  if (!authUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const metadata = uploadMetadataSchema.parse(req.body);
  const file = req.file;

  if (!file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A PDF file is required for upload");
  }

  const pageCount = validatePdfAndExtractPageCount(file);

  const upload = await createUpload({
    metadata,
    file,
    pageCount,
    authUser,
  });

  return sendResponse(res, StatusCodes.CREATED, {
    success: true,
    message: "Upload received and rasterization queued",
    data: upload,
  });
});

export const getUploadHandler = catchAsync(async (req, res) => {
  const { uploadId } = req.params;
  const upload = await getUploadById(uploadId);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    data: upload,
  });
});

export const listUploadsHandler = catchAsync(async (req, res) => {
  const query = uploadListQuerySchema.parse(req.query);
  const uploads = await listUploadsByChapter(query);

  return sendResponse(res, StatusCodes.OK, {
    success: true,
    data: { uploads },
  });
});

