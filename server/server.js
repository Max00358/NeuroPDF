// LLM API platform
    // https://platform.openai.com/
    // https://platform.deepseek.com/usage 

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve("../.env") });

// CORS(cross-origin resource sharing) vs. Proxy
    // CORS: a browser security mechanism that restricts HTTP requests between different domains
        // only use it when you have control over the backend
    // Proxy: a middleman server that forwards requests from FE to BE
        // browser sees the requests as same-origin, avoiding CORS
        // for twitch API, we cannot control backend, hence we use proxy
const app = express();
app.use(cors());

// usually we don't store info on server, but this reduce project complexity
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, "uploads/")
    }, 
    filename: (req, file, cb)=>{
        cb(null, file.originalname)
    }
});

const upload = multer({storage: storage});
const PORT = 5001;

// middleware that executes after post & before upload 
const clearBeforeUpload = async(req, res, next) => {
    const uploadsFolder = path.join(__dirname, "uploads");
    try{
        const items = await fs.readdir(uploadsFolder);

        const removalPromises = items.map(item => {
            const itemPath = path.join(uploadsFolder, item);
            console.log(`(server.js->clearBeforeUpload) deleting: ${itemPath}`);

            return fs.rm(itemPath, { recursive: true, force: true });
        });

        const complete = await Promise.all(removalPromises);
        console.log(`(server.js->clearBeforeUpload) Deletoin completed.`);
    } catch(error){
        if (error.code === 'ENOENT') {
            console.log(`(server.js->clearBeforeUpload) Directory ${uploadsFolder} does not exist.`);
        }
        else{
            console.error(`(server.js->clearBeforeUpload) Error clearing directory ${uploadsFolder}:`, error);
        }
    }

    next(); // move onto next function, if no next(), then request hangs indefinitely
};

app.post("/upload", clearBeforeUpload, upload.single("file"), async(req, res) => {
    // sends json format key-value pair { filePath (key) : req.file.path (value) }
    res.json({ filePath : req.file.path });
});

// expose the uploaded PDF onto express 5001 port so that react-pdf can see it
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});