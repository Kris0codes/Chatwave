# Chatwave

Chatwave is a simple real-time chat application built to explore the basics of WebSockets and full-stack development. It simulates an open chat room where multiple people can join, send messages instantly, and see live updates without refreshing the page.

The project is intentionally lightweight and beginner-friendly, making it a great way to understand how a WebSocket-powered backend and frontend work together.

## What this project does

Chatwave allows users to:

- join a shared chat room with a username
- send messages in real time to everyone connected
- receive system notifications when someone joins or leaves
- see the current number of online users
- experience a basic real-time communication flow built with FastAPI and React

## Main idea

This project was created as a learning exercise to understand:

- how WebSockets enable live, two-way communication
- how a backend manages multiple active connections
- how messages are broadcast to connected clients
- how a small real-time application is structured from front to back

## Technologies used

- Frontend: React with Vite
- Backend: FastAPI
- Real-time communication: WebSockets
- Styling: CSS

## Project structure

- backend/main.py: the WebSocket server, connection handling, message broadcasting, and basic safety checks
- frontend/src: the user interface and chat interaction logic
- README.md: project overview and setup guide

## Getting started

### Backend

1. Go to the backend folder
2. Install the required packages
3. Start the server

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Go to the frontend folder
2. Install the dependencies
3. Start the development server

```bash
cd frontend
npm install
npm run dev
```

Then open the local frontend address shown by Vite in your browser.

## Why this project is useful

Chatwave is a practical example of how real-time apps are built. It focuses on the core ideas behind WebSockets without adding unnecessary complexity, which makes it ideal for learning and experimentation.

## Summary

Chatwave is a clean and approachable project for understanding real-time communication, backend messaging flow, and the fundamentals of building a simple interactive web app.
