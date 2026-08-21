import { S3Storage } from "coze-coding-dev-sdk";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

/**
 * 获取文件的签名URL
 */
export async function getSignedUrl(key: string, expireTime = 3600): Promise<string> {
  return storage.generatePresignedUrl({ key, expireTime });
}

/**
 * 下载文件内容
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const url = await getSignedUrl(key);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { storage };
