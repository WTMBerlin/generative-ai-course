const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
require('dotenv').config()
const OpenAI = require('openai')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

const app = express()
const port = 3000

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
})
const upload = multer({ storage: storage })

app.use(express.static('public'))
app.use(express.json())

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.post('/upload-audio', upload.single('file'), async (req, res) => {
  const audioPath = req.file.path

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
    })

    const transcriptText = transcription.text
    console.log('Transcribed text:', transcriptText)

    const image = await openai.images.generate({
      prompt: transcriptText,
      n: 1,
      size: '1024x1024',
      model: 'dall-e-3',
      quality: 'standard',
    })

    const imageUrl = image.data[0].url
    console.log('Generated image URL:', imageUrl)
    res.json({ imageUrl })

    fs.unlinkSync(audioPath)
  } catch (error) {
    console.error('Error processing audio or generating image:', error)
    res.status(500).json({ error: 'Failed to process audio or generate image.' })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
