var exec = require("child_process").exec;

export async function stopContainer(containerName: string) {
  return await new Promise((resolve, reject) => {
    exec(`docker stop ${containerName}`, (err, stdout, stderr) => {
      const error = err || stderr;
      if (error) reject(error);

      resolve(stdout);
    });
  });
}
