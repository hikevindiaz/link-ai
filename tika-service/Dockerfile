FROM openjdk:11-jre-slim

# Install Tesseract for OCR + additional language support
RUN apt-get update \
  && apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
     libtesseract-dev \
  && rm -rf /var/lib/apt/lists/*

# Fetch and install Tika Server
ENV TIKA_VERSION=2.9.4
ADD https://downloads.apache.org/tika/2.9.4/tika-server-standard-${TIKA_VERSION}.jar /tika-server.jar

# Expose the default port
EXPOSE 9998

# Launch Tika in server mode with OCR enabled
ENTRYPOINT ["java", "-jar", "/tika-server.jar", "-h", "0.0.0.0"] 