FROM gradle:8.14.3-jdk17 AS build
WORKDIR /app

COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src

# Build the Spring Boot executable JAR and skip tests for image build speed.
RUN chmod +x gradlew && ./gradlew clean bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app

ENV JAVA_OPTS=""

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]