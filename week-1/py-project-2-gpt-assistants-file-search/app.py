import os
import openai
import time
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
from openai import OpenAI

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

from dotenv import load_dotenv
load_dotenv()
openai = OpenAI()
openai.api_key = os.getenv('OPENAI_API_KEY')

assistant_id = None
vector_store_id = None
thread_id = None
polling_interval = None

@app.route('/')
def index():
    return render_template('index.html')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def create_assistant():
    global assistant_id
    assistant = openai.beta.assistants.create(
        name="File-based Assistant",
        instructions="You are an assistant that answers questions based on the uploaded PDF file.",
        model="gpt-4o-mini",
        tools=[{"type": "file_search"}]
    )
    assistant_id = assistant.id
    print(f"Assistant created with ID: {assistant_id}")

def upload_pdf_to_vector_store(file_path):
    global vector_store_id
    try:
        file_data = openai.files.create(
            file=open(file_path, 'rb'),
            purpose='assistants'
        )

        print(f"File uploaded with ID: {file_data.id}")

        vector_store = openai.beta.vector_stores.create(
            name="Document Vector Store" 
        )

        vector_store_response = openai.beta.vector_stores.files.create(
            vector_store_id=vector_store.id,
            file_id=file_data.id
        )
        print("File added to vector store", vector_store_response)

        vector_store_id = vector_store.id
        print(f"Vector store created with ID: {vector_store_id}")

        openai.beta.assistants.update(assistant_id, tool_resources={
            "file_search": {"vector_store_ids": [vector_store_id]}
        })

        print(f"Assistant updated with Vector Store ID: {vector_store_id}")
        return vector_store_id

    except Exception as e:
        print(f"Error uploading file or creating vector store: {e}")
        return None

def create_thread():
    global thread_id
    thread = openai.beta.threads.create()
    thread_id = thread.id
    print(f"Thread created with ID: {thread_id}")
    return thread

def add_question(thread_id, question):
    response = openai.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=question
    )
    return response

def run_assistant(thread_id):
    response = openai.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id
    )
    print(f"Assistant run response: {response}")
    return response

def checking_status(thread_id, run_id):
    try:
        print("thread id ** ", thread_id)
        print("run id ** ", run_id)
        run_object = openai.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run_id)
        status = run_object.status
        print(f"Current status: {status}")

        if status == "completed":
            thread_messages = openai.beta.threads.messages.list(thread_id)
            answers = []

            for message in thread_messages.data:
                if message.role == 'assistant':
                    for content_item in message.content:
                        if content_item.type == 'text':
                            answers.append(content_item.text.value.strip())

            print("answers => ", answers)
            return answers[0] if answers else None

    except Exception as e:
        print(f"Error checking status or retrieving messages: {e}")
        return None

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        vector_store_id = upload_pdf_to_vector_store(file_path)
        os.remove(file_path)

        if vector_store_id:
            return jsonify({'message': 'File uploaded and processed successfully.'}), 200
        else:
            return jsonify({'error': 'Failed to process file.'}), 500

    return jsonify({'error': 'Invalid file type.'}), 400

@app.route('/ask', methods=['POST'])
def ask_question():
    global thread_id, polling_interval

    data = request.get_json()
    question = data.get('question')

    if not question:
        return jsonify({'error': 'No question provided.'}), 400

    if not thread_id:
        create_thread()

    add_question(thread_id, question)
    run_response = run_assistant(thread_id)
    run_id = run_response.id

    time.sleep(6)  

    answers = checking_status(thread_id, run_id)
    if answers:
        return jsonify({'answers': answers}), 200
    else:
        return jsonify({'error': 'No answers found.'}), 500

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    create_assistant()
    app.run(debug=True, port=3000) 