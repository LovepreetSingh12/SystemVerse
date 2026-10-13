FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B package
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S systemverse && adduser -S systemverse -G systemverse
USER systemverse
COPY --from=build /app/target/systemverse-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
