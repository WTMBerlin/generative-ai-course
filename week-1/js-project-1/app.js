const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');
const pdf = require('pdf-parse');

dotenv.config();
const app = express();
app.use(express.static('public'));
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
};

let assistantId = null;
let threadId = null;
let pdfContent = '';

const upload = multer({ dest: 'uploads/' });

async function createAssistant() {
    try {
        const assistantResponse = await axios.post('https://api.openai.com/v1/assistants', {
            name: "File-based Assistant",
            description: "This assistant answers questions based on the uploaded file.",
            model: "gpt-4-1106-preview"  
        }, { headers });

        assistantId = assistantResponse.data.id;
        console.log(`Assistant Created with ID: ${assistantId}`);
    } catch (error) {
        console.error("Error creating assistant:", error.response ? error.response.data : error.message);
    }
}

async function uploadFile(filePath) {
    try {
        const form = new FormData();
        form.append('purpose', 'assistants');
        form.append('file', fs.createReadStream(filePath));

        const fileResponse = await axios.post('https://api.openai.com/v1/files', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        console.log('File Uploaded:', fileResponse.data);
        return fileResponse.data.id;
    } catch (error) {
        console.error("Error uploading file:", error.response ? error.response.data : error.message);
    }
}

async function createThread() {
    try {
        if (!threadId) {
            const threadResponse = await axios.post('https://api.openai.com/v1/threads', {}, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            });

            threadId = threadResponse.data.id;
            console.log('Thread Created:', threadId);
        }
        return threadId;
    } catch (error) {
        console.error("Error creating thread:", error.response ? error.response.data : error.message);
    }
}

async function addMessageToThread(question) {
    try {
        const messageResponse = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            role: 'user',
            content: question
        }, { headers });

        console.log('Message added to thread:', messageResponse.data);
        return messageResponse.data;
    } catch (error) {
        console.error("Error adding message to thread:", error.response ? error.response.data : error.message);
    }
}

async function runAssistantAndWaitForCompletion() {
    try {
        const runResponse = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            assistant_id: assistantId
        }, { headers });

        console.log('Assistant Run Started:', runResponse.data);
        const runId = runResponse.data.id;

        let status = 'queued';
        while (status === 'queued' || status === 'in_progress') {  
            const runStatusResponse = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, { headers });
            status = runStatusResponse.data.status;

            console.log(`Current Run Status: ${status}`);
            if (status === 'completed') {
                console.log('Assistant Run Completed');
                return runStatusResponse.data;
            } else if (status === 'failed') {
                throw new Error('Assistant run failed');
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.error("Error running assistant:", error.response ? error.response.data : error.message);
    }
}

async function askQuestion(question) {
    try {
        await createThread();
        console.log(`Thread ID after creation: ${threadId}`);

        const messageResponse = await addMessageToThread(question);
        console.log('Message Response:', messageResponse);

        const runData = await runAssistantAndWaitForCompletion();
        console.log('Run Data:', runData); 

        const messagesResponse = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
        const messages = messagesResponse.data;

        console.log("All Messages in Thread:");
        messages.data.forEach((msg, index) => {
            msg.content.forEach(item => {
                if (item.type === 'text' && item.text && item.text.value) {
                    console.log(`Content Value: ${item.text.value}`);
                }
            });
        });

        const answerMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (answerMessage && Array.isArray(answerMessage.content)) {
            return answerMessage.content.map(item => item.text.value).join(' ');
        } else if (answerMessage && typeof answerMessage.content === 'string') {
            return answerMessage.content;
        } else {
            throw new Error('No assistant message found or message content is not in a valid format');
        }
    } catch (error) {
        console.error("Error asking question:", error.response ? error.response.data : error.message);
    }
}

app.post('/ask', async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question is required.' });
    }

    const answer = await askQuestion(question);
    res.json({ answer });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;

    try {
        const dataBuffer = fs.readFileSync(filePath);
        const parsedData = await pdf(dataBuffer);
        pdfContent = parsedData.text;
        console.log('PDF content parsed:', pdfContent);

        const fileId = await uploadFile(filePath);
        console.log('File uploaded and ready to use:', fileId);

        await createThread();
        
        res.json({ message: "File uploaded successfully and thread created." });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process file.' });
    } finally {
        fs.unlinkSync(filePath);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await createAssistant();
});
