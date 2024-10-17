from flask import Flask, request, jsonify, render_template
import os
import requests
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

pdf_content = ""


def parse_pdf():
    global pdf_content
    pdf_path = os.path.join(app.root_path, "static", "source.pdf")

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pdf_content += page.extract_text()


def query_openai(question):
    prompt = f'Use the following text to answer the user\'s question: "{pdf_content}"\n\nQuestion: {question}\nAnswer:'

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 150,
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions", json=data, headers=headers
        )
        response_json = response.json()
        return response_json["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Error querying OpenAI API: {e}")
        return "Error retrieving the answer."


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
def ask():
    question = request.json.get("question")
    if not question:
        return jsonify({"error": "Question is required"}), 400

    answer = query_openai(question)
    return jsonify({"answer": answer})


if __name__ == "__main__":
    parse_pdf()
    app.run(port=3000, debug=True)
