# prepare the instances, from docker-compose

docker-compose build
# -> angular-websocket-example_backend:latest and angular-websocket-example_frontend:latest

# created one docker cloud account and 2 public repositories
docker login
docker tag angular-websocket-example_backend:latest azulgan/backend:latest
docker push azulgan/backend:latest
docker tag angular-websocket-example_frontend:latest azulgan/frontend:latest
docker push azulgan/frontend:latest

# make sure that locally the firewall does not filter 2376, 7649 and 7650
# created security group (name Open76xx8000) and get the name of the default vpc of my account
docker-machine create --driver amazonec2 --amazonec2-security-group Open76xx8000 --amazonec2-region us-east-2 --amazonec2-vpc-id vpc-a2facaca alan-1
#docker-machine regenerate-certs alan-1

eval $(docker-machine env alan-1)
docker run -d -p 7650:1080 azulgan/frontend:latest
docker run -d -p 7649:7649 azulgan/backend:latest

# end the experience
docker-machine rm alan-1

