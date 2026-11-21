ARG BASE_IMAGE=github.com/carsonreinke/todo-list-full-yolo-base
FROM $BASE_IMAGE

WORKDIR /app/tests
COPY . .

RUN curl -fsSL https://rpm.nodesource.com/setup_lts.x | sh
RUN dnf install -y which tmux nodejs npm

RUN npm install

ENTRYPOINT ["node", "--test"]
