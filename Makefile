DOCKER_NAMESPACE := backend/mozilla-send
BUILD_TAG ?= local
export BUILD_TAG
DOCKER_TAG := $(DOCKER_NAMESPACE):$(BUILD_TAG)

DOCKER_BUILD_STAMP := docker-image.id

.PHONY: lint-docker docker-build docker

docker: $(DOCKER_BUILD_STAMP)
$(DOCKER_BUILD_STAMP): Dockerfile .dockerignore
	docker build --iidfile $(DOCKER_BUILD_STAMP) --tag $(DOCKER_TAG) .

lint-docker:
	docker run --rm \
		-v $(CURDIR)/Dockerfile:/app/Dockerfile:ro \
		--workdir /app \
		ghcr.io/hadolint/hadolint:latest-alpine \
		hadolint Dockerfile

docker-build:
	docker build -t backend/mozilla-send:latest .
