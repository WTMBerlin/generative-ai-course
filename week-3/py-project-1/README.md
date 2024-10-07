## RAG: Seeking Information in a Paper
This Flask/Python application answers user questions based on the content extracted from a PDF file. The application generates answers by analyzing the uploaded source.pdf. It employs the Retrieval Augmented Generation (RAG) approach using OpenAI's GPT-4o-mini model to provide contextual and informed responses.
### Requirements:
    Python 3.11.5 
### Installation

- Clone the repository:
```
git clone https://github.com/HilalKocak/gen-ai.git
```
- Go to the project directory:
```
cd week-3/py-project-1
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