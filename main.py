from groq import Groq
import os
import json
import time
import requests
import base64
from magic_hour import Client
from dotenv import load_dotenv

load_dotenv(override=True)

#video api key client
client = Client(
    token=os.getenv("MAGIC_HOUR_API_KEY")
) 

#CLOUDFLARE_ACCOUNT_ID
#CLOUDFLARE_API_TOKEN
ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL = "@cf/black-forest-labs/flux-2-klein-4b"

URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}"



#groq api client
groq_client = Groq(
    api_key= os.getenv("GROQ_API_KEY")
)




# to animate photo

def animate_image():
    image_path = input("\n📷 Enter image path: ").strip()
    image_path = image_path.strip('"').strip("'")

    if not os.path.exists(image_path):
        print("❌ Image not found!")
        return

    motion = input("🎬 What movement should I add? ").strip()

    print("\n🎬 Animating your image...")

    try:
        res = client.v1.image_to_video.generate(
            name="Animated Image",
            end_seconds=5,
            resolution="480p",
            assets={
                "image_file_path": image_path
            },
            style={
                "prompt": motion
            },
            wait_for_completion=True,
            download_outputs=True,
            download_directory="."
        )

        print("✅ Video generated successfully!")

        return res

    except Exception as e:
        print("❌ Image-to-video error:")
        print(e)



# to edit video
def edit_video():
    video_path = input("\n🎥 Enter video path: ").strip()
    video_path = video_path.strip('"').strip("'")

    if not os.path.exists(video_path):
        print("❌ Video not found!")
        return

    edit_prompt = input("✏️ What should I change? ").strip()

    print("\n🎬 Editing your video...")
    print("Please wait...")

    try:
        res = client.v1.video_to_video.generate(
            name="Edited Video",
            assets={
                "video_file_path": video_path,
                "video_source": "file"
            },
            start_seconds=0,
            end_seconds=15,
            style={
                "art_style": "3D Render",
                "model": "default",
                "prompt": edit_prompt,
                "prompt_type": "default",
                "version": "default"
            },
            fps_resolution="HALF",
            wait_for_completion=True,
            download_outputs=True,
            download_directory="."
        )

        print("✅ Video edited successfully!")

        return res

    except Exception as e:
        print("❌ Video editing error:")
        print(e)                


# to generate image
def generate_image(prompt):

  try:

    print("\n🎨 Generating image...")
    print("Prompt:", prompt)
    print("Please wait...\n")

    headers = {
        "Authorization": f"Bearer {API_TOKEN}"
    }

    files = {
        "prompt": (None, prompt),
        "width": (None, "1024"),
        "height": (None, "1024")
    }

    response = requests.post(
        URL,
        headers=headers,
        files=files,
        timeout=120
    )

    if response.status_code != 200:
        print("❌ Image generation error:")
        print(response.text)
        return None

    result = response.json()

    image_base64 = result["result"]["image"]

    image_bytes = base64.b64decode(image_base64)

    output_path = "generated_image.png"

    with open(output_path, "wb") as f:
        f.write(image_bytes)

    print("✅ Image generated successfully!")
    print("Saved at:", os.path.abspath(output_path))

    return output_path
  except Exception as e:
       print("❌ Image generation error:", e)
       return None


# to edit image with ai
def ai_edit_image(image_path, edit_command):
     # Remove quotes if user pastes "path"
    image_path = image_path.strip().strip('"').strip("'")

    # Check image
    if not os.path.exists(image_path):
        print("❌ Image not found!")
        return None

    print("\nAI is editing your image...")
    print("Please wait...\n")

    headers = {
        "Authorization": f"Bearer {API_TOKEN}"
    }

    try:
        with open(image_path, "rb") as image_file:

            files = {
                "input_image_0": (
                    os.path.basename(image_path),
                    image_file,
                    "application/octet-stream"
                ),
                "prompt": (None, edit_command),
                "width": (None, "1024"),
                "height": (None, "1024")
            }

            response = requests.post(
                URL,
                headers=headers,
                files=files,
                timeout=120
            )

        if response.status_code != 200:
            print("❌ Cloudflare error:")
            print(response.status_code)
            print(response.text)
            return None

        result = response.json()

        # Cloudflare returns generated image as Base64
        import base64

        image_base64 = result["result"]["image"]

        image_bytes = base64.b64decode(image_base64)

        output_path = "edited_image.png"

        with open(output_path, "wb") as output_file:
            output_file.write(image_bytes)

        print("✅ Image edited successfully!")
        print("Saved at:", os.path.abspath(output_path))

        return output_path

    except Exception as e:
        print("❌ Image editing error:")
        print(e)
        return None

   


def edit_image(command):
    print("""Sure—upload the photo and tell me what you want changed
     (e.g. background, lighting, hairstyle, clothes, body proportions,
    cinematic look, remove something, or make it Instagram-style).""")



    image_path = input("Enter the image path: ").strip()

    # Remove quotes if user pasted:
    image_path = image_path.strip('"').strip("'")


    # Check image
    if not os.path.exists(image_path):

        print("Image file not found!")

        return


    print("Image found successfully!")


    edit_command = input(
        "What do you want to change?\n> "
    ).strip()


    if not edit_command:

        print("Please enter an editing instruction.")

        return


    # Call AI image editor
    edited_image = ai_edit_image(
        image_path,
        edit_command
    )


    if edited_image:

        print(f"\nYour edited image is here:")
        print(os.path.abspath(edited_image))


#  weather 
def weather():    
         city = input("tell me which city or which country :- ")

         url = f"https://wttr.in/{city}?format=j1"
         try:
     
             response = requests.get(url,timeout=10)
             response.raise_for_status()

             data = response.json()

             temperature = data["current_condition"][0]["temp_C"]

             print(f"The temperature in {city} is {temperature}°C")

         except Exception as e: 
            print("Weather error:", e) 

         


# to store history

HISTORY_FILE = "history.json"

def save_history(user_message, ai_response):
    history = []

    if os.path.exists(HISTORY_FILE):

     try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as file:
            history = json.load(file)
     except (json.JSONDecodeError, OSError):
           history = []
    history.append({
        "user": user_message,
        "AI": ai_response
    })

    with open(HISTORY_FILE, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=4, ensure_ascii=False)


# ai prompt

conversation_history = [
    {
        "role": "system",
        "content": """
You are ai, a fast and friendly ai assistant.
Remember previous messages so you can understand follow-up questions.
If the user asks something related to a previous question,
use the previous conversation context.
Give short, natural answers, usually 1-3 sentences.
If the user changes the topic, answer the new topic normally.
Do not use markdown.Do not give unnecessary explanations. and always explain like every normal humans can understand. 
if user  ask about you, tell them that your are a ai assistant and you can help them in variours problems. always respect the user.
if user ask how are you tell them you are fine and ask them how can i help you. 
write properly .if user talk with you talk with the user and
talk friendly. if user ask for any advice give your best advise to user.  if user ask you what 
are you doing reply them that your are helping the user. 
always remember what user ask to you Remember the conversation and use previous messages to understand follow-up questions.
If the user asks something related to a previous question, use the previous context.
If the user changes the topic, answer the new topic normally. 

If the user's question depends on current or recent information,
use web search when available instead of relying on your stored knowledge.

Examples of current information:
- latest products
- current prices
- today's news
- current events
- recent releases
- current company CEOs
- current sports results
- current technology
You are Ai, a multilingual AI assistant.

IMPORTANT LANGUAGE RULES:

1. Detect the language used by the user.
2. Reply in the same language as the user.
3. Support multilingual conversations.

5. If the user speaks Hindi using English/Roman letters,
   reply in Roman Hindi.
6. If the user speaks English, reply in English.
7. If the user speaks Punjabi, reply in Punjabi.
8. Do not randomly change the user's language.
9. Keep answers natural and conversational.

Examples:

User: How are you?
Assistant: I'm doing great! How can I help you?

User: Kaise ho?
Assistant: Main bilkul theek hoon! Aap kaise ho?

User: ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?
Assistant: ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ! ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?

User: ¿Cómo estás?
Assistant: ¡Estoy muy bien! ¿Cómo puedo ayudarte?
"""
    }
]  


MAX_EXCHANGES = 10

#Ai 

def aiprocess(command):
                global conversation_history
                try:
        # Add user's question
                  conversation_history.append({
                 "role": "user",
                 "content": command
                  })

        # Send conversation history to Groq
                  response = groq_client.chat.completions.create(
                  model="openai/gpt-oss-20b",
                 messages= conversation_history,
                 
                  tools=[
                {
                    "type": "browser_search"
                }
            ],
                   
                  tool_choice="auto",
            

                  max_completion_tokens=2048

                  )
                  

        # Get Ai answer
                  answer = response.choices[0].message.content
                

        # Save Ai  answer
                  conversation_history.append({
                  "role": "assistant",
                 "content": answer
                  })
                  save_history(command, answer)

        # Keep only last 10 exchanges
                  if len(conversation_history) > (MAX_EXCHANGES * 2) + 1:
                    conversation_history = (
                  [conversation_history[0]]
                  + conversation_history[-(MAX_EXCHANGES * 2):]
                 )  
                  return answer
        
                except Exception as e:
                  print(f"{e}")
                  return f"Groq error: {e}"

                
waiting_for_image_prompt = False
waiting_for_video_prompt = False

def proccess(command):
       global waiting_for_video_prompt
       global waiting_for_image_prompt

     
       command = command.lower().strip()

       if waiting_for_image_prompt:
            waiting_for_image_prompt = False

            print("🎨 Generating your image...")
            generate_image(command)
            return

       if waiting_for_video_prompt:
            waiting_for_video_prompt = False

            print("🎬 Generating your video...")
            generate_video(command)
            return
            
       if "weather" in command or command.startswith("temperature in "):
             print("yes tell me your city ")
             weather()


       elif command in[
            "time",
            "what time is it",
            "current time",
            "tell me the time"
       ]:
       
            
              current_time = time.strftime("%I:%M %p")
              return(f"The current time is {current_time}") 

       elif (
           command.startswith ("generate a photo")
           or command.startswith("generate an image")
           or command.startswith("create an image")
           or command.startswith("make an image")
       ):
            if command.startswith("generate a photo"):
                 prompt = command.replace("generate a photo", "", 1).strip()

            elif command.startswith("generate an image"):
                 prompt = command.replace("generate an image", "", 1).strip()     

            elif command.startswith("create an image"):
                 prompt = command.replace("create an image", "", 1).strip()

            elif command.startswith("make an image"):
                 prompt = command.replace("make an image", "", 1).strip()   

            if prompt:
                 generate_image(prompt)   

            else:
                 waiting_for_image_prompt = True
                 print("Please tell me what image you want to generate.")

       elif( 
           command.startswith("generate a video")
           or command.startswith("make a video")
           or command.startswith("create a video")
           or command.startswith("generate video")
       ):

           if command.startswith("generate a video"):
               prompt = command.replace("generate a video", "" , 1).strip()

           elif command.startswith("make a video"):
               prompt = command.replace("make a video", "" , 1).strip()

           elif command.startswith("create a video"):
               prompt = command.replace("create a video", "" , 1).strip()

           elif command.startswith("generate video"):
               prompt = command.replace("generate video", "" , 1).strip()

           if prompt:
               generate_video(prompt)

           else:
               waiting_for_video_prompt = True
               print("tell me what video you want to generate")


       elif(
           command.startswith("animate this photo")
           or command.startswith("animate photo")
           or command.startswith("animate this image")
           or command.startswith("animate image")
       ):     

           animate_image()
           return


       elif(
           command.startswith("edit this video")
           or command.startswith("edit video")
           or command.startswith("edit my video")
       ):
           edit_video()
           return     
   

       

       elif command.startswith("edit this image"):
              edit_image(command)

       elif command.startswith("edit this photo"):
               edit_image(command)

       elif command.startswith("edit my photo"):
                     edit_image(command)

       elif command.startswith("edit my image"):
                            edit_image(command)                                 
             
       
       else:
            output = aiprocess(command)
            print(output)       


#------------------------------------frontend-------------------------------


if __name__ == "__main__":

 
      while True:

            start = time.time()
            print("Ai look around:", round(time.time() - start, 2), "seconds")
            ask_question = input("ask question:- ")

            proccess(ask_question)
            print("total time taken to answer:", round(time.time() - start, 2), "seconds")
 
