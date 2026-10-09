# syntax=docker/dockerfile:1
FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
# CI/release-gate already runs Maven verify and Testcontainers before image build.
# BuildKit caches Maven artifacts across version bumps, avoiding go-offline
# downloads of unused site/deploy plugins on every fresh Docker build.
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S arena && adduser -S arena -G arena
COPY --from=build --chown=arena:arena /app/target/*.jar app.jar
USER arena
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
