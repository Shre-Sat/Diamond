/** Static export so the dashboard can be served next to the DIAMOND daemon. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
module.exports = {
  output: 'export', basePath, trailingSlash: true, images: { unoptimized: true },
  generateBuildId: async () => process.env.BUILD_ID || 'diamond-' + Date.now().toString(36),
};
