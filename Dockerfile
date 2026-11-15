# Railway / Docker: Telegram bot "Yo'l qoidasi" (kod prava-bot papkasida)
FROM python:3.12-slim
WORKDIR /app
COPY prava-bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY prava-bot/ .
ENV PYTHONUNBUFFERED=1
CMD ["python", "app.py"]
