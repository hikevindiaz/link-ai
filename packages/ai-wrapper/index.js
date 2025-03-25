const ai = require('ai');
const { formatStreamPart } = require('../app/lib/chat-interface/ai/compatibility');

// Create a proxy that adds formatStreamPart to the ai package
const aiProxy = new Proxy(ai, {
  get(target, prop) {
    if (prop === 'formatStreamPart') {
      return formatStreamPart;
    }
    return target[prop];
  }
});

module.exports = aiProxy; 