//currently we are not using owner name becauee this is testing
// import multer from "multer";
// import path from "path";

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, "./public/temp");
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
//     }
// });

// export const upload = multer({ 
//     storage, 
//     limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for now
// });
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.resolve("public/temp");

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.random();
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});