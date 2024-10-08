const express = require('express')
const OpenAI = require('openai')
require('dotenv').config()

const app = express()

const PORT = process.env.PORT || 3000
app.use(express.json())

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
})

app.post('/ask', async (req, res) => {
  const { question } = req.body

  if (!question) {
    return res.status(400).send({ error: 'Please provide a question' })
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: question }],
      max_tokens: 100,
    })

    const answer = response.choices[0].message.content.trim()
    res.status(200).json({ answer })
  } catch (error) {
    console.error(error.response ? error.response.data : error.message)
    res.status(500).send({ error: 'Something went wrong' })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
