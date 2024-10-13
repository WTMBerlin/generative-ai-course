## Poem Generation and Voice Over Application

This is a Flask (Python) based web application that generates a poem based on 5 user-provided words using the OpenAI gpt-4o-mini model and performs a voice-over of the generated poem using ElevenLabs' text-to-speech API.

### Requirements:

    Python 3.11.5

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-2/py-project-1-poetry-vocalizer
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
ELEVENLABS_API_KEY = your_elevenlabs_api_key
```

- Go to [elevenlabs voice lab](https://elevenlabs.io/app/voice-lab), upload sylviaplath.mp3 (or any other audio file of your choice) and obtain VOICE_ID. Replace the VOICE_ID in app.py with the one you obtained.
- Run the application:

```
python app.py
```
