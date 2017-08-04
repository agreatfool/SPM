"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function post(uri, params, callback, handleResponse) {
    return new Promise((resolve, reject) => {
        callback("123", resolve, reject);
    });
}
exports.post = post;
function postForm(uri, params, filePath, callback) {
    return new Promise((resolve, reject) => {
        callback("123", resolve, reject);
    });
}
exports.postForm = postForm;
//# sourceMappingURL=request.js.map