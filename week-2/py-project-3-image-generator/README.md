## Image Generator with Voice

This is a Flask application that allows users to record their voice, transcribe the audio using OpenAI's Whisper API, and generate an image based on the transcribed text using OpenAI's DALL·E API.

### Requirements:

    Python 3.11.5

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-2/py-project-3-image-generator
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
