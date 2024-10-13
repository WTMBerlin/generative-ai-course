## Weather Bot Assistant

This project is a simple weather assistant built using the OpenAI GPT-4 model with function calling capabilities. The assistant provides answers to weather-related questions, specifically the current temperature and the probability of rain for a given location. This assistant uses custom functions (getCurrentTemperature and getRainProbability) to simulate fetching weather data.

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-1/js-project-3-function-calling-weather-bot
```

- Install dependencies

```
npm install
```

- Create a .env file and add your OpenAI API key::

```
OPENAI_API_KEY=your_openai_api_key
```

- Start the server:

```
node server.js
```
