import { S3Client, PutObjectCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, UploadPartCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PUBLIC_CLOUDFLARE_ACCOUNT_ID, PUBLIC_R2_ACCESS_KEY_ID, PUBLIC_R2_SECRET_ACCESS_KEY, PUBLIC_R2_BUCKET_NAME } from '$env/static/public';
console.log('PUBLIC_CLOUDFLARE_ACCOUNT_ID:', PUBLIC_CLOUDFLARE_ACCOUNT_ID);
console.log('PUBLIC_R2_ACCESS_KEY_ID:', PUBLIC_R2_ACCESS_KEY_ID);
console.log('PUBLIC_R2_SECRET_ACCESS_KEY:', PUBLIC_R2_SECRET_ACCESS_KEY);
console.log('PUBLIC_R2_BUCKET_NAME:', PUBLIC_R2_BUCKET_NAME);


const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${PUBLIC_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: PUBLIC_R2_ACCESS_KEY_ID,
    secretAccessKey: PUBLIC_R2_SECRET_ACCESS_KEY,
  },
});

export async function initializeMultipartUpload(key: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: PUBLIC_R2_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.UploadId;
}

export async function uploadPart(key: string, uploadId: string, partNumber: number, body: Buffer) {
  const command = new UploadPartCommand({
    Bucket: PUBLIC_R2_BUCKET_NAME,
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
    Bucket: PUBLIC_R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
}

export async function uploadSingleObject(key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: PUBLIC_R2_BUCKET_NAME,
    Key: key,
    Body: body,
  });

  await s3Client.send(command);
}

export async function deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: PUBLIC_R2_BUCKET_NAME,
      Key: key,
    });
  
    await s3Client.send(command);
  }