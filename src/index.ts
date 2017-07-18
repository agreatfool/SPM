import App from "./lib/App";

// App Start
let app = new App();
app.init()
    .then(() => {
        app.start();
    })
    .catch((err) => {
        console.log(err.message);
    });