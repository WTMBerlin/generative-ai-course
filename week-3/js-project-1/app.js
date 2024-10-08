const express = require('express')
const dotenv = require('dotenv')
const axios = require('axios')
const fs = require('fs')
const pdf = require('pdf-parse')
const path = require('path')

dotenv.config()
const app = express()
app.use(express.static('public'))
app.use(express.json())

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

let pdfContent = ''
const pdfPath = path.join(__dirname, 'public', 'source.pdf')

fs.readFile(pdfPath, (err, data) => {
  if (err) {
    console.error('Error reading PDF:', err)
    return
  }
  pdf(data)
    .then(parsedData => {
      pdfContent = parsedData.text
    })
    .catch(err => console.error('Error parsing PDF:', err))
})

async function queryOpenAI(question) {
  try {
    const prompt = `Use the following text to answer the user's question: "${pdfContent}"\n\nQuestion: ${question}\nAnswer:`

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )

    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error querying OpenAI API:', error)
    return 'Error retrieving the answer.'
  }
}

app.post('/ask', async (req, res) => {
  const { question } = req.body
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' })
  }
  const answer = await queryOpenAI(question)
  res.json({ answer })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
