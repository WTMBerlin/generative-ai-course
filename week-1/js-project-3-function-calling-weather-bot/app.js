import OpenAI from 'openai/index.mjs'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
app.use(express.json())

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

let assistantId
let threadId

const initializeAssistant = async () => {
  const assistant = await openai.beta.assistants.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a weather bot. Use the provided functions to answer questions.',
    tools: [
      {
        type: 'function',
        function: {
          name: 'getCurrentTemperature',
          description: 'Get the current temperature for a specific location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g., San Francisco, CA',
              },
              unit: {
                type: 'string',
                enum: ['Celsius', 'Fahrenheit'],
                description: 'The temperature unit to use.',
              },
            },
            required: ['location', 'unit'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getRainProbability',
          description: 'Get the probability of rain for a specific location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g., San Francisco, CA',
              },
            },
            required: ['location'],
          },
        },
      },
    ],
  })

  assistantId = assistant.id
  const thread = await openai.beta.threads.create()
  threadId = thread.id
}

const handleRequiresAction = async run => {
  if (
    run.required_action &&
    run.required_action.submit_tool_outputs &&
    run.required_action.submit_tool_outputs.tool_calls
  ) {
    const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(tool => {
      if (tool.function.name === 'getCurrentTemperature') {
        return {
          tool_call_id: tool.id,
          output: '57', // You can add real API call
        }
      } else if (tool.function.name === 'getRainProbability') {
        return {
          tool_call_id: tool.id,
          output: '0.06', // You can add real API call
        }
      }
    })

    if (toolOutputs.length > 0) {
      run = await openai.beta.threads.runs.submitToolOutputsAndPoll(threadId, run.id, { tool_outputs: toolOutputs })
      console.log('Tool outputs submitted successfully.')
    }
    return handleRunStatus(run)
  }
}

const handleRunStatus = async run => {
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(threadId)
    console.log('messages.data ====> ', messages.data)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant')
    let assistantResponse = ''
    if (assistantMessage?.content?.length > 0) {
      assistantResponse = assistantMessage.content[0].text.value
      console.log('Answer of Assistant:', assistantResponse)
    } else {
      console.log('Answer not found')
    }
    return assistantResponse
  } else if (run.status === 'requires_action') {
    return await handleRequiresAction(run)
  } else {
    console.error('Run did not complete:', run)
  }
}

app.post('/ask', async (req, res) => {
  const { question } = req.body

  if (!question) {
    return res.status(400).json({ error: 'No question provided' })
  }

  try {
    if (!assistantId || !threadId) {
      await initializeAssistant()
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: question,
    })

    let run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    })

    const result = await handleRunStatus(run)

    res.json({
      message: 'Process completed successfully',
      result: result,
    })
  } catch (error) {
    console.error('Error handling question:', error)
    res.status(500).json({ error: 'Failed to process question' })
  }
})

app.listen(3002, () => {
  console.log('Server is running on port 3002')
})
