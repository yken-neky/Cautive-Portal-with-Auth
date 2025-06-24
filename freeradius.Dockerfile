FROM freeradius/freeradius-server:latest

RUN apt-get update && apt-get install -y mysql-client && rm -rf /var/lib/apt/lists/*
