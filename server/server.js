import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import chat from "./chat.js";

dotenv.config();

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

let filePath;

app.post("/upload", upload.single("file"), async(req, res) => {
    filePath = req.file.path;
    res.send(filePath + " upload successfully.");
});

app.post("/chat", express.json(), async(req, res)=>{
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
    
    // Handle question from URL parameter (from Postman)
    // e.g. http://localhost:5001/chat?question='Does this student reveal his aura through his writing?'
    const urlQuestion = req.query.question;
    const bodyQuestion = req.body?.message;
    const finalQuestion = urlQuestion || bodyQuestion;
    
    if (!finalQuestion) {
        return res.status(400).send("Missing Question!");
    }

    try {
        const response = await chat(filePath, finalQuestion);
        return res.json(response);
    } catch (error) {
        console.error("Chat Error:", error.message);
        return res.status(500).send("Error processing the request");
    }
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});