## Poem Generation and Voice Over Application
This is a Node.js application that generates a poem using OpenAI gpt-4o-mini model and performs a voice-over of the generated poem using the ElevenLabs text-to-speech API.
### Features
- Generate a poem based on 5 user-provided words.
- Perform a voice-over of the generated poem using ElevenLabs.
- Play the generated voice-over in the browser.
### Installation
- Clone the repository:
```
git clone https://github.com/HilalKocak/gen-ai.git
```
- Go to the project directory:
```
cd week-2/js-project-1
```
- Install dependencies
```
npm install
```
- Create a .env file then add your OpenAI API key and ElevenLabs API key:
```
OPENAI_API_KEY= your_openai_api_key
ELEVENLABS_API_KEY = your_elevenlabs_api_key
```
- Go to [elevenlabs voice lab](https://elevenlabs.io/app/voice-lab), upload sylviaplath.mp3 (or any other audio file of your choice) and obtain VOICE_ID. Replace the VOICE_ID in app.js with the one you obtained.
- Start the server:
```
node app.js
```