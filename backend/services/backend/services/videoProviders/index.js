const openaiVideoProvider =
  require("./openaiVideoProvider");

const providers = {
  openai: openaiVideoProvider
};

function getVideoProvider() {

  const providerName =
    process.env.VIDORA_VIDEO_PROVIDER ||
    "openai";

  const provider =
    providers[providerName];

  if (!provider) {

    throw new Error(
      `Video provider "${providerName}" is not supported.`
    );

  }

  return provider;
}

module.exports = {
  getVideoProvider
};