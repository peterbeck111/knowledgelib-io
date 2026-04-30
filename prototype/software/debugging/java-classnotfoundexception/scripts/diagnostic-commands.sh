#!/bin/bash
# Diagnostic commands for Java ClassNotFoundException and NoClassDefFoundError

# === Trace class loading at runtime ===
java -verbose:class -cp "lib/*:myapp.jar" com.example.Main 2>&1 | grep "MyMissingClass"
# Shows: [Loaded com.example.MyMissingClass from file:/path/to/library.jar]
# If no output, the class is never found/loaded

# === Print the effective classpath ===
# Maven:
mvn dependency:build-classpath -Dmdep.outputFile=classpath.txt
cat classpath.txt

# Gradle:
./gradlew dependencies --configuration runtimeClasspath

# === Search for a class in all JARs on the classpath ===
for jar in lib/*.jar; do
    jar tf "$jar" | grep -q "com/example/MyClass.class" && echo "FOUND in: $jar"
done

# === Check dependency tree for conflicts ===
# Maven (verbose shows conflict resolution):
mvn dependency:tree -Dverbose

# Maven (filter to specific dependency):
mvn dependency:tree -Dincludes=com.google.guava

# Gradle (insight into specific dependency resolution):
./gradlew dependencyInsight --dependency guava --configuration runtimeClasspath

# === Inspect a JAR's contents ===
jar tf target/myapp.jar | head -50
jar tf target/myapp.jar | grep "com/example/"

# === Check MANIFEST.MF for Class-Path entries ===
unzip -p target/myapp.jar META-INF/MANIFEST.MF

# === Check SPI service files (JDBC drivers, etc.) ===
jar tf target/myapp.jar | grep "META-INF/services"
unzip -p target/myapp.jar META-INF/services/java.sql.Driver

# === Java 9+ module system diagnostics ===
java --show-module-resolution -m com.example.myapp/com.example.Main
java --describe-module com.example.myapp
