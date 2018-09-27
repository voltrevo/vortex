FROM ubuntu:18.04

RUN apt update

RUN printf "Australia\nSydney\n" | apt install tzdata

RUN apt install -y \
    build-essential \
    curl \
    wget \
    git \
    vim \
    zsh \
    tmux

RUN apt install -y \
    zip \
    g++ \
    zlib1g-dev \
    unzip \
    python

ADD ./docker-workspace-init.sh /tmp/.
RUN /tmp/docker-workspace-init.sh

ADD .vimrc /root/.vimrc
RUN vim +PlugInstall +qall

ADD .zshrc /root/.zshrc
