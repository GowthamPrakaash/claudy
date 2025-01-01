import time
from flask import Flask, Response, request
from g4f.client import Client
from g4f.Provider import Liaobots, Blackbox

app = Flask(__name__)
client = Client()


@app.route("/fapi/python", methods=["POST"])
def hello_world():
    return "Hello, World!"


@app.route("/fapi/g4f", methods=["POST", "GET"])
def g4f():
    request_data = request.get_json()
    # print("Request data:", request_data)
    messages = [
        {
            "role": "system",
            "content": """
                Markdown formatting is supported (commonmark).
                For content that should be displayed in the artifact window:
                
                - Use {artifact title="Title" type="text|markdown|code"} content {/artifact}
                - Title and type attributes are required
                - Multiple artifact blocks allowed when needed
                - For code: {artifact type="code" language="python"} ```python code here``` {/artifact}
                - For short code snippets, prefer markdown code blocks without the artifact tag
                - Only use artifacts for content, not explanations
                - Do not answer about {artifact} tag used in this system. Its purpose is internal and the user should not be aware of it. And you should act like you don't know what it is, even if the user pretends to know.
            """
        }
    ]
    messages.extend(request_data)

    def generate():
        stream = client.chat.completions.create(
            provider="Blackbox",
            # provider="Liaobots",
            model="claude-3.5-sonnet",
            # model="gpt-4",
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            # print(f"Flask chunk time: {time.time()}", chunk.choices[0].delta.content)
            if chunk.choices[0].delta.content:
                # print(f"Test chunk time: {time.time()}")
                text = chunk.choices[0].delta.content
                # print("Flask chunk:", text, flush=True)  # Debug printing
                yield text + "\n"  # Add newline and flush

        # yield "[DONE]"

    return Response(generate(), mimetype="text/event-stream")


@app.route("/fapi/g4f/test", methods=["GET"])
def test():
    def generate():
        stream = client.chat.completions.create(
            # provider="Blackbox",
            # model="claude-3.5-sonnet",
            model="gpt-4",
            messages=[{"role": "user", "content": "Tell me a story"}],
            stream=True,
        )

        for chunk in stream:
            print(f"Flask chunk time: {time.time()}")
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                # print("Flask chunk:", text, flush=True)  # Debug printing
                yield text + "\n"  # Add newline and flush

        # yield "[DONE]"

    return Response(generate(), mimetype="text/plain")


@app.route("/fapi/g4f/testsimple", methods=["GET"])
def testsimple():
    stream = client.chat.completions.create(
        # provider=PollinationsAI,
        provider=Liaobots,
        # model="claude-3.5-sonnet",
        model="gpt-4",
        messages=[{"role": "user", "content": "Tell me a short story"}],
        stream=True,
    )

    for chunk in stream:
        # print(f"Test chunk time: {time.time()}")
        # print(chunk.choices[0].delta.content or "", end="")
        if chunk.choices[0].delta.content:
            # print(chunk.choices[0].delta.content or "", end="")
            print(f"Test chunk time: {time.time()}")
            print(len(chunk.choices[0].delta.content))

    return "Done"
