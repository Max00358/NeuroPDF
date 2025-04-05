// LLM API platform
    // https://platform.openai.com/
    // https://platform.deepseek.com/usage 

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import chat from "./chat.js";
import path from "path";

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

app.post("/upload", upload.single("file"), async(req, res) => {
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
        const response = await chat(filePath, finalQuestion);
        return res.json(response);
    } catch (error) {
        console.error("Chat Error:", error);
        return res.status(500).send("Error processing the request");
    }
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});