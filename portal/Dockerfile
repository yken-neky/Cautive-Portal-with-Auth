FROM golang:1.24.1-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY vendor/ ./vendor/
COPY . .
RUN go build -mod=vendor -o portal

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/portal .
EXPOSE 8080
CMD ["./portal"]
