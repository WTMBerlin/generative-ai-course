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

const generateResponse = async (queryText, topCandidates) => {
  const candidateData = topCandidates.map(candidate => ({
    id: candidate.id,
    resume: candidate.resume,
  }))
  const candidatesJSON = JSON.stringify(candidateData)
  const prompt = `You are a skilled talent recruiter. You have access to the resumes of the top candidates. Provide a brief summary of each candidate's resume to help your client make an informed decision. Don't skip any candidates—talk about all the candidates you are given.
  
Candidates:
  ${candidatesJSON}
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Who are the best candidates for ${queryText}?` },
    ],
    max_tokens: 1000,
  })

  return response.choices[0].message.content
}

const parseCSVFile = csvPath => {
  return new Promise((resolve, reject) => {
    const data = []
    let count = 0

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', row => {
        count++

        if (count % 50 != 0) return

        data.push({
          id: count + 1,
          resume: row.Resume,
        })
      })
      .on('end', () => {
        resolve(data)
      })
      .on('error', reject)
  })
}

const storeEmbeddingsInPinecone = async texts => {
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]
    const embedding = await generateEmbedding(text.resume)
    await index.upsert([
      {
        id: `text_${i + 1}`,
        values: embedding,
        metadata: { id: text.id, resume: text.resume },
      },
    ])
  }
  console.log('Embeddings generated and stored in Pinecone.')
}

app.post('/generate-embeddings', async (req, res) => {
  const csvPath = path.join(__dirname, 'public', 'Resume.csv')
  try {
    const data = await parseCSVFile(csvPath)
    await storeEmbeddingsInPinecone(data)
    res.send('Embeddings generated and stored in Pinecone.')
  } catch (error) {
    console.error('Error generating embeddings:', error)
    res.status(500).send('Error generating embeddings.')
  }
})

app.post('/query', async (req, res) => {
  const { queryText } = req.body
  try {
    const queryEmbedding = await generateEmbedding(queryText)
    const results = await index.query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true,
    })
    const topCandidates = []
    const scoreThreshold = 0.75
    results.matches.forEach(match => {
      if (match.score > scoreThreshold) {
        topCandidates.push({
          id: match.metadata.id,
          score: match.score,
          resume: match.metadata.resume,
        })
      }
    })

    console.log(`Found ${topCandidates.length} top candidates.`)
    console.log(
      `Ordered by score: \n${topCandidates
        .map(candidate => `ID: ${candidate.id}, Score: ${candidate.score}`)
        .join('\n')}`
    )

    if (topCandidates.length === 0) {
      return res.json({
        status: 'notfound',
        message: 'No relevant matches found.',
      })
    }

    const detailedResponse = await generateResponse(queryText, topCandidates)
    res.json({
      status: 'success',
      candidates: topCandidates,
      detailedResponse,
    })
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
