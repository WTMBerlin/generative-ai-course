## GPT Assistants
This is a Node.js application that answers questions using the OpenAI GPT-4 Turbo model and GPT assistants. The assistant is designed to answer questions based on the content of an uploaded PDF file. The file content is processed and stored in a vectorized format, enabling efficient document search and question answering.
### Installation
- Clone the repository:
```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```
- Go to the project directory:
```
cd week1/js-project-2-gpt-assistants-app
```
- Install dependencies
```
npm install
```
- Create a .env file and add your OpenAI API key::
```
OPENAI_API_KEY=your_openai_api_key
```
- Start the server:
```
node server.js
```