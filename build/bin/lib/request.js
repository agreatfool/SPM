"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const qs = require("querystring");
function fetch(params, reqOptions) {
    const reqParamsStr = qs.stringify(params);
    return new Promise((resolve, reject) => {
        let req = http.request(reqOptions, (response) => {
            resolve(response);
        });
        req.on('error', (e) => reject(e));
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setHeader('Content-Length', Buffer.byteLength(reqParamsStr, 'utf8').toString());
        req.write(reqParamsStr);
    });
}
exports.fetch = fetch;
//# sourceMappingURL=request.js.map