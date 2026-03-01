import { S3Client, PutObjectCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, UploadPartCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } from '$env/static/private';

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function initializeMultipartUpload(key: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.UploadId;
}

export async function uploadPart(key: string, uploadId: string, partNumber: number, body: Buffer) {
  const command = new UploadPartCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  });

  const response = await s3Client.send(command);
  return { ETag: response.ETag, PartNumber: partNumber };
}

export async function completeMultipartUpload(key: string, uploadId: string, parts: { ETag: string, PartNumber: number }[]) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
}

export async function uploadSingleObject(key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
  });

  await s3Client.send(command);
}

export async function deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
  
    await s3Client.send(command);
  }