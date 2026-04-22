from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import base64

app = Flask(__name__)
CORS(app)

os.environ['Gemini_API_Key'] = 'AIzaSyCbw8WH-Y_a4F-cA4HeBdnt6j9mmeUqniw'
genai.configure(api_key=os.environ['Gemini_API_Key'])
model = genai.GenerativeModel('gemini-2.5-flash')

def classify_crisis(guest_message):
    prompt = f"""
    You are an emergency response AI for a hospitality venue like a hotel, mall, or transport system.

    A guest has sent this emergency message:
    "{guest_message}"

    Analyze the message and respond in exactly this format:
    Category: [Fire/Medical/Security/Flood/Gas Leak/Electricity short circuit]
    Severity: [Low/Medium/High/Critical]
    Call: [Fire Brigade/Ambulance/Police/Maintenance/Gas Authority/Electricians]
    Instructions: [2 simple instructions for the guest to follow right now]

    Only respond in the above format. Nothing else.
    """
    response = model.generate_content(prompt)
    return response.text

@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    message = data['message']
    result = classify_crisis(message)
    return jsonify({'result': result})

@app.route('/classify-image', methods=['POST'])
def classify_image():
    data = request.get_json()
    image_base64 = data['image']
    prompt = """
    You are an emergency response AI for a hospitality venue.

    Analyze this image and respond in exactly this format:
    Category: [Fire/Medical/Security/Flood/Gas Leak/Electricity short circuit]
    Severity: [Low/Medium/High/Critical]
    Call: [Fire Brigade/Ambulance/Police/Maintenance/Gas Authority/Electricians]
    Instructions: [2 simple instructions for the guest to follow right now]

    Only respond in the above format. Nothing else.
    """
    response = model.generate_content([
        prompt,
        {
            'mime_type': 'image/jpeg',
            'data': image_base64
        }
    ])
    return jsonify({'result': response.text})

@app.route('/', methods=['GET'])
def home():
    return "RAPID Crisis API is running!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)