from flask import Flask, request, jsonify, render_template
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "XB0fDUnXU5powFXDhCwa"
# or use premade voices in elevenlabs like CwhRBWXzGAHq8TQ4Fs17


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate-poetry", methods=["POST"])
def generate_poetry():
    data = request.json
    words = data.get("words")

    if not words or len(words) != 5:
        return jsonify({"error": "Please provide exactly 5 words."}), 400

    prompt = f"Write a poem with two verses that includes the following words: {', '.join(words)}. Each verse should be about 4-6 lines and creatively incorporate the words provided."

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 100,
            },
        )

        response_data = response.json()
        if "choices" in response_data and len(response_data["choices"]) > 0:
            lyrics = response_data["choices"][0]["message"]["content"].strip()
            return jsonify({"lyrics": lyrics})
        else:
            return jsonify({"error": "Invalid response from OpenAI API."}), 500

    except Exception as e:
        print(f"Error generating poetry: {e}")
        return jsonify({"error": "Failed to generate poetry."}), 500


@app.route("/voice-over", methods=["POST"])
def voice_over():
    data = request.json
    lyrics = data.get("lyrics")

    if not lyrics:
        return jsonify({"error": "No lyrics provided."}), 400

    try:
        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "text": lyrics,
                "output_format": "mp3_22050",
                "voice_settings": {
                    "stability": 0.7,
                    "similarity_boost": 0.75,
                    "style": 0.2,
                },
            },
            stream=True,
        )

        if response.status_code != 200:
            return (
                jsonify({"error": f"ElevenLabs API error: {response.text}"}),
                response.status_code,
            )

        file_path = "./static/generated_audio.mp3"
        with open(file_path, "wb") as audio_file:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    audio_file.write(chunk)

        return jsonify({"audioUrl": "/static/generated_audio.mp3"})

    except Exception as e:
        print(f"Error generating voice-over: {e}")
        return jsonify({"error": "Failed to generate voice-over."}), 500


if __name__ == "__main__":
    app.run(port=3000)
