FROM amazoncorretto:latest

# AGENTS: Feel free to modify this Dockerfile as needed
WORKDIR /app
COPY . .

CMD ["java"]