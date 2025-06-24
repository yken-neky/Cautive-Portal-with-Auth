FROM golang:1.22-alpine as builder
WORKDIR /app
COPY . .
RUN go build -o portal

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/portal .
COPY --from=builder /app/static ./static
EXPOSE 8080
CMD ["./portal"]
