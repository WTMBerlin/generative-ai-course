from flask import Flask, request, jsonify, send_from_directory
import os
import openai
from werkzeug.utils import secure_filename
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


openai.api_key = os.getenv('OPENAI_API_KEY')

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/upload-audio', methods=['POST'])
def upload_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(audio_path)

        try:
            with open(audio_path, 'rb') as audio_file:
                transcription = openai.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
                )

            transcript_text = transcription.text
            print('Transcribed text:', transcript_text)

            response = openai.images.generate(
                prompt=transcript_text,
                n=1,
                size='1024x1024',
                model='dall-e-3',        
                response_format='url'    
            )

            image_url = response.data[0].url
            print('Generated image URL:', image_url)
            os.remove(audio_path)  

            return jsonify({'imageUrl': image_url})

        except Exception as e:
            print('Error processing audio or generating image:', e)
            return jsonify({'error': 'Failed to process audio or generate image.'}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('public', filename)

if __name__ == '__main__':
    app.run(port=3000, debug=True)
