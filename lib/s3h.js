const fs = require('fs');
const path = require('path');
const mimeTypes = require('mime-types');

/**
 * Constants.
 */

const DEFAULT_MAXIMUM_CONCURRENT_UPLOADS = 5;

/**
 * Uploads the entire contents of a local directory to an S3 bucket and key
 * starting at the specified path.
 *
 * @param {AWS.S3} s3Client A genuine AWS.S3 instance.
 * @param {string} localDirectory The directory to upload.
 * @param {string} s3Bucket The S3 bucket you will upload to.
 * @param {string} remoteDirectory The "directory" on S3 where files end up.
 * @param {object} options Upload options for AWS.S3.putObject().
 */
async function uploadDirectory(
    s3Client,
    localDirectory,
    s3Bucket,
    remoteDirectory,
    options,
) {
  const originalCwd = process.cwd();
  process.chdir(localDirectory);
  const allFilePaths = recursiveReadDirSync('.');
  const result = await uploadUntilFinished(
      s3Client,
      allFilePaths,
      s3Bucket,
      remoteDirectory,
      options,
  );
  process.chdir(originalCwd);
  return result;
}

/**
 * Recursively reads directory and each subdirectory.
 *
 * @param {string} directory
 * @param {array} allFilePaths Used during recursion to accumulate file paths.
 * @return {array} filePaths
 */
function recursiveReadDirSync(directory, allFilePaths = []) {
  // TODO: This shouldn't be sync, we should run on a callback in case users
  // have massive filesystem heirarchies...
  fs.readdirSync(directory).forEach((fileName) => {
    const filePath = path.join(directory, fileName);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      allFilePaths.push(filePath);
    } else if (stat.isDirectory()) {
      allFilePaths = recursiveReadDirSync(filePath, allFilePaths);
    }
  });

  return allFilePaths;
}

/**
 * Uploads every local file path to S3, managing up to a maximum number of
 * concurrent uploads.
 *
 * Resolves with null upon success but rejects with an error that has a
 * failures property containing all
 * upload failures if at least one error occurred. The resulting object looks
 * like this:
 *
 * failures = {
 *   '/local/file/path': <Error caught when upload failed>,
 *   ...
 * }
 *
 * @param {AWS.S3} s3Client
 * @param {array} filePaths
 * @param {string} s3Bucket
 * @param {string} remoteDirectory
 * @param {object} options
 */
async function uploadUntilFinished(
    s3Client,
    filePaths,
    s3Bucket,
    remoteDirectory,
    options = {},
) {
  const failures = {};
  let uploadsInProgress = 0;
  let maximumConcurrentUploads = DEFAULT_MAXIMUM_CONCURRENT_UPLOADS;
  if ('maximumConcurrentUploads' in options) {
    maximumConcurrentUploads = options.maximumConcurrentUploads;
    delete options.maximumConcurrentUploads;
  }

  return new Promise(async (resolve, reject) => {
    while (filePaths.length > 0 || uploadsInProgress > 0) {
      if (uploadsInProgress < maximumConcurrentUploads &&
        filePaths.length > 0) {
        uploadsInProgress++;
        const filePath = filePaths.pop();
        const s3Key = getS3Key(remoteDirectory, filePath);
        options.Bucket = s3Bucket;
        options.Key = s3Key;
        options.Body = fs.readFileSync(filePath);

        if (!('ContentType' in options)) {
          options.ContentType = mimeTypes.lookup(filePath);
        }

        s3Client.putObject(options, (error) => {
          if (error) {
            failures[filePath] = error;
          }

          uploadsInProgress--;
        });
      }

      await egalitarianSleep(25);
    }

    if (Object.keys(failures).length > 0) {
      const error = new Error('Failed to upload one or more files.');
      error.failures = failures;
      reject(error);
    }

    resolve();
  });
}

/**
 * Concatenates the a remote directory with the file path provided.
 *
 * @param {string} rootDirectory
 * @param {string} filePath
 * @return {string} Full S3 Key that can be uploaded to a bucket.
 */
function getS3Key(rootDirectory, filePath) {
  return `${normalizePath(rootDirectory)}/${normalizePath(filePath)}`;
}

/**
 * Trims slashes from the beginning and end of path.
 *
 * @param {string} path
 * @return {string} Normalized path.
 */
function normalizePath(path) {
  let normalizedPath = path;

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

/**
 * Sleep while yielding CPU.
 *
 * @param {number} ms
 */
async function egalitarianSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  uploadDirectory,
  recursiveReadDirSync,
  uploadUntilFinished,
  normalizePath,
};
