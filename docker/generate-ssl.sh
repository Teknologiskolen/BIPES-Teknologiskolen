#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# For production, replace with Let's Encrypt certificates

set -e

SSL_DIR="$(dirname "$0")/ssl"
mkdir -p "$SSL_DIR"

echo "Generating self-signed SSL certificate..."
echo "⚠️  This is for DEVELOPMENT/TESTING only!"
echo "⚠️  For production, use Let's Encrypt or proper CA certificates"
echo ""

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=DK/ST=Denmark/L=Copenhagen/O=BIPES/OU=Development/CN=localhost"

chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "✅ SSL certificates generated in $SSL_DIR/"
echo "   - key.pem (private key)"
echo "   - cert.pem (certificate)"
echo ""
echo "For production, replace these with:"
echo "   docker/ssl/cert.pem - your domain certificate"
echo "   docker/ssl/key.pem - your private key"
