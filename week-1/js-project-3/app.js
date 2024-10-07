import OpenAI from 'openai'
import express from 'express'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const app = express()
app.use(express.json())
app.use(express.static('public'))

let assistantId = null
let vectorStoreId = null

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: 'File-based Assistant',
    instructions: 'You are an assistant that answers questions based on the uploaded PDF file.',
    model: 'gpt-4-turbo-preview',
    tools: [{ type: 'file_search' }]
  })
  assistantId = assistant.id
  console.log(`Assistant created with ID: ${assistantId}`)
}

async function uploadPDFToVectorStore() {
  const filePath = path.join(process.cwd(), 'worksheet.pdf')

  try {
    const fileData = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants'
    })

    console.log(`File uploaded with ID: ${fileData.id}`)

    let vectorStore = await openai.beta.vectorStores.create({
      name: 'Document Vector Store'
    })

    await openai.beta.vectorStores.files.createAndPoll(vectorStore.id, {
      file_id: fileData.id
    })

    vectorStoreId = vectorStore.id
    console.log(`Vector store created with ID: ${vectorStoreId}`)

    await openai.beta.assistants.update(assistantId, {
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } }
    })
    console.log(`Assistant updated with Vector Store ID: ${vectorStoreId}`)

    return vectorStoreId
  } catch (error) {
    console.error('Error uploading file or creating vector store:', error.message)
  }
}

async function askQuestion(question) {
  try {
    const thread = await openai.beta.threads.create({
      messages: [{ role: 'user', content: question }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      }
    })

    console.log(`Thread created with ID: ${thread.id}`)

    let answerContent = ''
    const stream = openai.beta.threads.runs
      .stream(thread.id, {
        assistant_id: assistantId
      })
      .on('textCreated', () => console.log('assistant >'))
      .on('messageDone', async event => {
        const messageContent = event.content[0].text.value
        console.log(`Answer: ${messageContent}`)
        answerContent = messageContent
      })
      .on('end', () => {
        console.log('Stream ended')
      })
      .on('error', err => {
        console.error('Error during stream:', err.message)
      })

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        if (answerContent) {
          resolve(answerContent)
        } else {
          reject('No answer received.')
        }
      })
    })
  } catch (error) {
    console.error('Error running assistant:', error.message)
    return null
  }
}

app.post('/ask', async (req, res) => {
  const { question } = req.body
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' })
  }

  const answer = await askQuestion(question)
  if (answer) {
    res.json({ answer })
  } else {
    res.status(500).json({ error: 'Failed to retrieve answer.' })
  }
})

app.listen(3005, async () => {
  console.log('Server running on port 3005')
  await createAssistant()
  await uploadPDFToVectorStore()
})
