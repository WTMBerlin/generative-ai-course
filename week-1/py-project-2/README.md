## OpenAI Question Answering CLI Application
This is a simple command-line application that uses OpenAI's GPT model to answer questions based on user input. The application sends the user's question to the OpenAI API and prints out the response.

### Requirements:
    Python 3.11.5 
### Installation

- Clone the repository:
```
git clone https://github.com/HilalKocak/gen-ai.git
```
- Go to the project directory:
```
cd week1/py-project-2
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