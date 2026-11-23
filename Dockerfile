FROM amazoncorretto:latest
WORKDIR /app
COPY TodoApp.class ./
ENTRYPOINT ["/bin/sh", "-c", "stty raw -echo opost onlcr; trap 'stty sane' EXIT; java -Dtodo.data=/data/6c2a9f31.bin -cp /app TodoApp"]
