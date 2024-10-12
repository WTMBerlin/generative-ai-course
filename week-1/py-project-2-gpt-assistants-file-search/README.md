## GPT Assistants: File Search

This project implements an assistant using OpenAI that answers questions based on the content of a PDF file uploaded by the user through their browser. The assistant processes the PDF, stores it in a vector store, and allows the user to ask questions related to the PDF content.

### Requirements:

    Python 3.11.5

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-1/py-project-2-gpt-assistants-file-search
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
