import "server-only";

const UPLOAD_SESSION_PATTERN = /^[a-z0-9-]{16,80}$/i;

export function isValidUploadSessionId(value: string | null | undefined) {
  return Boolean(value && UPLOAD_SESSION_PATTERN.test(value));
}

export function submissionUploadFolder(uploadSessionId: string) {
  return `motba/submissions/${uploadSessionId}`;
}

export function startProjectUploadFolder(userId: string, uploadSessionId: string) {
  return `motba/start/${userId}/${uploadSessionId}`;
}

export function artistUploadFolder(artistId: string) {
  return `motba/artists/${artistId}`;
}

export function isCloudinaryIdInFolder(
  publicId: string | null | undefined,
  folder: string
) {
  if (!publicId) return true;
  return publicId.startsWith(`${folder}/`);
}

export function assertCloudinaryIdInFolder(
  publicId: string | null | undefined,
  folder: string,
  message: string
) {
  if (!isCloudinaryIdInFolder(publicId, folder)) {
    throw new Error(message);
  }
}
