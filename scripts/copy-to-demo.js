const fs = require('fs');

const file = 'dist/auto-complete.js',
    destFile = 'demo/static/auto-complete.js';

try {
    fs.copyFile(file, destFile, () => {}, fs.constants.COPYFILE_FICLONE);
    console.log(file + ' was copied to ' + destFile);
} catch(e) {
    console.log(e);
}
