## Weather Assistant Using Function Calling

This project is a simple weather assistant built using the OpenAI gpt-4o-mini model with function calling capabilities. The assistant provides answers to weather-related questions, specifically the current temperature and the probability of rain for a given location. This assistant uses custom functions (getCurrentTemperature and getRainProbability) to simulate fetching weather data.

### Requirements:

    Python 3.11.5

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-1/py-project-3-function-calling-weather-bot
```

- Create and activate a virtual environment:

```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

- Install required dependencies:

```
pip install -r requirements.txt
```

Create a .env file and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key
```

- Run the application:

```
python app.py
```
