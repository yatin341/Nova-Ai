🌟 Nova AI

Nova AI is a Python-based multimodal AI assistant that combines conversational AI with web search, image generation, image editing, video generation, image animation, video editing, AI music generation, weather information, time information, and conversation history.

The project is built as a command-line AI assistant and combines powerful cloud-based AI APIs with a locally running AI music-generation model.

Nova AI is designed to bring multiple AI capabilities into a single Python application instead of requiring separate tools for each task.

✨ Features
🤖 AI Chat

Nova AI uses Groq with the openai/gpt-oss-20b model for conversational AI.

It supports:

Natural conversations
Follow-up questions
Context-aware responses
Multilingual conversations
Friendly responses
Current information through web search
Rolling conversation context
AI-powered question answering

Example:

What is Artificial Intelligence?
Explain machine learning in simple words.
What are the latest AI developments?
🔎 Web Search

Nova AI can use Groq's browser search tool when a question requires current or recent information.

This allows the assistant to retrieve information that may not be available in its static knowledge.

Examples:

What are the latest AI developments?
What happened in the news today?
What is the latest version of Python?
🖼️ AI Image Generation

Nova AI can generate images from text prompts using Cloudflare Workers AI and the FLUX 2 Klein 4B model.

Model:

@cf/black-forest-labs/flux-2-klein-4b

Example:

Generate an image of a futuristic city at night

The generated image is saved locally as:

generated_image.png
✏️ AI Image Editing

Nova AI can edit an existing image using a natural-language instruction.

The user can provide an image and describe what should be changed.

Examples:

Make the background look like a beach
Change the image into a cinematic style
Remove the background and replace it with a city

The edited image can be saved locally as:

edited_image.png
🎬 AI Video Generation

Nova AI can generate short videos from text prompts using Magic Hour.

The current implementation uses:

Duration: 5 seconds
Resolution: 480p
Orientation: Landscape
Aspect Ratio: 16:9

Example:

Generate a cinematic video of mountains at sunset

The generated video is downloaded locally.

🎞️ Image-to-Video Animation

Nova AI can take an existing image and turn it into an animated video using Magic Hour.

Example:

Animate this image with smooth camera movement

This allows static images to be transformed into short animated scenes.

🎥 Video-to-Video Editing

Nova AI can modify an existing video using a text prompt.

Examples:

Make this video look cinematic
Change the visual style of this video

The edited video is generated through Magic Hour.

🌦️ Weather Information

Nova AI can retrieve weather information using wttr.in.

Example:

weather

The assistant can ask for the city and retrieve the weather information.

🕒 Time Information

Nova AI can provide time-related information.

Example:

What time is it?
🧠 Conversation Memory

Nova AI maintains a rolling conversation context during the running session.

This allows follow-up questions to refer to previous messages.

Example:

You:
What is Python?

Nova AI:
Python is a programming language...

You:
Who created it?

Nova AI:
Python was created by Guido van Rossum.

The conversation history is also saved locally in:

history.json

This provides a local record of previous conversations.

🌍 Multilingual Support

Nova AI is designed to handle conversations in multiple languages.

The AI is instructed to respond appropriately to the language used by the user.

For example:

User:
What is machine learning?

Nova AI:
Machine learning is a branch of artificial intelligence...

The system can also handle multilingual prompts depending on the capabilities of the underlying AI model.

🧩 Intelligent Command Routing

Nova AI uses a command-routing system to determine which functionality should handle a user's request.

For example:

User Command
      ↓
Command Router
      ↓
 ┌────────────┬────────────┬─────────
 ↓            ↓            ↓            
AI Chat     Image AI     Video AI     
 ↓            ↓            ↓            
Groq       Cloudflare   Magic Hour   

This allows the application to provide multiple AI capabilities through one interface.

🛠️ Technologies Used
Technology	Purpose
Python	Main programming language
Groq	Conversational AI
GPT-OSS-20B	AI chat model
Groq Browser Search	Current information and web search
Cloudflare Workers AI	Image generation and editing
FLUX 2 Klein 4B	Image generation/editing model
Magic Hour	AI video generation and editing
Hugging Face Transformers	Loading and running MusicGen
Requests	API communication
python-dotenv	Environment variable management
JSON	Conversation history storage
🏗️ Project Architecture

Nova AI combines several AI services into one Python application.

                         ┌───────────────────┐
                         │      USER         │
                         └─────────┬─────────┘
                                   │
                                   ↓
                         ┌───────────────────┐
                         │   NOVA AI        │
                         │  Command Router   │
                         └─────────┬─────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ↓                     ↓                     ↓
       ┌───────────┐        ┌────────────┐        ┌────────────┐
       │  AI Chat  │        │ Image AI   │        │  Video AI  │
       └─────┬─────┘        └─────┬──────┘        └──────┬─────┘
             │                    │                      │
             ↓                    ↓                      ↓
          Groq              Cloudflare              Magic Hour
             │                    │                      │
             ↓                    ↓                      ↓
       GPT-OSS-20B          FLUX 2 Klein          AI Video
                                                       
                      
                        
🔄 AI Processing Flow
💬 Chat Processing
User
 ↓
Nova AI
 ↓
Command Router
 ↓
Groq
 ↓
GPT-OSS-20B
 ↓
AI Response
🔎 Web Search Processing
User Question
 ↓
Nova AI
 ↓
Groq Browser Search
 ↓
Current Information
 ↓
Groq AI
 ↓
Response
🖼️ Image Generation
User Prompt
 ↓
Nova AI
 ↓
Cloudflare Workers AI
 ↓
FLUX 2 Klein 4B
 ↓
Generated Image
 ↓
generated_image.png
✏️ Image Editing
Input Image
 ↓
User Editing Prompt
 ↓
Nova AI
 ↓
Cloudflare Workers AI
 ↓
FLUX 2 Klein 4B
 ↓
Edited Image
 ↓
edited_image.png
🎬 Video Generation
Text Prompt
 ↓
Nova AI
 ↓
Magic Hour API
 ↓
AI Video Generation
 ↓
Video File
🎞️ Image Animation
Input Image
 ↓
Animation Prompt
 ↓
Nova AI
 ↓
Magic Hour
 ↓
Animated Video
🎥 Video Editing
Input Video
 ↓
Editing Prompt
 ↓
Nova AI
 ↓
Magic Hour
 ↓
Edited Video
 ↓
Nova AI
 ↓
generated_music.wav
📁 Project Structure
Nova-AI/
│
├── main.py
├── README.md
├── .env
├── history.json
│
├── generated_image.png
├── edited_image.png
├── generated_music.wav
│
└── venv/
Important

The following files should generally not be uploaded to GitHub:

.env
venv/
history.json
generated_image.png
edited_image.png
generated_music.wav

Add them to .gitignore.

Example:

.env
venv/
__pycache__/
*.pyc
history.json
generated_image.png
edited_image.png
generated_music.wav
⚙️ Installation
1. Clone the Repository
git clone YOUR_GITHUB_REPOSITORY_URL

Move into the project folder:

cd Nova-AI
2. Create a Virtual Environment
python -m venv venv
3. Activate the Virtual Environment
Windows
venv\Scripts\activate
macOS / Linux
source venv/bin/activate
4. Install Dependencies

Install the required Python packages:

pip install groq requests magic-hour torch transformers scipy python-dotenv

Depending on your system, installing the correct PyTorch version with CUDA support may require following the official PyTorch installation instructions.

🔐 Environment Variables

Nova AI uses environment variables to keep API credentials outside the source code.

Create a file named:

.env

Inside it:

GROQ_API_KEY=your_groq_api_key
MAGIC_HOUR_API_KEY=your_magic_hour_api_key
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

The application loads these values using:

from dotenv import load_dotenv

load_dotenv(override=True)
⚠️ Important Security Rule

Never upload your .env file to GitHub.

Never publish API keys directly inside:

main.py

or any other public source file.

If an API key has already been exposed publicly, revoke or rotate it before publishing the project.

▶️ Running Nova AI

Activate the virtual environment first:

venv\Scripts\activate

Then run:

python main.py

Nova AI will start in the command-line interface.

💡 Example Commands
AI Chat
What is Artificial Intelligence?
Explain Python in simple words.
What is machine learning?
Web Search
What are the latest AI developments?
What is happening in technology today?
Image Generation
Generate an image of a futuristic city
Generate a beautiful sunset over the ocean
Generate a realistic cyberpunk city
Image Editing
Make the background look like a beach
Make this image cinematic
Video Generation
Generate a cinematic video of mountains
Generate a futuristic city video at night
Image Animation
Animate this image with camera movement
Video Editing
Make this video look cinematic
Music Generation
Generate a relaxing piano music
Generate energetic cinematic background music
Generate peaceful meditation music
Weather
weather
Time
What time is it?
🧠 Conversation Context

Nova AI keeps a rolling conversation context during execution.

The system uses previous exchanges to make follow-up questions more meaningful.

Example:

User:
What is Python?

Nova AI:
Python is a programming language...

User:
What is it used for?

Nova AI:
Python is commonly used for web development,
automation, data science, AI and machine learning...

The application also writes conversation information to:

history.json
⚡ Local AI Music Generation

One of the main features of Nova AI is that music generation can run locally.

The project uses:

facebook/musicgen-small

The model is loaded through Hugging Face Transformers.

If CUDA is available:

MusicGen → NVIDIA GPU

Otherwise:

MusicGen → CPU

This makes the music-generation component different from the cloud-based image and video features.

☁️ Cloud AI Services

Nova AI uses cloud services for several advanced capabilities.

Groq

Used for:

Conversational AI
AI reasoning
Web search integration
Cloudflare Workers AI

Used for:

Image generation
Image editing
Magic Hour

Used for:

Text-to-video generation
Image-to-video animation
Video-to-video editing
Local MusicGen

Used for:

AI music generation
🔒 Security

Nova AI uses environment variables for API credentials.

Recommended .gitignore:

.env
venv/
__pycache__/
*.pyc
history.json
generated_image.png
edited_image.png
generated_music.wav

Never commit:

GROQ_API_KEY
MAGIC_HOUR_API_KEY
CLOUDFLARE_API_TOKEN

to a public repository.

⚠️ Current Limitations

Nova AI is still an experimental/educational project and has some limitations.

Some features depend on external APIs.
Groq requires an API key.
Cloudflare Workers AI requires an API key and account configuration.
Magic Hour requires an API key and available credits.
Video generation depends on the Magic Hour service.
Image generation depends on Cloudflare availability.
Music generation requires significant local computing resources.
GPU acceleration requires a compatible NVIDIA/CUDA setup.
CPU music generation can be considerably slower.
Generated media can require significant disk space.
The application currently runs primarily through the command line.
Conversation history is stored locally.
API services may have rate limits or usage limits.
🚀 Future Improvements

Planned or possible improvements include:

🎨 User Interface
Modern graphical interface
Chat-style interface
Image preview
Video player
Audio player
File upload support
Dark mode
🎙️ Voice Assistant
Speech-to-text
Text-to-speech
Voice commands
Wake word
Hands-free interaction
🧠 Better Memory
Long-term memory
Better conversation retrieval
User preferences
Persistent context across sessions
🤖 More AI Models
More image models
More video models
More music models
Local LLM support
AI document processing
⚡ Performance
Faster model loading
GPU optimization
Better memory management
Background processing
Parallel AI tasks
🌐 Deployment
Web application
Cloud deployment
API backend
Mobile application
Multi-user support
🎯 Project Goal

The main goal of Nova AI is to create a single Python-based multimodal AI assistant capable of handling different types of AI tasks from one application.

Instead of using separate applications for:

Chat
Web search
Image generation
Image editing
Video generation
Video editing
Image animation
Music generation
Weather
Time

Nova AI attempts to bring these capabilities together into one assistant.

📚 What This Project Demonstrates

This project demonstrates practical experience with:

Python programming
API integration
Generative AI
Large Language Models
Prompt engineering
Web search integration
Image generation
Image editing
Video generation
Video processing workflows
AI music generation
Local AI model deployment
GPU acceleration
CUDA
Hugging Face Transformers
PyTorch
Environment variables
JSON data storage
Command routing
Multimodal AI architecture
🏆 Project Highlights
🌟 Multimodal AI

Nova AI combines multiple AI capabilities into a single project.

☁️ Cloud + Local AI

The project combines cloud APIs with locally running AI models.

🎵 Local Music Generation

MusicGen runs locally and can take advantage of an NVIDIA GPU.

🖼️ Generative Images

Images can be generated and edited using FLUX.

🎬 Generative Video

Short AI videos can be created and modified using Magic Hour.

🔎 Current Information

The assistant can perform web searches for information that requires up-to-date data.

🧠 Context-Aware Chat

The assistant maintains conversation context during the current session.

📈 Project Status
🟢 AI Chat                 Working
🟢 Web Search              Working
🟢 Image Generation        Working
🟢 Image Editing           Working
🟢 Video Generation        Working
🟢 Image Animation         Working
🟢 Video Editing           Working
🟢 Music Generation        Working
🟢 Weather                 Working
🟢 Time                    Working
🟢 Conversation History    Working
🟡 GUI                     Planned
🟡 Voice Assistant         Planned
🤝 Contributing

Contributions and ideas are welcome.

If you want to improve Nova AI:

Fork the repository.
Create a new branch.
Make your changes.
Test the changes.
Create a pull request.

Example:

git checkout -b feature/new-feature
⭐ Support the Project

If you find Nova AI interesting or useful, consider giving the repository a ⭐ on GitHub.

Your support helps motivate further development.

👨‍💻 Author

Yatin Jangra

AI/ML Student | Python Developer

Interested in:

Artificial Intelligence
Machine Learning
Python
Generative AI
Automation
AI Applications
📜 License

This project is created for educational and experimental purposes.

Individual third-party models and services used by this project may have their own licenses, terms, usage restrictions, and pricing.

Check the respective provider's documentation before using the project commercially.

🌟 Nova AI

One assistant. Multiple AI capabilities.

Chat • Search • Images • Video • Music • Weather • AI

Built with Python, AI APIs, PyTorch, and local AI models.
