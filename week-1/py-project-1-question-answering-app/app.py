import openai
import os
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")


def ask_question(question):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": question}],
            max_tokens=100,
        )
        answer = response["choices"][0]["message"]["content"].strip()
        return answer
    except Exception as e:
        return f"An error occurred: {str(e)}"


if __name__ == "__main__":
    question = input("Please enter your question: ")
    if question:
        answer = ask_question(question)
        print("Answer:", answer)
    else:
        print("Please provide a valid question.")
