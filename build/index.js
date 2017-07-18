"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const App_1 = require("./lib/App");
// App Start
let app = new App_1.default();
app.init()
    .then(() => {
    app.start();
})
    .catch((err) => {
    console.log(err.message);
});
//# sourceMappingURL=index.js.map