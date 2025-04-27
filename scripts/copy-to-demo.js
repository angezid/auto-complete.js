const fs = require('fs');

const files = ['auto-complete.js', 'auto-complete.css'],
    sourceDir = 'dist/',
    destDir = 'demo/static/';

try {
    files.forEach((name) => {
        const path = sourceDir + name,
            destPath = destDir + name;
        
        fs.copyFile(path, destPath, () => {}, fs.constants.COPYFILE_FICLONE);
        console.log(path + ' was copied to ' + destPath);
    }); 

} catch(e) {
    console.log(e);
}
