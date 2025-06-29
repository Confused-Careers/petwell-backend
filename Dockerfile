FROM python:3.10-alpine AS builder

WORKDIR /app

COPY requirement.txt .

RUN apk add --no-cache gcc musl-dev && \
    pip install --no-cache-dir -r requirement.txt

FROM python:3.10-alpine

WORKDIR /app

COPY src/ ./src/
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages

RUN apk add --no-cache libpq && \
    adduser -D appuser && \
    chown -R appuser:appuser /app

USER appuser

CMD ["python", "-m", "src.main"]