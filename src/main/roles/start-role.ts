var exec = require("child_process").exec;

export async function startContainer(containerName: string) {
  return await new Promise((resolve, reject) => {
    exec(`docker start ${containerName}`, (err, stdout, stderr) => {
      const error = err || stderr;
      if (error) reject(error);

      resolve(stdout);
    });
  });
}
