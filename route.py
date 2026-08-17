from flask import Flask, request, jsonify, json
from app_fin import song_recom ,data, explained
import random        # pull in just what this file needs
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 



@app.route("/data", methods=["GET"])
def getdat():
    return jsonify(data)

# @app.route("/songrecom",methods=["POST"])
# def postsong():
#     input=request.get_json()
#     with open("data.json", "r") as f:
#         current_data = json.load(f)
#     current_data.append(input)

#     with open("data.json", "w") as f:
#         json.dump(current_data, f, indent=2) 
   
#     #return jsonify({"mssg":"success","added":input})
#     return jsonify(song_recom(current_data[-1]))

@app.route("/explain",methods=["POST"])
def explain():
    input_data = request.get_json()      
    reason = explained(input_data)  
    return jsonify({"reason": reason})

if __name__ == "__main__":
    app.run(debug=True, port=5000)