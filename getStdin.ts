export default function getStdin() {
  return new Promise<string>(resolve => {
    let stdinText = '';

    process.stdin.on('data', chunk => {
      if (chunk !== null) {
        stdinText += chunk;
      }
    });

    process.stdin.on('end', () => resolve(stdinText));
  });
}
