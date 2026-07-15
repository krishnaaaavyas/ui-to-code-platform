const OpenAI = require("openai");

let client = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2, // enforce retry limits
    });
  }
  return client;
}

module.exports = {
  getOpenAIClient,
};
