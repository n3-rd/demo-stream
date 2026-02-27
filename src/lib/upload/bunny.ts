import https from 'https';

export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc':
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

export function uploadToBunnyCDN(
  file: File,
  storageZoneName: string,
  accessKey: string,
  region = ''
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const hostname = region || 'storage.bunnycdn.com';
    const options = {
      method: 'PUT',
      hostname,
      path: `/${storageZoneName}/${encodeURIComponent(file.name)}`,
      headers: {
        'AccessKey': accessKey,
        'Content-Type': file.type || getContentType(file.name),
        'Content-Length': file.size
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(`https://${storageZoneName}.b-cdn.net/${encodeURIComponent(file.name)}`);
        } else {
          reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    file.arrayBuffer().then((buffer) => {
      req.write(Buffer.from(buffer));
      req.end();
    }).catch(reject);
  });
}
