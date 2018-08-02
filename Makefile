SHELL := /bin/bash
app = raybans 

cp-envvars:
	cp ./envvars.sample ./envvars

build-dev: cp-envvars
	docker-compose build ${app}

test: build-dev
	docker-compose run ${app} /test.sh

build-dist: build-dev
	docker-compose run ${app} npm run-script build 

deploy: build-dev
	docker-compose run ${app} /deploy.sh 

test-dev: test
