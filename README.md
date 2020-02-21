# S3 Helper

This module allows you to:
1. Automatically detect AWS credentials.
2. Upload a local directory to S3.

## Automatically Detecting AWS Credentails

### Simplest usage:
```
const AWS = require('aws-sdk')
const { detectAwsCredentials } = require('@muhfuhcaw/s3h')

const credentials = detectAwsCredentials(AWS) // This returns a genuine AWS.Credentials instance.
const s3Client = new AWS.S3({
  region: 'us-west-2',
  credentials // Use your credentials the same way you always have.
})
```

By default this function respects the presence of Amazon's standard `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables and will use those credentials if they exist and are populated. Failing that, the function falls back to reading `~/.aws/credentials` by instantiating a genuine `AWS.SharedIniFileCredentials` object which respects all of the standard environment variables you already know and love (like `AWS_PROFILE`, etc).

## Uploading A Directory

### Simplest Usage:
```
const AWS = require('aws-sdk')
const { uploadDirectory } = require('@muhfuhcaw/s3h')

const s3Client = new AWS.S3() // You'll need to specify a bucket name and credentials of course.
await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/')
```

### Checking For Failures:
```
try {
  await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/')
} catch (failures) {
  // Handle failures...
}
```

The `failures` parameter looks like this:
```
failures = {
  './local/dir/failed/upload': <Exception caught during upload attempt>,
  ...
}
```

### Options

You can pass an options object to uploadDirectory. The following keys and values are supported:
- `maximumConcurrentUploads: <number>` The maximum number of files that can be uploading at the same time.

### Example Using Options
```
const AWS = require('aws-sdk')
const { uploadDirectory } = require('@muhfuhcaw/s3e')

const options = {
  maximumConcurrentUploads: 3, // Defaults to 5
}

const s3Client = new AWS.S3()

// Allows up to three simultaneous uploads at any given time until uploading is complete.
await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/', options)
```
