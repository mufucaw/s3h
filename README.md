# S3 Helper

This module allows you to upload a local directory to S3.

## Uploading A Directory

### Simplest Usage:
```
const AWS = require('aws-sdk')
const { uploadDirectory } = require('s3h')

const s3Client = new AWS.S3() // You'll need to specify a bucket name and credentials of course.
await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/')
```

### Checking For Failures:
```
try {
  await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/')
} catch (error) {
  // error.failures is an object containing every failure that occurred.
}
```

The `failures` property of the error caught looks like this:
```
error.failures = {
  './local/dir/failed/upload': <Exception caught during upload attempt>,
  ...
}
```

### Managing Upload Concurrency

When you pass an options object to uploadDirectory it is directly passed to AWS.SyyputObject() for each uploaded file, except when you want to manage upload concurrency. For that you can add a property to the options object named `maximumConcurrentUploads`. The value is a number indicating the maximum number of uploads you want going at any time while uploading a directory and its files/subdirectories.

### Example Customizing Upload Concurrency
```
const AWS = require('aws-sdk')
const { uploadDirectory } = require('s3h')

const options = {
  maximumConcurrentUploads: 3, // Defaults to 5.
  // All other options are passed directly to AWS.S3.putObject() as-is.
}

const s3Client = new AWS.S3()

// Allows up to three simultaneous uploads at any given time until uploading is complete.
await uploadDirectory(s3Client, './local/dir', 'myBucket', 'uploads/end/up/in/here/', options)
```
