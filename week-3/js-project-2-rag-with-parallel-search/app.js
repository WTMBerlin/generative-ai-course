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

const extractCategoriesFromText = async text => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You extract information from resumes and return them in a structured JSON format.',
      },
      {
        role: 'user',
        content: `Extract or predict the following information from the given resume text:
- Roles: the roles held by the individual (e.g., Software Engineer, Project Manager).
- Skills: the technical skills possessed by the individual (e.g., Java, Python, Project Management).
- Seniority: extract or predict the seniority level from experience, technologies, etc. (e.g., Junior, Mid-level, Senior, or years of experience).
- Industry: the industry/industries related to the experience (e.g., IT, Finance, Healthcare).

Resume:
${text}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'resume_extraction_schema',
        schema: {
          type: 'object',
          properties: {
            roles: {
              description: 'Roles held by the individual',
              type: 'array',
              items: { type: 'string' },
            },
            skills: {
              description: 'Technical skills of the individual',
              type: 'array',
              items: { type: 'string' },
            },
            seniority: {
              description: 'Seniority level',
              type: 'array',
              items: { type: 'string' },
            },
            industry: {
              description: 'Related industries',
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['roles', 'skills', 'seniority', 'industry'],
          additionalProperties: false,
        },
      },
    },
  })

  const extractedData = JSON.parse(response.choices[0].message.content)
  console.log('extractedData', extractedData)
  return extractedData
}

const generateCategoryEmbeddings = async categories => {
  const embeddings = {}

  for (const [category, text] of Object.entries(categories)) {
    const response = await openai.embeddings.create({
      input: text.join(', '),
      model: 'text-embedding-ada-002',
    })
    embeddings[category] = response.data[0].embedding
  }
  return embeddings
}

const parseCSVFile = (csvPath, columns) => {
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
    const categories = await extractCategoriesFromText(text.resume)
    const categoryEmbeddings = await generateCategoryEmbeddings(categories)

    for (const [category, embedding] of Object.entries(categoryEmbeddings)) {
      await index.upsert([
        {
          id: `text_${text.id}_${category}`,
          values: embedding,
          metadata: { id: text.id, resume: text.resume, content: categories[category].join(', '), category },
        },
      ])
    }
  }
  console.log('Embeddings generated and stored in Pinecone.')
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

app.post('/query', async (req, res) => {
  const { queryText } = req.body
  try {
    const extractedCategories = await extractCategoriesFromText(queryText)
    const queryEmbeddings = await generateCategoryEmbeddings(extractedCategories)
    const categories = ['roles', 'skills', 'seniority', 'industry']

    const candidateScores = {}
    for (const category of categories) {
      const queryEmbedding = queryEmbeddings[category]
      const results = await index.query({
        vector: queryEmbedding,
        topK: 10,
        includeMetadata: true,
        filter: { category },
      })

      results.matches.forEach(match => {
        candidateScores[match.metadata.id] = candidateScores[match.metadata.id] || {
          id: match.metadata.id,
          score: 0,
          resume: match.metadata.resume,
        }

        candidateScores[match.metadata.id].score += match.score
      })
    }

    const topCandidates = Object.values(candidateScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    console.log(`Found ${topCandidates.length} top candidates.`)
    console.log(
      `Ordered by score: ${topCandidates.map(candidate => `ID: ${candidate.id}, Score: ${candidate.score}`).join('\n')}`
    )

    if (topCandidates.length === 0) {
      return res.json({
        status: 'notfound',
        message: 'No relevant matches found.',
      })
    }

    const detailedResponse = await generateResponse(queryText, topCandidates)
    console.log('detailedResponse', detailedResponse)
    return res.json({
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
