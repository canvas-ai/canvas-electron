let context = {}

console.log('content-script.js | Initializing content script')
console.log(store)

/*
browser.runtime.sendMessage({ action: 'get:context' }, (ctx) => {
    console.log(`Content script | Context: "${JSON.stringify(ctx, null, 2)}"`)
    context = ctx;
});
*/
