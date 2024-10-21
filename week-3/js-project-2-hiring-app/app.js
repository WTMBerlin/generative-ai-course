import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import csv from 'csv-parser'
import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
dotenv.config()
import OpenAI from 'openai'

const app = express()
const port = process.env.PORT || 3000

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})
const indexName = 'index3'
const pinecone_host = process.env.PINECONE_HOST
const index = pinecone.Index(indexName, pinecone_host)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const generateEmbedding = async text => {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-ada-002',
  })
  return response.data[0].embedding
}

const generateResponseFromChunks = async (chunks, userQuery, context) => {
  const combinedText = chunks.map(chunk => chunk.metadata.text).join('\n')

  const prompt = `
    You are an AI assistant. Based on the following resume information and previous context,
    provide the top candidates for the role '${userQuery}'. The candidates should match based on experience, skills, and relevant category.

    Previous context: ${context}

    Here is the resume data:\n${combinedText}

    Response:
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant providing detailed responses based on given resume data.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 500,
  })

  return response.choices[0].message.content
}

const parseCSVFile = (csvPath, columns) => {
  return new Promise((resolve, reject) => {
    const data = new Set()
    let count = 0

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', row => {
        count++
        if (count % 45 === 0) {
          const text = columns.map(col => `${col}: ${row[col]}`).join('. ')
          data.add(text)
        }
      })
      .on('end', () => {
        resolve(Array.from(data))
      })
      .on('error', err => {
        reject(err)
      })
  })
}

const storeEmbeddingsInPinecone = async texts => {
  const embeddings = []
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]
    const embedding = await generateEmbedding(text)
    embeddings.push(embedding)
    await index.upsert([
      {
        id: `text_${i + 1}`,
        values: embedding,
        metadata: { text },
      },
    ])
  }
  console.log('Embeddings generated and stored in Pinecone.')

  console.log('First 3 Embeddings:')
  for (let i = 0; i < Math.min(3, embeddings.length); i++) {
    console.log(`Embedding ${i + 1}:`, embeddings[i])
  }
}

app.post('/generate-embeddings', async (req, res) => {
  const csvPath = path.join(__dirname, 'public', 'Resume.csv')
  const columns = ['Category', 'Resume']
  try {
    const data = await parseCSVFile(csvPath, columns)
    await storeEmbeddingsInPinecone(data)
    res.send('Embeddings generated and stored in Pinecone.')
  } catch (error) {
    console.error('Error generating embeddings:', error)
    res.status(500).send('Error generating embeddings.')
  }
})

app.post('/query', async (req, res) => {
  const { queryText } = req.body
  let context = ''
  try {
    const queryEmbedding = await generateEmbedding(queryText)
    const results = await index.query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true,
    })

    const scoreThreshold = 0.75
    const filteredMatches = results.matches.filter(match => match.score > scoreThreshold)

    if (filteredMatches.length > 0) {
      filteredMatches.forEach((match, idx) => {
        console.log(`Result ${idx + 1}:`)
        console.log(`Score: ${match.score}`)
      })

      const detailedResponse = await generateResponseFromChunks(filteredMatches, queryText, context)
      context += `\nUser query: ${queryText}\nResponse: ${detailedResponse}\n`

      res.json({
        status: 'success',
        candidates: filteredMatches.map(match => ({
          id: match.id,
          score: match.score,
          text: match.metadata.text,
        })),
        detailedResponse,
      })
    } else {
      res.json({
        status: 'notfound',
        message: 'No relevant matches found.',
      })
    }
  } catch (error) {
    console.error('Error querying Pinecone:', error)
    res.status(500).send('Error querying Pinecone.')
  }
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
