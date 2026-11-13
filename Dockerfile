FROM amazoncorretto:latest
WORKDIR /app
COPY *.class ./
ENTRYPOINT ["java", "-cp", "/app", "q7m4v2x9"]
