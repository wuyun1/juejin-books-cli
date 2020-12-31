const fs = require("fs");
const path = require("path");

const installFile = path.join(__dirname, 'lib/install-chrome.js');
if(fs.existsSync(installFile)) {
    require(installFile).download();
}