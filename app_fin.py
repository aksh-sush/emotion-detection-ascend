import json
import random

with open("data.json", "r") as f:
    data = json.load(f) 
with open("music.json","r") as p:
    music=json.load(p)

def lubdub_heart(i):
  
        if(i["rate"]>100):
            return "racing"
        
        elif(i["rate"] >60):
            return "steady"
        elif(i["rate"]<=60):
            return "goner"
        else:
            return "ambiguous"
        

def human(i):
  
            return i["user-tag"]

def timestamp(i):
        return i["timestamp"]

def machprediction(i):
        return i["machine-feelin"]

# for i in data:
#     # print(i["rate"])
#     # print(lubdub_heart(i["rate"]))
#     print(machprediction(i))
#     print(timestamp(i))
#     print(human(i))

def emotion_decision(occurance):
        c=0
        c=c+1
        if(c<=3):
            #dont consider sensor reading atall it might be wrong 1 out of 3 times

            if(human(occurance) == machprediction(occurance)):
                return human(occurance) 
            
            elif(human(occurance)=="angry" or human(occurance)=="sad"):
                return "sad"
            
            elif(human(occurance)!=machprediction(occurance)):
                if lubdub_heart(occurance)=="goner" or lubdub_heart(occurance)=="ambigious":
                    return human(occurance)
                else:
                    return machprediction(occurance)
        else:
            return human(occurance)
            c=0

# for i in data:
#     print(emotion_decision(i)) #my ultimate decision 

def song_recom(i):
        

        songs = music[emotion_decision(i)]
        idx = random.randint(0, len(songs) - 1)   
        return(songs[idx]["name"])  

def explained(occurance):
    human_tag = human(occurance)
    machine_tag = machprediction(occurance)
    heart_status = lubdub_heart(occurance)
    song=song_recom(occurance)
    return (song +" sensor sensed rate and concluded that this was their stability " + heart_status +
            " which may be misleading 1 out of 3 times, hence we take into consideration how the person feels which is " + human_tag +
            " and the machine without interference predicted " + machine_tag +
            " the council decides the person's state is " + song)

import random
