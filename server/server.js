// LLM API platform
    // https://platform.openai.com/
    // https://platform.deepseek.com/usage 

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import chat from "./chat.js";
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
        const files = await fs.readdir(uploadsFolder);
        for(const file of files){
            console.log(`(server.js->clearBeforeUpload) deleting file: ${file}...`);
            await fs.unlink(path.join(uploadsFolder, file));
        }
    } catch(e){
        console.error();
    }

    next(); // move onto next function, if no next(), then request hangs indefinitely
};

app.post("/upload", clearBeforeUpload, upload.single("file"), async(req, res) => {
    // sends json format key-value pair { filePath (key) : req.file.path (value) }
    res.json({ filePath : req.file.path });
});

// backend expects POST request
app.post("/chat", express.json(), async(req, res)=>{
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
    
    // Handle question from URL parameter (from Postman)
    // e.g. http://localhost:5001/chat?question='Does this student reveal his aura through his writing?'
    const urlQuestion = req.query.question; // comes from Postman or Url requests
    const bodyQuestion = req.body?.message; // comes from frontend POST requests with JSON body { message: "..." }
    const finalQuestion = urlQuestion || bodyQuestion;

    const filePath = req.body?.filePath;
    
    if (!finalQuestion) {
        return res.status(400).send("Missing Question!");
    }

    try {
        const { LLM_response, highlight_text } = await chat(filePath, finalQuestion);
        console.log(`(server.js) finished waiting for chat response`);
        return res.json({
            LLM_response: LLM_response,      // LLM response used in ChatComponents
            highlight_text: highlight_text
        });
    } catch (error) {
        console.error("Chat Error:", error);
        return res.status(500).send("Error processing the request");
    }
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});