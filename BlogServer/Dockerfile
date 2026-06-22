FROM ubuntu:22.04 AS build

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY CMakeLists.txt .
COPY source/ ./source/
COPY deps/ ./deps/

RUN mkdir build && cd build && \
    cmake .. && \
    make

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libmysqlclient21 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/build/blogserver .

EXPOSE 4000 4001
CMD ["./blogserver"]
