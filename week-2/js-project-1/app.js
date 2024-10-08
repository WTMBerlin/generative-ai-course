const express = require('express')
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config()
const axios = require('axios')
const app = express()
app.use(express.json())
app.use(express.static('public'))
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const VOICE_ID = 'YOUR_VOICE_ID' // or use premade voices in elevenlabs like CwhRBWXzGAHq8TQ4Fs17

app.post('/generate-song', async (req, res) => {
  const { words } = req.body

  if (!words || words.length !== 5) {
    return res.status(400).json({ error: 'Please provide exactly 5 words.' })
  }

  const prompt = `Write a poem with two verse that includes the following words: ${words.join(', ')}. Each verse should be about 4-6 lines and creatively incorporate the words provided. Do not add additional words like verse except poetry`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }),
    })

    const data = await response.json()
    if (data.choices && data.choices.length > 0) {
      const lyrics = data.choices[0].message.content.trim()
      return res.json({ lyrics })
    } else {
      return res.status(500).json({ error: 'Invalid response from OpenAI API.' })
    }
  } catch (error) {
    console.error('Error generating song:', error)
    return res.status(500).json({ error: 'Failed to generate song.' })
  }
})

app.post('/voice-over', async (req, res) => {
  const { lyrics } = req.body

  if (!lyrics) {
    return res.status(400).json({ error: 'No lyrics provided.' })
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: lyrics,
        output_format: 'mp3_22050',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.75,
          style: 0.2,
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      },
    )

    const filePath = './public/generated_audio.mp3'
    fs.writeFileSync(filePath, response.data)

    console.log('Audio file saved as generated_audio.mp3')
    res.json({ audioUrl: '/generated_audio.mp3' })
  } catch (error) {
    console.error('Error generating voice-over:', error.response ? error.response.data : error.message)
    return res.status(500).json({ error: 'Failed to generate voice-over.' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
