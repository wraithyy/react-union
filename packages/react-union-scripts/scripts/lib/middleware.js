const { o, replace, mapObjIndexed, values, map, pipe } = require('ramda');
const { isArray, isString, isFunction } = require('ramda-extension');
const httpProxyMiddleware = require('http-proxy-middleware');

// webpack 4.0 compatible. based on impl from webpack dev-server
const proxyMiddleware = ({ proxy } = {}) => {
	if (!proxy) {
		return [];
	}
	let normalizedConfig = proxy;
	if (!isArray(proxy)) {
		normalizedConfig = pipe(
			mapObjIndexed((target, context) => {
				// for more info see https://github.com/webpack/webpack-dev-server/blob/master/lib/Server.js#L193
				const correctedContext = o(replace(/\/\*$/, ''), replace(/^\*$/, '**'))(context);
				if (isString(target)) {
					return {
						context: correctedContext,
						target,
					};
				} else {
					return {
						...target,
						context: correctedContext,
					};
				}
			}),
			values
		)(proxy);
	}
	return map(config => {
		const proxyConfig = isFunction(config) ? config() : config;
		return httpProxyMiddleware(proxyConfig.context, proxyConfig);
	}, normalizedConfig);
};

const responseCaptureMiddleware = (req, res, next) => {
	// HACK: Because browserSync only uses Connect and not Express or any other framework,
	// we need to gather the response body ourselves. Because `res.end` is called under the hood
	// to send the response to the client, we intercept the call and instead use `forceEnd`
	// in the SSR server middleware instead.
	if (req.url === '/') {
		res.body = '';
		res.forceEnd = res.end;
		res.end = data => {
			res.body += data;
			next();
		};
	}

	next();
};

module.exports = { proxyMiddleware, responseCaptureMiddleware };