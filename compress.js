const { Worker, isMainThread, parentPort } = require('worker_threads');
const WorkDoneSignal = 'WorkDone';
const StoppedSignal = 'WorkerStopped';
if (isMainThread) {
  const workingDirectory = process.cwd();
  if (process.argv.length < 3 || process.argv[2] === undefined) {
    console.error('Project not defined');
    return;
  }

  const { resolve, extname } = require('path');
  const fs = require('fs');
  const { readdir } = fs.promises;
  const zlib = require('zlib');

  async function* getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* getFiles(res);
      } else {
        yield res;
      }
    }
  }

  const typesToCompress = [
    'text/html',
    'text/css',
    'text/xml',
    'text/javascript',
    'application/x-javascript',
    'application/xml',
    'image/svg+xml',
  ];

  const extensionsToCompress = [
    '.js',
    '.html',
    '.css',
    '.svg',
    '.json',
    '.xml',
  ];
  let totalOriginalSize = 0;
  let totalBrrSize = 0;
  let totalGzSize = 0;
  let totalFiles = 0;
  const files = [];
  (async () => {
    const FileType = await import('file-type');
    for (let i = 2; i < process.argv.length; i++) {
      const startingDirectory = process.argv[i];
      for await (const file of getFiles(
        resolve(workingDirectory + '/' + startingDirectory),
      )) {
        if (
          file &&
          (extensionsToCompress.includes(extname(file)) ||
            typesToCompress.includes(await FileType.fileTypeFromFile(file).ext))
        ) {
          files.push(file);
        }
      }
    }

    // console.log(files);

    // create pool of workers
    const os = require('os');
    const poolSize = os.cpus().length - 1;
    const pool = [];
    let stopped = 0;
    // create workers
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(__filename);
      pool.push(worker);
      worker.addListener('message', (e) => {
        if (e === StoppedSignal) {
          stopped++;
          if (stopped === poolSize) {
            console.log();
            console.log('Done Compressing files');
            console.log('total files compressed:' + totalFiles);
            console.log('total original size:' + totalOriginalSize);
            console.log(
              'total br size:' +
                totalBrrSize +
                ' (' +
                (100 - (totalBrrSize / totalOriginalSize) * 100).toFixed(2) +
                '% of original)',
            );
            console.log(
              'total gz size:' +
                totalGzSize +
                ' (' +
                (100 - (totalGzSize / totalOriginalSize) * 100).toFixed(2) +
                '%  of original)',
            );
          }
        } else {
          totalFiles++;
          totalOriginalSize = totalOriginalSize + e.originalSize;
          totalBrrSize = totalBrrSize + e.brotliSize;
          totalGzSize = totalGzSize + e.gzipSize;
        }
      });
    }

    // send work to workers
    for (let i = 0; i < files.length; i++) {
      const n = files[i];
      const worker = pool[i % poolSize];
      worker.postMessage(n);
    }

    // signal workers there is no more work
    for (const worker of pool) {
      worker.postMessage(WorkDoneSignal);
    }
  })();
} else {
  const fs = require('fs');
  const zlib = require('zlib');
  parentPort.addListener('message', async (event) => {
    // signal that there is no further work to be done, terminate worker
    if (event === WorkDoneSignal) {
      parentPort.close();
    } else {
      const file = event;
      const fileStats = fs.statSync(event);
      let brotliSize;
      let gzipSize;
      if (!fileStats.size) {
        console.log('File is empty skipping compression');
      } else {
        const zip = zlib.createGzip({
          chunkSize: 32 * 1024,
          level: 9,
        });

        const brotli = zlib.createBrotliCompress({
          chunkSize: 32 * 1024,
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          },
        });
        const fileContents = fs.createReadStream(file);
        await Promise.allSettled([
          new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(file + '.br');
            fileContents
              .pipe(brotli)
              .on('error', (err) => {
                console.error(err);
                reject(err);
              })
              .pipe(writeStream)
              .on('error', (err) => {
                console.error(err);
                reject(err);
              })
              .on('finish', () => {
                const compressedFileStat = fs.statSync(file + '.br');
                brotliSize = compressedFileStat.size;
                console.log('Written to ' + file + '.br');
                resolve();
              });
          }),
          new Promise((resolve, reject) => {
            // gzip
            const writeStream = fs.createWriteStream(file + '.gz');

            fileContents
              .pipe(zip)
              .on('error', (err) => {
                console.error(err);
                reject(err);
              })
              .pipe(writeStream)
              .on('error', (err) => {
                console.error(err);
                reject(err);
              })
              .on('finish', () => {
                const compressedFileStat = fs.statSync(file + '.gz');
                gzipSize = compressedFileStat.size;
                console.log('Written to ' + file + '.gz');
                resolve();
              });
          }),
        ]);
      }

      parentPort.postMessage({
        originalSize: fileStats.size,
        brotliSize: brotliSize,
        gzipSize: gzipSize,
      });
    }
  });
}
