// pidusage | https://www.npmjs.com/package/pidusage
const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
console.log(`RSS: ${rss}, Heap Total: ${heapTotal}, Heap Used: ${heapUsed}, External: ${external}`);


