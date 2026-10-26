// Keep e2e runs hermetic: answer the Cloudflare Web Analytics beacon locally (empty module) so tests never call the third-party
// script or send test page views from localhost to the real dashboard (cloudflareinsights.com rejects the localhost origin anyway).
module.exports = async function stubAnalytics(ctx) {
  await ctx.route(/cloudflareinsights\.com/, r => r.fulfill({ status: /beacon\.min\.js/.test(r.request().url()) ? 200 : 204,
    contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: '' }));
};
