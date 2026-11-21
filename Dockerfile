FROM amazoncorretto:latest
WORKDIR /app
COPY TodoApp.class ./
ENTRYPOINT ["java", "-Dtodo.data=/data/6c2a9f31.bin", "-cp", "/app", "TodoApp"]
