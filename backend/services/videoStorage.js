const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} = require("@aws-sdk/client-s3");

const storageDir = path.join(
  os.tmpdir(),
  "vidora-videos"
);

function ensureStorageDir() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, {
      recursive: true
    });
  }
}

function getVideoPath(jobId) {
  ensureStorageDir();

  return path.join(
    storageDir,
    `${jobId}.mp4`
  );
}

function getR2Config() {
  const accountId =
    process.env.R2_ACCOUNT_ID;

  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY;

  const bucket =
    process.env.R2_BUCKET_NAME;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket
  ) {
    throw new Error(
      "Cloudflare R2 storage is not fully configured."
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket
  };
}

function getR2Client() {
  const {
    accountId,
    accessKeyId,
    secretAccessKey
  } = getR2Config();

  return new S3Client({
    region: "auto",

    endpoint:
      `https://${accountId}.r2.cloudflarestorage.com`,

    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function getR2VideoKey(jobId) {
  return `videos/${jobId}.mp4`;
}

async function uploadVideo(
  jobId,
  filePath
) {
  if (
    !jobId ||
    !filePath
  ) {
    throw new Error(
      "Job ID and video file path are required."
    );
  }

  if (
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      "Video file does not exist."
    );
  }

  const {
    bucket
  } = getR2Config();

  const client =
    getR2Client();

  const key =
    getR2VideoKey(
      jobId
    );

  const fileStream =
    fs.createReadStream(
      filePath
    );

  const stats =
    fs.statSync(
      filePath
    );

  await client.send(
    new PutObjectCommand({
      Bucket:
        bucket,

      Key:
        key,

      Body:
        fileStream,

      ContentType:
        "video/mp4",

      ContentLength:
        stats.size
    })
  );

  console.log(
    `Uploaded video to R2: ${key}`
  );

  return key;
}

async function videoExists(
  jobId
) {
  const {
    bucket
  } = getR2Config();

  const client =
    getR2Client();

  const key =
    getR2VideoKey(
      jobId
    );

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket:
          bucket,

        Key:
          key
      })
    );

    return true;

  } catch (error) {
    if (
      error.name ===
        "NotFound" ||
      error.$metadata?.httpStatusCode ===
        404
    ) {
      return false;
    }

    throw error;
  }
}

async function downloadStoredVideo(
  jobId,
  outputPath
) {
  if (
    !jobId ||
    !outputPath
  ) {
    throw new Error(
      "Job ID and output path are required."
    );
  }

  const {
    bucket
  } = getR2Config();

  const client =
    getR2Client();

  const key =
    getR2VideoKey(
      jobId
    );

  const response =
    await client.send(
      new GetObjectCommand({
        Bucket:
          bucket,

        Key:
          key
      })
    );

  if (
    !response.Body
  ) {
    throw new Error(
      "Cloudflare R2 returned an empty video response."
    );
  }

  const fileStream =
    fs.createWriteStream(
      outputPath
    );

  await new Promise(
    (
      resolve,
      reject
    ) => {
      response.Body
        .pipe(fileStream)
        .on(
          "finish",
          resolve
        )
        .on(
          "error",
          reject
        );
    }
  );

  return outputPath;
}

async function deleteVideo(
  jobId
) {
  const {
    bucket
  } = getR2Config();

  const client =
    getR2Client();

  const key =
    getR2VideoKey(
      jobId
    );

  await client.send(
    new DeleteObjectCommand({
      Bucket:
        bucket,

      Key:
        key
    })
  );

  console.log(
    `Deleted video from R2: ${key}`
  );
}

module.exports = {
  getVideoPath,
  getR2VideoKey,
  uploadVideo,
  videoExists,
  downloadStoredVideo,
  deleteVideo
};