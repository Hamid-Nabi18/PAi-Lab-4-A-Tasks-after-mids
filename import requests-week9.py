import requests
from flask import Flask, render_template

app = Flask(__name__)

data_dict = {
    "name": "John Doe",
    "age": 30,
    "city": "New York"
}

api_key = "vMAnP08Jfp4B3wCkO0gyIlK49ttvWyu9mo33Ou6f"

url = f"https://api.nasa.gov/planetary/apod?api_key={api_key}"

@app.route("/data")
def data():
    return data_dict



@app.route("/")
def main():
    response = requests.get(url)
    
    if response.status_code == 200:
        nasa_data = response.json()
        
    return render_template("index.html", data=nasa_data)


if __name__ == "__main__":
    app.run(debug=False, port=5000)











# response = requests.get(url)
# # print(response)

# if response.status_code == 200:
#     data = response.json()
#     print(data)