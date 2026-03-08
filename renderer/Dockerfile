FROM manimcommunity/manim:stable

USER root

RUN pip install fastapi uvicorn python-multipart

COPY render_server.py /app/render_server.py
WORKDIR /app

EXPOSE 8000
CMD ["python", "render_server.py"]
