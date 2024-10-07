## OpenAI Question Answering CLI Application
This project provides a web service that allows users to upload a PDF document, ask questions related to its content, and receive answers from an AI assistant powered by OpenAI's GPT models.

### Requirements:
    Python 3.11.5 
### Installation

- Clone the repository:
```
git clone https://github.com/HilalKocak/gen-ai.git
```
- Go to the project directory:
```
cd week1/py-project-1
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