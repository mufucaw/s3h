/* eslint max-len: 0 */

const mockFs = require('mock-fs');

const {
  recursiveReadDirSync,
  uploadUntilFinished,
  normalizePath,
} = require('../../s3h');

describe('S3 Helper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('recursiveReadDirSync()', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('returns all file paths beneath the starting directory', () => {
      mockFs({
        'test': {
          'file.txt': '',
          'subdir': {
            'file.js': '',
          },
        },
      });

      const results = recursiveReadDirSync('test');
      expect(results).toStrictEqual([
        'test/file.txt',
        'test/subdir/file.js',
      ]);
    });
  });

  describe('uploadUntilFinished()', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('uploads every file path provided', async (done) => {
      mockFs({
        './1': '',
        './2': '',
        './3': '',
        './4': '',
        './5': '',
      });

      let completedUploads = 0;

      const filePaths = ['./1', './2', './3', './4', './5'];

      const s3Client = {
        constructor: jest.fn(),
        putObject: async (uploadOptions, callback) => {
          callback();
          completedUploads++;
          if (completedUploads === 5) {
            done();
          }
        },
      };

      await uploadUntilFinished(s3Client, filePaths, 'bucket', 'remoteDir');
      expect(completedUploads).toBe(5); // Redundant but it feels good, ya know?
    });

    it('respects the maximum number of concurrent uploads', async (done) => {
      mockFs({
        './1': '',
        './2': '',
        './3': '',
        './4': '',
        './5': '',
      });

      let concurrentUploads = 0;
      let highestConcurrentUploads = 0;
      let completedUploads = 0;

      const filePaths = ['./1', './2', './3', './4', './5'];

      const s3Client = {
        constructor: jest.fn(),
        putObject: async (uploadOptions, callback) => {
          concurrentUploads++;
          if (concurrentUploads > highestConcurrentUploads) {
            highestConcurrentUploads = concurrentUploads;
          }
          setTimeout(() => {
            concurrentUploads--;
            completedUploads++;
            callback();
            if (completedUploads >= filePaths.length) {
              done();
            }
          }, 10);
        },
      };

      const options = {
        maximumConcurrentUploads: 2,
      };

      await uploadUntilFinished(s3Client, filePaths, 'bucket', 'remoteDir', options);
      expect(highestConcurrentUploads === options.maximumConcurrentUploads).toBe(true);
    });

    it('rejects and returns all failures if at least one failure occurs', async (done) => {
      mockFs({
        './1': '',
        './2': '',
        './3': '',
        './4': '',
      });

      let completedUploads = 0;

      const filePaths = ['./1', './2', './3', './4'];

      const s3Client = {
        constructor: jest.fn(),
        putObject: async (uploadOptions, callback) => {
          setTimeout(() => {
            completedUploads++;
            if ((completedUploads % 2) == 1) { // Fail odd uploads.
              callback(`failed ${completedUploads}`);
            } else {
              callback();
            }
            if (completedUploads >= filePaths.length) {
              done();
            }
          }, 10);
        },
      };

      try {
        await uploadUntilFinished(s3Client, filePaths, 'bucket', 'remoteDir');
        throw new Error('uploadUntilFinished should have thrown but did not.');
      } catch (failures) {
        expect(failures.length).toBe(2); // Every upload at an odd index failed.
        expect(failures[0]).toEqual(`failed 1`);
        expect(failures[1]).toEqual(`failed 3`);
      }
    });
  });

  describe('normalizePath()', () => {
    it('returns the input without leading or trailing slashes', () => {
      const result = normalizePath('/caw/wac/');
      expect(result).toBe('caw/wac');
    });
  });
});
