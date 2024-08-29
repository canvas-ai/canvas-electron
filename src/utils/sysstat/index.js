// pidusage | https://www.npmjs.com/package/pidusage
// Test
const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
console.log(`RSS: ${rss}, Heap Total: ${heapTotal}, Heap Used: ${heapUsed}, External: ${external}`);


