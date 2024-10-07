from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
import os
import requests
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

assistant_id = None
thread_id = None
pdf_content = ''

headers = {
    'Authorization': f'Bearer {OPENAI_API_KEY}',
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
}

def create_assistant():
    global assistant_id
    url = 'https://api.openai.com/v1/assistants'
    data = {
        "name": "File-based Assistant",
        "description": "This assistant answers questions based on the uploaded file.",
        "model": "gpt-4-1106-preview"
    }
    response = requests.post(url, json=data, headers=headers)
    assistant_id = response.json().get('id')
    print(f"Assistant Created with ID: {assistant_id}")

def upload_file(file_path):
    global pdf_content
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            pdf_content += page.extract_text()

def create_thread():
    global thread_id
    url = 'https://api.openai.com/v1/threads'
    response = requests.post(url, headers=headers)
    thread_id = response.json().get('id')
    print(f"Thread Created with ID: {thread_id}")

def add_message_to_thread(question):
    url = f'https://api.openai.com/v1/threads/{thread_id}/messages'
    data = {
        "role": "user",
        "content": question
    }
    response = requests.post(url, json=data, headers=headers)
    print(f"Message added to thread: {response.json()}")

def run_assistant():
    url = f'https://api.openai.com/v1/threads/{thread_id}/runs'
    data = {
        "assistant_id": assistant_id
    }
    response = requests.post(url, json=data, headers=headers)
    print(f"Assistant Run Started: {response.json()}")

def ask_question(question):
    create_thread()
    add_message_to_thread(question)
    run_assistant()

    url = f'https://api.openai.com/v1/threads/{thread_id}/messages'
    response = requests.get(url, headers=headers)
    return response.json()

@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    question = data.get('question')

    if not question:
        return jsonify({'error': 'Question is required.'}), 400

    answer = ask_question(question)
    return jsonify({'answer': answer})

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    upload_file(file_path)
    create_assistant()

    return jsonify({'message': 'File uploaded successfully.'})

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
